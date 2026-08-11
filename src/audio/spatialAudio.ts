// Web Audio API Spatial Sound Engine for Microsoft HoloLens 2 Mixed Reality Interface

class SpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private humGainNode: GainNode | null = null;
  private humOscillator: OscillatorNode | null = null;
  private geigerInterval: number | null = null;

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
      this.stopContinuousSounds();
    } else {
      this.startContinuousHum();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
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
    try {
      this.initContext();
      if (!this.ctx) return;

      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        const startTime = this.ctx.currentTime + i * 0.25;
        osc.frequency.setValueAtTime(880, startTime);
        osc.frequency.exponentialRampToValueAtTime(440, startTime + 0.2);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.23);
      }
    } catch {
      // ignore
    }
  }

  // Single Geiger Click
  public playGeigerClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(3200 + Math.random() * 800, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.008);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.009);
    } catch {
      // ignore
    }
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

  public stopContinuousSounds() {
    if (this.humOscillator) {
      try {
        this.humOscillator.stop();
        this.humOscillator.disconnect();
      } catch {
        // ignore
      }
      this.humOscillator = null;
    }
    if (this.geigerInterval) {
      clearInterval(this.geigerInterval);
      this.geigerInterval = null;
    }
  }
}

export const spatialAudio = new SpatialAudioEngine();
