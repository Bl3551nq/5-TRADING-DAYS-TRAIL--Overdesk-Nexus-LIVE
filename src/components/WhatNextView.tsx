import React, { useState, useEffect, useRef, useCallback } from 'react';
import { unlockAudioContext } from '../lib/speechVoice';
import { GeminiLiveClient, LiveConnectionState } from '../utils/geminiLiveClient';
import { AudioSparkIcon } from './AudioSparkIcon';

export interface UpcomingItem {
  action: string;
  mode?: string;
  itemIndex?: number;
}

export interface WhatNextResultData {
  matchedAction: string;
  matchedMode?: string;
  matchedItemIndex?: number;
  nextAction: string;
  nextMode?: string;
  nextItemIndex?: number;
  upcomingActions?: UpcomingItem[];
  spokenSpeech?: string;
  advice?: string;
}

export type WhatNextPhase = 'PROMPT' | 'LISTENING' | 'ANALYZING' | 'RESULT' | 'ERROR';

interface WhatNextViewProps {
  isLight: boolean;
  isEyeMode: boolean;
  phase: WhatNextPhase;
  transcript: string;
  result: WhatNextResultData | null;
  error: string | null;
  isSpeaking: boolean;
  micAudioLevel: number;
  voiceIsListening: boolean;
  liveMicMuted?: boolean;
  accentColor?: string;
  extraHeight?: number;
  modes?: Record<string, { title: string; options: string[]; accent?: string }>;
  currentMode?: string;
  selections?: Record<string, number[]>;
  onAskWhatNext: () => void;
  onSubmitQuery: (text: string, fromLiveVoice?: boolean) => void;
  onExitWhatNext: () => void;
  onJumpToStep?: (modeName: string, itemIdx?: number) => void;
  onReplaySpeech?: () => void;
}

