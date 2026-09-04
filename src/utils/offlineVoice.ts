/**
 * Offline Voice Assembly Engine
 * Handles microphone capture, Web Audio API analysis for live volume metering,
 * and integrates with the browser's speech recognition engine for accurate keyword detection.
 */

export class OfflineVoiceEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private recognition: any = null;
  private lastTriggerTime = 0;
  private restartTimeout: any = null;

  // Callbacks
  public onCommand: (cmd: 'NEXT' | 'BACK' | 'CALENDAR' | 'CHECKLIST') => void = () => {};
  public onState: (statusMessage: string) => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};

  constructor() {}

  async start() {
    if (this.isRunning) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.3;
        source.connect(this.analyser);
      }

      this.isRunning = true;
      this.onState("Voice active 🎙️");
      this.startMeter();
      this.startSpeechRecognition();
    } catch (err: any) {
      console.error("Microphone init failed:", err);
      this.onState("Microphone access denied.");
      throw err;
    }
  }

  private startMeter = () => {
    if (!this.isRunning || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      if (!this.isRunning || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > peak) peak = dataArray[i];
      }
      const peakPct = Math.min(100, Math.round((peak / 255) * 100));
      this.onAudioLevel(peakPct);

      this.animationFrameId = requestAnimationFrame(tick);
    };
    tick();
  };

  private startSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      if (this.recognition) {
        try { this.recognition.abort(); } catch (e) {}
        this.recognition = null;
      }

      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          for (let alt = 0; alt < res.length; alt++) {
            const raw = (res[alt]?.transcript || '').trim().toLowerCase();
            if (!raw) continue;

            const clean = raw.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ');
            const tokens = clean.split(/\s+/).filter(Boolean);

            let matched: 'NEXT' | 'BACK' | 'CALENDAR' | 'CHECKLIST' | null = null;

            // Accurate, distinct token matching
            if (
              tokens.includes('next') ||
              tokens.includes('forward') ||
              tokens.includes('advance') ||
              tokens.includes('skip') ||
              clean === 'next' ||
              clean.startsWith('next ') ||
              clean.includes('go next')
            ) {
              matched = 'NEXT';
            } else if (
              tokens.includes('back') ||
              tokens.includes('previous') ||
              tokens.includes('prev') ||
              clean === 'back' ||
              clean.startsWith('back ') ||
              clean.includes('go back')
            ) {
              matched = 'BACK';
            } else if (
              tokens.includes('calendar') ||
              tokens.includes('calender') ||
              clean.includes('calendar') ||
              clean.includes('economic calendar') ||
              clean.includes('app 2') ||
              clean.includes('app two')
            ) {
              matched = 'CALENDAR';
            } else if (
              tokens.includes('checklist') ||
              tokens.includes('tasks') ||
              tokens.includes('todo') ||
              tokens.includes('todos') ||
              clean.includes('checklist') ||
              clean.includes('check list') ||
              clean.includes('task list') ||
              clean.includes('app 1') ||
              clean.includes('app one')
            ) {
              matched = 'CHECKLIST';
            }

            if (matched) {
              const now = Date.now();
              if (now - this.lastTriggerTime > 900) {
                this.lastTriggerTime = now;
                this.onCommand(matched);
              }
              return;
            }
          }
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          this.onState("Microphone access denied.");
        }
      };

      rec.onend = () => {
        if (this.isRunning) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isRunning) {
              this.startSpeechRecognition();
            }
          }, 200);
        }
      };

      rec.start();
      this.recognition = rec;
    } catch (e) {
      console.warn("Speech recognition notice:", e);
    }
  };

  stop() {
    this.isRunning = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.onAudioLevel(0);
    this.onState("Voice service stopped.");
  }
}
