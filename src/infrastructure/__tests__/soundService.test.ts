import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SoundService,
  soundService,
  playSwipe,
  playDice,
  playVirusAlert,
  playVirusExpired,
  playVictory,
  playTap,
  vibrate,
} from '../soundService';

describe('SoundService Infrastructure Service', () => {
  let mockAudioContext: any;
  let mockGainNode: any;
  let mockOscillatorNode: any;
  let mockFilterNode: any;
  let mockBufferSourceNode: any;
  let mockAudioBuffer: any;
  let mockVibrate: any;

  beforeEach(() => {
    mockGainNode = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockOscillatorNode = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockFilterNode = {
      type: 'lowpass',
      frequency: {
        value: 1000,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      Q: {
        value: 1,
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockBufferSourceNode = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const channelData = new Float32Array(44100);
    mockAudioBuffer = {
      getChannelData: vi.fn().mockReturnValue(channelData),
    };

    mockAudioContext = {
      state: 'suspended',
      sampleRate: 44100,
      currentTime: 10.0,
      destination: {},
      createBuffer: vi.fn().mockReturnValue(mockAudioBuffer),
      createBufferSource: vi.fn().mockReturnValue(mockBufferSourceNode),
      createBiquadFilter: vi.fn().mockReturnValue(mockFilterNode),
      createGain: vi.fn().mockReturnValue(mockGainNode),
      createOscillator: vi.fn().mockReturnValue(mockOscillatorNode),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockVibrate = vi.fn().mockReturnValue(true);

    vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockAudioContext));
    vi.stubGlobal('navigator', {
      vibrate: mockVibrate,
    });
    vi.stubGlobal('window', {
      AudioContext: vi.fn().mockImplementation(() => mockAudioContext),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('AudioContext initialization and lazy resume', () => {
    it('should lazily create AudioContext and resume if suspended', async () => {
      const service = new SoundService();
      const ctx = service.getAudioContext();

      expect(ctx).toBe(mockAudioContext);
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should explicitly resume on resume() call', async () => {
      const service = new SoundService();
      await service.resume();

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should cleanly close AudioContext on close()', async () => {
      const service = new SoundService();
      service.getAudioContext();
      await service.close();

      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(service.getAudioContext()).not.toBeNull();
    });
  });

  describe('Toggles (sound & haptics)', () => {
    it('should enable and disable sound effects', () => {
      const service = new SoundService();
      expect(service.isSoundEnabled()).toBe(true);

      service.setSoundEnabled(false);
      expect(service.isSoundEnabled()).toBe(false);

      // With sound disabled, play methods should not touch AudioContext
      service.playSwipe();
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();

      service.setSoundEnabled(true);
      service.playSwipe();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should enable and disable haptics', () => {
      const service = new SoundService();
      expect(service.isHapticsEnabled()).toBe(true);

      service.vibrate(50);
      expect(mockVibrate).toHaveBeenCalledWith(50);

      mockVibrate.mockClear();
      service.setHapticsEnabled(false);
      expect(service.isHapticsEnabled()).toBe(false);

      const result = service.vibrate(50);
      expect(result).toBe(false);
      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('should handle navigator.vibrate throwing gracefully', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('NotAllowedError');
      });
      const service = new SoundService();

      expect(() => service.vibrate(20)).not.toThrow();
      expect(service.vibrate(20)).toBe(false);
    });
  });

  describe('Procedural Web Audio synthesizers', () => {
    it('playSwipe(): should synthesize filtered lowpass noise sweep and trigger haptic', () => {
      const service = new SoundService();
      service.playSwipe();

      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();

      // Check filter sweep: 800 Hz down to 150 Hz
      expect(mockFilterNode.frequency.setValueAtTime).toHaveBeenCalledWith(800, 10.0);
      expect(mockFilterNode.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        150,
        expect.closeTo(10.12, 2)
      );

      expect(mockBufferSourceNode.start).toHaveBeenCalled();
      expect(mockBufferSourceNode.stop).toHaveBeenCalled();
      expect(mockVibrate).toHaveBeenCalled();
    });

    it('playDice(): should synthesize noise rattle bursts and 90 Hz sine thud', () => {
      const service = new SoundService();
      service.playDice();

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();

      // Check 90 Hz thud oscillator
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(90, expect.any(Number));
      expect(mockOscillatorNode.start).toHaveBeenCalled();
      expect(mockVibrate).toHaveBeenCalledWith([15, 25, 15, 25, 40]);
    });

    it('playVirusAlert(): should synthesize alternating square wave siren (520 / 780 Hz)', () => {
      const service = new SoundService();
      service.playVirusAlert();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillatorNode.type).toBe('square');

      // Check alternating frequencies
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(520, expect.any(Number));
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(780, expect.any(Number));

      expect(mockOscillatorNode.start).toHaveBeenCalled();
      expect(mockOscillatorNode.stop).toHaveBeenCalled();
      expect(mockVibrate).toHaveBeenCalledWith([40, 30, 40]);
    });

    it('playVirusExpired(): should synthesize triad chime arpeggio (C5, E5, G5, C6)', () => {
      const service = new SoundService();
      service.playVirusExpired();

      // 4 chime notes in arpeggio
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(4);
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(523.25, expect.any(Number));
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(659.25, expect.any(Number));
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(783.99, expect.any(Number));
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(1046.5, expect.any(Number));

      expect(mockVibrate).toHaveBeenCalledWith([30, 50, 30]);
    });

    it('playVictory(): should synthesize brass chord progression (triads F, G, C major)', () => {
      const service = new SoundService();
      service.playVictory();

      // Chords create oscillators for each note in triads
      // F major: 3 notes, G major: 3 notes, C major: 4 notes = 10 oscillators
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(10);
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalledTimes(3);

      expect(mockVibrate).toHaveBeenCalledWith([50, 50, 50, 50, 120]);
    });

    it('playTap(): should synthesize subtle 1200 Hz sine micro-click (12ms)', () => {
      const service = new SoundService();
      service.playTap();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillatorNode.type).toBe('sine');
      expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(1200, 10.0);
      expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        0.001,
        expect.closeTo(10.012, 3)
      );
      expect(mockOscillatorNode.start).toHaveBeenCalledWith(10.0);
      expect(mockOscillatorNode.stop).toHaveBeenCalledWith(expect.closeTo(10.012, 3));
      expect(mockVibrate).toHaveBeenCalledWith(8);
    });

    it('should support singleton and standalone helper functions', () => {
      expect(soundService).toBeInstanceOf(SoundService);
      expect(typeof playSwipe).toBe('function');
      expect(typeof playDice).toBe('function');
      expect(typeof playVirusAlert).toBe('function');
      expect(typeof playVirusExpired).toBe('function');
      expect(typeof playVictory).toBe('function');
      expect(typeof playTap).toBe('function');
      expect(typeof vibrate).toBe('function');

      playTap();
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });
  });
});