export const WhatNextView: React.FC<WhatNextViewProps> = ({
  isLight,
  isEyeMode,
  phase,
  transcript,
  result,
  error,
  isSpeaking,
  micAudioLevel,
  voiceIsListening,
  liveMicMuted = false,
  accentColor = '#38bdf8',
  extraHeight = 0,
  modes,
  currentMode,
  selections,
  onAskWhatNext,
  onSubmitQuery,
  onExitWhatNext,
  onJumpToStep,
  onReplaySpeech,
}) => {
  // --- Integrated Gemini 3.8 Live API Voice Copilot ---
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [liveState, setLiveState] = useState<LiveConnectionState>('DISCONNECTED');
  const [liveStateDetail, setLiveStateDetail] = useState<string>('Connecting voice...');
  const [lastUserSpeech, setLastUserSpeech] = useState<string>('');
  const [lastModelSpeech, setLastModelSpeech] = useState<string>('');
  const [liveAudioLevel, setLiveAudioLevel] = useState<number>(0);
  const [liveModelSpeaking, setLiveModelSpeaking] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Construct complete trading checklist context string with checked/done status
  const getTradingPlanContext = useCallback((): string => {
    if (!modes) return '';
    const modeKeys = Object.keys(modes);
    let globalStep = 1;

    const sections = modeKeys.map((k, mIdx) => {
      const m = modes[k];
      const isCurrent = k === currentMode;
      const checkedIndices = selections?.[k] || [];
      const opts = (m.options || [])
        .map((o, idx) => {
          const isDone = checkedIndices.includes(idx);
          const stepNum = globalStep++;
          return `    Step ${stepNum}. [${isDone ? 'DONE ✓' : 'PENDING ⏱️'}] ${o}`;
        })
        .join('\n');
      return `Mode ${mIdx + 1}: ${m.title || k}${isCurrent ? ' [CURRENT ACTIVE MODE]' : ''}\n${opts}`;
    });

    return (
      `TRADER'S COMPLETE SEQUENTIAL CHECKLIST & CURRENT STATUS:\n\n` +
      sections.join('\n\n') +
      `\n\nCORE DIRECTIVE: When the trader tells you what they have completed, done, or concluded (or asks what is next), identify their concluded step and verbally tell them the NEXT 3 THINGS on their checklist in sequential order (1, 2, 3).`
    );
  }, [modes, currentMode, selections]);

  // Connect Gemini Live API on mount so voice conversation is always integrated into sequence
  useEffect(() => {
    if (!liveClientRef.current) {
      const client = new GeminiLiveClient();
      liveClientRef.current = client;

      client.onStateChange = (state, details) => {
        setLiveState(state);
        if (details) setLiveStateDetail(details);
        if (state === 'CONNECTED') setLiveError(null);
      };

      client.onAudioLevel = (level) => {
        setLiveAudioLevel(level);
      };

      client.onMessage = (msg) => {
        if (msg.role === 'model') {
          setLiveModelSpeaking(true);
          if (msg.text) {
            setLastModelSpeech(msg.text);
          }
        } else if (msg.role === 'user') {
          // Spoken voice detected: feed directly into plan sequence matcher for visual UI updates
          if (msg.text && msg.text.trim()) {
            setLastUserSpeech(msg.text.trim());
            onSubmitQuery(msg.text.trim(), true);
          }
        }
      };

      client.onInterrupted = () => {
        setLiveModelSpeaking(false);
      };

      client.onError = (err) => {
        setLiveError(err);
      };

      const planContext = getTradingPlanContext();
      client.start(planContext).catch((err) => {
        setLiveError(err?.message || 'Live session note');
      });
    }

    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
    };
  }, [getTradingPlanContext, onSubmitQuery]);

  // Keep live voice session in sync with current checklist state and selections
  useEffect(() => {
    if (liveClientRef.current && liveState === 'CONNECTED') {
      const planContext = getTradingPlanContext();
      liveClientRef.current.sendContext(planContext);
    }
  }, [getTradingPlanContext, liveState]);

  // Sync mic muted state from Settings
  useEffect(() => {
    if (liveClientRef.current) {
      liveClientRef.current.setMicMuted(liveMicMuted);
    }
  }, [liveMicMuted]);

  const handleInterruptLive = () => {
    if (liveClientRef.current) {
      liveClientRef.current.stopOutputPlayback();
      setLiveModelSpeaking(false);
    }
  };

  const dynamicHeight = Math.max(260, 290 + extraHeight);

  // Extract up to 3 upcoming sequential items from the sequence result or pending modes
  const upcomingList: UpcomingItem[] = (() => {
    if (result?.upcomingActions && result.upcomingActions.length > 0) {
      return result.upcomingActions.slice(0, 3);
    }
    if (result?.nextAction && result.nextAction !== 'Tell me what you completed first') {
      return [
        {
          action: result.nextAction,
          mode: result.nextMode,
          itemIndex: result.nextItemIndex,
        },
      ];
    }
    if (modes) {
      const modeKeys = Object.keys(modes);
      const currIdx = currentMode ? modeKeys.indexOf(currentMode) : 0;
      const orderedKeys = [
        ...modeKeys.slice(currIdx >= 0 ? currIdx : 0),
        ...modeKeys.slice(0, currIdx >= 0 ? currIdx : 0),
      ];
      const pending: UpcomingItem[] = [];
      for (const mKey of orderedKeys) {
        const opts = modes[mKey]?.options || [];
        const checked = selections?.[mKey] || [];
        for (let i = 0; i < opts.length; i++) {
          if (!checked.includes(i)) {
            pending.push({
              action: opts[i],
              mode: modes[mKey]?.title || mKey,
              itemIndex: i,
            });
            if (pending.length >= 3) return pending;
          }
        }
      }
      return pending;
    }
    return [];
  })();

  const currentModeOptions = (currentMode && modes?.[currentMode]?.options) || [];
  const checkedCurrentIndices = (currentMode && selections?.[currentMode]) || [];
  const pendingOptions = currentModeOptions
    .map((opt, idx) => ({ text: opt, idx }))
    .filter((o) => !checkedCurrentIndices.includes(o.idx))
    .slice(0, 3);

  return (
    <div
      id="what-next-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        minHeight: `${dynamicHeight}px`,
        boxSizing: 'border-box',
        padding: isEyeMode ? '8px 6px 12px' : '10px 10px 14px',
        position: 'relative',
        userSelect: 'none',
        animation: 'fadeIn 0.25s ease-out',
        gap: '8px',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: PLAN SEQUENCE & LIVE VOICE CONTROLS (NO CHAT OPTION)       */}
      {/* ========================================================================= */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '4px',
          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', textAlign: 'left' }}>
          <AudioSparkIcon size={18} color={accentColor} isAnimated={liveState === 'CONNECTED' || liveModelSpeaking} />
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: isLight ? '#0f172a' : '#f8fafc',
                lineHeight: 1.15,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>PLAN SEQUENCE</span>
              <span
                style={{
                  fontSize: '8.5px',
                  fontWeight: 800,
                  color: accentColor,
                  background: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.15)',
                  padding: '1px 6px',
                  borderRadius: '999px',
                }}
              >
                LIVE VOICE
              </span>
            </div>
          </div>
        </div>

        {/* Live Voice Controls: Stop Audio, Close View (Mic is configured in Settings) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {liveModelSpeaking && (
            <button
              type="button"
              onClick={handleInterruptLive}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                fontSize: '8.5px',
                fontWeight: 800,
                padding: '3px 8px',
                cursor: 'pointer',
                animation: 'pulse 1s infinite',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Interrupt speech"
            >
              ⏹ Stop
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onExitWhatNext}
            style={{
              background: 'transparent',
              border: 'none',
              color: isLight ? '#94a3b8' : '#64748b',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '2px 4px',
              lineHeight: 1,
            }}
            title="Close Plan Sequence"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. NEXT 3 CHECKLIST ACTIONS                                               */}
      {/* ========================================================================= */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          boxSizing: 'border-box',
        }}
      >
        {/* Ordered Upcoming Checklist Cards */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            maxWidth: '460px',
            margin: '0 auto',
          }}
        >
          {upcomingList.length === 0 ? (
            <div
              style={{
                padding: '16px 12px',
                borderRadius: '8px',
                background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: isLight ? '#475569' : '#94a3b8',
              }}
            >
              All checklist actions completed!
            </div>
          ) : (
            upcomingList.map((item, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={`${item.action}-${idx}`}
                  onClick={() => {
                    if (item.mode && onJumpToStep) {
                      onJumpToStep(item.mode, item.itemIndex);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: isFirst ? '9px 12px' : '7px 10px',
                    background: isFirst
                      ? isLight
                        ? 'rgba(2, 132, 199, 0.09)'
                        : 'rgba(56, 189, 248, 0.13)'
                      : isLight
                      ? 'rgba(0, 0, 0, 0.03)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isFirst
                      ? `1.5px solid ${isLight ? 'rgba(2, 132, 199, 0.35)' : 'rgba(56, 189, 248, 0.45)'}`
                      : `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '8px',
                    cursor: item.mode && onJumpToStep ? 'pointer' : 'default',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow:
                      isFirst && !isLight
                        ? `0 0 12px ${accentColor}18`
                        : 'none',
                  }}
                  title={item.mode ? `Click to jump to ${item.mode} in checklist` : undefined}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: isFirst
                        ? accentColor
                        : isLight
                        ? 'rgba(0, 0, 0, 0.1)'
                        : 'rgba(255, 255, 255, 0.12)',
                      color: isFirst ? '#0f172a' : isLight ? '#334155' : '#e2e8f0',
                      fontSize: '11px',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: isFirst ? '13px' : '12px',
                      fontWeight: isFirst ? 800 : 600,
                      color: isLight ? '#0f172a' : '#f8fafc',
                      lineHeight: 1.3,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {item.action}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INTEGRATED LIVE VOICE WAVEFORM & REAL-TIME AUDIO FEEDBACK              */}
      {/* ========================================================================= */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxSizing: 'border-box',
          background: isLight ? 'rgba(0,0,0,0.025)' : 'rgba(0,0,0,0.22)',
          borderRadius: '9px',
          padding: '8px 10px',
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)'}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Animated Waveform Visualizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {[20, 50, 80, 100, 80, 50, 20].map((baseH, bIdx) => {
              const activeScale = liveModelSpeaking
                ? Math.min(1.8, 0.6 + Math.random() * 1.2)
                : Math.min(1.8, 0.3 + (liveAudioLevel / 100) * 1.5);
              return (
                <div
                  key={bIdx}
                  style={{
                    width: '3px',
                    height: `${Math.max(3, (baseH / 100) * 14 * activeScale)}px`,
                    background: liveModelSpeaking ? '#00e676' : accentColor,
                    borderRadius: '2px',
                    transition: 'height 0.08s ease-out',
                  }}
                />
              );
            })}
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: liveModelSpeaking
                  ? '#00e676'
                  : liveMicMuted
                  ? '#ef4444'
                  : liveState === 'ERROR'
                  ? '#f59e0b'
                  : isLight
                  ? '#64748b'
                  : '#94a3b8',
                marginLeft: '5px',
              }}
            >
              {liveModelSpeaking
                ? 'Gemini 3.8 Live Speaking...'
                : liveMicMuted
                ? 'Mic Muted (Settings)'
                : liveState === 'ERROR'
                ? 'Live Voice Offline'
                : 'Listening: Speak what step you completed...'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Reconnect button if live voice session failed */}
            {liveState === 'ERROR' && (
              <button
                type="button"
                onClick={() => {
                  if (liveClientRef.current) {
                    setLiveError(null);
                    setLiveState('CONNECTING');
                    const planContext = getTradingPlanContext();
                    liveClientRef.current.start(planContext).catch(() => {});
                  }
                }}
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
                title="Retry connecting to Gemini Live Voice"
              >
                ↻ Reconnect
              </button>
            )}

            {/* Replay Speech Button */}
            {onReplaySpeech && (result?.spokenSpeech || lastModelSpeech) && (
              <button
                type="button"
                onClick={() => {
                  unlockAudioContext();
                  onReplaySpeech();
                }}
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: accentColor,
                  background: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                🔊 Replay
              </button>
            )}
          </div>
        </div>

        {/* Live Audio Feedback Transcript Subtitle Banner */}
        {(lastModelSpeech || lastUserSpeech || transcript) && (
          <div
            style={{
              fontSize: '10.5px',
              lineHeight: 1.35,
              color: isLight ? '#1e293b' : '#f1f5f9',
              textAlign: 'left',
              padding: '4px 6px',
              borderRadius: '6px',
              background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {lastModelSpeech ? (
              <>
                <span style={{ color: accentColor, fontWeight: 800, fontSize: '9px' }}>COPILOT:</span>
                <span style={{ fontStyle: 'normal' }}>{lastModelSpeech}</span>
              </>
            ) : lastUserSpeech ? (
              <>
                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '9px' }}>HEARD:</span>
                <span style={{ fontStyle: 'italic' }}>"{lastUserSpeech}"</span>
              </>
            ) : transcript ? (
              <>
                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '9px' }}>HEARD:</span>
                <span style={{ fontStyle: 'italic' }}>"{transcript}"</span>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. PRIMARY WHAT NEXT ACTION BUTTON                                        */}
      {/* ========================================================================= */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
        <button
          id="what-next-repeat-btn"
          onClick={() => {
            unlockAudioContext();
            if (result?.matchedAction && result.matchedAction !== 'Awaiting Completed Step') {
              const query = `I completed ${result.matchedAction}`;
              if (liveClientRef.current && liveState === 'CONNECTED') {
                liveClientRef.current.sendText(query);
              }
              onSubmitQuery(query, liveState === 'CONNECTED');
            } else {
              const query = 'next';
              if (liveClientRef.current && liveState === 'CONNECTED') {
                liveClientRef.current.sendText(query);
              }
              onSubmitQuery(query, liveState === 'CONNECTED');
            }
          }}
          title="Advance to next step"
          style={{
            borderRadius: '999px',
            padding: '7px 24px',
            background: isLight
              ? 'linear-gradient(135deg, #0284c7, #0369a1)'
              : 'linear-gradient(135deg, #38bdf8, #0284c7)',
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: `0 3px 14px ${accentColor}66`,
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 900,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AudioSparkIcon size={14} color="#ffffff" isAnimated={true} />
          <span>
            {result?.matchedAction && result.matchedAction !== 'Awaiting Completed Step'
              ? 'NEXT 3 STEPS IN PLAN'
              : 'ADVANCE NEXT STEP'}
          </span>
        </button>
      </div>
    </div>
  );
};
