import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

function voiceApiPlugin(): Plugin {
  let aiInstance: GoogleGenAI | null = null;
  function getAi() {
    if (!aiInstance) {
      const key = process.env.GEMINI_API_KEY || '';
      aiInstance = new GoogleGenAI({ apiKey: key });
    }
    return aiInstance;
  }

  let lastCallTimestamp = 0;

  return {
    name: 'voice-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/voice-command', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { transcript } = JSON.parse(body || '{}');
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

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                command: identifiedCommand,
                action: identifiedCommand,
                heardText: transcribedSpeech || identifiedCommand,
                transcript: transcribedSpeech,
              })
            );
          } catch (err: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ command: 'NONE', action: 'NONE' }));
          }
        });
      });

      // WHAT NEXT Intelligence Endpoint
      server.middlewares.use('/api/what-next', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { spokenText, modes, currentMode, selections } = JSON.parse(body || '{}');

            if (!spokenText || typeof spokenText !== 'string' || !spokenText.trim()) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing spoken action text' }));
              return;
            }

            // Flatten all checklist items across all modes with context
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

            // Helper to get up to next 3 sequential items from the entire checklist (crossing category boundaries)
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

            // Fast local fallback matcher in case AI call fails or key is omitted
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
                return {
                  matchedAction: matched.text,
                  matchedMode: matched.modeTitle,
                  matchedItemIndex: matched.itemIndex,
                  nextAction: nextItem.action,
                  nextMode: nextItem.mode,
                  nextItemIndex: nextItem.itemIndex,
                  upcomingActions: upcoming,
                  spokenSpeech: `Next step: ${nextItem.action}`,
                  advice: `Proceeding from ${matched.modeTitle} to ${nextItem.mode}.`,
                };
              }

              // Default if no match found
              const firstItem = allItems[0] || { text: 'Confirm Market Structure & Bias', modeTitle: 'Setup', itemIndex: 0 };
              const upcoming = getUpcomingFromIndex(0);
              return {
                matchedAction: spokenText,
                matchedMode: currentMode ? (modes[currentMode]?.title || currentMode) : 'Trading Plan',
                matchedItemIndex: 0,
                nextAction: firstItem.text,
                nextMode: firstItem.modeTitle,
                nextItemIndex: firstItem.itemIndex,
                upcomingActions: upcoming.length > 0 ? upcoming : [{ action: firstItem.text, mode: firstItem.modeTitle, itemIndex: firstItem.itemIndex }],
                spokenSpeech: `Next step: ${firstItem.text}`,
                advice: 'Follow your trading plan sequentially.',
              };
            };

            // Attempt Gemini AI Intelligence resolution
            try {
              const ai = getAi();
              const tradingPlanContext = modeKeys.map((mKey) => {
                const m = modes[mKey];
                const list = (m.options || []).map((o: string, idx: number) => `  ${idx + 1}. ${o}`).join('\n');
                return `[Mode: ${m.title || mKey}]\n${list}`;
              }).join('\n\n');

              const prompt = `You are the AI Trading Assistant for a trader's desktop overlay checklist.
The user just completed a step in their trading plan and said:
"${spokenText}"

Here is the complete trading plan and sequential checklist modes:
${tradingPlanContext}

Tasks:
1. Identify which action in the trading plan the user just completed/concluded based on their words (even if phrased conversationally or slightly differently).
2. Determine the EXACT NEXT LINE OF ACTION in their sequential trading plan/checklist.
3. If they finished the last step in a mode, smoothly advance to the first step of the subsequent mode.
4. If the action was not explicitly in the list, intelligently identify where it fits in the trading cycle and provide the correct logical next step.
5. Provide a short, direct spoken text for voice synthesis (e.g., "Next, verify 15-minute entry trigger").

Respond in JSON format matching this schema:
{
  "matchedAction": "Summary of the concluded action",
  "matchedMode": "Name of the mode where this was found",
  "matchedItemIndex": number or 0,
  "nextAction": "The exact next line of action to execute",
  "nextMode": "Name of the next mode",
  "nextItemIndex": number or 0,
  "spokenSpeech": "Short phrase to speak aloud",
  "advice": "1 brief sentence with actionable trading guidance"
}`;

              const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.7-flash'];
              let response: any = null;

              for (const modelName of modelsToTry) {
                try {
                  response = await ai.models.generateContent({
                    model: modelName,
                    contents: [{ text: prompt }],
                    config: {
                      responseMimeType: 'application/json',
                    },
                  });
                  if (response && response.text) break;
                } catch {
                  continue;
                }
              }

              if (!response || !response.text) {
                throw new Error('All models exhausted, using instant local plan matcher');
              }

              const text = response.text || '';
              const parsed = JSON.parse(text);

              // Enrich with sequential 3 upcoming items from checklist
              let matchedIdx = -1;
              if (typeof parsed.matchedItemIndex === 'number' && parsed.matchedMode) {
                matchedIdx = allItems.findIndex(
                  (it) => it.itemIndex === parsed.matchedItemIndex && (it.modeTitle.toLowerCase() === parsed.matchedMode.toLowerCase() || it.modeKey.toLowerCase() === parsed.matchedMode.toLowerCase())
                );
              }
              if (matchedIdx === -1 && parsed.matchedAction) {
                const target = parsed.matchedAction.toLowerCase();
                matchedIdx = allItems.findIndex((it) => it.text.toLowerCase() === target || it.text.toLowerCase().includes(target) || target.includes(it.text.toLowerCase()));
              }
              if (matchedIdx === -1 && parsed.nextAction) {
                const nextTarget = parsed.nextAction.toLowerCase();
                const nextIdx = allItems.findIndex((it) => it.text.toLowerCase() === nextTarget || it.text.toLowerCase().includes(nextTarget));
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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(parsed));
              return;
            } catch (aiErr: any) {
              console.debug('Gemini WHAT NEXT fallback used:', aiErr?.message || aiErr);
              const fallback = findFallbackNext(spokenText);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(fallback));
              return;
            }
          } catch (err: any) {
            console.error('WHAT NEXT error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Server error' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), voiceApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
