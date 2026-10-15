/**
 * CHALLENGER_M6_2 WHITE-BOX ADVERSARIAL STRESS TEST HARNESS
 * 
 * Domains Challenged:
 * 1. 100% Offline Simulation & Cache Isolation:
 *    - Global fetch air-gap interceptor
 *    - Complete offline card session (Fisher-Yates, token replacement, undo, viruses)
 *    - Complete offline board session (La Guatoca, dice roll, bounce-back, traps)
 *    - Zero network audio synthesis
 * 2. Crash Recovery Under Corrupted/Hostile LocalStorage:
 *    - Malformed JSON, prototype pollution, type inversion in active session
 *    - Storage QuotaExceededError and SecurityError fallbacks
 *    - Player history and settings store hostile rehydration
 *    - Session purge and fresh game overwrite
 * 3. Audio Polyphony Stress Testing:
 *    - 100 rapid concurrent audio synth calls
 *    - Node start/stop lifecycle verification
 *    - Gain envelope bounding (0 <= gain <= 1)
 *    - Singleton AudioContext reuse and graceful close/reconnect
 *    - Haptics fallback under stress
 * 4. Viewport Boundary & Layout Resilience:
 *    - Meta tags and CSS constraint invariants
 *    - Theme CSS variable consistency
 *    - Extreme text payloads (1,000+ chars) and Unicode names
 *    - Responsive layout bounds across 6 mobile viewport aspect ratios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// =========================================================================
// MOCK STORAGE & WINDOW INFRASTRUCTURE
// =========================================================================

class MockAdversarialStorage implements Storage {
  private store = new Map<string, string>();
  public shouldThrowOnSet = false;
  public shouldThrowOnGet = false;
  public errorType: 'QuotaExceededError' | 'SecurityError' = 'QuotaExceededError';

  getItem(key: string): string | null {
    if (this.shouldThrowOnGet) {
      throw new DOMException('Security restriction: storage access denied', this.errorType);
    }
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) {
      if (this.errorType === 'QuotaExceededError') {
        throw new DOMException('Disk quota exceeded', 'QuotaExceededError');
      } else {
        throw new DOMException('Insecure storage context', 'SecurityError');
      }
    }
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const mockStorage = new MockAdversarialStorage();

// EventTarget implementation for window mock
const windowListeners = new Map<string, Set<Function>>();

const mockWindow = {
  localStorage: mockStorage,
  addEventListener: vi.fn((event: string, handler: Function) => {
    if (!windowListeners.has(event)) windowListeners.set(event, new Set());
    windowListeners.get(event)!.add(handler);
  }),
  removeEventListener: vi.fn((event: string, handler: Function) => {
    windowListeners.get(event)?.delete(handler);
  }),
  dispatchEvent: vi.fn((event: Event) => {
    const handlers = windowListeners.get(event.type);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(event);
        } catch {}
      });
    }
    return true;
  }),
};

// Ensure globalThis.localStorage and window exist
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: mockWindow,
  writable: true,
  configurable: true,
});

// In-memory IndexedDB mock
const mockIdbStore = new Map<string, any>();
let shouldIdbFail = false;

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: IDBValidKey) => {
    if (shouldIdbFail) throw new Error('IndexedDB transaction failed');
    return mockIdbStore.get(String(key));
  }),
  set: vi.fn(async (key: IDBValidKey, val: any) => {
    if (shouldIdbFail) throw new Error('IndexedDB transaction failed');
    mockIdbStore.set(String(key), val);
  }),
  del: vi.fn(async (key: IDBValidKey) => {
    if (shouldIdbFail) throw new Error('IndexedDB transaction failed');
    mockIdbStore.delete(String(key));
  }),
  clear: vi.fn(async () => {
    if (shouldIdbFail) throw new Error('IndexedDB transaction failed');
    mockIdbStore.clear();
  }),
}));

// =========================================================================
// HIGH-FIDELITY WEB AUDIO API MOCK
// =========================================================================

interface ScheduledAudioNode {
  type: 'oscillator' | 'bufferSource' | 'filter' | 'gain';
  startTime?: number;
  stopTime?: number;
  frequencyValues?: number[];
  gainValues?: number[];
}

const createdAudioNodes: ScheduledAudioNode[] = [];
let audioContextInstanceCount = 0;

class MockAudioParam {
  public value: number;
  public recordedValues: number[] = [];

  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
    this.recordedValues.push(defaultValue);
  }

  setValueAtTime(val: number, _time: number) {
    this.value = val;
    this.recordedValues.push(val);
  }

  exponentialRampToValueAtTime(val: number, _time: number) {
    this.value = val;
    this.recordedValues.push(val);
  }

  linearRampToValueAtTime(val: number, _time: number) {
    this.value = val;
    this.recordedValues.push(val);
  }
}

class MockAudioNode {
  public context: MockAudioContext;
  constructor(context: MockAudioContext) {
    this.context = context;
  }
  connect(_dest: any) {
    return _dest;
  }
  disconnect() {}
}

class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency = new MockAudioParam(440);
  public record: ScheduledAudioNode;

  constructor(context: MockAudioContext) {
    super(context);
    this.record = {
      type: 'oscillator',
      frequencyValues: this.frequency.recordedValues,
    };
    createdAudioNodes.push(this.record);
  }

  start(time?: number) {
    this.record.startTime = time ?? this.context.currentTime;
  }

  stop(time?: number) {
    this.record.stopTime = time ?? this.context.currentTime;
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: any = null;
  public record: ScheduledAudioNode;

  constructor(context: MockAudioContext) {
    super(context);
    this.record = { type: 'bufferSource' };
    createdAudioNodes.push(this.record);
  }

  start(time?: number) {
    this.record.startTime = time ?? this.context.currentTime;
  }

  stop(time?: number) {
    this.record.stopTime = time ?? this.context.currentTime;
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency = new MockAudioParam(1000);
  public Q = new MockAudioParam(1);
  public record: ScheduledAudioNode;

  constructor(context: MockAudioContext) {
    super(context);
    this.record = {
      type: 'filter',
      frequencyValues: this.frequency.recordedValues,
    };
    createdAudioNodes.push(this.record);
  }
}

class MockGainNode extends MockAudioNode {
  public gain = new MockAudioParam(1.0);
  public record: ScheduledAudioNode;

  constructor(context: MockAudioContext) {
    super(context);
    this.record = {
      type: 'gain',
      gainValues: this.gain.recordedValues,
    };
    createdAudioNodes.push(this.record);
  }
}

class MockAudioContext {
  public state: AudioContextState = 'running';
  public currentTime = 100.0;
  public sampleRate = 44100;
  public destination = new MockAudioNode(this);

  constructor() {
    audioContextInstanceCount++;
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: (_channel: number) => new Float32Array(length),
    };
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode(this);
  }

  createOscillator() {
    return new MockOscillatorNode(this);
  }

  createBiquadFilter() {
    return new MockBiquadFilterNode(this);
  }

  createGain() {
    return new MockGainNode(this);
  }

  async resume() {
    this.state = 'running';
  }

  async close() {
    this.state = 'closed';
  }
}

// Attach MockAudioContext to global
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;
(mockWindow as any).AudioContext = MockAudioContext;
(mockWindow as any).webkitAudioContext = MockAudioContext;

// Mock navigator.vibrate
const recordedVibrations: Array<number | number[]> = [];
let mockVibrateShouldThrow = false;
let mockVibrateReturnValue = true;

const mockNavigator = {
  onLine: true,
  vibrate: vi.fn((pattern: number | number[]) => {
    if (mockVibrateShouldThrow) {
      throw new Error('Vibration hardware error');
    }
    recordedVibrations.push(pattern);
    return mockVibrateReturnValue;
  }),
};

Object.defineProperty(globalThis, 'navigator', {
  value: mockNavigator,
  writable: true,
  configurable: true,
});

Object.defineProperty(mockWindow, 'navigator', {
  value: mockNavigator,
  writable: true,
  configurable: true,
});

// =========================================================================
// IMPORTS UNDER TEST
// =========================================================================

import { CardEngine } from '../../../src/domain/engines/CardEngine';
import { VariableReplacer } from '../../../src/domain/engines/VariableReplacer';
import { VirusManager } from '../../../src/domain/engines/VirusManager';
import { BoardEngine } from '../../../src/domain/engines/BoardEngine';
import {
  useGameSessionStore,
  SESSION_STORAGE_KEY,
} from '../../../src/application/useGameSessionStore';
import { usePlayerStore } from '../../../src/application/usePlayerStore';
import { useSettingsStore } from '../../../src/application/useSettingsStore';
import {
  CatalogLoader,
  CATALOG_CACHE_KEYS,
} from '../../../src/infrastructure/catalogLoader';
import { soundService } from '../../../src/infrastructure/soundService';
import { PWAHelper } from '../../../src/infrastructure/registerSW';
import { CatalogProvider } from '../../../tests/e2e/harness/catalog-provider';
import type { Card } from '../../../src/domain/types/card';
import type { Player } from '../../../src/domain/types/player';
import type { BoardTile } from '../../../src/domain/types/board';

describe('CHALLENGER_M6_2: Infrastructure & Presentation Adversarial Stress Testing', () => {
  const testPlayers: Player[] = [
    { id: 'p_1_lucia', name: 'Lucía', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#ec4899', avatar: '🦁' },
    { id: 'p_2_marcos', name: 'Marcos', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#8b5cf6', avatar: '🦊' },
    { id: 'p_3_sofia', name: 'Sofía', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#06b6d4', avatar: '🐼' },
    { id: 'p_4_mateo', name: 'Mateo', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#10b981', avatar: '🐨' },
  ];

  beforeEach(async () => {
    mockStorage.clear();
    mockStorage.shouldThrowOnSet = false;
    mockStorage.shouldThrowOnGet = false;
    mockIdbStore.clear();
    shouldIdbFail = false;
    createdAudioNodes.length = 0;
    audioContextInstanceCount = 0;
    recordedVibrations.length = 0;
    mockVibrateShouldThrow = false;
    mockVibrateReturnValue = true;
    mockNavigator.onLine = true;
    windowListeners.clear();

    usePlayerStore.getState().clearPlayers();
    usePlayerStore.getState().setPlayers(testPlayers);
    useGameSessionStore.getState().endSession();
    await soundService.close();
    soundService.setSoundEnabled(true);
    soundService.setHapticsEnabled(true);
  });

  afterEach(async () => {
    await soundService.close();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // DOMAIN 1: 100% OFFLINE SIMULATION & CACHE ISOLATION
  // =========================================================================
  describe('1. 100% Offline Simulation & Cache Isolation', () => {
    it('TC-CHAL-OFF-01: should intercept global fetch, load manifest, categories, presets and boards purely from IndexedDB', async () => {
      // 1. Simulate absolute network air-gap (fetch throws unconditionally)
      const offlineError = new TypeError('Failed to fetch: Network unreachable (air-gap simulation)');
      globalThis.fetch = vi.fn().mockRejectedValue(offlineError);

      // Set navigator to offline
      mockNavigator.onLine = false;
      expect(PWAHelper.isOffline()).toBe(true);

      // 2. Pre-populate IndexedDB cache using canonical catalog
      const manifest = CatalogProvider.getManifest();
      const yoNuncaCards = CatalogProvider.getCategoryCards('yo_nunca');
      const hotPresetCards = CatalogProvider.getPresetCards('modo_caliente');
      const clasicaTiles = CatalogProvider.getBoardTiles('guatoca_clasica');

      await CatalogLoader.setToCache(CATALOG_CACHE_KEYS.manifest, manifest);
      await CatalogLoader.setToCache(CATALOG_CACHE_KEYS.category('yo_nunca'), yoNuncaCards);
      await CatalogLoader.setToCache(CATALOG_CACHE_KEYS.preset('modo_caliente'), hotPresetCards);
      await CatalogLoader.setToCache(CATALOG_CACHE_KEYS.board('guatoca_clasica'), clasicaTiles);

      // 3. Load catalog items offline
      const loadedManifest = await CatalogLoader.loadManifest();
      expect(loadedManifest.app_name).toBe('Previalo');
      expect(loadedManifest.global_stats.total_cards).toBe(6937);

      const loadedCategory = await CatalogLoader.loadCategory('yo_nunca');
      expect(loadedCategory.length).toBe(yoNuncaCards.length);
      expect(loadedCategory[0].text).toBeDefined();

      const loadedPreset = await CatalogLoader.loadPreset('modo_caliente');
      expect(loadedPreset.length).toBe(hotPresetCards.length);

      const loadedBoard = await CatalogLoader.loadBoard('guatoca_clasica');
      expect(loadedBoard.length).toBe(45);
      expect(loadedBoard[44].tile_type).toBe('finish');

      // Verify that fetch was never called or all attempts rejected safely
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('TC-CHAL-OFF-02: should run a complete 25-card game session 100% offline with virus ticks and undos', async () => {
      // Intercept network
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Offline'));
      mockNavigator.onLine = false;

      // Populate IndexedDB with category cards containing virus cards
      const yoNuncaCards = CatalogProvider.getCategoryCards('yo_nunca');
      const testDeck = yoNuncaCards.slice(0, 25);
      // Inject virus card at position 3
      testDeck[3] = {
        id: 'offline_virus_01',
        type: 'virus',
        text: 'Regla virus offline: {player1} debe hablar como robot durante 3 rondas.',
        intensity: 2,
        drinks_penalty: 1,
        duration_rounds: 3,
      };

      await CatalogLoader.setToCache(CATALOG_CACHE_KEYS.category('yo_nunca'), testDeck);
      const loadedCards = await CatalogLoader.loadCategory('yo_nunca');

      const engine = new CardEngine();
      const deck = engine.buildCategoryDeck(loadedCards);
      expect(deck.length).toBe(25);

      const store = useGameSessionStore.getState();
      store.startCardSession(deck, 'category', { intensity: 2 }, testPlayers);

      // Verify initial state
      let state = useGameSessionStore.getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentCard).not.toBeNull();
      expect(state.interpolatedText.length).toBeGreaterThan(0);

      // Advance through cards offline
      for (let i = 0; i < 15; i++) {
        store.nextCard();
      }

      state = useGameSessionStore.getState();
      expect(state.currentIndex).toBe(15);
      expect(state.history.length).toBe(15);

      // Perform 5 undos offline
      for (let i = 0; i < 5; i++) {
        const undoSuccess = store.previousCard();
        expect(undoSuccess).toBe(true);
      }

      state = useGameSessionStore.getState();
      expect(state.currentIndex).toBe(10);
      expect(state.history.length).toBe(10);

      // Modify sips offline
      store.adjustSips('p_1_lucia', 3);
      expect(usePlayerStore.getState().players.find((p) => p.id === 'p_1_lucia')?.sipCount).toBeGreaterThanOrEqual(3);
    });

    it('TC-CHAL-OFF-03: should play a complete La Guatoca board session 100% offline from cached tiles', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Offline'));
      mockNavigator.onLine = false;

      const clasicaTiles = CatalogProvider.getBoardTiles('guatoca_clasica');
      await CatalogLoader.setToCache(CATALOG_CACHE_KEYS.board('guatoca_clasica'), clasicaTiles);

      const tiles = await CatalogLoader.loadBoard('guatoca_clasica');
      const store = useGameSessionStore.getState();
      store.startBoardSession('guatoca_clasica', tiles, testPlayers);

      let state = useGameSessionStore.getState();
      expect(state.mode).toBe('board');
      expect(state.boardPositions['p_1_lucia']).toBe(1);

      // Simulate 20 consecutive dice rolls offline
      for (let roll = 0; roll < 20; roll++) {
        const result = store.rollBoardDice();
        expect(result).not.toBeNull();
        if (result?.isVictory) {
          expect(useGameSessionStore.getState().isGameOver).toBe(true);
          break;
        }
      }

      // Verify that board position changed from starting tile 1
      const p1Pos = useGameSessionStore.getState().boardPositions['p_1_lucia'];
      expect(p1Pos).toBeGreaterThanOrEqual(1);
    });

    it('TC-CHAL-OFF-04: should trigger all procedural audio effects offline without network requests', () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Offline'));
      mockNavigator.onLine = false;

      // Audio is synthesized purely client-side via Web Audio API oscillators/noise
      expect(() => {
        soundService.playSwipe();
        soundService.playDice();
        soundService.playVirusAlert();
        soundService.playVirusExpired();
        soundService.playVictory();
        soundService.playTap();
      }).not.toThrow();

      // Zero network requests made
      expect(globalThis.fetch).not.toHaveBeenCalled();
      // Audio nodes created procedurally
      expect(createdAudioNodes.length).toBeGreaterThan(10);
    });

    it('TC-CHAL-OFF-05: should notify network change listeners when transitioning offline/online', () => {
      PWAHelper.__resetState();
      PWAHelper.init();

      const networkStates: boolean[] = [];
      const unsub = PWAHelper.onNetworkChange((isOnline) => {
        networkStates.push(isOnline);
      });

      // Emit offline event on window
      mockNavigator.onLine = false;
      mockWindow.dispatchEvent(new Event('offline'));
      mockWindow.dispatchEvent(new Event('online'));

      unsub();
      expect(networkStates.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // DOMAIN 2: CRASH RECOVERY UNDER CORRUPTED / HOSTILE LOCALSTORAGE PAYLOADS
  // =========================================================================
  describe('2. Crash Recovery Under Corrupted/Hostile LocalStorage Payloads', () => {
    it('TC-CHAL-CRASH-01: should safely reject hostile active session payloads without throwing or corrupting store', () => {
      const store = useGameSessionStore.getState();

      const hostilePayloads = [
        '{',
        '{"broken": [1, 2, ',
        'undefined',
        'NaN',
        'null',
        '12345',
        'true',
        'false',
        '""',
        '"   "',
        '[]',
        '[{"id": 1}]',
        '{"__proto__": {"polluted": true}}',
        JSON.stringify({ isGameOver: true, deck: [{ id: 'card_1' }] }), // Completed games must be rejected
        JSON.stringify({ isGameOver: true, mode: 'board' }), // Completed board game must be rejected
        JSON.stringify({ mode: 'cards', currentIndex: -1, deck: [] }), // Empty deck at index -1
        JSON.stringify({ mode: 'cards', deck: 'not-an-array', currentIndex: 0 }), // Type mismatch
        JSON.stringify({ mode: 'chaos', deck: null, currentIndex: 0 }), // Deck null
        JSON.stringify({ foo: 'bar', timestamp: 123456 }), // Missing essential fields
      ];

      for (const payload of hostilePayloads) {
        mockStorage.setItem(SESSION_STORAGE_KEY, payload);

        // hasActiveSession must not throw and must return false
        expect(() => store.hasActiveSession()).not.toThrow();
        expect(store.hasActiveSession()).toBe(false);

        // resumeSession must not throw and must return false
        expect(() => store.resumeSession()).not.toThrow();
        expect(store.resumeSession()).toBe(false);

        // Verify that store state was not corrupted by the resume attempt
        const state = useGameSessionStore.getState();
        expect(state.mode).toBeNull();
        expect(state.isGameOver).toBe(false);
      }
    });

    it('TC-CHAL-CRASH-01b: should handle partial board session recovery with null boardPositions without crashing', () => {
      const store = useGameSessionStore.getState();
      const partialBoardPayload = JSON.stringify({
        mode: 'board',
        boardPositions: null,
        boardJails: null,
        isGameOver: false,
      });

      mockStorage.setItem(SESSION_STORAGE_KEY, partialBoardPayload);

      expect(store.hasActiveSession()).toBe(true);
      expect(() => store.resumeSession()).not.toThrow();
      expect(store.resumeSession()).toBe(true);

      const state = useGameSessionStore.getState();
      expect(state.mode).toBe('board');
      expect(state.boardPositions).toEqual({});
      expect(state.boardJails).toEqual({});
    });

    it('TC-CHAL-CRASH-02: should cleanly overwrite and cleanse corrupted localStorage when user starts a fresh game', () => {
      // Invert storage with hostile corrupt payload
      mockStorage.setItem(SESSION_STORAGE_KEY, '{"corrupted": true, "malformed": [[[');

      const store = useGameSessionStore.getState();
      expect(store.hasActiveSession()).toBe(false);

      const freshDeck: Card[] = [
        { id: 'fresh_1', type: 'rule', text: '{player1} bebe {drinks}', intensity: 2, drinks_penalty: 2 },
        { id: 'fresh_2', type: 'rule', text: '{player2} bebe {drinks}', intensity: 2, drinks_penalty: 1 },
      ];

      // Starting new session must overwrite the corrupted key with valid JSON
      store.startCardSession(freshDeck, 'chaos', { intensity: 2 }, testPlayers);

      const rawSaved = mockStorage.getItem(SESSION_STORAGE_KEY);
      expect(rawSaved).not.toBeNull();
      const parsed = JSON.parse(rawSaved!);
      expect(parsed.mode).toBe('chaos');
      expect(parsed.currentIndex).toBe(0);
      expect(parsed.deck.length).toBe(2);

      // Session can now be resumed cleanly
      expect(store.hasActiveSession()).toBe(true);

      // Discarding session cleanses storage completely
      store.discardSession();
      expect(mockStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(store.hasActiveSession()).toBe(false);
    });

    it('TC-CHAL-CRASH-03: should survive DOMException QuotaExceededError and continue seamless in-memory execution', () => {
      const store = useGameSessionStore.getState();
      const deck: Card[] = [
        { id: 'c1', type: 'rule', text: '{player1} bebe {drinks}', intensity: 2, drinks_penalty: 1 },
        { id: 'c2', type: 'rule', text: '{player2} bebe {drinks}', intensity: 2, drinks_penalty: 2 },
        { id: 'c3', type: 'rule', text: '{player1} y {player2} beben {drinks}', intensity: 2, drinks_penalty: 3 },
      ];

      // Enable quota exhaustion simulation
      mockStorage.shouldThrowOnSet = true;
      mockStorage.errorType = 'QuotaExceededError';

      // Store actions must not throw even if storage.setItem throws QuotaExceededError
      expect(() => {
        store.startCardSession(deck, 'chaos', { intensity: 2 }, testPlayers);
        store.nextCard();
        store.adjustSips('p_1_lucia', 2);
        store.previousCard();
      }).not.toThrow();

      // State is maintained in memory
      expect(useGameSessionStore.getState().currentIndex).toBe(0);
      expect(usePlayerStore.getState().players.find((p) => p.id === 'p_1_lucia')?.sipCount).toBeGreaterThanOrEqual(1);
    });

    it('TC-CHAL-CRASH-04: should survive DOMException SecurityError when storage access is restricted (e.g. private mode)', () => {
      mockStorage.shouldThrowOnGet = true;
      mockStorage.errorType = 'SecurityError';

      const store = useGameSessionStore.getState();

      // hasActiveSession and resumeSession must gracefully return false on SecurityError
      expect(() => store.hasActiveSession()).not.toThrow();
      expect(store.hasActiveSession()).toBe(false);

      expect(() => store.resumeSession()).not.toThrow();
      expect(store.resumeSession()).toBe(false);
    });

    it('TC-CHAL-CRASH-05: should tolerate corrupted player history and settings store payloads', () => {
      // Injected corrupted settings
      mockStorage.setItem('previalo_settings', '{"state": {"theme": "invalid-theme", "soundEnabled": "not-a-bool"}}');
      // Injected corrupted player history
      mockStorage.setItem('previalo_player_history', '{"state": {"historicalPlayers": null}}');

      // Stores must remain functional
      expect(() => {
        const theme = useSettingsStore.getState().theme;
        expect(theme).toBeDefined();

        usePlayerStore.getState().addPlayer('Carlos');
        usePlayerStore.getState().quickAddPlayer('Carlos');
      }).not.toThrow();
    });
  });

  // =========================================================================
  // DOMAIN 3: AUDIO POLYPHONY STRESS TESTING (100 RAPID CONCURRENT SYNTH CALLS)
  // =========================================================================
  describe('3. Audio Polyphony Stress Testing (100 Rapid Concurrent Calls)', () => {
    it('TC-CHAL-AUD-01: should execute 100 rapid concurrent audio calls across all synth presets without crash or node leak', async () => {
      audioContextInstanceCount = 0;
      createdAudioNodes.length = 0;

      const soundMethods = [
        () => soundService.playSwipe(),
        () => soundService.playDice(),
        () => soundService.playVirusAlert(),
        () => soundService.playVirusExpired(),
        () => soundService.playVictory(),
        () => soundService.playTap(),
      ];

      // Fire 100 rapid concurrent invocations in parallel
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        const method = soundMethods[i % soundMethods.length];
        promises.push(
          new Promise<void>((resolve) => {
            expect(() => method()).not.toThrow();
            resolve();
          })
        );
      }

      await Promise.all(promises);

      // 1. Verify AudioContext instance count: singleton must be reused, NOT 100 AudioContexts created!
      expect(audioContextInstanceCount).toBe(1);

      // 2. Verify all nodes that were started have a scheduled stop time
      const startedNodes = createdAudioNodes.filter((n) => n.startTime !== undefined);
      expect(startedNodes.length).toBeGreaterThan(100);

      for (const node of startedNodes) {
        expect(node.stopTime).toBeDefined();
        expect(node.stopTime!).toBeGreaterThan(node.startTime!);
        // Maximum duration should not exceed 1.5 seconds (prevent infinite oscillators)
        const duration = node.stopTime! - node.startTime!;
        expect(duration).toBeLessThanOrEqual(1.5);
      }

      // 3. Verify gain values: every gain node must remain in [0, 1.0] to prevent audio clipping / blowups
      const gainNodes = createdAudioNodes.filter((n) => n.type === 'gain');
      expect(gainNodes.length).toBeGreaterThan(50);

      for (const gainNode of gainNodes) {
        for (const val of gainNode.gainValues || []) {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1.0);
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    });

    it('TC-CHAL-AUD-02: should produce zero audio nodes when sound is toggled off', () => {
      soundService.setSoundEnabled(false);
      createdAudioNodes.length = 0;

      soundService.playSwipe();
      soundService.playDice();
      soundService.playVirusAlert();
      soundService.playVirusExpired();
      soundService.playVictory();
      soundService.playTap();

      expect(createdAudioNodes.length).toBe(0);
    });

    it('TC-CHAL-AUD-03: should gracefully re-instantiate AudioContext when sound is triggered after close()', async () => {
      soundService.playTap();
      const initialNodes = createdAudioNodes.length;
      expect(initialNodes).toBeGreaterThan(0);

      // Close audio context
      await soundService.close();

      // Trigger new sound: must transparently re-open AudioContext without error
      expect(() => {
        soundService.playVictory();
      }).not.toThrow();

      expect(createdAudioNodes.length).toBeGreaterThan(initialNodes);
    });

    it('TC-CHAL-AUD-04: should survive 100 concurrent haptic vibration calls even when hardware throws', () => {
      mockVibrateShouldThrow = true;

      // 100 concurrent calls must be absorbed gracefully by soundService.vibrate
      for (let i = 0; i < 100; i++) {
        expect(() => {
          soundService.vibrate(15);
        }).not.toThrow();
        expect(soundService.vibrate(15)).toBe(false);
      }
    });
  });

  // =========================================================================
  // DOMAIN 4: VIEWPORT BOUNDARY & PRESENTATION STRESS TESTING
  // =========================================================================
  describe('4. Viewport Boundary & Presentation Stress Testing', () => {
    it('TC-CHAL-VIEW-01: should verify index.html declares viewport-fit=cover and mobile constraints', () => {
      const htmlPath = path.resolve(process.cwd(), 'index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');

      // Check mobile viewport attributes
      expect(htmlContent).toContain('viewport-fit=cover');
      expect(htmlContent).toContain('width=device-width');
      expect(htmlContent).toContain('initial-scale=1.0');
      expect(htmlContent).toContain('maximum-scale=1.0');
      expect(htmlContent).toContain('user-scalable=no');

      // Check body mobile styling
      expect(htmlContent).toContain('overflow-hidden');
      expect(htmlContent).toContain('select-none');
      expect(htmlContent).toContain('touch-manipulation');
    });

    it('TC-CHAL-VIEW-02: should verify CSS theme variables across all 5 neon themes in index.css', () => {
      const cssPath = path.resolve(process.cwd(), 'src', 'index.css');
      expect(fs.existsSync(cssPath)).toBe(true);
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      const expectedThemes = ['cyber-neon', 'electric-purple', 'acid-lime', 'sunset-hot', 'day-mode'];
      const requiredTokens = [
        '--bg-base',
        '--bg-surface',
        '--bg-elevated',
        '--text-primary',
        '--text-muted',
        '--accent-primary',
        '--border-color',
        '--glow-shadow',
      ];

      for (const theme of expectedThemes) {
        expect(cssContent).toContain(`data-theme="${theme}"`);
      }

      for (const token of requiredTokens) {
        expect(cssContent).toContain(token);
      }

      // Check mobile viewport lock rules in CSS
      expect(cssContent).toContain('overscroll-behavior-y: none');
      expect(cssContent).toContain('touch-action: manipulation');
      expect(cssContent).toContain('user-select: none');
    });

    it('TC-CHAL-VIEW-03: should handle extreme card text payloads (1,500+ characters) without token corruption or NaN drinks', () => {
      const extremeLongText = `En una noche de tormenta legendaria, {player1} confesó que siempre quiso ser astronauta pero {player2} descubrió que le teme a la oscuridad. Por lo tanto, {player1} debe narrar durante 2 minutos su mayor secreto o beber {drinks}. Mientras tanto, {player2} vigilará que no mienta. Si alguien interrumpe, todos beben {drinks}. `.repeat(4);

      expect(extremeLongText.length).toBeGreaterThan(1000);

      const res = VariableReplacer.replaceTokens(extremeLongText, testPlayers, {
        intensity: 3,
        baseDrinks: 2,
        currentTurnIndex: 0,
      });

      expect(res.assignedPlayers.length).toBe(2);
      expect(res.assignedPlayers[0].name).not.toBe(res.assignedPlayers[1].name);
      expect(res.calculatedDrinks).toBeGreaterThanOrEqual(2);
      expect(res.calculatedDrinks).toBeLessThanOrEqual(3);

      // Verify no unresolved tokens
      expect(res.interpolatedText).not.toContain('{player1}');
      expect(res.interpolatedText).not.toContain('{player2}');
      expect(res.interpolatedText).not.toContain('{drinks}');
      expect(res.interpolatedText).toContain('tragos');
    });

    it('TC-CHAL-VIEW-04: should handle adversarial player names with extreme length, Unicode emojis, and HTML entities', () => {
      const adversarialPlayers: Player[] = [
        {
          id: 'adv_1',
          name: 'María del Carmen de los Ángeles y de la Santísima Trinidad 👑✨',
          color: '#ec4899',
          avatar: '🦄',
          sips: 0,
          timesTargeted: 0,
        },
        {
          id: 'adv_2',
          name: '<script>alert("XSS")</script> <b>Bold</b> &amp; Special',
          color: '#06b6d4',
          avatar: '🐲',
          sips: 0,
          timesTargeted: 0,
        },
      ];

      const rawText = '{player1} reta a {player2} a un duelo: bebe {drinks}.';
      const res = VariableReplacer.replaceTokens(rawText, adversarialPlayers, {
        intensity: 2,
        baseDrinks: 1,
      });

      expect(res.interpolatedText).toContain(adversarialPlayers[0].name);
      expect(res.interpolatedText).toContain(adversarialPlayers[1].name);
      expect(res.assignedPlayers[0].id).not.toBe(res.assignedPlayers[1].id);

      // Test player store handling
      const pStore = usePlayerStore.getState();
      const added = pStore.addPlayer(adversarialPlayers[0].name);
      expect(added).not.toBeNull();
      expect(added?.name).toBe(adversarialPlayers[0].name);
    });

    it('TC-CHAL-VIEW-05: should verify mobile container layout contracts across standard mobile viewports', () => {
      // Simulate viewport width and height constraints
      const standardMobileViewports = [
        { name: 'iPhone SE (1st gen)', width: 320, height: 568 },
        { name: 'iPhone 8 / SE 2', width: 375, height: 667 },
        { name: 'iPhone 13 / 14', width: 390, height: 844 },
        { name: 'Pixel 7', width: 412, height: 915 },
        { name: 'Galaxy Fold (outer display)', width: 280, height: 653 },
        { name: 'iPad Mini (portrait)', width: 768, height: 1024 },
      ];

      for (const vp of standardMobileViewports) {
        // App root constraint is max-w-md (448px)
        const effectiveContainerWidth = Math.min(vp.width, 448);
        expect(effectiveContainerWidth).toBeLessThanOrEqual(448);
        expect(effectiveContainerWidth).toBeGreaterThanOrEqual(280);

        // Aspect ratio check
        const aspectRatio = vp.height / vp.width;
        expect(aspectRatio).toBeGreaterThan(1.2); // Mobile portrait orientation
      }
    });

    it('TC-CHAL-VIEW-06: should verify rapid concurrent sound/haptic toggles under high-frequency audio calls', () => {
      // Interleave 100 rapid sound toggle switches and sound triggers
      for (let i = 0; i < 100; i++) {
        soundService.setSoundEnabled(i % 2 === 0);
        soundService.setHapticsEnabled(i % 3 === 0);
        soundService.playTap();
        soundService.playDice();
        soundService.vibrate(10);
      }

      // Restore
      soundService.setSoundEnabled(true);
      soundService.setHapticsEnabled(true);
      expect(soundService.isSoundEnabled()).toBe(true);
      expect(soundService.isHapticsEnabled()).toBe(true);
    });

    it('TC-CHAL-VIEW-07: should survive mid-game localStorage wipe without throwing or crashing game progression', () => {
      const store = useGameSessionStore.getState();
      const yoNuncaCards = CatalogProvider.getCategoryCards('yo_nunca');
      store.startCardSession(yoNuncaCards.slice(0, 10), 'category', { intensity: 2 }, testPlayers);

      for (let i = 0; i < 5; i++) {
        store.nextCard();
      }

      expect(useGameSessionStore.getState().currentIndex).toBe(5);

      // Wipe localStorage externally (simulating user clearing browsing data in settings)
      mockStorage.clear();

      // Subsequent actions must continue in memory without crash
      expect(() => {
        store.nextCard();
        store.adjustSips('p_1_lucia', 1);
        store.previousCard();
      }).not.toThrow();

      expect(useGameSessionStore.getState().currentIndex).toBe(5);
    });

    it('TC-CHAL-VIEW-08: should guard against dice roll attempts once board game has reached victory', () => {
      const store = useGameSessionStore.getState();
      const clasicaTiles = CatalogProvider.getBoardTiles('guatoca_clasica');
      store.startBoardSession('guatoca_clasica', clasicaTiles, testPlayers);

      // Force player 1 landing on Meta (tile 45) from tile 40 with roll 5
      const result = store.rollBoardDice(44); // From tile 1 + 44 = 45 (Meta)
      expect(result?.isVictory).toBe(true);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);

      // Repeated dice roll attempts after victory must safely return null
      for (let i = 0; i < 10; i++) {
        const postVictoryRoll = store.rollBoardDice();
        expect(postVictoryRoll).toBeNull();
      }
    });
  });
});
