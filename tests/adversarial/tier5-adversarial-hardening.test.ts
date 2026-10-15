/**
 * Previalo PWA - Tier 5 White-Box Adversarial Stress Testing & Hardening Suite
 * 
 * Comprehensive validation across:
 * 1. Extreme deck exhaustion and circular replay.
 * 2. Concurrency stress: 100 rapid card taps, alternating undos, and active virus alerts.
 * 3. Corrupted IndexedDB & localStorage fallbacks under concurrent writes.
 * 4. Dynamic drink scaling extremes across Chill, Fiesta, Hot, Extremo.
 * 5. Unbiased dice roll distribution across 10,000 rolls with chi-square goodness-of-fit test.
 * 6. La Guatoca match played start-to-finish with all special tiles exercised and verified.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// =========================================================================
// MOCK STORAGE INFRASTRUCTURE (For localStorage & IndexedDB hardening)
// =========================================================================

class AdversarialLocalStorage {
  private store = new Map<string, string>();
  public shouldThrowOnSet = false;
  public throwErrorType: 'QuotaExceededError' | 'SecurityError' = 'QuotaExceededError';

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) {
      if (this.throwErrorType === 'QuotaExceededError') {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      } else {
        throw new DOMException('The operation is insecure.', 'SecurityError');
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

const adversarialStorage = new AdversarialLocalStorage();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: adversarialStorage,
    writable: true,
    configurable: true,
  });
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: adversarialStorage },
    writable: true,
    configurable: true,
  });
} else if (!globalThis.window.localStorage) {
  (globalThis.window as any).localStorage = adversarialStorage;
}

// In-memory mock IDB storage with controllable failure injection
const mockIdbStore = new Map<string, any>();
let shouldIdbFail = false;
let idbFailureMessage = 'IDBDatabase connection closed';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: IDBValidKey) => {
    if (shouldIdbFail) {
      throw new Error(idbFailureMessage);
    }
    return mockIdbStore.get(String(key));
  }),
  set: vi.fn(async (key: IDBValidKey, val: any) => {
    if (shouldIdbFail) {
      throw new Error(idbFailureMessage);
    }
    mockIdbStore.set(String(key), val);
  }),
  del: vi.fn(async (key: IDBValidKey) => {
    if (shouldIdbFail) {
      throw new Error(idbFailureMessage);
    }
    mockIdbStore.delete(String(key));
  }),
  clear: vi.fn(async () => {
    if (shouldIdbFail) {
      throw new Error(idbFailureMessage);
    }
    mockIdbStore.clear();
  }),
}));

// =========================================================================
// IMPORTS UNDER TEST
// =========================================================================

import { CardEngine } from '../../src/domain/engines/CardEngine';
import { VariableReplacer } from '../../src/domain/engines/VariableReplacer';
import { VirusManager } from '../../src/domain/engines/VirusManager';
import { BoardEngine } from '../../src/domain/engines/BoardEngine';
import {
  useGameSessionStore,
  SESSION_STORAGE_KEY,
} from '../../src/application/useGameSessionStore';
import { usePlayerStore } from '../../src/application/usePlayerStore';
import { useSettingsStore } from '../../src/application/useSettingsStore';
import {
  CatalogLoader,
  CATALOG_CACHE_KEYS,
} from '../../src/infrastructure/catalogLoader';
import { CatalogProvider } from '../e2e/harness/catalog-provider';
import type { Card, IntensityLevel } from '../../src/domain/types/card';
import type { Player } from '../../src/domain/types/player';
import type { BoardTile } from '../../src/domain/types/board';

describe('Tier 5: White-Box Adversarial Stress Testing & Hardening', () => {
  const testPlayers: Player[] = [
    { id: 'p_1_ana', name: 'Ana', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#ec4899', emoji: '🍸' },
    { id: 'p_2_bernat', name: 'Bernat', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#8b5cf6', emoji: '🍺' },
    { id: 'p_3_clara', name: 'Clara', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#06b6d4', emoji: '🍷' },
    { id: 'p_4_david', name: 'David', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#10b981', emoji: '🍹' },
  ];

  beforeEach(() => {
    adversarialStorage.clear();
    adversarialStorage.shouldThrowOnSet = false;
    mockIdbStore.clear();
    shouldIdbFail = false;
    usePlayerStore.getState().clearPlayers();
    usePlayerStore.getState().setPlayers(testPlayers);
    useGameSessionStore.getState().endSession();
  });

  afterEach(() => {
    adversarialStorage.shouldThrowOnSet = false;
    shouldIdbFail = false;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. EXTREME DECK EXHAUSTION AND CIRCULAR REPLAY
  // =========================================================================
  describe('1. Extreme Deck Exhaustion & Circular Replay Hardening', () => {
    it('TC-T5-EXH-01: should gracefully handle 0-card deck boundary without crashing or invalid state', () => {
      const store = useGameSessionStore.getState();
      store.startCardSession([], 'chaos', { intensity: 2 }, testPlayers);

      const state = useGameSessionStore.getState();
      expect(state.deck.length).toBe(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.currentCard).toBeNull();
      expect(state.isGameOver).toBe(false);

      // Repeated nextCard calls on empty deck must be safe no-ops
      for (let i = 0; i < 5; i++) {
        expect(() => store.nextCard()).not.toThrow();
        expect(useGameSessionStore.getState().currentIndex).toBe(-1);
        expect(useGameSessionStore.getState().isGameOver).toBe(false);
      }

      // Undo on empty deck must safely return false
      expect(store.previousCard()).toBe(false);
      expect(useGameSessionStore.getState().currentIndex).toBe(-1);
    });

    it('TC-T5-EXH-02: should lock at boundary on 1-card deck exhaustion and prevent out-of-bounds increment', () => {
      const singleCard: Card = {
        id: 'solo_01',
        type: 'rule',
        text: '{player1} bebe {drinks}',
        intensity: 2,
        drinks_penalty: 2,
      };

      const store = useGameSessionStore.getState();
      store.startCardSession([singleCard], 'category', { intensity: 2 }, testPlayers);

      expect(useGameSessionStore.getState().currentIndex).toBe(0);
      expect(useGameSessionStore.getState().currentCard?.id).toBe('solo_01');
      expect(useGameSessionStore.getState().isGameOver).toBe(false);

      // First advance on 1-card deck: triggers game over
      store.nextCard();
      const afterExhaust = useGameSessionStore.getState();
      expect(afterExhaust.isGameOver).toBe(true);
      expect(afterExhaust.currentIndex).toBe(0);

      // 10 subsequent rapid nextCard calls must remain locked at index 0 and isGameOver true
      for (let i = 0; i < 10; i++) {
        store.nextCard();
        expect(useGameSessionStore.getState().currentIndex).toBe(0);
        expect(useGameSessionStore.getState().isGameOver).toBe(true);
      }

      // previousCard on 1-card deck with empty history safely returns false
      expect(store.previousCard()).toBe(false);
      expect(useGameSessionStore.getState().currentIndex).toBe(0);
    });

    it('TC-T5-EXH-03: should allow complete backward undo from exhausted game over state to index 0', () => {
      const deck: Card[] = Array.from({ length: 30 }, (_, i) => ({
        id: `card_${i + 1}`,
        type: 'rule',
        text: `{player1} bebe {drinks} en turno ${i + 1}`,
        intensity: 2,
        drinks_penalty: 1,
      }));

      const store = useGameSessionStore.getState();
      store.startCardSession(deck, 'preset', { intensity: 2 }, testPlayers);

      // Step through all 30 cards until exhaustion
      for (let i = 0; i < 29; i++) {
        store.nextCard();
      }
      expect(useGameSessionStore.getState().currentIndex).toBe(29);
      expect(useGameSessionStore.getState().isGameOver).toBe(false);

      // 30th step: triggers exhaustion
      store.nextCard();
      expect(useGameSessionStore.getState().isGameOver).toBe(true);
      expect(useGameSessionStore.getState().currentIndex).toBe(29);

      // Undo from game over back to 0: first undo immediately clears isGameOver
      const firstUndoSuccess = store.previousCard();
      expect(firstUndoSuccess).toBe(true);
      expect(useGameSessionStore.getState().isGameOver).toBe(false);
      expect(useGameSessionStore.getState().currentIndex).toBe(28);

      // Undo remaining 28 times back to 0
      for (let expected = 27; expected >= 0; expected--) {
        const ok = store.previousCard();
        expect(ok).toBe(true);
        expect(useGameSessionStore.getState().currentIndex).toBe(expected);
        expect(useGameSessionStore.getState().isGameOver).toBe(false);
      }

      // At index 0, history is empty: previousCard returns false
      expect(useGameSessionStore.getState().currentIndex).toBe(0);
      expect(store.previousCard()).toBe(false);
      expect(useGameSessionStore.getState().currentIndex).toBe(0);
    });

    it('TC-T5-EXH-04: should cleanly support circular replay / reshuffle without session contamination', () => {
      const deck: Card[] = Array.from({ length: 15 }, (_, i) => ({
        id: `card_circ_${i}`,
        type: 'rule',
        text: `{player1} y {player2} toman {drinks}`,
        intensity: 2,
        drinks_penalty: 2,
      }));

      const store = useGameSessionStore.getState();
      store.startCardSession(deck, 'preset', { intensity: 2 }, testPlayers);

      // Play to end
      for (let i = 0; i < 15; i++) {
        store.nextCard();
      }
      expect(useGameSessionStore.getState().isGameOver).toBe(true);

      // Re-shuffle deck using Fisher-Yates
      const reshuffledDeck = CardEngine.shuffle(deck);
      expect(reshuffledDeck.length).toBe(15);
      const originalIds = new Set(deck.map((c) => c.id));
      for (const c of reshuffledDeck) {
        expect(originalIds.has(c.id)).toBe(true);
      }

      // Start circular replay with reshuffled deck
      store.startCardSession(reshuffledDeck, 'preset', { intensity: 2 }, testPlayers);

      const refreshedState = useGameSessionStore.getState();
      expect(refreshedState.currentIndex).toBe(0);
      expect(refreshedState.isGameOver).toBe(false);
      expect(refreshedState.history.length).toBe(0);
      expect(refreshedState.currentCard?.id).toBe(reshuffledDeck[0].id);

      // Draw 5 cards in replay session smoothly
      for (let i = 0; i < 5; i++) {
        store.nextCard();
      }
      expect(useGameSessionStore.getState().currentIndex).toBe(5);
    });

    it('TC-T5-EXH-05: should handle ultra-large deck exhaustion (1,500 cards) under sustained iteration', () => {
      const largeDeck: Card[] = Array.from({ length: 1500 }, (_, i) => ({
        id: `mega_${i}`,
        type: (i % 10 === 0 ? 'virus' : 'rule') as 'virus' | 'rule',
        text: `{player1} bebe {drinks} en turno ${i}`,
        intensity: 2,
        drinks_penalty: 1,
        duration_rounds: i % 10 === 0 ? 3 : undefined,
      }));

      const store = useGameSessionStore.getState();
      store.startCardSession(largeDeck, 'chaos', { intensity: 2 }, testPlayers);

      // Rapidly advance 500 cards
      for (let i = 0; i < 500; i++) {
        store.nextCard();
      }

      const stateAt500 = useGameSessionStore.getState();
      expect(stateAt500.currentIndex).toBe(500);
      expect(stateAt500.history.length).toBe(500);
      expect(stateAt500.isGameOver).toBe(false);

      // Rapidly undo 50 times
      for (let i = 0; i < 50; i++) {
        const ok = store.previousCard();
        expect(ok).toBe(true);
      }
      expect(useGameSessionStore.getState().currentIndex).toBe(450);
      expect(useGameSessionStore.getState().history.length).toBe(450);
    }, 20000);
  });

  // =========================================================================
  // 2. CONCURRENCY STRESS: 100 RAPID CARD TAPS, ALTERNATING UNDOS & VIRUS ALERTS
  // =========================================================================
  describe('2. Concurrency Stress: 100 Rapid Card Taps, Alternating Undos, and Active Virus Alerts', () => {
    it('TC-T5-CON-01: should survive 100 rapid erratic card transitions with zero unhandled exceptions and strict state invariants', () => {
      // Build deck with virus cards interleaved every 5 cards
      const deck: Card[] = Array.from({ length: 120 }, (_, i) => ({
        id: `tap_card_${i}`,
        type: i % 5 === 0 ? 'virus' : 'rule',
        text: i % 5 === 0
          ? `Virus temporal: {player1} bebe {drinks} con la mano izquierda`
          : `{player1} reta a {player2} a beber {drinks}`,
        intensity: 2,
        drinks_penalty: 1,
        duration_rounds: i % 5 === 0 ? 3 : undefined,
      }));

      const store = useGameSessionStore.getState();
      store.startCardSession(deck, 'chaos', { intensity: 2 }, testPlayers);

      // Erratic sequence of 100 actions: bursts of nextCard, previousCard, and adjustSips
      const operations: Array<'next' | 'prev' | 'sip_up' | 'sip_down' | 'dismiss'> = [];
      const pattern = ['next', 'next', 'next', 'prev', 'next', 'sip_up', 'next', 'prev', 'prev', 'next'];
      for (let i = 0; i < 100; i++) {
        operations.push(pattern[i % pattern.length] as any);
      }

      for (let step = 0; step < operations.length; step++) {
        const op = operations[step];
        if (op === 'next') {
          store.nextCard();
        } else if (op === 'prev') {
          store.previousCard();
        } else if (op === 'sip_up') {
          store.adjustSips('p_1_ana', 1);
        } else if (op === 'sip_down') {
          store.adjustSips('p_1_ana', -1);
        } else if (op === 'dismiss') {
          const expired = useGameSessionStore.getState().expiredVirusesQueue;
          if (expired.length > 0) {
            store.dismissExpiredVirus(expired[0].id);
          }
        }

        // Verify fundamental invariants after every single step
        const currentState = useGameSessionStore.getState();
        expect(currentState.currentIndex).toBeGreaterThanOrEqual(0);
        expect(currentState.currentIndex).toBeLessThan(deck.length);
        expect(currentState.currentCard).not.toBeNull();
        expect(currentState.assignedPlayers.length).toBeGreaterThan(0);
        expect(currentState.calculatedDrinks).toBeGreaterThanOrEqual(1);

        // Strict distinctness: if 2 assigned players, they must not be identical
        if (currentState.assignedPlayers.length >= 2) {
          expect(currentState.assignedPlayers[0].id).not.toBe(currentState.assignedPlayers[1].id);
        }

        // Active viruses must all have roundsRemaining > 0
        for (const v of currentState.activeViruses) {
          expect(v.roundsRemaining).toBeGreaterThan(0);
        }

        // Player drink counts in store must never be negative
        for (const p of usePlayerStore.getState().players) {
          expect(p.sipCount).toBeGreaterThanOrEqual(0);
          expect(p.targetCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('TC-T5-CON-02: should maintain exact temporal consistency for virus countdowns and un-expirations during rapid undos', () => {
      const virusCard: Card = {
        id: 'virus_corona',
        type: 'virus',
        text: 'Regla virus: {player1} debe brindar antes de beber durante 3 rondas.',
        intensity: 2,
        drinks_penalty: 1,
        duration_rounds: 3,
      };

      const normalCards: Card[] = Array.from({ length: 10 }, (_, i) => ({
        id: `norm_${i}`,
        type: 'rule',
        text: `{player1} bebe {drinks}`,
        intensity: 2,
        drinks_penalty: 1,
      }));

      const deck = [virusCard, ...normalCards];
      const store = useGameSessionStore.getState();
      store.startCardSession(deck, 'chaos', { intensity: 2 }, testPlayers);

      // Card 0: Virus spawned with 3 rounds remaining
      let state = useGameSessionStore.getState();
      expect(state.activeViruses.length).toBe(1);
      expect(state.activeViruses[0].roundsRemaining).toBe(3);
      expect(state.expiredVirusesQueue.length).toBe(0);

      // Card 1: 1 tick -> roundsRemaining = 2
      store.nextCard();
      state = useGameSessionStore.getState();
      expect(state.activeViruses.length).toBe(1);
      expect(state.activeViruses[0].roundsRemaining).toBe(2);

      // Card 2: 1 tick -> roundsRemaining = 1
      store.nextCard();
      state = useGameSessionStore.getState();
      expect(state.activeViruses.length).toBe(1);
      expect(state.activeViruses[0].roundsRemaining).toBe(1);

      // Card 3: 1 tick -> roundsRemaining reaches 0 -> expired into queue
      store.nextCard();
      state = useGameSessionStore.getState();
      expect(state.activeViruses.length).toBe(0);
      expect(state.expiredVirusesQueue.length).toBe(1);
      expect(state.expiredVirusesQueue[0].cardId).toBe('virus_corona');

      // UNDO 1 step: Back to Card 2 -> Virus must be UN-EXPIRED and restored to activeViruses with 1 round remaining!
      store.previousCard();
      state = useGameSessionStore.getState();
      expect(state.activeViruses.length).toBe(1);
      expect(state.activeViruses[0].roundsRemaining).toBe(1);
      expect(state.expiredVirusesQueue.length).toBe(0);

      // UNDO another step: Back to Card 1 -> roundsRemaining = 2
      store.previousCard();
      state = useGameSessionStore.getState();
      expect(state.activeViruses.length).toBe(1);
      expect(state.activeViruses[0].roundsRemaining).toBe(2);

      // UNDO another step: Back to Card 0 -> roundsRemaining = 3
      store.previousCard();
      state = useGameSessionStore.getState();
      expect(state.activeViruses.length).toBe(1);
      expect(state.activeViruses[0].roundsRemaining).toBe(3);
    });

    it('TC-T5-CON-03: should manage multiple simultaneous active viruses and rapid queue dismissals', () => {
      const v2: Card = { id: 'v2', type: 'virus', text: 'Virus 2 rondas', intensity: 2, duration_rounds: 2 };
      const v3: Card = { id: 'v3', type: 'virus', text: 'Virus 3 rondas', intensity: 2, duration_rounds: 3 };
      const v4: Card = { id: 'v4', type: 'virus', text: 'Virus 4 rondas', intensity: 2, duration_rounds: 4 };
      const n: Card[] = Array.from({ length: 6 }, (_, i) => ({ id: `n_${i}`, type: 'rule', text: 'Normal', intensity: 2 }));

      const deck = [v2, v3, v4, ...n];
      const store = useGameSessionStore.getState();
      store.startCardSession(deck, 'chaos', { intensity: 2 }, testPlayers);

      // Step to v3 (index 1)
      store.nextCard();
      // Step to v4 (index 2)
      store.nextCard();

      // At index 2: v2 has ticked twice (initial 2 -> 1 -> 0 => expired!), v3 has ticked once (3 -> 2), v4 newly added (4)
      let state = useGameSessionStore.getState();
      expect(state.expiredVirusesQueue.length).toBe(1);
      expect(state.expiredVirusesQueue[0].cardId).toBe('v2');
      expect(state.activeViruses.map((v) => v.cardId)).toEqual(['v3', 'v4']);

      // Dismiss expired v2
      store.dismissExpiredVirus(state.expiredVirusesQueue[0].id);
      expect(useGameSessionStore.getState().expiredVirusesQueue.length).toBe(0);

      // Advance another card: v3 ticks to 1, v4 ticks to 3
      store.nextCard();
      state = useGameSessionStore.getState();
      expect(state.activeViruses.find((v) => v.cardId === 'v3')?.roundsRemaining).toBe(1);
      expect(state.activeViruses.find((v) => v.cardId === 'v4')?.roundsRemaining).toBe(3);
    });
  });

  // =========================================================================
  // 3. CORRUPTED STORAGE FALLBACKS UNDER CONCURRENT WRITES
  // =========================================================================
  describe('3. Corrupted IndexedDB & localStorage Fallbacks under Concurrent Writes', () => {
    it('TC-T5-STO-01: should handle hostile/malformed localStorage gracefully in hasActiveSession and resumeSession', () => {
      const store = useGameSessionStore.getState();
      const maliciousPayloads = [
        '{ malformed json : unexpected token [[',
        '',
        'null',
        '12345',
        '"just a string"',
        '{}',
        JSON.stringify({ isGameOver: true, deck: [{ id: 1 }] }),
        JSON.stringify({ mode: 'cards', currentIndex: -1, deck: [] }),
      ];

      for (const payload of maliciousPayloads) {
        adversarialStorage.setItem(SESSION_STORAGE_KEY, payload);

        // Neither hasActiveSession nor resumeSession may throw
        expect(() => store.hasActiveSession()).not.toThrow();
        expect(store.hasActiveSession()).toBe(false);

        expect(() => store.resumeSession()).not.toThrow();
        expect(store.resumeSession()).toBe(false);
      }
    });

    it('TC-T5-STO-02: should survive localStorage QuotaExceededError and continue seamless in-memory execution', () => {
      const deck: Card[] = [
        { id: 'c1', type: 'rule', text: '{player1} bebe {drinks}', intensity: 2, drinks_penalty: 2 },
        { id: 'c2', type: 'rule', text: '{player2} bebe {drinks}', intensity: 2, drinks_penalty: 1 },
      ];

      // Simulate full disk quota
      adversarialStorage.shouldThrowOnSet = true;
      adversarialStorage.throwErrorType = 'QuotaExceededError';

      const store = useGameSessionStore.getState();

      // Card session operations must continue functioning in memory without throwing
      expect(() => {
        store.startCardSession(deck, 'chaos', { intensity: 2 }, testPlayers);
        store.nextCard();
        store.adjustSips('p_1_ana', 2);
      }).not.toThrow();

      expect(useGameSessionStore.getState().currentIndex).toBe(1);
      expect(usePlayerStore.getState().players.find((p) => p.id === 'p_1_ana')?.sipCount).toBeGreaterThan(0);

      // Board session operations must also continue functioning in memory
      expect(() => {
        store.startBoardSession('guatoca_clasica', [{ id: 1, board_id: 'guatoca_clasica', tile_number: 1, tile_type: 'start', title: 'Salida', description: '', drinks_action: 0, target: 'active_player', action_jump_to: null, turns_lost: 0 }], testPlayers);
        store.rollBoardDice(3);
      }).not.toThrow();
    });

    it('TC-T5-STO-03: should transparently fallback to memoryCache when IndexedDB transactions abort or reject', async () => {
      shouldIdbFail = true;
      idbFailureMessage = 'DOMException: The transaction was aborted, so the request cannot be fulfilled.';

      const testKey = 'test_board_tiles_hardened';
      const testTiles: BoardTile[] = [
        {
          id: 99,
          board_id: 'guatoca_clasica',
          tile_number: 99,
          tile_type: 'finish',
          title: 'Meta Hardened',
          description: 'Finish test tile',
          drinks_action: 0,
          target: 'active_player',
          action_jump_to: null,
          turns_lost: 0,
        },
      ];

      // setToCache should not throw even though IndexedDB rejects
      await expect(CatalogLoader.setToCache(testKey, testTiles)).resolves.not.toThrow();

      // getFromCache should transparently retrieve the value from memoryCache
      const retrieved = await CatalogLoader.getFromCache<BoardTile[]>(testKey);
      expect(retrieved).toBeDefined();
      expect(retrieved?.length).toBe(1);
      expect(retrieved?.[0].title).toBe('Meta Hardened');
    });

    it('TC-T5-STO-04: should handle 50 concurrent asynchronous cache read/write operations without race conditions', async () => {
      const operations: Promise<void>[] = [];

      for (let i = 0; i < 50; i++) {
        const key = `stress_cache_key_${i}`;
        const val = { iteration: i, payload: `data_${i * 42}` };

        operations.push(
          CatalogLoader.setToCache(key, val).then(async () => {
            const readBack = await CatalogLoader.getFromCache<typeof val>(key);
            expect(readBack).toBeDefined();
            expect(readBack?.iteration).toBe(i);
          })
        );
      }

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // 4. DYNAMIC DRINK SCALING EXTREMES ACROSS CHILL, FIESTA, HOT, EXTREMO
  // =========================================================================
  describe('4. Dynamic Drink Scaling Extremes across Chill, Fiesta, Hot, Extremo', () => {
    it('TC-T5-DRK-01: should enforce Chill (Level 1) invariant: strictly 1 sip across extreme base penalties', () => {
      const basePenalties = [0, 1, 2, 3, 5, 10, 50, 99];
      for (const base of basePenalties) {
        const calculated = VariableReplacer.calculateDrinks(1, base);
        expect(calculated).toBe(1);

        const res = VariableReplacer.replaceTokens('{player1} bebe {drinks}', testPlayers, {
          intensity: 1,
          baseDrinks: base,
        });
        expect(res.calculatedDrinks).toBe(1);
        expect(res.interpolatedText).toContain('1 trago');
        expect(res.interpolatedText).not.toContain('tragos');
      }
    });

    it('TC-T5-DRK-02: should enforce Fiesta (Level 2) invariant: strictly [1, 2] sips across all base penalties', () => {
      const basePenalties = [0, 1, 2, 3, 5, 10, 99];
      for (const base of basePenalties) {
        const calculated = VariableReplacer.calculateDrinks(2, base);
        expect(calculated).toBeGreaterThanOrEqual(1);
        expect(calculated).toBeLessThanOrEqual(2);

        const res = VariableReplacer.replaceTokens('{player1} bebe {drinks}', testPlayers, {
          intensity: 2,
          baseDrinks: base,
        });
        expect(res.calculatedDrinks).toBeGreaterThanOrEqual(1);
        expect(res.calculatedDrinks).toBeLessThanOrEqual(2);
        if (res.calculatedDrinks === 1) {
          expect(res.interpolatedText).toContain('1 trago');
        } else {
          expect(res.interpolatedText).toContain('2 tragos');
        }
      }
    });

    it('TC-T5-DRK-03: should enforce Hot (Level 3) invariant: strictly [2, 3] sips across all base penalties', () => {
      const basePenalties = [0, 1, 2, 3, 5, 10, 99];
      for (const base of basePenalties) {
        const calculated = VariableReplacer.calculateDrinks(3, base);
        expect(calculated).toBeGreaterThanOrEqual(2);
        expect(calculated).toBeLessThanOrEqual(3);

        const res = VariableReplacer.replaceTokens('{player1} bebe {drinks}', testPlayers, {
          intensity: 3,
          baseDrinks: base,
        });
        expect(res.calculatedDrinks).toBeGreaterThanOrEqual(2);
        expect(res.calculatedDrinks).toBeLessThanOrEqual(3);
        expect(res.interpolatedText).toMatch(/2 tragos|3 tragos/);
      }
    });

    it('TC-T5-DRK-04: should enforce Extremo (Level 4) invariant: strictly [3, 10] sips across all base penalties', () => {
      // Extremo formula: Math.min(10, Math.max(3, base + 2))
      const testCases = [
        { base: 0, expected: 3 },
        { base: 1, expected: 3 }, // max(3, 1 + 2) = 3
        { base: 2, expected: 4 }, // max(3, 2 + 2) = 4
        { base: 3, expected: 5 }, // max(3, 3 + 2) = 5
        { base: 5, expected: 7 }, // max(3, 5 + 2) = 7
        { base: 8, expected: 10 }, // max(3, 8 + 2) = 10
        { base: 20, expected: 10 }, // capped at 10
        { base: 99, expected: 10 }, // capped at 10
      ];

      for (const tc of testCases) {
        const calculated = VariableReplacer.calculateDrinks(4, tc.base);
        expect(calculated).toBe(tc.expected);

        const res = VariableReplacer.replaceTokens('{player1} bebe {drinks}', testPlayers, {
          intensity: 4,
          baseDrinks: tc.base,
        });
        expect(res.calculatedDrinks).toBe(tc.expected);
        expect(res.interpolatedText).toContain(`${tc.expected} tragos`);
      }
    });

    it('TC-T5-DRK-05: should replace multiple {drinks} tokens in a single card text with identical string values', () => {
      const multiTokenText = 'Toma {drinks}, invita {drinks} a tu derecha, y si fallas, bebes otros {drinks}.';
      const res = VariableReplacer.replaceTokens(multiTokenText, testPlayers, {
        intensity: 3,
        baseDrinks: 2,
      });

      expect(res.calculatedDrinks).toBe(3); // Hot with base 2 -> 3 tragos
      expect(res.interpolatedText).toBe(
        'Toma 3 tragos, invita 3 tragos a tu derecha, y si fallas, bebes otros 3 tragos.'
      );
      expect(res.interpolatedText).not.toContain('{drinks}');
    });
  });

  // =========================================================================
  // 5. UNBIASED DICE ROLL DISTRIBUTION ACROSS 10,000 ROLLS (CHI-SQUARE TEST)
  // =========================================================================
  describe('5. Unbiased Dice Roll Distribution Across 10,000 Rolls with Chi-Square Test', () => {
    it('TC-T5-RNG-01: should satisfy Pearson Chi-Square goodness-of-fit test across 10,000 rolls at alpha = 0.001', () => {
      const rolls = 10000;
      const expected = rolls / 6; // 1666.6667
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      let sum = 0;

      for (let i = 0; i < rolls; i++) {
        const roll = BoardEngine.rollDice();
        expect(Number.isInteger(roll)).toBe(true);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
        counts[roll]++;
        sum += roll;
      }

      // Compute Pearson's Chi-Square statistic: sum((O_k - E)^2 / E)
      let chiSquare = 0;
      for (let face = 1; face <= 6; face++) {
        const diff = counts[face] - expected;
        chiSquare += (diff * diff) / expected;
      }

      const mean = sum / rolls;

      console.log(`[Tier 5 RNG 10k Rolls] Counts:`, counts);
      console.log(`[Tier 5 RNG 10k Rolls] Chi-Square: ${chiSquare.toFixed(4)}, Mean: ${mean.toFixed(4)} (Expected 3.5)`);

      // Critical value for df = 5 at alpha = 0.001 is 20.515
      expect(chiSquare).toBeLessThan(20.515);

      // Mean roll should be within [3.42, 3.58]
      expect(mean).toBeGreaterThan(3.42);
      expect(mean).toBeLessThan(3.58);
    });

    it('TC-T5-RNG-02: should verify lag-1 Markov transition independence across 10,000 consecutive rolls', () => {
      const rolls = 10000;
      // 6 x 6 transition matrix
      const transitions: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
      let prevRoll = BoardEngine.rollDice();

      for (let i = 1; i < rolls; i++) {
        const currRoll = BoardEngine.rollDice();
        transitions[prevRoll - 1][currRoll - 1]++;
        prevRoll = currRoll;
      }

      const expectedPerCell = (rolls - 1) / 36; // 9999 / 36 = 277.75
      let transitionChiSquare = 0;

      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const observed = transitions[r][c];
          // Every transition cell must have non-zero, healthy observations (> 150)
          expect(observed).toBeGreaterThan(150);
          const diff = observed - expectedPerCell;
          transitionChiSquare += (diff * diff) / expectedPerCell;
        }
      }

      console.log(`[Tier 5 RNG Transition Chi-Square] 36 cells, stat: ${transitionChiSquare.toFixed(4)}`);
      // df = (6-1)*(6-1) = 25. Critical value at alpha = 0.001 is 52.62. We allow safe margin of 65.0.
      expect(transitionChiSquare).toBeLessThan(65.0);
    });
  });

  // =========================================================================
  // 6. LA GUATOCA MATCH PLAYED START-TO-FINISH WITH ALL SPECIAL TILES EXERCISED
  // =========================================================================
  describe('6. La Guatoca Match Played Start-to-Finish with All Special Tiles Exercised', () => {
    it('TC-T5-GUA-01: should exercise and verify all special tile mechanics on canonical Clásica 45 board', () => {
      const clasicaTiles = CatalogProvider.getBoardTiles('guatoca_clasica');
      expect(clasicaTiles.length).toBe(45);

      // 1. Oca Jump tile (tile 5 -> 9, extraRoll = true)
      const jumpTile = clasicaTiles.find((t) => t.tile_number === 5)!;
      expect(jumpTile.tile_type).toBe('jump');
      const jumpRes = BoardEngine.resolveTile(jumpTile);
      expect(jumpRes.actionType).toBe('jump');
      expect(jumpRes.destination).toBe(9);
      expect(jumpRes.extraRoll).toBe(true);

      // 2. Cárcel Jail tile (tile 10, turnsLost = 1, drinks = 3)
      const jailTile = clasicaTiles.find((t) => t.tile_number === 10)!;
      expect(jailTile.tile_type).toBe('trap_jail');
      const jailRes = BoardEngine.resolveTile(jailTile);
      expect(jailRes.actionType).toBe('trap_jail');
      expect(jailRes.turnsLost).toBe(1);
      expect(jailRes.drinks).toBe(3);

      // 3. Resacón Trap Back tile (tile 17 -> 14)
      const backTile = clasicaTiles.find((t) => t.tile_number === 17)!;
      expect(backTile.tile_type).toBe('trap_back');
      const backRes = BoardEngine.resolveTile(backTile);
      expect(backRes.actionType).toBe('trap_back');
      expect(backRes.destination).toBe(14);

      // 4. Muerte Skull tile (tile 37 -> 1)
      const skullTile = clasicaTiles.find((t) => t.tile_number === 37)!;
      expect(skullTile.tile_type).toBe('trap_skull');
      const skullRes = BoardEngine.resolveTile(skullTile);
      expect(skullRes.actionType).toBe('trap_skull');
      expect(skullRes.destination).toBe(1);

      // 5. Finish Meta tile (tile 45)
      const finishTile = clasicaTiles.find((t) => t.tile_number === 45)!;
      expect(finishTile.tile_type).toBe('finish');
      const finishRes = BoardEngine.resolveTile(finishTile);
      expect(finishRes.actionType).toBe('finish');
      expect(finishRes.destination).toBe(45);
    });

    it('TC-T5-GUA-02: should execute complete multi-player La Guatoca match in useGameSessionStore with all special tiles encountered', () => {
      const clasicaTiles = CatalogProvider.getBoardTiles('guatoca_clasica');
      const store = useGameSessionStore.getState();
      const p1 = testPlayers[0]; // Ana
      const p2 = testPlayers[1]; // Bernat
      const p3 = testPlayers[2]; // Clara

      usePlayerStore.getState().setPlayers([p1, p2, p3]);
      store.startBoardSession('guatoca_clasica', clasicaTiles, [p1, p2, p3]);

      let state = useGameSessionStore.getState();
      expect(state.boardPositions[p1.id]).toBe(1);
      expect(state.boardPositions[p2.id]).toBe(1);
      expect(state.boardPositions[p3.id]).toBe(1);
      expect(state.currentTurnPlayerIndex).toBe(0);

      // Step 1: Ana rolls 4 (1 + 4 = 5 -> Oca Jump tile!).
      // Oca tile 5 jumps to tile 9 and grants extraRoll = true!
      const roll1 = store.rollBoardDice(4);
      expect(roll1?.destination).toBe(9);
      expect(roll1?.extraRoll).toBe(true);
      expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(9);
      // Turn player must STILL be Ana because of extraRoll!
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(0);

      // Step 2: Ana takes her extra roll (rolls 3: 9 + 3 = 12).
      const roll2 = store.rollBoardDice(3);
      expect(roll2?.destination).toBe(12);
      expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(12);
      // Now turn passes to Bernat (index 1)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);

      // Step 3: Bernat rolls 9 (1 + 9 = 10 -> Cárcel!).
      // Tile 10: turnsLost = 1, drinks = 3
      const roll3 = store.rollBoardDice(9);
      expect(roll3?.destination).toBe(10);
      expect(useGameSessionStore.getState().boardJails[p2.id]).toBe(1);
      // Drinks penalty applied to Bernat
      expect(usePlayerStore.getState().players.find((p) => p.id === p2.id)?.sipCount).toBeGreaterThanOrEqual(3);
      // Turn passes to Clara (index 2)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(2);

      // Step 4: Clara rolls 16 (1 + 16 = 17 -> Resacón Trap Back!).
      // Tile 17: action_jump_to: 14
      const roll4 = store.rollBoardDice(16);
      expect(roll4?.destination).toBe(14);
      expect(useGameSessionStore.getState().boardPositions[p3.id]).toBe(14);
      // Turn cycles back to Ana (index 0)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(0);

      // Step 5: Ana rolls 25 (12 + 25 = 37 -> La Muerte Skull!).
      // Tile 37: resets to tile 1!
      const roll5 = store.rollBoardDice(25);
      expect(roll5?.destination).toBe(1);
      expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(1);
      // Turn passes to Bernat (index 1), who is in jail!
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);

      // Step 6: Bernat's turn in jail. Calling rollBoardDice() must skip!
      const jailSkip = store.rollBoardDice(4);
      expect(jailSkip?.skipped).toBe(true);
      expect(jailSkip?.reason).toBe('jail');
      expect(jailSkip?.remainingJailTurns).toBe(0);
      expect(useGameSessionStore.getState().boardPositions[p2.id]).toBe(10); // Still on 10
      // Turn advances to Clara (index 2)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(2);

      // Step 7: Clara advances to near the finish line (pos 43)
      const roll7 = store.rollBoardDice(29); // 14 + 29 = 43
      expect(roll7?.destination).toBe(43);
      expect(useGameSessionStore.getState().boardPositions[p3.id]).toBe(43);
      // Turn passes to Ana (index 0)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(0);

      // Step 8: Ana rolls normally (1 + 2 = 3)
      store.rollBoardDice(2);
      // Turn passes to Bernat (index 1), who is now freed!
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);

      // Step 9: Bernat rolls 5 freely (10 + 5 = 15)
      const rollBernatFreed = store.rollBoardDice(5);
      expect(rollBernatFreed?.skipped).toBeFalsy();
      expect(rollBernatFreed?.destination).toBe(15);
      // Turn passes to Clara (index 2, position 43)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(2);

      // Step 10: Overshoot Bounce-Back Verification:
      // Clara is at tile 43. Rolls 5 on a 45-tile board:
      // 43 + 5 = 48 > 45 => excess = 3 => bounced destination = 45 - 3 = 42!
      // In canonical Guatoca Clásica, tile 42 is a 'trap_back' tile ('Perdiste el DNI', jump_to: 38).
      // So bouncing on tile 42 immediately triggers the trap_back action to tile 38!
      const rollBounce = store.rollBoardDice(5);
      expect(rollBounce?.destination).toBe(38);
      expect(useGameSessionStore.getState().boardPositions[p3.id]).toBe(38);
      expect(useGameSessionStore.getState().isGameOver).toBe(false);

      // Turn passes to Ana (currently at 3), then Bernat (currently at 15), back to Clara
      store.rollBoardDice(3); // Ana: 3 + 3 = 6 (Challenge, no jump)
      store.rollBoardDice(1); // Bernat: 15 + 1 = 16 (Drink, no jump)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(2);

      // Step 11: Clara advances from 38 to 43 (rolls 5: 38 + 5 = 43)
      const rollClara43 = store.rollBoardDice(5);
      expect(rollClara43?.destination).toBe(43);
      expect(useGameSessionStore.getState().boardPositions[p3.id]).toBe(43);

      // Turn passes to Ana (at 6), then Bernat (at 16/14), back to Clara
      store.rollBoardDice(1); // Ana: 6 + 1 = 7 (Drink, no jump)
      store.rollBoardDice(1); // Bernat: 16 + 1 = 17 (Trap back to 14, no extra roll)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(2);

      // Step 12: Exact Victory Landing on Meta:
      // Clara is at tile 43. Rolls exact 2 => 43 + 2 = 45 (Meta)!
      const rollVictory = store.rollBoardDice(2);
      expect(rollVictory?.destination).toBe(45);
      expect(rollVictory?.isVictory).toBe(true);
      expect(rollVictory?.winner?.name).toBe('Clara');

      const finalState = useGameSessionStore.getState();
      expect(finalState.isGameOver).toBe(true);
      expect(finalState.winner?.name).toBe('Clara');
      expect(finalState.boardPositions[p3.id]).toBe(45);

      // Step 12: Subsequent roll attempt on finished game returns null
      const postVictoryRoll = store.rollBoardDice(2);
      expect(postVictoryRoll).toBeNull();
    });

    it('TC-T5-GUA-03: should verify jump tile leading directly to Meta triggers instant victory (M5 hardening check)', () => {
      const store = useGameSessionStore.getState();
      const p1 = testPlayers[0];

      // Custom board where tile 44 jumps directly to Meta 45
      const customTiles: BoardTile[] = [
        { id: 1, board_id: 'guatoca_clasica', tile_number: 1, tile_type: 'start', title: 'Start', description: '', drinks_action: 0, target: 'active_player', action_jump_to: null, turns_lost: 0 },
        { id: 44, board_id: 'guatoca_clasica', tile_number: 44, tile_type: 'jump', title: 'Salto a la Gloria', description: '¡Saltas a la meta!', drinks_action: 0, target: 'active_player', action_jump_to: 45, turns_lost: 0 },
        { id: 45, board_id: 'guatoca_clasica', tile_number: 45, tile_type: 'finish', title: 'Meta', description: '', drinks_action: 0, target: 'active_player', action_jump_to: null, turns_lost: 0 },
      ];

      usePlayerStore.getState().setPlayers([p1]);
      store.startBoardSession('guatoca_clasica', customTiles, [p1]);

      // Roll 43 from tile 1 to land on tile 44
      const result = store.rollBoardDice(43);
      expect(result?.destination).toBe(45);
      expect(result?.isVictory).toBe(true);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);
      expect(useGameSessionStore.getState().winner?.id).toBe(p1.id);
    });
  });
});
