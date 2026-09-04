/**
 * Browser-Native Speech Synthesis Engine (src/lib/speechVoice.ts)
 * 
 * Powered exclusively by the browser's native Web Speech API (window.speechSynthesis & SpeechSynthesisUtterance).
 * - Free, unlimited, offline-capable, and zero latency.
 * - Accurate onstart / onend / onerror lifecycle tracking for real speaking status.
 * - Zero external API calls or quota limitations.
 */

export interface UnifiedVoiceOption {
  uri: string;
  name: string;
  lang?: string;
  description?: string;
  isDefault?: boolean;
}

// Built-in presets for immediate fallback before dynamic voices load
export const GEMINI_STUDIO_VOICES: UnifiedVoiceOption[] = [
  { uri: 'default', name: 'System Default Voice', description: 'Browser default speech synthesizer', isDefault: true },
  { uri: 'en-US-Standard', name: 'Natural English (US)', description: 'Clear standard American accent' },
  { uri: 'en-GB-Standard', name: 'Natural English (UK)', description: 'Articulate British accent' },
  { uri: 'en-AU-Standard', name: 'Natural English (AU)', description: 'Australian accent' },
];

let activeUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * Returns available system voices from window.speechSynthesis
 */
export function getAvailableSystemVoices(): UnifiedVoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return GEMINI_STUDIO_VOICES;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return cachedVoices.length > 0 ? formatVoiceList(cachedVoices) : GEMINI_STUDIO_VOICES;
  }

  cachedVoices = voices;
  return formatVoiceList(voices);
}

function formatVoiceList(voices: SpeechSynthesisVoice[]): UnifiedVoiceOption[] {
  // Prioritize English voices first, then others
  const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const otherVoices = voices.filter((v) => !v.lang.toLowerCase().startsWith('en'));
  const sorted = [...englishVoices, ...otherVoices];

  const list = sorted.map((v) => ({
    uri: v.voiceURI || v.name,
    name: v.name,
    lang: v.lang,
    description: `${v.lang}${v.default ? ' — System Default' : ''}`,
    isDefault: v.default,
  }));

  if (list.length === 0) {
    return GEMINI_STUDIO_VOICES;
  }

  return list;
}

// Cache dynamic voices as soon as they become ready
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
}

/**
 * Unlocks / resumes browser speech synthesis on user interaction
 */
export function unlockAudioContext(): void {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
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
 * Cancels any currently playing speech utterance
 */
export function stopCurrentSpeech(): void {
  activeUtterance = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

/**
 * Clean text for high-fidelity speech pronunciation (replacing symbols with words)
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
 * Speaks text aloud using browser native SpeechSynthesis API
 */
export function speakNaturalUtterance(
  text: string,
  options?: {
    preferredVoiceUri?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  }
): void {
  if (!text || !text.trim()) return;

  stopCurrentSpeech();
  unlockAudioContext();

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    const error = new Error('Speech synthesis is not supported by this browser.');
    console.warn(error.message);
    if (options?.onError) options.onError(error);
    return;
  }

  const cleanSpeech = formatTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(cleanSpeech);

  // Keep a global reference to prevent garbage collection bugs during long speech in Chromium
  activeUtterance = utterance;

  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;

  // Resolve selected voice
  const availableVoices = window.speechSynthesis.getVoices();
  if (availableVoices && availableVoices.length > 0) {
    let matchedVoice: SpeechSynthesisVoice | undefined;

    if (options?.preferredVoiceUri && options.preferredVoiceUri !== 'default') {
      matchedVoice = availableVoices.find(
        (v) =>
          v.voiceURI === options.preferredVoiceUri ||
          v.name === options.preferredVoiceUri ||
          v.name.toLowerCase().includes(options.preferredVoiceUri!.toLowerCase())
      );
    }

    // Default to natural English voice if specific voice is not found
    if (!matchedVoice) {
      matchedVoice =
        availableVoices.find((v) => v.default && v.lang.startsWith('en')) ||
        availableVoices.find((v) => v.lang.startsWith('en')) ||
        availableVoices.find((v) => v.default) ||
        availableVoices[0];
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || 'en-US';
    }
  }

  // Real native lifecycle event listeners
  utterance.onstart = () => {
    if (options?.onStart) options.onStart();
  };

  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    if (options?.onEnd) options.onEnd();
  };

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    // Cancelled / interrupted is a normal user interruption (e.g. hitting stop or changing step)
    if (event.error === 'canceled' || event.error === 'interrupted') {
      if (options?.onEnd) options.onEnd();
      return;
    }
    console.warn('SpeechSynthesis error:', event.error);
    if (options?.onError) options.onError(event);
  };

  // Speak via native browser engine
  window.speechSynthesis.speak(utterance);
}
