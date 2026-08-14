// Web Audio API Spatial Sound Engine for Microsoft HoloLens 2 Mixed Reality Interface

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface BrowserSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

class SpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private humGainNode: GainNode | null = null;
  private humOscillator: OscillatorNode | null = null;
  private scramAlarmInterval: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopContinuousHum();
    } else {
      this.startContinuousHum();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Background 60Hz Generator & Reactor Sub-bass Hum
  public startContinuousHum() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || this.humOscillator) return;

      this.humOscillator = this.ctx.createOscillator();
      this.humGainNode = this.ctx.createGain();

      this.humOscillator.type = 'sine';
      this.humOscillator.frequency.setValueAtTime(60, this.ctx.currentTime);

      this.humGainNode.gain.setValueAtTime(0.035, this.ctx.currentTime);

      this.humOscillator.connect(this.humGainNode);
      this.humGainNode.connect(this.ctx.destination);

      this.humOscillator.start();
    } catch {
      // ignore
    }
  }

  public stopContinuousHum() {
    if (this.humOscillator) {
      try {
        this.humOscillator.stop();
        this.humOscillator.disconnect();
      } catch {
        // ignore
      }
      this.humOscillator = null;
    }
    this.humGainNode = null;
    this.stopScramAlarm();
  }

  // Crisp HoloLens 2 Air-Tap Click (High-frequency holographic snap)
  public playAirTap() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3200, this.ctx.currentTime + 0.04);
      osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.09);

      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 3.0;

      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // Audio fallback ignored
    }
  }

  // Spatial Holographic Hover Ping (Subtle ice-blue resonance)
  public playHoverPing() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch {
      // ignore
    }
  }

  // Cherenkov Radiation Resonance Pulse
  public playCherenkovPulse() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, this.ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.8);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.8);
    } catch {
      // ignore
    }
  }

  // SCRAM Emergency Klaxon Alarm Tone
  public playScramAlarm() {
    if (this.isMuted) return;
    this.playScramTone();
    this.scramAlarmInterval = window.setInterval(() => {
      this.playScramTone();
    }, 1500);
  }

  private playScramTone() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.23);
    } catch {
      // ignore
    }
  }

  public stopScramAlarm() {
    if (this.scramAlarmInterval) {
      clearInterval(this.scramAlarmInterval);
      this.scramAlarmInterval = null;
    }
  }

  // Success chime for operations
  public playSuccessChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(this.ctx!.currentTime + i * 0.08);
        osc.stop(this.ctx!.currentTime + i * 0.08 + 0.35);
      });
    } catch {
      // ignore
    }
  }

  // Error buzz
  public playErrorBuzz() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  }

  // Text-to-Speech for AURA AI
  public speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.95;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 0.9;
      utterance.lang = 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Microsoft') || 
        v.name.includes('Samantha') ||
        v.name.includes('Alex')
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Speech Recognition for AURA AI Voice Commands
  private recognition: BrowserSpeechRecognition | null = null;
  private onResultCallback: ((text: string) => void) | null = null;

  public startListening(onResult: (text: string) => void) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech Recognition not supported');
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.webkitSpeechRecognition
      ?? speechWindow.SpeechRecognition;
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        this.onResultCallback?.(finalTranscript.trim());
      }
    };

    this.recognition.onend = () => {
      this.recognition = null;
    };

    this.recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.recognition = null;
    };

    this.onResultCallback = onResult;
    this.recognition.start();
  }

  public stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }
}

export const spatialAudio = new SpatialAudioEngine();
