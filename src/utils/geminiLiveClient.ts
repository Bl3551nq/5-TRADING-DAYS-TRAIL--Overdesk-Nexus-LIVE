/**
 * Gemini Live API Client (src/utils/geminiLiveClient.ts)
 * 
 * Manages low-latency real-time bidirectional voice conversations with Gemini 3.8 Live API
 * via WebSocket connection to /live.
 * - Streams 16kHz 16-bit PCM mic input from the user to the server.
 * - Receives 24kHz 16-bit PCM model audio and provides gapless, jitter-buffered playback.
 * - Supports instant model interruption, live transcription, and context passing.
 */

export interface LiveMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type LiveConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private nextPlayStartTime = 0;
  private activeAudioSources: AudioBufferSourceNode[] = [];

  private isConnected = false;
  private isMicMuted = false;
  private isModelSpeaking = false;
  private currentAudioLevel = 0;
  private animFrameId: number | null = null;

  // Callbacks
  public onStateChange: (state: LiveConnectionState, details?: string) => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};
  public onMessage: (msg: LiveMessage) => void = () => {};
  public onInterrupted: () => void = () => {};
  public onError: (err: string) => void = () => {};

  public get connected(): boolean {
    return this.isConnected;
  }

  public get modelSpeaking(): boolean {
    return this.isModelSpeaking;
  }

  public get micMuted(): boolean {
    return this.isMicMuted;
  }

  /**
   * Sends or refreshes the trading checklist context to the active Gemini Live session
   */
  public sendContext(contextText: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && contextText) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'context',
            context: contextText,
          })
        );
        return true;
      } catch (e) {
        console.warn('[GeminiLiveClient] Failed to send context:', e);
      }
    }
    return false;
  }

  /**
   * Connect to /live (or /api/live fallback) WebSocket and initialize audio pipelines.
   */
  async start(planContext?: string, isFallback: boolean = false): Promise<boolean> {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (planContext) this.sendContext(planContext);
      return true;
    }

    this.onStateChange('CONNECTING', 'Connecting to Gemini 3.8 Live API...');

    return new Promise<boolean>((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Keep WebSocket URL clean. Never put multi-kilobyte context in query strings
        // as HTTP proxies (Cloud Run / Envoy / GFE) reject long URLs during upgrade handshake.
        const endpoint = isFallback ? '/api/live' : '/live';
        const wsUrl = `${protocol}//${window.location.host}${endpoint}`;
        
        console.log(`[GeminiLiveClient] Connecting to WebSocket at: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        let resolved = false;

        this.ws.onopen = async () => {
          console.log('[GeminiLiveClient] WebSocket opened successfully');
          // Send context as a message frame now that the socket is connected
          if (planContext) {
            this.sendContext(planContext);
          }

          // Always initialize output audio so the AI can speak back immediately
          try {
            this.initOutputAudio();
          } catch (outErr) {
            console.warn('[GeminiLiveClient] Output audio init note:', outErr);
          }

          // Attempt microphone capture. If permission not granted or absent, keep connection alive!
          try {
            await this.initMicrophone();
            this.isConnected = true;
            this.onStateChange('CONNECTED', 'Gemini 3.8 Live Ready');
          } catch (micErr: any) {
            console.warn('[GeminiLiveClient] Microphone capture disabled/pending (output voice active):', micErr?.message || micErr);
            this.isConnected = true;
            this.onStateChange('CONNECTED', 'Voice Copilot Active (Mic pending permission)');
          }

          if (!resolved) {
            resolved = true;
            resolve(true);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'ready') {
              this.onStateChange('CONNECTED', data.message || 'Live session active');
            } else if (data.type === 'audio' && data.audio) {
              this.isModelSpeaking = true;
              this.playAudioChunk(data.audio);
            } else if (data.type === 'text' && data.text) {
              this.onMessage({
                id: `model-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'model',
                text: data.text,
                timestamp: Date.now(),
              });
            } else if (data.type === 'user_transcript' && data.text) {
              this.onMessage({
                id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'user',
                text: data.text,
                timestamp: Date.now(),
              });
            } else if (data.type === 'interrupted') {
              console.log('[GeminiLiveClient] Model interrupted');
              this.stopOutputPlayback();
              this.isModelSpeaking = false;
              this.onInterrupted();
            } else if (data.type === 'turn_complete') {
              this.isModelSpeaking = false;
            } else if (data.type === 'error') {
              console.warn('[GeminiLiveClient] Server error:', data.message);
              this.onError(data.message || 'Live session error');
            }
          } catch (e) {
            console.warn('[GeminiLiveClient] Parse message error:', e);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('[GeminiLiveClient] WebSocket connection event:', err);
          if (!isFallback && !this.isConnected) {
            console.log('[GeminiLiveClient] Retrying connection via /api/live endpoint...');
            this.cleanup();
            this.start(planContext, true).then(resolve).catch(reject);
            return;
          }
          this.onStateChange('ERROR', 'Live connection offline');
          this.onError('Live voice connection unavailable. Tap to retry.');
          if (!resolved) {
            resolved = true;
            reject(new Error('WebSocket connection failed'));
          }
        };

        this.ws.onclose = () => {
          console.log('[GeminiLiveClient] WebSocket closed');
          const wasConnected = this.isConnected;
          this.cleanup();
          if (wasConnected) {
            this.onStateChange('DISCONNECTED', 'Session ended');
          }
        };
      } catch (err: any) {
        this.cleanup();
        this.onStateChange('ERROR', err?.message || 'Connection failed');
        reject(err);
      }
    });
  }

  /**
   * Initializes 16kHz microphone stream and ScriptProcessor for PCM streaming.
   */
  private async initMicrophone() {
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioCtx = new AudioContextClass();
    if (this.inputAudioCtx.state === 'suspended') {
      await this.inputAudioCtx.resume();
    }

    const inputSampleRate = this.inputAudioCtx.sampleRate;
    this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.micStream);

    // Buffer size 2048 gives ~46ms packets at 44.1kHz
    this.processorNode = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isConnected || this.isMicMuted || this.ws?.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate audio meter level
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);
      const level = Math.min(100, Math.round(rms * 280));
      this.currentAudioLevel = level;
      this.onAudioLevel(level);

      // Downsample to 16000 Hz if necessary
      const downsampled = this.downsampleTo16k(inputData, inputSampleRate, 16000);
      const pcm16 = this.floatTo16BitPCM(downsampled);
      const base64 = this.arrayBufferToBase64(pcm16);

      this.ws.send(
        JSON.stringify({
          audio: base64,
        })
      );
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.inputAudioCtx.destination);
  }

  /**
   * Initializes 24kHz AudioContext for model speech output playback.
   */
  private initOutputAudio() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
    this.nextPlayStartTime = this.outputAudioCtx.currentTime;
  }

  /**
   * Gapless chunk playback for 24kHz 16-bit PCM little-endian.
   */
  private playAudioChunk(base64Data: string) {
    if (!this.outputAudioCtx) return;

    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume();
    }

    try {
      const float32 = this.base64PcmToFloat32(base64Data);
      if (float32.length === 0) return;

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioCtx.destination);

      const now = this.outputAudioCtx.currentTime;
      // Add a tiny jitter buffer (10ms) if scheduling in the past
      const startTime = Math.max(now + 0.01, this.nextPlayStartTime);
      source.start(startTime);
      this.nextPlayStartTime = startTime + audioBuffer.duration;

      this.activeAudioSources.push(source);
      source.onended = () => {
        const idx = this.activeAudioSources.indexOf(source);
        if (idx !== -1) {
          this.activeAudioSources.splice(idx, 1);
        }
        if (this.activeAudioSources.length === 0) {
          this.isModelSpeaking = false;
        }
      };
    } catch (err) {
      console.warn('[GeminiLiveClient] Playback error:', err);
    }
  }

  /**
   * Stops any currently playing audio and clears queue immediately (interrupt response).
   */
  public stopOutputPlayback() {
    for (const src of this.activeAudioSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeAudioSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayStartTime = this.outputAudioCtx.currentTime;
    }
    this.isModelSpeaking = false;
  }

  /**
   * Send a direct text message to the live conversation session.
   */
  public sendText(text: string) {
    if (!text || !text.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const trimmed = text.trim();
    this.onMessage({
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    });

    this.ws.send(
      JSON.stringify({
        text: trimmed,
      })
    );
  }

  /**
   * Mute or unmute mic streaming.
   */
  public setMicMuted(muted: boolean) {
    this.isMicMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Disconnects WebSocket and releases audio hardware.
   */
  public disconnect() {
    if (this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: 'close' }));
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.cleanup();
  }

  private cleanup() {
    this.isConnected = false;
    this.isModelSpeaking = false;
    this.stopOutputPlayback();

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }
  }

  // --- Audio Conversion Helpers ---

  private downsampleTo16k(buffer: Float32Array, inputRate: number, outputRate = 16000): Float32Array {
    if (inputRate === outputRate) return buffer;
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64PcmToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const dataView = new DataView(bytes.buffer);
    const numSamples = Math.floor(len / 2);
    const float32 = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
    }
    return float32;
  }
}
