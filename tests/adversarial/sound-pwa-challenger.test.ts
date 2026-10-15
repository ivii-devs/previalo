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
} from '../../src/infrastructure/soundService';
import {
  PWAHelper,
  promptInstall,
  isInstallable,
  isOffline,
  isOnline,
  onNetworkChange,
  onInstallableChange,
  onAppInstalled,
  registerServiceWorker,
  type BeforeInstallPromptEvent,
} from '../../src/infrastructure/registerSW';

/**
 * CHALLENGER M3_2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE
 * Targets:
 * 1. Web Audio Node Graph Topology & AudioParam Finite/Positive Invariants
 * 2. Rapid Firing Stress (50+ calls bursts, interleave, no leaks or unhandled rejections)
 * 3. Mute & Haptic State Enforcement (zero nodes scheduled, zero vibrate calls)
 * 4. PWA Lifecycle & State Machine Transitions (beforeinstallprompt, prompt, outcome, appinstalled)
 * 5. Robustness under Hostile Web Audio Environment (AudioContext failure/rejection resilience)
 */

interface AudioNodeRecord {
  id: number;
  type: 'oscillator' | 'filter' | 'gain' | 'bufferSource';
  instance: any;
  connections: any[];
  params: {
    frequencyEvents: { type: string; value: number; time: number }[];
    gainEvents: { type: string; value: number; time: number }[];
    qEvents: { type: string; value: number; time: number }[];
  };
  playback: {
    startedAt?: number;
    stoppedAt?: number;
  };
}

