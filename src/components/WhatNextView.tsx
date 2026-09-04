import React, { useState, useEffect, useRef } from 'react';
import { unlockAudioContext } from '../lib/speechVoice';

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
  accentColor?: string;
  extraHeight?: number;
  onAskWhatNext: () => void;
  onSubmitQuery: (text: string) => void;
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
  accentColor = '#38bdf8',
  extraHeight = 0,
  onAskWhatNext,
  onSubmitQuery,
  onExitWhatNext,
  onJumpToStep,
  onReplaySpeech,
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input if phase is LISTENING
  useEffect(() => {
    if (phase === 'LISTENING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    unlockAudioContext();
    if (inputText.trim()) {
      onSubmitQuery(inputText.trim());
      setInputText('');
    }
  };

  const dynamicHeight = Math.max(360, 380 + extraHeight);

  // Extract up to 3 upcoming sequential items from the result
  const upcomingList: UpcomingItem[] =
    result?.upcomingActions && result.upcomingActions.length > 0
      ? result.upcomingActions
      : result?.nextAction
      ? [
          {
            action: result.nextAction,
            mode: result.nextMode,
            itemIndex: result.nextItemIndex,
          },
        ]
      : [];

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
        padding: isEyeMode ? '8px 6px 14px' : '10px 12px 16px',
        position: 'relative',
        userSelect: 'none',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {/* Top Status & Speaking Indicator */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '4px',
          minHeight: '22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '9.5px',
              letterSpacing: '0.12em',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: accentColor,
                display: 'inline-block',
                boxShadow: `0 0 8px ${accentColor}`,
                animation: phase === 'LISTENING' ? 'pulse 1.2s infinite' : 'none',
              }}
            />
            {phase === 'LISTENING'
              ? 'LISTENING...'
              : phase === 'ANALYZING'
              ? 'ANALYZING...'
              : phase === 'RESULT'
              ? 'SEQUENCE RESOLVED'
              : 'VOICE COPILOT READY'}
          </span>
        </div>

        {voiceIsListening && (
          <span
            style={{
              fontSize: '8.5px',
              fontWeight: 700,
              color: '#00e676',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              opacity: 0.85,
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#00e676',
                animation: 'pulse 1.5s infinite',
              }}
            />
            Mic Active
          </span>
        )}
      </div>

      {/* Main Center Content Body */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 4px',
          gap: '10px',
          textAlign: 'center',
        }}
      >
        {/* Prominent "WHAT NEXT?" Text Header - Only shown before resolution */}
        {phase !== 'RESULT' && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h1
              id="what-next-title"
              style={{
                fontSize: '34px',
                fontWeight: 900,
                letterSpacing: '0.04em',
                lineHeight: 1.1,
                margin: 0,
                color: isLight ? '#0f172a' : '#f8fafc',
                textShadow: isLight
                  ? '0 2px 8px rgba(0,0,0,0.06)'
                  : `0 0 24px ${accentColor}44, 0 2px 8px rgba(0,0,0,0.8)`,
              }}
            >
              WHAT NEXT?
            </h1>
          </div>
        )}

        {/* Phase: LISTENING or PROMPT */}
        {(phase === 'LISTENING' || phase === 'PROMPT') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              maxWidth: '380px',
            }}
          >
            {/* Glowing audio visualizer / interactive mic wave button */}
            <button
              type="button"
              onClick={() => {
                unlockAudioContext();
                onAskWhatNext();
              }}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: voiceIsListening
                  ? (isLight ? 'rgba(56, 189, 248, 0.18)' : 'rgba(56, 189, 248, 0.25)')
                  : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'),
                border: `2.5px solid ${voiceIsListening ? accentColor : (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: voiceIsListening
                  ? `0 0 ${Math.max(16, micAudioLevel * 0.5)}px ${accentColor}aa`
                  : 'none',
                transform: `scale(${1 + Math.min(0.22, (micAudioLevel / 100) * 0.35)})`,
                transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out, background 0.2s ease',
                position: 'relative',
                cursor: 'pointer',
                outline: 'none',
              }}
              title={voiceIsListening ? "Mic is listening... Tap to restart voice capture" : "Tap to activate Microphone"}
            >
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke={voiceIsListening ? accentColor : (isLight ? '#475569' : '#cbd5e1')}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: voiceIsListening ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#64748b' : '#94a3b8'),
                  letterSpacing: '0.02em',
                }}
              >
                {voiceIsListening ? '🎙️ Mic Active — Speak anytime or type below' : '🎙️ Tap Mic to Enable Voice Listening'}
              </span>
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: 1.45,
                  color: isLight ? 'rgba(15, 23, 42, 0.75)' : 'rgba(241, 245, 249, 0.8)',
                  margin: 0,
                  maxWidth: '320px',
                  fontWeight: 500,
                }}
              >
                Say what you just concluded in your trading plan, and the next 3 sequential checklist steps will appear.
              </p>
            </div>

            {/* Interim live speech transcript preview */}
            {transcript && (
              <div
                style={{
                  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${accentColor}55`,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontStyle: 'italic',
                  color: isLight ? '#0369a1' : '#7dd3fc',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  animation: 'fadeIn 0.15s ease-in-out',
                }}
              >
                🎙️ "{transcript}"
              </div>
            )}

            {/* Quick text input form */}
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                width: '100%',
                maxWidth: '320px',
                gap: '6px',
                marginTop: '4px',
                position: 'relative',
                zIndex: 10,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. 'Marked key zones' or 'Placed order'..."
                style={{
                  flex: 1,
                  background: isLight ? '#ffffff' : '#0f172a',
                  border: `1.5px solid ${isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.25)'}`,
                  borderRadius: '8px',
                  padding: '7px 11px',
                  fontSize: '11.5px',
                  color: isLight ? '#0f172a' : '#f8fafc',
                  outline: 'none',
                  boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.4)',
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                style={{
                  background: inputText.trim()
                    ? (isLight ? '#0284c7' : '#38bdf8')
                    : (isLight ? '#cbd5e1' : '#334155'),
                  color: inputText.trim()
                    ? '#ffffff'
                    : (isLight ? '#64748b' : '#94a3b8'),
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 14px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: inputText.trim() ? 'pointer' : 'default',
                  opacity: 1,
                  boxShadow: inputText.trim()
                    ? '0 2px 8px rgba(2, 132, 199, 0.4)'
                    : '0 2px 4px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  zIndex: 20,
                  whiteSpace: 'nowrap',
                }}
              >
                Send →
              </button>
            </form>
          </div>
        )}

        {/* Phase: ANALYZING */}
        {phase === 'ANALYZING' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              maxWidth: '340px',
              padding: '12px 0',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: `3px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                borderTopColor: accentColor,
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div>
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  margin: '0 0 4px 0',
                  color: isLight ? '#0f172a' : '#f8fafc',
                  letterSpacing: '0.04em',
                }}
              >
                FINDING UPCOMING ACTIONS...
              </h3>
              <p
                style={{
                  fontSize: '11.5px',
                  color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
                  margin: 0,
                }}
              >
                Scanning checklist sequence for next 3 actions...
              </p>
            </div>
          </div>
        )}

        {/* Phase: RESULT */}
        {phase === 'RESULT' && result && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              flex: 1,
              padding: '4px 2px',
              boxSizing: 'border-box',
              textAlign: 'center',
              animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Concluded step indicator */}
            <div
              style={{
                width: 'auto',
                maxWidth: '96%',
                background: isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 78, 59, 0.65)',
                backdropFilter: 'blur(8px)',
                borderRadius: '7px',
                padding: '5px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 800,
                color: isLight ? '#047857' : '#34d399',
                textAlign: 'center',
                boxSizing: 'border-box',
                border: isLight ? '1px solid rgba(16, 185, 129, 0.32)' : '1px solid rgba(52, 211, 153, 0.36)',
                boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.05)' : '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', letterSpacing: '0.04em' }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                CONCLUDED:
              </span>
              <span style={{ fontWeight: 700, color: isLight ? '#065f46' : '#a7f3d0' }}>
                {result.matchedAction}
              </span>
            </div>

            {/* Upcoming Sequence Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  letterSpacing: '0.14em',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: accentColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textShadow: `0 0 14px ${accentColor}55`,
                }}
              >
                NEXT UP ({upcomingList.length} {upcomingList.length === 1 ? 'STEP' : 'STEPS'} IN SEQUENCE)
              </span>

              {isSpeaking && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    color: '#00e676',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    animation: 'pulse 1.2s infinite',
                  }}
                >
                  🔊 SPEAKING...
                </span>
              )}
            </div>

            {/* Ordered Upcoming Items (N+1, N+2, N+3) */}
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
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isLight ? '#059669' : '#34d399',
                  }}
                >
                  🎉 Checklist Complete! All sequential trading actions concluded.
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
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: isFirst ? '9px 12px' : '7px 11px',
                        background: isFirst
                          ? isLight
                            ? 'rgba(2, 132, 199, 0.08)'
                            : 'rgba(56, 189, 248, 0.12)'
                          : isLight
                          ? 'rgba(0, 0, 0, 0.03)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isFirst
                          ? `1.5px solid ${isLight ? 'rgba(2, 132, 199, 0.35)' : 'rgba(56, 189, 248, 0.4)'}`
                          : `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '9px',
                        boxShadow: isFirst
                          ? isLight
                            ? '0 2px 8px rgba(2, 132, 199, 0.1)'
                            : '0 3px 12px rgba(0, 0, 0, 0.4)'
                          : 'none',
                        cursor: item.mode && onJumpToStep ? 'pointer' : 'default',
                        transition: 'transform 0.12s ease, background 0.12s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (item.mode && onJumpToStep) {
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (item.mode && onJumpToStep) {
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      {/* Left Number Badge & Action Text */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            width: isFirst ? '22px' : '19px',
                            height: isFirst ? '22px' : '19px',
                            borderRadius: '50%',
                            background: isFirst
                              ? accentColor
                              : isLight
                              ? 'rgba(0, 0, 0, 0.12)'
                              : 'rgba(255, 255, 255, 0.14)',
                            color: isFirst
                              ? '#0f172a'
                              : isLight
                              ? '#334155'
                              : '#e2e8f0',
                            fontSize: isFirst ? '11px' : '10px',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: isFirst ? `0 0 8px ${accentColor}88` : 'none',
                          }}
                        >
                          {idx + 1}
                        </span>

                        <span
                          style={{
                            fontSize: isFirst ? '14px' : '12.5px',
                            fontWeight: isFirst ? 800 : 600,
                            color: isLight ? '#0f172a' : '#f8fafc',
                            lineHeight: 1.25,
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.action}
                        </span>
                      </div>

                      {/* Right Category Pill (shows crossed category boundary smoothly) */}
                      {item.mode && (
                        <div
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: isFirst
                              ? isLight
                                ? '#0369a1'
                                : '#38bdf8'
                              : isLight
                              ? '#64748b'
                              : '#94a3b8',
                            background: isFirst
                              ? isLight
                                ? 'rgba(2, 132, 199, 0.12)'
                                : 'rgba(56, 189, 248, 0.18)'
                              : isLight
                              ? 'rgba(0, 0, 0, 0.05)'
                              : 'rgba(255, 255, 255, 0.06)',
                            border: `1px solid ${
                              isFirst
                                ? isLight
                                  ? 'rgba(2, 132, 199, 0.25)'
                                  : 'rgba(56, 189, 248, 0.3)'
                                : isLight
                                ? 'rgba(0, 0, 0, 0.08)'
                                : 'rgba(255, 255, 255, 0.1)'
                            }`,
                            borderRadius: '999px',
                            padding: '3px 8px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                          title={`Category: ${item.mode}`}
                        >
                          {item.mode}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Replay Voice Button */}
            {onReplaySpeech && (
              <div style={{ marginTop: '4px' }}>
                <button
                  onClick={() => {
                    unlockAudioContext();
                    onReplaySpeech();
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isLight ? '#0284c7' : '#38bdf8',
                    background: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.14)',
                    border: `1.5px solid ${isLight ? 'rgba(2, 132, 199, 0.25)' : 'rgba(56, 189, 248, 0.35)'}`,
                    borderRadius: '999px',
                    padding: '4px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.05)' : '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Replay Spoken Actions"
                >
                  <span>🔊</span>
                  <span>Replay Voice</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase: ERROR */}
        {phase === 'ERROR' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              maxWidth: '320px',
            }}
          >
            <div style={{ fontSize: '24px' }}>⚠️</div>
            <div
              style={{
                fontSize: '12px',
                color: '#ef4444',
                fontWeight: 600,
              }}
            >
              {error || 'Unable to process question. Please try again.'}
            </div>
            <button
              onClick={onAskWhatNext}
              style={{
                background: accentColor,
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Ask "WHAT NEXT?" Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom Dedicated "WHAT NEXT?" Button */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: '6px',
        }}
      >
        <button
          id="what-next-repeat-btn"
          onClick={onAskWhatNext}
          title="Click to ask WHAT NEXT?"
          style={{
            borderRadius: '999px',
            padding: '9px 28px',
            background: isLight
              ? 'linear-gradient(135deg, #0284c7, #0369a1)'
              : 'linear-gradient(135deg, #38bdf8, #0284c7)',
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: `0 4px 18px ${accentColor}66, 0 2px 6px rgba(0,0,0,0.3)`,
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 900,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.96)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.06)';
          }}
        >
          <span>WHAT NEXT?</span>
        </button>
      </div>
    </div>
  );
};
