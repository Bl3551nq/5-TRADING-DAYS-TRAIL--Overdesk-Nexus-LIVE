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
 * Fallback to browser Web Speech API if Gemini AI TTS is unavailable
 */
export function fallbackToWebSpeech(
  cleanText: string,
  options?: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  }
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (options?.onEnd) options.onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate || 1.05;
    utterance.pitch = options?.pitch || 1.0;

    const voices = window.speechSynthesis.getVoices();
    const enVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Alex'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (enVoice) utterance.voice = enVoice;

    utterance.onstart = () => {
      if (options?.onStart) options.onStart();
    };
    utterance.onend = () => {
      if (options?.onEnd) options.onEnd();
    };
    utterance.onerror = () => {
      if (options?.onEnd) options.onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('[Web Speech] Fallback failed:', e);
    if (options?.onEnd) options.onEnd();
  }
}

/**
 * Speaks text aloud using Gemini AI Text-To-Speech (gemini-3.8-flash-lite-tts)
 * with seamless automatic fallback to browser Web Speech API.
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
  const selectedVoice =
    options?.preferredVoiceUri && options.preferredVoiceUri !== 'default'
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
      try {
        await ctx.resume();
      } catch {}
    }

    // Convert base64 to ArrayBuffer
    const binary = atob(data.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    let audioBuffer: AudioBuffer;
    try {
      // Decode audio data using native Web Audio decoder (handles WAV, MP3, etc.)
      audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    } catch {
      // Manual PCM extraction fallback from WAV container (offset 44)
      let offset = 44;
      const dataIndex = binary.indexOf('data');
      if (dataIndex !== -1) {
        offset = dataIndex + 8;
      }
      const pcmBytes = bytes.slice(offset);
      const int16 = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, Math.floor(pcmBytes.byteLength / 2));
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }
      audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
    }

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
    console.warn('[Gemini AI Voice] Falling back to Web Speech Synthesis:', err?.message || err);
    fallbackToWebSpeech(cleanText, options);
  }
}
