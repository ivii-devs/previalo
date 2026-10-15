/**
 * Previalo Infrastructure: SoundService
 * Procedural Web Audio API synthesizers (zero external audio files).
 * Lazy AudioContext instantiation with automatic gesture resume (avoids Safari autoplay restrictions).
 * Supports sound FX toggles and graceful haptic vibrations (navigator.vibrate).
 */

export interface ISoundService {
  playSwipe(): void;
  playDice(): void;
  playVirusAlert(): void;
  playVirusExpired(): void;
  playVictory(): void;
  playTap(): void;
  vibrate(pattern?: number | number[]): boolean;
  isSoundEnabled(): boolean;
  setSoundEnabled(enabled: boolean): void;
  isHapticsEnabled(): boolean;
  setHapticsEnabled(enabled: boolean): void;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export class SoundService implements ISoundService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;
  private hasRegisteredUnlock: boolean = false;

  constructor() {
    this.registerUnlockListeners();
  }

  /**
   * Registers one-time user gesture listeners on window to resume AudioContext.
   */
  private registerUnlockListeners(): void {
    if (typeof window === 'undefined' || this.hasRegisteredUnlock) return;
    this.hasRegisteredUnlock = true;

    const unlock = () => {
      this.resume().catch(() => {});
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  /**
   * Lazily instantiates and returns the Web Audio API AudioContext.
   */
  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return null;

      try {
        this.audioCtx = new AudioContextClass();
      } catch {
        return null;
      }
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Explicitly resumes the AudioContext if suspended.
   */
  public async resume(): Promise<void> {
    if (!this.audioCtx) {
      this.getAudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /**
   * Closes the AudioContext (useful in tests or when unmounting).
   */
  public async close(): Promise<void> {
    if (this.audioCtx) {
      try {
        await this.audioCtx.close();
      } catch {
        // Ignored
      }
      this.audioCtx = null;
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  /**
   * Triggers haptic vibration via navigator.vibrate with graceful fallback.
   */
  public vibrate(pattern: number | number[] = 15): boolean {
    if (!this.hapticsEnabled) return false;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        return navigator.vibrate(pattern);
      }
    } catch {
      // Ignored for non-supporting browsers (e.g. iOS Safari)
    }
    return false;
  }

  /**
   * playSwipe(): filtered noise sweep (lowpass sweep from 800 Hz down to 150 Hz over 120 ms).
   */
  public playSwipe(): void {
    this.vibrate(12);
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const duration = 0.12; // 120 ms
      const sampleRate = ctx.sampleRate || 44100;
      const bufferSize = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Lowpass filter sweeping from 800 Hz down to 150 Hz
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const now = ctx.currentTime;
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + duration);

      // Gain envelope: fast attack, exponential decay
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Graceful silence on audio error
    }
  }

  /**
   * playDice(): short noise bursts + 90 Hz sine thud.
   */
  public playDice(): void {
    this.vibrate([15, 25, 15, 25, 40]);
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const sampleRate = ctx.sampleRate || 44100;

      // 4 short noise rattle bursts
      const rattleOffsets = [0, 0.04, 0.085, 0.13];
      for (const offset of rattleOffsets) {
        const burstDuration = 0.015;
        const burstSamples = Math.floor(sampleRate * burstDuration);
        const burstBuffer = ctx.createBuffer(1, burstSamples, sampleRate);
        const data = burstBuffer.getChannelData(0);
        for (let i = 0; i < burstSamples; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = burstBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200 + Math.random() * 600, now + offset);
        filter.Q.setValueAtTime(2.0, now + offset);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + burstDuration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start(now + offset);
        source.stop(now + offset + burstDuration);
      }

      // Final 90 Hz sine thud
      const thudTime = now + 0.16;
      const thudDuration = 0.08; // 80 ms
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, thudTime);
      osc.frequency.exponentialRampToValueAtTime(45, thudTime + thudDuration);

      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.25, thudTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + thudDuration);

      osc.connect(thudGain);
      thudGain.connect(ctx.destination);

      osc.start(thudTime);
      osc.stop(thudTime + thudDuration);
    } catch {
      // Graceful silence on audio error
    }
  }

  /**
   * playVirusAlert(): square wave alternating siren (520 Hz / 780 Hz).
   */
  public playVirusAlert(): void {
    this.vibrate([40, 30, 40]);
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const step = 0.08; // 80 ms per step
      const cycles = 3;
      const totalDuration = cycles * 2 * step; // ~480 ms

      const osc = ctx.createOscillator();
      osc.type = 'square';

      // Alternate frequencies 520 Hz and 780 Hz
      for (let i = 0; i < cycles * 2; i++) {
        const freq = i % 2 === 0 ? 520 : 780;
        osc.frequency.setValueAtTime(freq, now + i * step);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.setValueAtTime(0.12, now + totalDuration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + totalDuration);
    } catch {
      // Graceful silence
    }
  }

  /**
   * playVirusExpired(): triad chime arpeggio (C5=523Hz, E5=659Hz, G5=784Hz, C6=1046Hz).
   */
  public playVirusExpired(): void {
    this.vibrate([30, 50, 30]);
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Arpeggio frequencies: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteDelay = 0.09;
      const noteDuration = 0.16;

      notes.forEach((freq, index) => {
        const noteStart = now + index * noteDelay;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.16, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);
      });
    } catch {
      // Graceful silence
    }
  }

  /**
   * playVictory(): brass chord progression (triads F -> G -> C major).
   */
  public playVictory(): void {
    this.vibrate([50, 50, 50, 50, 120]);
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Chord 1: F Major (F4=349.23, A4=440.00, C5=523.25)
      // Chord 2: G Major (G4=392.00, B4=493.88, D5=587.33)
      // Chord 3: C Major (C4=261.63, E4=329.63, G4=392.00, C5=523.25)
      const chords = [
        { freqs: [349.23, 440.0, 523.25], start: now, duration: 0.32 },
        { freqs: [392.0, 493.88, 587.33], start: now + 0.34, duration: 0.32 },
        { freqs: [261.63, 329.63, 392.0, 523.25], start: now + 0.68, duration: 0.65 },
      ];

      for (const chord of chords) {
        // Lowpass filter for warm brass character
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, chord.start);

        const chordGain = ctx.createGain();
        chordGain.gain.setValueAtTime(0.001, chord.start);
        chordGain.gain.linearRampToValueAtTime(0.12, chord.start + 0.03);
        chordGain.gain.setValueAtTime(0.12, chord.start + chord.duration - 0.05);
        chordGain.gain.exponentialRampToValueAtTime(0.001, chord.start + chord.duration);

        filter.connect(chordGain);
        chordGain.connect(ctx.destination);

        for (const freq of chord.freqs) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, chord.start);
          osc.connect(filter);
          osc.start(chord.start);
          osc.stop(chord.start + chord.duration);
        }
      }
    } catch {
      // Graceful silence
    }
  }

  /**
   * playTap(): subtle 1200 Hz sine micro-click (12ms).
   */
  public playTap(): void {
    this.vibrate(8);
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.012; // 12 ms

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Graceful silence
    }
  }
}

// Default singleton instance
export const soundService = new SoundService();

// Standalone function exports for easy destructuring
export const playSwipe = () => soundService.playSwipe();
export const playDice = () => soundService.playDice();
export const playVirusAlert = () => soundService.playVirusAlert();
export const playVirusExpired = () => soundService.playVirusExpired();
export const playVictory = () => soundService.playVictory();
export const playTap = () => soundService.playTap();
export const vibrate = (pattern?: number | number[]) => soundService.vibrate(pattern);

export default soundService;
