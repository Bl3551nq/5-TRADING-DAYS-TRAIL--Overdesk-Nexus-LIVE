/**
 * Voice Recognition Engine (src/utils/geminiVoice.ts)
 * 
 * Captures speech locally in the browser using the native Web Speech API
 * (window.SpeechRecognition || window.webkitSpeechRecognition).
 * Transcribed text is fed directly to the application text-matching pipeline
 * without transmitting raw audio to external APIs.
 */

export type VoiceCommand = 'NEXT' | 'BACK' | 'CALENDAR' | 'CHECKLIST' | 'WHAT_NEXT' | 'NONE';

export interface GeminiVoiceResult {
  command: VoiceCommand;
  action?: VoiceCommand;
  heardText?: string;
  source?: 'speech_recognition';
}

export type VoiceState = 'LISTENING' | 'HEARING' | 'PROCESSING' | 'TRIGGERED' | 'OFF' | 'ERROR';

export class GeminiVoiceEngine {
  private recognition: any = null;
  private isRunning = false;
  private isListeningActive = false;
  private restartTimeout: any = null;
  private speechDebounceTimer: any = null;
  private currentPhraseBuffer: string = '';

  // Optional Web Audio analyser for local UI audio level metering
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private lastTriggerTimestamp = 0;

  // Callbacks
  public onCommand: (command: VoiceCommand, heardText?: string) => void = () => {};
  public onAction: (result: GeminiVoiceResult) => void = () => {};
  public onState: (state: VoiceState, message?: string) => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};
  public onTranscript: (transcript: string, isFinal: boolean) => void = () => {};
  public onSpeechPhrase: (phrase: string) => void = () => {};
  public onError: (errorMessage: string, errorType?: string) => void = () => {};

  constructor() {}

  public get running(): boolean {
    return this.isRunning;
  }

  public get isListening(): boolean {
    return this.isListeningActive;
  }

  /**
   * Start local SpeechRecognition and microphone visualizer meter.
   */
  async start(): Promise<boolean> {
    if (this.isRunning) return true;

    const SpeechRecClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecClass) {
      const errorMsg =
        'Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari, or type your update below.';
      this.onState('ERROR', errorMsg);
      this.onError(errorMsg, 'UNSUPPORTED_BROWSER');
      throw new Error(errorMsg);
    }

    this.isRunning = true;

    // 1. Initialize native browser SpeechRecognition immediately
    try {
      this.initSpeechRecognition(SpeechRecClass);
    } catch (err: any) {
      this.isRunning = false;
      this.isListeningActive = false;
      const errorMsg = err?.message || 'Failed to initialize speech recognition.';
      this.onState('ERROR', errorMsg);
      this.onError(errorMsg, 'INIT_ERROR');
      throw err;
    }

    // 2. Optional visual audio meter in background (non-blocking, never delays speech)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !this.stream) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            if (!this.isRunning) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            this.stream = stream;
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              this.audioContext = new AudioCtx();
              const src = this.audioContext.createMediaStreamSource(this.stream);
              this.analyser = this.audioContext.createAnalyser();
              this.analyser.fftSize = 128;
              this.analyser.smoothingTimeConstant = 0.25;
              src.connect(this.analyser);
              this.startAudioMeterLoop();
            }
          })
          .catch(() => {});
      }
    } catch {}

    return true;
  }

  /**
   * Initializes and starts browser SpeechRecognition instance
   */
  private initSpeechRecognition(SpeechRecClass: any) {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    const rec = new SpeechRecClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    // Real native lifecycle handlers for UI state
    rec.onstart = () => {
      this.isListeningActive = true;
      this.onState('LISTENING', 'Microphone active — Listening...');
    };

    rec.onaudiostart = () => {
      this.isListeningActive = true;
      this.onState('HEARING', 'Detecting audio...');
    };

    rec.onspeechstart = () => {
      this.isListeningActive = true;
      this.onState('HEARING', 'Hearing speech...');
    };

    rec.onspeechend = () => {
      if (this.isRunning) {
        this.onState('LISTENING', 'Microphone active — Listening...');
      }
    };

    rec.onaudioend = () => {
      if (this.isRunning) {
        this.onState('LISTENING', 'Microphone active — Listening...');
      }
    };

    rec.onresult = (event: any) => {
      let interimText = '';
      let finalizedText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcriptPart = (res[0]?.transcript || '').trim();
        if (res.isFinal) {
          finalizedText += (finalizedText ? ' ' : '') + transcriptPart;
        } else {
          interimText += (interimText ? ' ' : '') + transcriptPart;
        }
      }

      const activeText = (finalizedText || interimText).trim();
      if (!activeText) return;

      this.currentPhraseBuffer = activeText;
      this.onTranscript(activeText, !!finalizedText);

      // Check for instant shortcut navigation commands (with punctuation removed)
      const cleanLower = activeText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
      const cleanWords = cleanLower.split(/\s+/).filter(Boolean);

      const isInstantNext =
        cleanLower === 'next' ||
        cleanLower === 'nex' ||
        cleanLower === 'neck' ||
        cleanLower === 'necks' ||
        cleanWords.includes('next') ||
        cleanWords.includes('nex') ||
        cleanWords.includes('neck') ||
        cleanWords.includes('necks') ||
        cleanWords.includes('mark') ||
        cleanWords.includes('check') ||
        cleanWords.includes('checked') ||
        cleanWords.includes('done') ||
        cleanLower.startsWith('next ') ||
        cleanLower.endsWith(' next') ||
        cleanLower === 'mark next' ||
        cleanLower === 'check next' ||
        cleanLower === 'next step' ||
        cleanLower === 'next item' ||
        cleanLower === 'next one' ||
        cleanLower === 'next please' ||
        cleanLower === 'advance';

      const isInstantOther =
        cleanLower === 'back' ||
        cleanWords.includes('back') ||
        cleanLower === 'calendar' ||
        cleanWords.includes('calendar') ||
        cleanLower === 'checklist' ||
        cleanWords.includes('checklist') ||
        cleanLower.includes('what next') ||
        cleanLower.includes("what's next") ||
        cleanLower.includes('whats next');

      if (isInstantNext || isInstantOther) {
        if (this.speechDebounceTimer) clearTimeout(this.speechDebounceTimer);
        this.handleTranscribedPhrase(activeText);
        return;
      }

      // If final transcript is delivered by the browser
      if (finalizedText) {
        if (this.speechDebounceTimer) clearTimeout(this.speechDebounceTimer);
        this.speechDebounceTimer = setTimeout(() => {
          this.handleTranscribedPhrase(finalizedText);
        }, 80);
        return;
      }

      // Debounce interim multi-word speech if the user pauses
      if (this.speechDebounceTimer) clearTimeout(this.speechDebounceTimer);
      this.speechDebounceTimer = setTimeout(() => {
        if (this.currentPhraseBuffer) {
          const phraseToProcess = this.currentPhraseBuffer;
          this.handleTranscribedPhrase(phraseToProcess);
        }
      }, 500);
    };

    rec.onerror = (event: any) => {
      const errorType = event.error || 'unknown';
      console.warn('Browser SpeechRecognition event error:', errorType);

      if (errorType === 'no-speech' || errorType === 'aborted') {
        // Normal benign idle event, don't show error to user
        return;
      }

      let userFriendlyMessage = 'Speech recognition encountered an issue.';

      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        userFriendlyMessage =
          'Microphone permission denied. Please allow microphone access in your browser address bar.';
      } else if (errorType === 'audio-capture') {
        userFriendlyMessage =
          'No microphone was detected. Please verify your microphone is plugged in and not in use by another program.';
      } else if (errorType === 'network') {
        userFriendlyMessage =
          'Speech recognition network service error. Please check your internet connection.';
      }

      this.isListeningActive = false;
      this.onState('ERROR', userFriendlyMessage);
      this.onError(userFriendlyMessage, errorType);
    };

    rec.onend = () => {
      this.isListeningActive = false;
      // If user has not stopped the engine, auto-restart continuous listening
      if (this.isRunning) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.isRunning) {
            try {
              this.initSpeechRecognition(SpeechRecClass);
            } catch (err) {
              console.debug('Recognition restart note:', err);
            }
          }
        }, 150);
      } else {
        this.onState('OFF', 'Microphone standby');
      }
    };

    try {
      rec.start();
      this.recognition = rec;
    } catch (e) {
      console.warn('Recognition start warning:', e);
    }
  }

  /**
   * Evaluates transcribed speech phrase: classifies shortcut commands or forwards
   * natural speech directly to the matching function.
   */
  private handleTranscribedPhrase(phrase: string) {
    const cleanPhrase = phrase.trim();
    if (!cleanPhrase) return;

    const lower = cleanPhrase.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ').trim();
    const words = lower.split(/\s+/).filter(Boolean);

    let command: VoiceCommand = 'NONE';

    if (
      lower.includes('what next') ||
      lower.includes("what's next") ||
      lower.includes('whats next') ||
      lower.includes('what is next') ||
      lower.includes('what to do next') ||
      lower.includes('what should i do next')
    ) {
      command = 'WHAT_NEXT';
    } else if (
      words.includes('next') ||
      words.includes('nex') ||
      words.includes('neck') ||
      words.includes('necks') ||
      words.includes('forward') ||
      words.includes('advance') ||
      words.includes('skip') ||
      words.includes('mark') ||
      words.includes('check') ||
      words.includes('checked') ||
      words.includes('done') ||
      lower.includes('next') ||
      lower.includes('go next') ||
      lower.includes('next one') ||
      lower.includes('next item') ||
      lower.includes('next step') ||
      lower.includes('next task')
    ) {
      command = 'NEXT';
    } else if (
      words.includes('back') ||
      words.includes('previous') ||
      words.includes('prev') ||
      lower.includes('back') ||
      lower.includes('go back') ||
      lower.includes('last task')
    ) {
      command = 'BACK';
    } else if (
      words.includes('calendar') ||
      words.includes('calender') ||
      lower.includes('calendar') ||
      lower.includes('economic calendar') ||
      lower.includes('app 2') ||
      lower.includes('app two') ||
      lower.includes('events')
    ) {
      command = 'CALENDAR';
    } else if (
      words.includes('checklist') ||
      words.includes('tasks') ||
      words.includes('todo') ||
      words.includes('todos') ||
      lower.includes('checklist') ||
      lower.includes('task list') ||
      lower.includes('app 1') ||
      lower.includes('app one')
    ) {
      command = 'CHECKLIST';
    }

    if (command !== 'NONE') {
      this.dispatchCommand(command, cleanPhrase);
    } else {
      // Natural speech update (e.g., "Marked support zone at 18200") -> forward to speech handler
      this.onSpeechPhrase(cleanPhrase);
    }
  }

  /**
   * Dispatches navigation command with debounce
   */
  private dispatchCommand(command: VoiceCommand, heardText: string) {
    const now = Date.now();
    if (now - this.lastTriggerTimestamp < 350) {
      return; // Debounce duplicate triggers within 350ms
    }
    this.lastTriggerTimestamp = now;

    this.onState('TRIGGERED', `Recognized: "${command}"`);
    this.onAction({
      command,
      action: command,
      heardText,
      source: 'speech_recognition',
    });

    setTimeout(() => {
      if (this.isRunning && this.isListeningActive) {
        this.onState('LISTENING', 'Microphone active — Listening...');
      }
    }, 450);
  }

  /**
   * Visual meter loop for audio energy feedback in the UI
   */
  private startAudioMeterLoop() {
    if (!this.analyser) return;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);

    const checkFrame = () => {
      if (!this.isRunning || !this.analyser || !this.stream?.active) return;

      this.analyser.getByteFrequencyData(buffer);
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] > peak) peak = buffer[i];
      }

      const peakPct = Math.min(100, Math.round((peak / 255) * 100));
      this.onAudioLevel(peakPct);

      this.animFrameId = requestAnimationFrame(checkFrame);
    };

    checkFrame();
  }

  /**
   * Stop speech recognition and release microphone resources
   */
  stop() {
    this.isRunning = false;
    this.isListeningActive = false;

    if (this.speechDebounceTimer) {
      clearTimeout(this.speechDebounceTimer);
      this.speechDebounceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.onAudioLevel(0);
    this.onState('OFF', 'Microphone standby');
  }
}
