/**
 * Gemini AI Speech Synthesis Engine (src/lib/speechVoice.ts)
 * 
 * Powered by Google Gemini AI Speech API (gemini-3.8-flash-lite-tts & gemini-3.8-live)
 * - Authentic, high-fidelity AI voice personas (Zephyr, Kore, Puck, Fenrir, Charon).
 * - Plays raw 24kHz 16-bit PCM audio stream with zero robotic browser artifacts.
 * - Accurate onStart / onEnd / onError lifecycle tracking for speaking status visualizers.
 */

export interface UnifiedVoiceOption {
  uri: string;
  name: string;
  lang?: string;
  description?: string;
  isDefault?: boolean;
}

// Authentic Google Gemini AI Voices
export const GEMINI_AI_VOICES: UnifiedVoiceOption[] = [
  { uri: 'Zephyr', name: 'Zephyr (Gemini AI)', description: 'Confident, dynamic, disciplined trader voice', isDefault: true },
  { uri: 'Kore', name: 'Kore (Gemini AI)', description: 'Calm, articulate, warm analytical focus' },
  { uri: 'Puck', name: 'Puck (Gemini AI)', description: 'Energetic, decisive, upbeat market momentum' },
  { uri: 'Fenrir', name: 'Fenrir (Gemini AI)', description: 'Deep, authoritative, structured discipline' },
  { uri: 'Charon', name: 'Charon (Gemini AI)', description: 'Steady, grounded, patient risk manager' },
];

let globalAudioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let activeAbortController: AbortController | null = null;

function getAudioContext(): AudioContext {
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    globalAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
  }
  return globalAudioCtx;
}

/**
 * Returns available Gemini AI voice personas
 */
export function getAvailableSystemVoices(): UnifiedVoiceOption[] {
  return GEMINI_AI_VOICES;
}

/**
 * Unlocks / resumes Web Audio context on user interaction
 */
export function unlockAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (e) {}
}

// Automatically resume on user gestures
if (typeof window !== 'undefined') {
  const gestureEvents = ['click', 'keydown', 'touchstart', 'pointerdown'];
  const handleUserGesture = () => {
    unlockAudioContext();
  };
  gestureEvents.forEach((ev) => {
    window.addEventListener(ev, handleUserGesture, { passive: true });
  });
}

/**
 * Cancels any currently playing Gemini AI speech
 */
export function stopCurrentSpeech(): void {
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch (e) {}
    activeAbortController = null;
  }

  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch (e) {}
    currentSourceNode = null;
  }
}

/**
 * Formats text for high-fidelity speech pronunciation
 */
export function formatTextForSpeech(text: string): string {
  return text
    .replace(/\?/g, ' ')
    .replace(/1min\/5min/gi, '1 minute and 5 minute')
    .replace(/15min\/1hr/gi, '15 minute and 1 hour')
    .replace(/4hr\/Daily/gi, '4 hour and Daily')
    .replace(/R:R/gi, 'Risk to reward')
    .replace(/SL & TP|SL\/TP/gi, 'Stop Loss and Take Profit')
    .replace(/PnL/gi, 'Profit and Loss')
    .replace(/BOS \/ CHoCH|BOS\/CHoCH/gi, 'Break of structure and change of character')
    .replace(/\//g, ' and ')
    .replace(/->|→/g, ' then ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts Base64 PCM 16-bit little-endian audio to Float32Array for Web Audio playback
 */
function base64PcmToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

/**
 * Speaks text aloud using Gemini AI Text-To-Speech (gemini-3.8-flash-lite-tts)
 */
export async function speakNaturalUtterance(
  text: string,
  options?: {
    preferredVoiceUri?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  }
): Promise<void> {
  if (!text || !text.trim()) return;

  stopCurrentSpeech();
  unlockAudioContext();

  const cleanText = formatTextForSpeech(text);
  const selectedVoice = options?.preferredVoiceUri && options.preferredVoiceUri !== 'default'
    ? options.preferredVoiceUri
    : 'Zephyr';

  const abortController = new AbortController();
  activeAbortController = abortController;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voiceName: selectedVoice,
        style: 'Confident, clear, disciplined financial trading copilot',
      }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      throw new Error(`Gemini AI voice API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.audio) {
      throw new Error('No audio returned by Gemini AI voice API');
    }

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const float32Data = base64PcmToFloat32(data.audio);
    if (float32Data.length === 0) {
      if (options?.onEnd) options.onEnd();
      return;
    }

    const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.copyToChannel(float32Data, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    currentSourceNode = source;

    source.onended = () => {
      if (currentSourceNode === source) {
        currentSourceNode = null;
      }
      activeAbortController = null;
      if (options?.onEnd) options.onEnd();
    };

    if (options?.onStart) options.onStart();
    source.start(0);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return;
    }
    console.warn('[Gemini AI Voice] Playback note:', err?.message || err);
    if (options?.onError) options.onError(err);
  }
}
