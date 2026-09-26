import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialize Gemini SDK with User-Agent as required by Gemini API guidelines
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade for Live API on /live and /api/live
  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const pathname = url.pathname;
      if (pathname === '/live' || pathname === '/api/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      console.warn('[Live API] Upgrade error:', err);
      socket.destroy();
    }
  });

  // Gemini 3.8 Live API WebSocket Handler
  wss.on('connection', async (clientWs: WebSocket, request: any) => {
    console.log('[Live API] Client connected');
    let clientDisconnected = false;

    clientWs.on('error', (err) => {
      console.warn('[Live API] Client WebSocket socket event:', err?.message || err);
    });

    const urlObj = new URL(request?.url || '/', 'http://127.0.0.1');
    const initialContext = urlObj.searchParams.get('context') || '';
    const voiceParam = urlObj.searchParams.get('voice') || '';
    const validVoices = ['Zephyr', 'Kore', 'Fenrir', 'Puck', 'Charon'];
    const selectedVoice = validVoices.includes(voiceParam) ? voiceParam : 'Zephyr';

    const ai = getAi();
    let session: any = null;
    let isConnected = false;

    const buildSystemInstruction = (tradingContext?: string) =>
      `You are the Overdesk Nexus Live Voice Copilot for an active financial trader.
You know all items and categories across the trader's 5-mode checklist:
1. Market Analysis:
   - Analyze higher timeframe (D1/H4) trend
   - Mark key Support & Resistance / Liquidity zones
   - Check Economic Calendar for high-impact news
   - Identify market structure (BOS / CHoCH)
2. Risk Management:
   - Calculate max risk per trade (1% - 2%)
   - Set precise Stop Loss price before entry
   - Verify Risk-to-Reward ratio (min 1:2)
   - Confirm total account margin & lot size
3. Trading Strategy:
   - Wait for clear setup at Key Zone / Order Block
   - Confirm lower timeframe entry trigger (M15/M5)
   - Check confluence indicators (RSI, MA, Volume)
   - Avoid trading inside low-liquidity chop
4. Trade Execution:
   - Place Buy/Sell Order with preset SL & TP
   - Move Stop Loss to Break-Even at 1:1 R:R
   - Take partial profits at key target levels
   - Let winning trade run to final Take Profit
5. Review & Journaling:
   - Screenshot chart before and after trade
   - Log entry, exit, lot size, and PnL in Journal

CURRENT TRADER CHECKLIST & STATUS:
${tradingContext || 'Standard 5-Mode Sequential Checklist'}

CRITICAL INTERACTION FLOW:
1. ABSOLUTE SILENCE ON CONNECTION: When the connection opens, stay completely silent. NEVER speak first. Wait for the trader to speak.
2. THE TRADER MUST ALWAYS BE THE ONE TO TELL YOU WHAT THEY HAVE DONE FIRST:
   The trader will speak to you and state what action or step they have just completed, concluded, or done (e.g., "I've analyzed the 4-hour trend", "Checked support and resistance", "Marked liquidity zones", "Placed stop loss", "Took partial profits").
3. YOUR RESPONSE ONCE THE TRADER TELLS YOU WHAT THEY HAVE DONE:
   Only after the trader tells you what they have done, respond verbally in your active AI voice persona (${selectedVoice}):
   a. Briefly confirm their completed step in 3-5 words (e.g., "Concluded higher timeframe trend analysis.").
   b. Immediately tell them the NEXT 3 THINGS on their checklist in sequential order:
      "Your next 3 steps are: 1, [next step 1]. 2, [next step 2]. 3, [next step 3]."
   c. If they reached the end of a category mode, smoothly transition into the next mode's steps.
4. IF THE TRADER SAYS "NEXT" (or "next item", "mark next"):
   Immediately acknowledge the next pending checklist item as marked (e.g., "Marked [step]."), and tell them the next 3 steps that follow on their checklist in sequential order.
5. If you receive an internal background message prefixed with [System Context Update], do NOT reply or speak any audio to it. Remain silent and wait for the trader to speak.
6. Keep spoken responses concise, energetic, confident, and direct (2-3 spoken sentences maximum) suitable for hands-free audio during live trading.`;

    try {
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: buildSystemInstruction(initialContext),
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // Handle audio and text chunks from model turn
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio',
                      audio: part.inlineData.data,
                    })
                  );
                }
                if (part.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'text',
                      text: part.text,
                    })
                  );
                }
              }
            }

            // Handle live transcriptions
            const serverContent = message.serverContent as any;
            if (serverContent?.outputAudioTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'text',
                  text: serverContent.outputAudioTranscription.text,
                })
              );
            }
            if (serverContent?.inputAudioTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'user_transcript',
                  text: serverContent.inputAudioTranscription.text,
                })
              );
            }

            // Handle interruption (user started speaking over model)
            if (message.serverContent?.interrupted) {
              clientWs.send(
                JSON.stringify({
                  type: 'interrupted',
                  interrupted: true,
                })
              );
            }

            // Turn complete
            if (message.serverContent?.turnComplete) {
              clientWs.send(
                JSON.stringify({
                  type: 'turn_complete',
                })
              );
            }
          },
          onclose: () => {
            console.log('[Live API] Gemini session closed');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'session_closed' }));
            }
          },
          onerror: (err: any) => {
            console.error('[Live API] Gemini session error:', err?.message || err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err?.message || 'Gemini Live session error',
                })
              );
            }
          },
        },
      });

      if (clientWs.readyState !== WebSocket.OPEN) {
        console.log('[Live API] Client disconnected before Gemini session initialized');
        if (session) {
          try {
            await session.close();
          } catch {}
        }
        return;
      }

      isConnected = true;
      clientWs.send(
        JSON.stringify({
          type: 'ready',
          model: 'gemini-3.8-live',
          voice: selectedVoice,
          message: 'Connected to Gemini 3.8 Live API',
        })
      );
    } catch (connErr: any) {
      console.error('[Live API] Failed to connect to Gemini Live:', connErr?.message || connErr);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            message: connErr?.message || 'Failed to establish Gemini Live session',
            fallbackAvailable: true,
          })
        );
      }
    }

    clientWs.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString());

        // 1. Audio input from client mic (16kHz PCM 16-bit little-endian)
        if (msg.audio && session) {
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
          return;
        }

        // 2. Direct text input to live conversation
        if (msg.text && session) {
          session.sendRealtimeInput({
            text: msg.text,
          });
          return;
        }

        // 3. Trading context synchronization:
        // Background update only. Do NOT trigger a model turn so the AI does not speak unprompted.
        if (msg.type === 'context' && msg.context && session) {
          // Context is already loaded into system instruction or updated silently
          return;
        }

        // 4. Session close requested
        if (msg.type === 'close' && session) {
          try {
            await session.close();
          } catch {}
        }
      } catch (err: any) {
        console.warn('[Live API] Error processing client message:', err?.message || err);
      }
    });

    clientWs.on('close', async () => {
      console.log('[Live API] Client disconnected');
      if (session) {
        try {
          await session.close();
        } catch {}
        session = null;
      }
    });
  });

  // REST API: Live API Status
  app.get('/api/live-status', (_req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({
      supported: true,
      liveModel: 'gemini-3.8-live',
      flashModel: 'gemini-3.8-flash',
      ttsModel: 'gemini-3.8-flash-lite-tts',
      hasApiKey: hasKey,
    });
  });

  // REST API: Gemini AI Text-To-Speech (gemini-3.8-flash-lite-tts)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voiceName = 'Zephyr', style = 'Clear, confident, disciplined financial trading copilot' } = req.body || {};
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Missing text parameter' });
        return;
      }

      const ai = getAi();
      const validVoices = ['Zephyr', 'Kore', 'Fenrir', 'Puck', 'Charon'];
      const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Zephyr';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 1200),
                speechMetadata: {
                  style: style || 'Clear, confident, disciplined financial trading copilot',
                },
              },
            ],
          },
        ] as any,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({
          audio: base64Audio,
          format: 'pcm16',
          sampleRate: 24000,
          voiceName: selectedVoice,
        });
      } else {
        res.status(500).json({ error: 'No audio returned by Gemini TTS' });
      }
    } catch (err: any) {
      console.warn('[Gemini TTS] Generation note:', err?.message || err);
      res.status(500).json({ error: err?.message || 'Gemini TTS generation failed' });
    }
  });

  // REST API: Fallback / Conversational Chat with gemini-3.8-flash
  app.post('/api/what-next-chat', async (req, res) => {
    try {
      const { message, planContext, history } = req.body || {};
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Missing message parameter' });
        return;
      }

      const ai = getAi();
      const systemInstruction = `You are the Overdesk Nexus Live Voice Copilot for an active financial trader.
Your goal is to guide the trader based on what they have completed.
Rule: The trader tells you what they have done first. When they report an action completed, identify where they are in their checklist, confirm the step, and clearly state the NEXT 3 THINGS on their checklist in sequential order (1, 2, 3).
If they haven't told you what was done, prompt them: "Tell me what step you just completed, and I will give you the next 3 actions."
Keep responses concise, clear, and actionable (2-3 sentences max).
Current Trading Plan Context:
${planContext || 'Standard 5-Day Trading Trail'}`;

      let replyText = '';
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

      for (const modelName of modelsToTry) {
        try {
          const chat = ai.chats.create({
            model: modelName,
            config: {
              systemInstruction,
            },
          });

          const response = await chat.sendMessage({
            message,
          });

          if (response && response.text) {
            replyText = response.text;
            break;
          }
        } catch (mErr: any) {
          console.warn(`[Chat API] ${modelName} attempt note:`, mErr?.message || mErr);
          continue;
        }
      }

      if (!replyText) {
        replyText = `Great progress. With ${message} concluded, verify your risk parameters, stop-loss placement, and execute your sequential checklist with discipline.`;
      }

      res.json({
        reply: replyText,
      });
    } catch (err: any) {
      console.error('[Chat API] Error:', err?.message || err);
      res.json({
        reply: 'Follow your trading plan sequentially. Ensure risk management rules are verified before executing.',
      });
    }
  });

  // REST API: Voice Command Identifier
  app.post('/api/voice-command', async (req, res) => {
    try {
      const { transcript } = req.body || {};
      let identifiedCommand = 'NONE';
      const transcribedSpeech = transcript ? String(transcript).trim() : '';

      if (transcribedSpeech) {
        const t = transcribedSpeech.toLowerCase();
        if (/\b(what next|what's next|whats next|what is next|what to do next)\b/.test(t)) identifiedCommand = 'WHAT_NEXT';
        else if (/\b(next|forward|advance|skip|go next)\b/.test(t)) identifiedCommand = 'NEXT';
        else if (/\b(back|previous|prev|go back)\b/.test(t)) identifiedCommand = 'BACK';
        else if (/\b(calendar|economic calendar|app two|app 2)\b/.test(t)) identifiedCommand = 'CALENDAR';
        else if (/\b(checklist|tasks|task list|todo|app one|app 1)\b/.test(t)) identifiedCommand = 'CHECKLIST';
      }

      res.json({
        command: identifiedCommand,
        action: identifiedCommand,
        heardText: transcribedSpeech || identifiedCommand,
        transcript: transcribedSpeech,
      });
    } catch {
      res.json({ command: 'NONE', action: 'NONE' });
    }
  });

  // REST API: WHAT NEXT Plan Sequential Resolution using gemini-3.8-flash
  app.post('/api/what-next', async (req, res) => {
    try {
      const { spokenText, modes, currentMode } = req.body || {};

      if (!spokenText || typeof spokenText !== 'string' || !spokenText.trim()) {
        res.status(400).json({ error: 'Missing spoken action text' });
        return;
      }

      // Flatten items for sequential upcoming computation
      const allItems: Array<{ modeKey: string; modeTitle: string; itemIndex: number; text: string; fullIndex: number }> = [];
      let globalIndex = 0;
      const modeKeys = modes ? Object.keys(modes) : [];

      modeKeys.forEach((mKey) => {
        const m = modes[mKey];
        const opts: string[] = m?.options || [];
        opts.forEach((optText, oIdx) => {
          allItems.push({
            modeKey: mKey,
            modeTitle: m.title || mKey,
            itemIndex: oIdx,
            text: optText,
            fullIndex: globalIndex++,
          });
        });
      });

      const getUpcomingFromIndex = (matchedIdx: number) => {
        const upcoming: Array<{ action: string; mode: string; itemIndex: number }> = [];
        if (matchedIdx >= 0) {
          for (let offset = 1; offset <= 3; offset++) {
            const idx = matchedIdx + offset;
            if (idx < allItems.length) {
              upcoming.push({
                action: allItems[idx].text,
                mode: allItems[idx].modeTitle,
                itemIndex: allItems[idx].itemIndex,
              });
            }
          }
        }
        return upcoming;
      };

      const findFallbackNext = (query: string) => {
        const q = query.toLowerCase().trim();
        const words = q.split(/\s+/).filter((w) => w.length > 2);

        let bestMatchIndex = -1;
        let bestScore = -1;

        allItems.forEach((item, idx) => {
          const target = item.text.toLowerCase();
          let score = 0;
          if (target === q) score += 100;
          if (target.includes(q) || q.includes(target)) score += 50;
          words.forEach((w) => {
            if (target.includes(w)) score += 10;
          });
          if (score > bestScore && score > 0) {
            bestScore = score;
            bestMatchIndex = idx;
          }
        });

        if (bestMatchIndex !== -1) {
          const matched = allItems[bestMatchIndex];
          const upcoming = getUpcomingFromIndex(bestMatchIndex);
          const nextItem =
            upcoming[0] ||
            (allItems[(bestMatchIndex + 1) % allItems.length]
              ? {
                  action: allItems[(bestMatchIndex + 1) % allItems.length].text,
                  mode: allItems[(bestMatchIndex + 1) % allItems.length].modeTitle,
                  itemIndex: allItems[(bestMatchIndex + 1) % allItems.length].itemIndex,
                }
              : { action: matched.text, mode: matched.modeTitle, itemIndex: matched.itemIndex });

          const spokenSpeech =
            upcoming.length >= 3
              ? `Next 3 things: 1, ${upcoming[0].action}. 2, ${upcoming[1].action}. 3, ${upcoming[2].action}.`
              : upcoming.length > 0
              ? `Next steps: ${upcoming.map((u, i) => `${i + 1}, ${u.action}`).join('. ')}.`
              : `Next step: ${nextItem.action}`;

          return {
            matchedAction: matched.text,
            matchedMode: matched.modeTitle,
            matchedItemIndex: matched.itemIndex,
            nextAction: nextItem.action,
            nextMode: nextItem.mode,
            nextItemIndex: nextItem.itemIndex,
            upcomingActions: upcoming,
            spokenSpeech,
            advice: `Proceeding from ${matched.modeTitle} to ${nextItem.mode}. Next: ${upcoming.map((u, i) => `${i + 1}) ${u.action}`).join(', ')}`,
          };
        }

        const firstItem = allItems[0] || { text: 'Confirm Market Structure & Bias', modeTitle: 'Setup', itemIndex: 0 };
        const upcoming = getUpcomingFromIndex(0);
        const fallbackSpeech =
          upcoming.length >= 3
            ? `Next 3 things: 1, ${upcoming[0].action}. 2, ${upcoming[1].action}. 3, ${upcoming[2].action}.`
            : `Next step: ${firstItem.text}`;

        return {
          matchedAction: spokenText,
          matchedMode: currentMode ? (modes[currentMode]?.title || currentMode) : 'Trading Plan',
          matchedItemIndex: 0,
          nextAction: firstItem.text,
          nextMode: firstItem.modeTitle,
          nextItemIndex: firstItem.itemIndex,
          upcomingActions: upcoming.length > 0 ? upcoming : [{ action: firstItem.text, mode: firstItem.modeTitle, itemIndex: firstItem.itemIndex }],
          spokenSpeech: fallbackSpeech,
          advice: 'Follow your trading plan sequentially.',
        };
      };

      try {
        const ai = getAi();
        const tradingPlanContext = modeKeys
          .map((mKey) => {
            const m = modes[mKey];
            const list = (m.options || []).map((o: string, idx: number) => `  ${idx + 1}. ${o}`).join('\n');
            return `[Mode: ${m.title || mKey}]\n${list}`;
          })
          .join('\n\n');

        const prompt = `You are the AI Trading Assistant for a trader's desktop overlay checklist.
The user just completed a step in their trading plan and said:
"${spokenText}"

Here is the complete trading plan and sequential checklist modes:
${tradingPlanContext}

Tasks:
1. Identify which action in the trading plan the user completed based on their words.
2. Determine the NEXT 3 SEQUENTIAL LINES OF ACTION for the trader to do next based on their checklist.
3. If they finished the last step in a mode, smoothly advance to the first step of the subsequent mode.
4. If the action was not explicitly in the list, intelligently identify where it fits in the trading cycle and provide the correct next steps.
5. In "spokenSpeech", acknowledge their concluded step and state the next 3 steps clearly: "Concluded [completed action]. Your next 3 steps are: 1, [step 1]. 2, [step 2]. 3, [step 3]."

Respond in JSON format matching this schema:
{
  "matchedAction": "Summary of the concluded action the user reported",
  "matchedMode": "Name of the mode where this was found",
  "matchedItemIndex": number or 0,
  "nextAction": "The exact next line of action to execute",
  "nextMode": "Name of the next mode",
  "nextItemIndex": number or 0,
  "spokenSpeech": "Phrase acknowledging concluded action and stating next 3 steps",
  "advice": "1 brief sentence with actionable trading guidance"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);

          let matchedIdx = -1;
          if (typeof parsed.matchedItemIndex === 'number' && parsed.matchedMode) {
            matchedIdx = allItems.findIndex(
              (it) =>
                it.itemIndex === parsed.matchedItemIndex &&
                (it.modeTitle.toLowerCase() === parsed.matchedMode.toLowerCase() ||
                  it.modeKey.toLowerCase() === parsed.matchedMode.toLowerCase())
            );
          }
          if (matchedIdx === -1 && parsed.matchedAction) {
            const target = parsed.matchedAction.toLowerCase();
            matchedIdx = allItems.findIndex(
              (it) => it.text.toLowerCase() === target || it.text.toLowerCase().includes(target) || target.includes(it.text.toLowerCase())
            );
          }
          if (matchedIdx === -1 && parsed.nextAction) {
            const nextTarget = parsed.nextAction.toLowerCase();
            const nextIdx = allItems.findIndex(
              (it) => it.text.toLowerCase() === nextTarget || it.text.toLowerCase().includes(nextTarget)
            );
            if (nextIdx > 0) matchedIdx = nextIdx - 1;
          }

          const upcoming = getUpcomingFromIndex(matchedIdx);
          if (upcoming.length > 0) {
            parsed.upcomingActions = upcoming;
            parsed.nextAction = upcoming[0].action;
            parsed.nextMode = upcoming[0].mode;
            parsed.nextItemIndex = upcoming[0].itemIndex;
          } else if (parsed.nextAction) {
            parsed.upcomingActions = [{ action: parsed.nextAction, mode: parsed.nextMode, itemIndex: parsed.nextItemIndex ?? 0 }];
          }

          res.json(parsed);
          return;
        }
      } catch (aiErr: any) {
        console.debug('Fallback matcher used:', aiErr?.message || aiErr);
      }

      const fallback = findFallbackNext(spokenText);
      res.json(fallback);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error' });
    }
  });

  // Mount Vite middleware in development or static build in production
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (Live API active on /live)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