describe('CHALLENGER M3_2: Adversarial Stress Test Suite (SoundService & registerSW)', () => {
  let mockDestination: any;
  let mockAudioContext: any;
  let allocatedNodes: AudioNodeRecord[];
  let nodeIdCounter: number;
  let mockVibrate: any;
  let currentTime: number;

  function createMockAudioParam(record: AudioNodeRecord, paramName: 'frequency' | 'gain' | 'q') {
    const list =
      paramName === 'frequency'
        ? record.params.frequencyEvents
        : paramName === 'gain'
        ? record.params.gainEvents
        : record.params.qEvents;

    return {
      value: 1,
      setValueAtTime: vi.fn((val: number, time: number) => {
        list.push({ type: 'setValueAtTime', value: val, time });
      }),
      linearRampToValueAtTime: vi.fn((val: number, time: number) => {
        list.push({ type: 'linearRampToValueAtTime', value: val, time });
      }),
      exponentialRampToValueAtTime: vi.fn((val: number, time: number) => {
        list.push({ type: 'exponentialRampToValueAtTime', value: val, time });
      }),
    };
  }

  function setupMockAudioGraph() {
    allocatedNodes = [];
    nodeIdCounter = 0;
    currentTime = 100.0;
    mockDestination = { __isDestination: true, id: 'DESTINATION' };

    mockAudioContext = {
      state: 'running',
      sampleRate: 44100,
      get currentTime() {
        return currentTime;
      },
      destination: mockDestination,
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),

      createOscillator: vi.fn(() => {
        const record: AudioNodeRecord = {
          id: ++nodeIdCounter,
          type: 'oscillator',
          instance: null,
          connections: [],
          params: { frequencyEvents: [], gainEvents: [], qEvents: [] },
          playback: {},
        };
        const node: any = {
          __nodeId: record.id,
          __nodeType: 'oscillator',
          type: 'sine',
          frequency: createMockAudioParam(record, 'frequency'),
          connect: vi.fn((target: any) => {
            record.connections.push(target);
          }),
          start: vi.fn((time?: number) => {
            record.playback.startedAt = time !== undefined ? time : currentTime;
          }),
          stop: vi.fn((time?: number) => {
            record.playback.stoppedAt = time !== undefined ? time : currentTime;
          }),
        };
        record.instance = node;
        allocatedNodes.push(record);
        return node;
      }),

      createBiquadFilter: vi.fn(() => {
        const record: AudioNodeRecord = {
          id: ++nodeIdCounter,
          type: 'filter',
          instance: null,
          connections: [],
          params: { frequencyEvents: [], gainEvents: [], qEvents: [] },
          playback: {},
        };
        const node: any = {
          __nodeId: record.id,
          __nodeType: 'filter',
          type: 'lowpass',
          frequency: createMockAudioParam(record, 'frequency'),
          Q: createMockAudioParam(record, 'q'),
          connect: vi.fn((target: any) => {
            record.connections.push(target);
          }),
        };
        record.instance = node;
        allocatedNodes.push(record);
        return node;
      }),

      createGain: vi.fn(() => {
        const record: AudioNodeRecord = {
          id: ++nodeIdCounter,
          type: 'gain',
          instance: null,
          connections: [],
          params: { frequencyEvents: [], gainEvents: [], qEvents: [] },
          playback: {},
        };
        const node: any = {
          __nodeId: record.id,
          __nodeType: 'gain',
          gain: createMockAudioParam(record, 'gain'),
          connect: vi.fn((target: any) => {
            record.connections.push(target);
          }),
        };
        record.instance = node;
        allocatedNodes.push(record);
        return node;
      }),

      createBufferSource: vi.fn(() => {
        const record: AudioNodeRecord = {
          id: ++nodeIdCounter,
          type: 'bufferSource',
          instance: null,
          connections: [],
          params: { frequencyEvents: [], gainEvents: [], qEvents: [] },
          playback: {},
        };
        const node: any = {
          __nodeId: record.id,
          __nodeType: 'bufferSource',
          buffer: null,
          connect: vi.fn((target: any) => {
            record.connections.push(target);
          }),
          start: vi.fn((time?: number) => {
            record.playback.startedAt = time !== undefined ? time : currentTime;
          }),
          stop: vi.fn((time?: number) => {
            record.playback.stoppedAt = time !== undefined ? time : currentTime;
          }),
        };
        record.instance = node;
        allocatedNodes.push(record);
        return node;
      }),

      createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
        const channelData = new Float32Array(length);
        return {
          numberOfChannels: channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: vi.fn(() => channelData),
        };
      }),
    };

    mockVibrate = vi.fn().mockReturnValue(true);

    vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockAudioContext));
    vi.stubGlobal('navigator', {
      vibrate: mockVibrate,
      onLine: true,
      serviceWorker: { register: vi.fn() },
    });
    vi.stubGlobal('window', {
      AudioContext: vi.fn().mockImplementation(() => mockAudioContext),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }

  beforeEach(() => {
    setupMockAudioGraph();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. WEB AUDIO NODE GRAPH TOPOLOGY & AUDIOPARAM FINITENESS CHALLENGE
  // =========================================================================
  describe('1. Web Audio Node Graph & AudioParam Invariants', () => {
    /**
     * Helper to trace graph from a source node to destination
     */
    function hasPathToDestination(sourceRecord: AudioNodeRecord, visited = new Set<number>()): boolean {
      if (visited.has(sourceRecord.id)) return false;
      visited.add(sourceRecord.id);

      for (const target of sourceRecord.connections) {
        if (target === mockDestination || target?.__isDestination) {
          return true;
        }
        if (target?.__nodeId) {
          const nextRecord = allocatedNodes.find((n) => n.id === target.__nodeId);
          if (nextRecord && hasPathToDestination(nextRecord, visited)) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * Validates that all AudioParam events have finite, non-NaN values,
     * positive times, and that exponential ramps are strictly positive (> 0)
     * as required by W3C Web Audio API specification.
     */
    function assertAudioParamInvariants(nodes: AudioNodeRecord[]) {
      for (const node of nodes) {
        const allEvents = [
          ...node.params.frequencyEvents,
          ...node.params.gainEvents,
          ...node.params.qEvents,
        ];

        for (const evt of allEvents) {
          expect(Number.isFinite(evt.value)).toBe(true);
          expect(Number.isNaN(evt.value)).toBe(false);
          expect(Number.isFinite(evt.time)).toBe(true);
          expect(Number.isNaN(evt.time)).toBe(false);
          expect(evt.time).toBeGreaterThanOrEqual(0);

          if (evt.type === 'exponentialRampToValueAtTime') {
            // W3C spec: "An InvalidAccessError MUST be thrown if value is less than or equal to 0."
            expect(evt.value).toBeGreaterThan(0);
          }
        }

        if (node.playback.startedAt !== undefined) {
          expect(Number.isFinite(node.playback.startedAt)).toBe(true);
          expect(Number.isNaN(node.playback.startedAt)).toBe(false);
        }
        if (node.playback.stoppedAt !== undefined) {
          expect(Number.isFinite(node.playback.stoppedAt)).toBe(true);
          expect(Number.isNaN(node.playback.stoppedAt)).toBe(false);
        }
        if (node.playback.startedAt !== undefined && node.playback.stoppedAt !== undefined) {
          expect(node.playback.stoppedAt).toBeGreaterThanOrEqual(node.playback.startedAt);
        }
      }
    }

    it('playSwipe(): verifies complete node graph BufferSource -> Filter -> Gain -> Destination and valid ramps', () => {
      const service = new SoundService();
      allocatedNodes = [];
      service.playSwipe();

      expect(allocatedNodes.length).toBe(3); // 1 bufferSource, 1 filter, 1 gain
      const bufferSource = allocatedNodes.find((n) => n.type === 'bufferSource');
      const filter = allocatedNodes.find((n) => n.type === 'filter');
      const gain = allocatedNodes.find((n) => n.type === 'gain');

      expect(bufferSource).toBeDefined();
      expect(filter).toBeDefined();
      expect(gain).toBeDefined();

      // Check node connection topology
      expect(bufferSource!.connections).toContain(filter!.instance);
      expect(filter!.connections).toContain(gain!.instance);
      expect(gain!.connections).toContain(mockDestination);
      expect(hasPathToDestination(bufferSource!)).toBe(true);

      // Verify filter frequency sweep (800 -> 150 Hz)
      const freqEvents = filter!.params.frequencyEvents;
      expect(freqEvents.length).toBe(2);
      expect(freqEvents[0].value).toBe(800);
      expect(freqEvents[1].value).toBe(150);

      // Verify gain envelope (starts positive, ramps up, decays to positive 0.001)
      const gainEvents = gain!.params.gainEvents;
      expect(gainEvents.length).toBe(3);
      expect(gainEvents[0].value).toBe(0.001);
      expect(gainEvents[1].value).toBe(0.18);
      expect(gainEvents[2].value).toBe(0.001);

      assertAudioParamInvariants(allocatedNodes);
    });

    it('playDice(): verifies 4 rattle bursts + 90 Hz sine thud node graphs all terminate at Destination', () => {
      const service = new SoundService();
      allocatedNodes = [];
      service.playDice();

      // 4 bursts * (1 bufferSource + 1 filter + 1 gain) = 12 nodes
      // + 1 thud (1 oscillator + 1 gain) = 2 nodes -> Total = 14 nodes
      expect(allocatedNodes.length).toBe(14);

      const sources = allocatedNodes.filter((n) => n.type === 'bufferSource' || n.type === 'oscillator');
      expect(sources.length).toBe(5); // 4 noise bursts + 1 sine oscillator

      for (const src of sources) {
        expect(hasPathToDestination(src)).toBe(true);
      }

      // Check thud oscillator
      const thudOsc = allocatedNodes.find((n) => n.type === 'oscillator');
      expect(thudOsc).toBeDefined();
      expect(thudOsc!.instance.type).toBe('sine');
      const thudFreqs = thudOsc!.params.frequencyEvents;
      expect(thudFreqs[0].value).toBe(90);
      expect(thudFreqs[1].value).toBe(45);

      assertAudioParamInvariants(allocatedNodes);
    });

    it('playVirusAlert(): verifies square wave siren connects to Gain -> Destination with strict alternating frequencies', () => {
      const service = new SoundService();
      allocatedNodes = [];
      service.playVirusAlert();

      expect(allocatedNodes.length).toBe(2); // 1 oscillator + 1 gain
      const osc = allocatedNodes.find((n) => n.type === 'oscillator');
      const gain = allocatedNodes.find((n) => n.type === 'gain');

      expect(osc).toBeDefined();
      expect(gain).toBeDefined();
      expect(osc!.instance.type).toBe('square');
      expect(hasPathToDestination(osc!)).toBe(true);

      const freqEvents = osc!.params.frequencyEvents;
      expect(freqEvents.length).toBe(6); // 3 cycles * 2 steps
      for (let i = 0; i < freqEvents.length; i++) {
        expect(freqEvents[i].value).toBe(i % 2 === 0 ? 520 : 780);
      }

      assertAudioParamInvariants(allocatedNodes);
    });

    it('playVirusExpired(): verifies 4-note chime arpeggio (C5, E5, G5, C6) each terminates at Destination', () => {
      const service = new SoundService();
      allocatedNodes = [];
      service.playVirusExpired();

      // 4 notes: 4 oscillators + 4 gains = 8 nodes
      expect(allocatedNodes.length).toBe(8);
      const oscillators = allocatedNodes.filter((n) => n.type === 'oscillator');
      const gains = allocatedNodes.filter((n) => n.type === 'gain');

      expect(oscillators.length).toBe(4);
      expect(gains.length).toBe(4);

      const expectedNotes = [523.25, 659.25, 783.99, 1046.5];
      oscillators.forEach((osc, idx) => {
        expect(hasPathToDestination(osc)).toBe(true);
        expect(osc.params.frequencyEvents[0].value).toBeCloseTo(expectedNotes[idx], 2);
      });

      assertAudioParamInvariants(allocatedNodes);
    });

    it('playVictory(): verifies brass chord progression (triads F, G, C) with 10 sawtooth oscillators and 3 lowpass filters', () => {
      const service = new SoundService();
      allocatedNodes = [];
      service.playVictory();

      // 3 chords:
      // F: 3 oscillators + 1 filter + 1 gain = 5 nodes
      // G: 3 oscillators + 1 filter + 1 gain = 5 nodes
      // C: 4 oscillators + 1 filter + 1 gain = 6 nodes
      // Total = 16 nodes
      expect(allocatedNodes.length).toBe(16);

      const oscillators = allocatedNodes.filter((n) => n.type === 'oscillator');
      const filters = allocatedNodes.filter((n) => n.type === 'filter');
      const gains = allocatedNodes.filter((n) => n.type === 'gain');

      expect(oscillators.length).toBe(10);
      expect(filters.length).toBe(3);
      expect(gains.length).toBe(3);

      for (const osc of oscillators) {
        expect(osc.instance.type).toBe('sawtooth');
        expect(hasPathToDestination(osc)).toBe(true);
      }

      for (const filter of filters) {
        expect(filter.instance.type).toBe('lowpass');
        expect(filter.params.frequencyEvents[0].value).toBe(1400);
      }

      assertAudioParamInvariants(allocatedNodes);
    });

    it('playTap(): verifies subtle 1200 Hz micro-click connects to Gain -> Destination', () => {
      const service = new SoundService();
      allocatedNodes = [];
      service.playTap();

      expect(allocatedNodes.length).toBe(2);
      const osc = allocatedNodes.find((n) => n.type === 'oscillator');
      const gain = allocatedNodes.find((n) => n.type === 'gain');

      expect(osc).toBeDefined();
      expect(gain).toBeDefined();
      expect(osc!.instance.type).toBe('sine');
      expect(osc!.params.frequencyEvents[0].value).toBe(1200);
      expect(hasPathToDestination(osc!)).toBe(true);

      assertAudioParamInvariants(allocatedNodes);
    });
  });

  // =========================================================================
  // 2. RAPID FIRING STRESS CHALLENGE (50+ Rapid Calls In Succession)
  // =========================================================================
  describe('2. Rapid Firing Stress Challenge', () => {
    it('survives 50 rapid calls to playSwipe() with zero uncaught exceptions or audio crashes', () => {
      const service = new SoundService();
      expect(() => {
        for (let i = 0; i < 50; i++) {
          currentTime += 0.01; // 10ms intervals
          service.playSwipe();
        }
      }).not.toThrow();

      // 50 calls * 3 nodes = 150 nodes created
      expect(allocatedNodes.length).toBe(150);
      expect(mockVibrate).toHaveBeenCalledTimes(50);
    });

    it('survives 50 rapid calls to playDice() with zero uncaught exceptions or audio crashes', () => {
      const service = new SoundService();
      expect(() => {
        for (let i = 0; i < 50; i++) {
          currentTime += 0.02;
          service.playDice();
        }
      }).not.toThrow();

      // 50 calls * 14 nodes = 700 nodes created
      expect(allocatedNodes.length).toBe(700);
      expect(mockVibrate).toHaveBeenCalledTimes(50);
    });

    it('survives 50 rapid calls to playTap() with zero uncaught exceptions or audio crashes', () => {
      const service = new SoundService();
      expect(() => {
        for (let i = 0; i < 50; i++) {
          currentTime += 0.005;
          service.playTap();
        }
      }).not.toThrow();

      // 50 calls * 2 nodes = 100 nodes created
      expect(allocatedNodes.length).toBe(100);
      expect(mockVibrate).toHaveBeenCalledTimes(50);
    });

    it('interleaved burst: 300 random calls across all 6 synthesizers without memory corruption', () => {
      const service = new SoundService();
      const methods = [
        () => service.playSwipe(),
        () => service.playDice(),
        () => service.playVirusAlert(),
        () => service.playVirusExpired(),
        () => service.playVictory(),
        () => service.playTap(),
      ];

      expect(() => {
        for (let i = 0; i < 300; i++) {
          currentTime += 0.008;
          const fn = methods[i % methods.length];
          fn();
        }
      }).not.toThrow();

      // 50 calls each:
      // Swipe: 50 * 3 = 150
      // Dice: 50 * 14 = 700
      // VirusAlert: 50 * 2 = 100
      // VirusExpired: 50 * 8 = 400
      // Victory: 50 * 16 = 800
      // Tap: 50 * 2 = 100
      // Total = 2250 nodes
      expect(allocatedNodes.length).toBe(2250);
      expect(mockVibrate).toHaveBeenCalledTimes(300);
    });
  });

  // =========================================================================
  // 3. MUTE & HAPTIC ENFORCEMENT CHALLENGE
  // =========================================================================
  describe('3. Mute & Haptic State Enforcement', () => {
    it('when setSoundEnabled(false) is active, zero audio nodes are scheduled for ANY sound', () => {
      const service = new SoundService();
      service.setSoundEnabled(false);
      expect(service.isSoundEnabled()).toBe(false);

      allocatedNodes = [];
      service.playSwipe();
      service.playDice();
      service.playVirusAlert();
      service.playVirusExpired();
      service.playVictory();
      service.playTap();

      // Zero nodes allocated!
      expect(allocatedNodes.length).toBe(0);
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).not.toHaveBeenCalled();
      expect(mockAudioContext.createGain).not.toHaveBeenCalled();

      // But haptics should still be active when sound is muted
      expect(mockVibrate).toHaveBeenCalledTimes(6);
    });

    it('when setHapticsEnabled(false) is active, navigator.vibrate is NEVER called', () => {
      const service = new SoundService();
      service.setHapticsEnabled(false);
      expect(service.isHapticsEnabled()).toBe(false);

      mockVibrate.mockClear();

      service.vibrate(100);
      service.playSwipe();
      service.playDice();
      service.playVirusAlert();
      service.playVirusExpired();
      service.playVictory();
      service.playTap();

      expect(mockVibrate).not.toHaveBeenCalled();
    });

    it('when both sound and haptics are disabled, complete silence and zero side-effects', () => {
      const service = new SoundService();
      service.setSoundEnabled(false);
      service.setHapticsEnabled(false);

      allocatedNodes = [];
      mockVibrate.mockClear();

      for (let i = 0; i < 20; i++) {
        service.playSwipe();
        service.playDice();
        service.playVirusAlert();
        service.playVirusExpired();
        service.playVictory();
        service.playTap();
      }

      expect(allocatedNodes.length).toBe(0);
      expect(mockVibrate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. PWA LIFECYCLE & STATE TRANSITIONS CHALLENGE
  // =========================================================================
  describe('4. PWA Lifecycle & State Machine Transitions', () => {
    let eventListenersMap: Map<string, Set<(e: any) => void>>;

    beforeEach(() => {
      PWAHelper.__resetState();
      eventListenersMap = new Map();

      const mockWin = {
        addEventListener: vi.fn((event: string, handler: (e: any) => void) => {
          if (!eventListenersMap.has(event)) {
            eventListenersMap.set(event, new Set());
          }
          eventListenersMap.get(event)!.add(handler);
        }),
        removeEventListener: vi.fn((event: string, handler: (e: any) => void) => {
          eventListenersMap.get(event)?.delete(handler);
        }),
      };

      vi.stubGlobal('window', mockWin);
      PWAHelper.init();
    });

    it('verifies beforeinstallprompt capture, preventDefault, and isInstallable() transition', async () => {
      expect(isInstallable()).toBe(false);

      const statusLog: boolean[] = [];
      const unsubscribe = onInstallableChange((status) => {
        statusLog.push(status);
      });

      // Initial status emitted
      expect(statusLog).toEqual([false]);

      // Create BeforeInstallPromptEvent
      const mockEvent: BeforeInstallPromptEvent = {
        platforms: ['web', 'play'],
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
        prompt: vi.fn().mockResolvedValue(undefined),
        preventDefault: vi.fn(),
      } as unknown as BeforeInstallPromptEvent;

      // Dispatch beforeinstallprompt
      const handlers = eventListenersMap.get('beforeinstallprompt');
      expect(handlers).toBeDefined();
      handlers!.forEach((h) => h(mockEvent));

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(isInstallable()).toBe(true);
      expect(statusLog).toEqual([false, true]);

      // Execute promptInstall()
      const outcome = await promptInstall();
      expect(mockEvent.prompt).toHaveBeenCalled();
      expect(outcome).toBe('accepted');

      // isInstallable() MUST transition back to false immediately
      expect(isInstallable()).toBe(false);
      expect(statusLog).toEqual([false, true, false]);

      // Subsequent prompt call must return unsupported
      const secondOutcome = await promptInstall();
      expect(secondOutcome).toBe('unsupported');

      unsubscribe();
    });

    it('handles user dismissing install prompt gracefully and resets installable flag', async () => {
      const mockDismissedEvent: BeforeInstallPromptEvent = {
        platforms: ['web'],
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
        prompt: vi.fn().mockResolvedValue(undefined),
        preventDefault: vi.fn(),
      } as unknown as BeforeInstallPromptEvent;

      PWAHelper.__setDeferredPrompt(mockDismissedEvent);
      expect(isInstallable()).toBe(true);

      const outcome = await promptInstall();
      expect(outcome).toBe('dismissed');
      expect(isInstallable()).toBe(false);
    });

    it('appinstalled event clears deferred prompt and notifies onAppInstalled listeners', () => {
      const appInstalledSpy = vi.fn();
      const unsubscribe = onAppInstalled(appInstalledSpy);

      PWAHelper.__setDeferredPrompt({} as any);
      expect(isInstallable()).toBe(true);

      const handlers = eventListenersMap.get('appinstalled');
      expect(handlers).toBeDefined();
      handlers!.forEach((h) => h(new Event('appinstalled')));

      expect(appInstalledSpy).toHaveBeenCalledTimes(1);
      expect(isInstallable()).toBe(false);

      unsubscribe();
    });

    it('robust network transitions: toggle online/offline 20 times and verify subscribers receive all events', () => {
      const networkHistory: boolean[] = [];
      const unsubscribe = onNetworkChange((online) => {
        networkHistory.push(online);
      });

      const onlineHandlers = eventListenersMap.get('online');
      const offlineHandlers = eventListenersMap.get('offline');

      for (let i = 0; i < 10; i++) {
        offlineHandlers?.forEach((h) => h(new Event('offline')));
        onlineHandlers?.forEach((h) => h(new Event('online')));
      }

      // Initial value (true) + 10 pairs of (false, true) = 21 entries
      expect(networkHistory.length).toBe(21);
      expect(networkHistory[1]).toBe(false);
      expect(networkHistory[2]).toBe(true);

      unsubscribe();
    });
  });

  // =========================================================================
  // 5. RESILIENCE IN HOSTILE/RESTRICTED ENVIRONMENTS
  // =========================================================================
  describe('5. Robustness under Hostile Web Audio Environment', () => {
    it('should silently handle AudioContext creation failure without crashing the caller', () => {
      vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => {
        throw new Error('AudioContext blocked by browser policy');
      }));

      const service = new SoundService();
      expect(() => {
        service.playSwipe();
        service.playDice();
        service.playVirusAlert();
        service.playVirusExpired();
        service.playVictory();
        service.playTap();
      }).not.toThrow();
    });

    it('should silently handle oscillator start() throwing an InvalidStateError', () => {
      mockAudioContext.createOscillator = vi.fn(() => {
        throw new Error('InvalidStateError');
      });

      const service = new SoundService();
      expect(() => {
        service.playTap();
        service.playVirusAlert();
      }).not.toThrow();
    });

    it('should handle navigator.vibrate throwing security exception on cross-origin iframe', () => {
      mockVibrate.mockImplementation(() => {
        throw new DOMException('Blocked by Permissions Policy', 'SecurityError');
      });

      const service = new SoundService();
      expect(() => service.vibrate(50)).not.toThrow();
      expect(service.vibrate(50)).toBe(false);
    });

    it('should function in SSR / Node environment where window is undefined', () => {
      vi.stubGlobal('window', undefined);
      vi.stubGlobal('navigator', undefined);

      const service = new SoundService();
      expect(service.getAudioContext()).toBeNull();
      expect(() => {
        service.playSwipe();
        service.playDice();
        service.playVirusAlert();
        service.playVirusExpired();
        service.playVictory();
        service.playTap();
      }).not.toThrow();
      expect(service.vibrate(50)).toBe(false);
    });

    it('should handle unusual AudioContext sample rates (22050 Hz, 48000 Hz, 96000 Hz)', () => {
      for (const sRate of [22050, 48000, 96000]) {
        mockAudioContext.sampleRate = sRate;
        const service = new SoundService();
        expect(() => {
          service.playSwipe();
          service.playDice();
        }).not.toThrow();
      }
    });

    it('should attempt resume when AudioContext state is suspended upon sound trigger', () => {
      mockAudioContext.state = 'suspended';
      const service = new SoundService();
      service.playSwipe();

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should handle prompt() throwing an unexpected error during promptInstall()', async () => {
      const mockFaultyPrompt: BeforeInstallPromptEvent = {
        platforms: ['web'],
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
        prompt: vi.fn().mockRejectedValue(new Error('Prompt exploded')),
        preventDefault: vi.fn(),
      } as unknown as BeforeInstallPromptEvent;

      PWAHelper.__setDeferredPrompt(mockFaultyPrompt);
      expect(isInstallable()).toBe(true);

      const outcome = await promptInstall();
      expect(outcome).toBe('unsupported');
      expect(isInstallable()).toBe(false);
    });

    it('should handle userChoice rejecting during promptInstall()', async () => {
      const rejectionPromise = Promise.reject(new Error('User choice aborted'));
      // Prevent unhandled rejection warning before promptInstall catches it
      rejectionPromise.catch(() => {});

      const mockFaultyPrompt: BeforeInstallPromptEvent = {
        platforms: ['web'],
        userChoice: rejectionPromise,
        prompt: vi.fn().mockResolvedValue(undefined),
        preventDefault: vi.fn(),
      } as unknown as BeforeInstallPromptEvent;

      PWAHelper.__setDeferredPrompt(mockFaultyPrompt);
      expect(isInstallable()).toBe(true);

      const outcome = await promptInstall();
      expect(outcome).toBe('unsupported');
      expect(isInstallable()).toBe(false);
    });
  });
});

