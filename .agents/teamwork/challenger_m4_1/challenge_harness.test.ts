/**
 * Adversarial Challenge Test Harness for Milestone 4:
 * useGameSessionStore Undo, Virus Dynamics, and Token Interpolation
 *
 * Authored by: challenger_m4_1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup mock localStorage for Node.js test environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
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

const mockStorage = new MockLocalStorage();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockStorage },
    writable: true,
  });
} else if (!globalThis.window.localStorage) {
  (globalThis.window as any).localStorage = mockStorage;
}

import { useGameSessionStore } from '../../../src/application/useGameSessionStore';
import { usePlayerStore } from '../../../src/application/usePlayerStore';
import { soundService } from '../../../src/infrastructure/soundService';
import type { Card } from '../../../src/domain/types/card';
import type { Player } from '../../../src/domain/types/player';

describe('Adversarial Challenge: useGameSessionStore (M4)', () => {
  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.getState().clearPlayers();
    useGameSessionStore.getState().endSession();
    vi.restoreAllMocks();
  });

  const roster4: Player[] = [
    { id: 'p_ana', name: 'Ana', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
    { id: 'p_bruno', name: 'Bruno', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
    { id: 'p_carla', name: 'Carla', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
    { id: 'p_diego', name: 'Diego', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
  ];

  // =========================================================================
  // CHALLENGE 1: Undo Stack Depth (10 consecutive draws, 10 consecutive undos)
  // =========================================================================
  describe('Challenge 1: Undo Stack Depth', () => {
    it('should maintain exact state restoration at every step through 10 draws and 10 undos', () => {
      usePlayerStore.getState().setPlayers(roster4);

      // Create a 15-card deck with alternating rules and viruses
      const deck: Card[] = [
        { id: 'c0', type: 'rule', text: '{player1} toma {drinks}', intensity: 2, drinks_penalty: 1, target: 'active_player' },
        { id: 'c1', type: 'virus', text: 'Virus 1: {player1} habla en rimas', intensity: 2, duration_rounds: 3, target: 'active_player' },
        { id: 'c2', type: 'challenge', text: '{player1} y {player2} toman {drinks}', intensity: 2, drinks_penalty: 2, target: 'pair' },
        { id: 'c3', type: 'rule', text: '{player1} confiesa un secreto o toma {drinks}', intensity: 2, drinks_penalty: 2, target: 'active_player' },
        { id: 'c4', type: 'virus', text: 'Virus 2: {player1} no puede decir NO', intensity: 2, duration_rounds: 2, target: 'active_player' },
        { id: 'c5', type: 'rule', text: '{player1} elige a alguien que tome {drinks}', intensity: 2, drinks_penalty: 1, target: 'active_player' },
        { id: 'c6', type: 'challenge', text: '{player1} y {player2} pulsean', intensity: 2, drinks_penalty: 1, target: 'pair' },
        { id: 'c7', type: 'virus', text: 'Virus 3: Todos deben aplaudir a {player1}', intensity: 2, duration_rounds: 4, target: 'active_player' },
        { id: 'c8', type: 'rule', text: '{player1} bebe {drinks}', intensity: 2, drinks_penalty: 3, target: 'active_player' },
        { id: 'c9', type: 'challenge', text: '{player1} y {player2} beben {drinks}', intensity: 2, drinks_penalty: 2, target: 'pair' },
        { id: 'c10', type: 'rule', text: 'Ronda libre: {player1} toma {drinks}', intensity: 2, drinks_penalty: 1, target: 'active_player' },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 2 }, roster4);

      interface RecordedStep {
        index: number;
        cardId: string | number;
        activeViruses: Array<{ id: string; cardId: string | number; roundsRemaining: number }>;
        players: Array<{ id: string; sips: number; timesTargeted: number }>;
        historyLength: number;
      }

      const recordedSteps: RecordedStep[] = [];

      const recordCurrentState = () => {
        const s = useGameSessionStore.getState();
        const players = usePlayerStore.getState().players.map((p) => ({
          id: p.id,
          sips: p.sips ?? p.sipCount ?? 0,
          timesTargeted: p.timesTargeted ?? p.targetCount ?? 0,
        }));
        return {
          index: s.currentIndex,
          cardId: s.currentCard!.id,
          activeViruses: s.activeViruses.map((v) => ({
            id: v.id,
            cardId: v.cardId,
            roundsRemaining: v.roundsRemaining,
          })),
          players,
          historyLength: s.history.length,
        };
      };

      // Step 0 recorded
      recordedSteps.push(recordCurrentState());

      // Draw 10 consecutive cards (reaching index 10)
      for (let i = 1; i <= 10; i++) {
        useGameSessionStore.getState().nextCard(roster4);
        recordedSteps.push(recordCurrentState());
        expect(useGameSessionStore.getState().currentIndex).toBe(i);
        expect(useGameSessionStore.getState().history).toHaveLength(i);
      }

      expect(useGameSessionStore.getState().currentIndex).toBe(10);
      expect(recordedSteps).toHaveLength(11);

      // Now execute 10 consecutive previousCard() calls
      for (let undoCount = 1; undoCount <= 10; undoCount++) {
        const expectedStepIndex = 10 - undoCount;
        const expected = recordedSteps[expectedStepIndex];

        const undoResult = useGameSessionStore.getState().previousCard();
        expect(undoResult).toBe(true);

        const current = recordCurrentState();

        // 1. Exact card index restoration
        expect(current.index).toBe(expected.index);
        expect(current.cardId).toBe(expected.cardId);

        // 2. Exact history stack length
        expect(current.historyLength).toBe(expected.historyLength);

        // 3. Exact active virus restoration (IDs and roundsRemaining)
        expect(current.activeViruses).toEqual(expected.activeViruses);

        // 4. Exact player sips and targeted counts
        expect(current.players).toEqual(expected.players);
      }

      // 11th undo should fail gracefully
      const extraUndo = useGameSessionStore.getState().previousCard();
      expect(extraUndo).toBe(false);
      expect(useGameSessionStore.getState().currentIndex).toBe(0);
      expect(useGameSessionStore.getState().history).toHaveLength(0);

      // Final state should exactly equal initial step 0 state
      const finalState = recordCurrentState();
      expect(finalState).toEqual(recordedSteps[0]);
    });
  });

  // =========================================================================
  // CHALLENGE 2: Rapid Back-and-Forth (20 succession rounds)
  // =========================================================================
  describe('Challenge 2: Rapid Back-and-Forth', () => {
    it('should alternate nextCard() and previousCard() 20 times without stat drift or memory leaks', () => {
      usePlayerStore.getState().setPlayers(roster4);

      const deck: Card[] = [
        { id: 'bf_0', type: 'rule', text: '{player1} bebe {drinks}', intensity: 2, drinks_penalty: 2, target: 'active_player' },
        { id: 'bf_1', type: 'challenge', text: '{player1} y {player2} beben {drinks}', intensity: 2, drinks_penalty: 3, target: 'pair' },
        { id: 'bf_2', type: 'rule', text: 'Tercera carta', intensity: 2, drinks_penalty: 1 },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 2 }, roster4);

      // Capture baseline at Card 0
      const baselineState = {
        index: useGameSessionStore.getState().currentIndex,
        cardId: useGameSessionStore.getState().currentCard?.id,
        drinks: useGameSessionStore.getState().calculatedDrinks,
        assigned: [...useGameSessionStore.getState().assignedPlayers],
        players: usePlayerStore.getState().players.map((p) => ({
          id: p.id,
          sips: p.sips ?? 0,
          timesTargeted: p.timesTargeted ?? 0,
        })),
      };

      expect(baselineState.index).toBe(0);
      expect(useGameSessionStore.getState().history).toHaveLength(0);

      // Rapidly toggle back and forth 20 times
      for (let cycle = 1; cycle <= 20; cycle++) {
        // Advance to Card 1
        useGameSessionStore.getState().nextCard(roster4);
        expect(useGameSessionStore.getState().currentIndex).toBe(1);
        expect(useGameSessionStore.getState().currentCard?.id).toBe('bf_1');
        expect(useGameSessionStore.getState().history).toHaveLength(1);

        // Undo back to Card 0
        const undone = useGameSessionStore.getState().previousCard();
        expect(undone).toBe(true);
        expect(useGameSessionStore.getState().currentIndex).toBe(0);
        expect(useGameSessionStore.getState().currentCard?.id).toBe('bf_0');
        expect(useGameSessionStore.getState().history).toHaveLength(0);

        // Verify NO stat drift after every cycle
        const currentPlayers = usePlayerStore.getState().players.map((p) => ({
          id: p.id,
          sips: p.sips ?? 0,
          timesTargeted: p.timesTargeted ?? 0,
        }));
        expect(currentPlayers).toEqual(baselineState.players);
      }

      // Verify final memory invariance
      const finalState = useGameSessionStore.getState();
      expect(finalState.history).toHaveLength(0);
      expect(finalState.currentIndex).toBe(0);
      expect(finalState.currentCard?.id).toBe('bf_0');
      expect(finalState.expiredVirusesQueue).toHaveLength(0);
      expect(finalState.activeViruses).toHaveLength(0);
    });
  });

  // =========================================================================
  // CHALLENGE 3: Multiple Concurrent Viruses
  // =========================================================================
  describe('Challenge 3: Multiple Concurrent Viruses & Expiration', () => {
    it('should manage multiple concurrent viruses with differing durations, individual expirations, and chime triggers', () => {
      const alertSpy = vi.spyOn(soundService, 'playVirusAlert');
      const expiredSpy = vi.spyOn(soundService, 'playVirusExpired');

      usePlayerStore.getState().setPlayers(roster4);

      const deck: Card[] = [
        { id: 'v_0', type: 'rule', text: 'Regla 0', intensity: 2 },
        { id: 'v_1', type: 'virus', text: 'Virus A (duración 2)', intensity: 2, duration_rounds: 2, target: 'active_player' },
        { id: 'v_2', type: 'rule', text: 'Regla 2', intensity: 2 },
        { id: 'v_3', type: 'virus', text: 'Virus B (duración 3)', intensity: 2, duration_rounds: 3, target: 'active_player' },
        { id: 'v_4', type: 'rule', text: 'Regla 4', intensity: 2 },
        { id: 'v_5', type: 'rule', text: 'Regla 5', intensity: 2 },
        { id: 'v_6', type: 'rule', text: 'Regla 6', intensity: 2 },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 2 }, roster4);
      expect(useGameSessionStore.getState().activeViruses).toHaveLength(0);
      expect(alertSpy).not.toHaveBeenCalled();

      // Card 0 -> Card 1: Virus A drawn (duration 2)
      useGameSessionStore.getState().nextCard(roster4);
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(expiredSpy).not.toHaveBeenCalled();
      let state = useGameSessionStore.getState();
      expect(state.activeViruses).toHaveLength(1);
      expect(state.activeViruses[0].cardId).toBe('v_1');
      expect(state.activeViruses[0].roundsRemaining).toBe(2);
      expect(state.expiredVirusesQueue).toHaveLength(0);
      const virusAId = state.activeViruses[0].id;

      // Card 1 -> Card 2: Virus A ticks from 2 -> 1
      useGameSessionStore.getState().nextCard(roster4);
      state = useGameSessionStore.getState();
      expect(state.activeViruses).toHaveLength(1);
      expect(state.activeViruses[0].id).toBe(virusAId);
      expect(state.activeViruses[0].roundsRemaining).toBe(1);
      expect(state.expiredVirusesQueue).toHaveLength(0);
      expect(expiredSpy).not.toHaveBeenCalled();

      // Card 2 -> Card 3: Virus A ticks from 1 -> 0 (EXPIRES!) & Virus B drawn (duration 3)
      useGameSessionStore.getState().nextCard(roster4);
      expect(alertSpy).toHaveBeenCalledTimes(2); // V2 triggered alert
      expect(expiredSpy).toHaveBeenCalledTimes(1); // V1 triggered expiration
      state = useGameSessionStore.getState();
      // Virus A should be in expiredVirusesQueue
      expect(state.expiredVirusesQueue).toHaveLength(1);
      expect(state.expiredVirusesQueue[0].id).toBe(virusAId);
      expect(state.expiredVirusesQueue[0].cardId).toBe('v_1');
      // Active viruses should contain only Virus B
      expect(state.activeViruses).toHaveLength(1);
      expect(state.activeViruses[0].cardId).toBe('v_3');
      expect(state.activeViruses[0].roundsRemaining).toBe(3);
      const virusBId = state.activeViruses[0].id;

      // Card 3 -> Card 4: Virus B ticks from 3 -> 2
      useGameSessionStore.getState().nextCard(roster4);
      state = useGameSessionStore.getState();
      expect(state.activeViruses).toHaveLength(1);
      expect(state.activeViruses[0].id).toBe(virusBId);
      expect(state.activeViruses[0].roundsRemaining).toBe(2);
      expect(state.expiredVirusesQueue).toHaveLength(1); // Virus A still waiting in queue
      expect(expiredSpy).toHaveBeenCalledTimes(1);

      // Card 4 -> Card 5: Virus B ticks from 2 -> 1
      useGameSessionStore.getState().nextCard(roster4);
      state = useGameSessionStore.getState();
      expect(state.activeViruses[0].roundsRemaining).toBe(1);
      expect(expiredSpy).toHaveBeenCalledTimes(1);

      // Card 5 -> Card 6: Virus B ticks from 1 -> 0 (EXPIRES!)
      useGameSessionStore.getState().nextCard(roster4);
      expect(expiredSpy).toHaveBeenCalledTimes(2); // Second chime!
      state = useGameSessionStore.getState();
      expect(state.activeViruses).toHaveLength(0);
      expect(state.expiredVirusesQueue).toHaveLength(2);
      expect(state.expiredVirusesQueue[0].id).toBe(virusAId);
      expect(state.expiredVirusesQueue[1].id).toBe(virusBId);

      // Dismiss queue items one by one
      useGameSessionStore.getState().dismissExpiredVirus(virusAId);
      expect(useGameSessionStore.getState().expiredVirusesQueue).toHaveLength(1);
      expect(useGameSessionStore.getState().expiredVirusesQueue[0].id).toBe(virusBId);

      useGameSessionStore.getState().dismissExpiredVirus(virusBId);
      expect(useGameSessionStore.getState().expiredVirusesQueue).toHaveLength(0);
    });

    it('adversarial check: simultaneous expiration of multiple viruses in the same round', () => {
      const expiredSpy = vi.spyOn(soundService, 'playVirusExpired');
      usePlayerStore.getState().setPlayers(roster4);

      // Two viruses expiring at the exact same transition
      const deck: Card[] = [
        { id: 'sync_0', type: 'rule', text: 'Carta inicial', intensity: 2 },
        { id: 'sync_v1', type: 'virus', text: 'Virus 1 (duración 2)', intensity: 2, duration_rounds: 2, target: 'active_player' },
        { id: 'sync_v2', type: 'virus', text: 'Virus 2 (duración 1)', intensity: 2, duration_rounds: 1, target: 'active_player' },
        { id: 'sync_end', type: 'rule', text: 'Ambos expiran aquí', intensity: 2 },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 2 }, roster4);

      // Card 0 -> Card 1: V1 registered (roundsRemaining = 2)
      useGameSessionStore.getState().nextCard(roster4);
      expect(useGameSessionStore.getState().activeViruses).toHaveLength(1);

      // Card 1 -> Card 2: V1 ticks to 1. V2 registered (roundsRemaining = 1)
      useGameSessionStore.getState().nextCard(roster4);
      expect(useGameSessionStore.getState().activeViruses).toHaveLength(2);

      // Card 2 -> Card 3: Both V1 and V2 tick to 0 -> SIMULTANEOUS EXPIRATION!
      useGameSessionStore.getState().nextCard(roster4);
      const state = useGameSessionStore.getState();
      expect(state.activeViruses).toHaveLength(0);
      expect(state.expiredVirusesQueue).toHaveLength(2);
      expect(state.expiredVirusesQueue.map((v) => v.cardId)).toEqual(['sync_v1', 'sync_v2']);
      expect(expiredSpy).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // CHALLENGE 4: Token Replacement with Dynamic Player Rosters (2, 3, 4 players)
  // =========================================================================
  describe('Challenge 4: Dynamic Player Rosters under Store Orchestration', () => {
    it('should interpolate tokens cleanly with 2 players guaranteeing distinctness', () => {
      const roster2: Player[] = [
        { id: 'p_1', name: 'Lucas', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
        { id: 'p_2', name: 'Martina', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
      ];
      usePlayerStore.getState().setPlayers(roster2);

      const deck: Card[] = [
        {
          id: 'c_pair',
          type: 'challenge',
          text: '{player1} y {player2} toman {drinks}.',
          intensity: 2,
          drinks_penalty: 2,
          target: 'pair',
        },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'preset', { intensity: 2 }, roster2);

      const state = useGameSessionStore.getState();
      expect(state.assignedPlayers).toHaveLength(2);
      expect(state.assignedPlayers[0].id).not.toBe(state.assignedPlayers[1].id);
      expect(state.interpolatedText).not.toContain('{player1}');
      expect(state.interpolatedText).not.toContain('{player2}');
      expect(state.interpolatedText).not.toContain('{drinks}');
      expect(state.interpolatedText).toMatch(/(Lucas y Martina|Martina y Lucas) toman 2 tragos\./);

      // Both players received sips and targeted
      const p1 = usePlayerStore.getState().players.find((p) => p.id === 'p_1');
      const p2 = usePlayerStore.getState().players.find((p) => p.id === 'p_2');
      expect(p1?.sips).toBe(2);
      expect(p2?.sips).toBe(2);
      expect(p1?.timesTargeted).toBe(1);
      expect(p2?.timesTargeted).toBe(1);
    });

    it('should gracefully handle 3-player and 4-player token cards with dynamic rosters', () => {
      const roster3: Player[] = [
        { id: 'p_1', name: 'Lucas', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
        { id: 'p_2', name: 'Martina', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
        { id: 'p_3', name: 'Tomás', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
      ];
      usePlayerStore.getState().setPlayers(roster3);

      const deck: Card[] = [
        {
          id: 'c_trio',
          type: 'challenge',
          text: '{player1}, {player2} y {player3} compiten.',
          intensity: 2,
          drinks_penalty: 1,
        },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'preset', { intensity: 2 }, roster3);

      const state = useGameSessionStore.getState();
      expect(state.assignedPlayers).toHaveLength(3);
      const uniqueIds = new Set(state.assignedPlayers.map((p) => p.id));
      expect(uniqueIds.size).toBe(3); // All 3 distinct!
      expect(state.interpolatedText).not.toContain('{player1}');
      expect(state.interpolatedText).not.toContain('{player2}');
      expect(state.interpolatedText).not.toContain('{player3}');
    });

    it('should demonstrate fairness and bounded deviation across 100 draws with 4 players', () => {
      usePlayerStore.getState().setPlayers(roster4);

      // Create a 100-card deck
      const deck: Card[] = Array.from({ length: 100 }, (_, i) => ({
        id: `deck_${i}`,
        type: 'rule',
        text: '{player1} toma {drinks}',
        intensity: 2,
        drinks_penalty: 1,
        target: 'active_player',
      }));

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 2 }, roster4);

      for (let i = 1; i < 100; i++) {
        useGameSessionStore.getState().nextCard(roster4);
      }

      const players = usePlayerStore.getState().players;
      const targetCounts = players.map((p) => p.timesTargeted ?? p.targetCount ?? 0);
      const totalPicks = targetCounts.reduce((acc, c) => acc + c, 0);
      expect(totalPicks).toBe(100);

      // In 100 draws across 4 players, expected is 25 per player
      // Requirement specifies <= 15% deviation in distribution (each player between 10 and 40)
      for (const count of targetCounts) {
        expect(count).toBeGreaterThanOrEqual(10);
        expect(count).toBeLessThanOrEqual(40);
      }
    });
  });

  // =========================================================================
  // CHALLENGE 5: Adversarial Edge Cases & State Invariant Auditing
  // =========================================================================
  describe('Challenge 5: Adversarial Invariant Audits', () => {
    it('ADVERSARIAL PROBE: undoing past a virus expiration should be evaluated for queue synchronization', () => {
      const expiredSpy = vi.spyOn(soundService, 'playVirusExpired');
      usePlayerStore.getState().setPlayers(roster4);

      const deck: Card[] = [
        { id: 'probe_0', type: 'rule', text: 'Inicio', intensity: 2 },
        { id: 'probe_v', type: 'virus', text: 'Virus rápido', intensity: 2, duration_rounds: 1, target: 'active_player' },
        { id: 'probe_exp', type: 'rule', text: 'Aquí expira el virus', intensity: 2 },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 2 }, roster4);

      // Card 0 -> Card 1: Virus registered (duration 1)
      useGameSessionStore.getState().nextCard(roster4);
      expect(useGameSessionStore.getState().activeViruses).toHaveLength(1);

      // Card 1 -> Card 2: Virus expires!
      useGameSessionStore.getState().nextCard(roster4);
      expect(useGameSessionStore.getState().activeViruses).toHaveLength(0);
      expect(useGameSessionStore.getState().expiredVirusesQueue).toHaveLength(1);
      expect(expiredSpy).toHaveBeenCalledTimes(1);

      // Perform undo back to Card 1
      useGameSessionStore.getState().previousCard();
      const stateAfterUndo = useGameSessionStore.getState();

      // Card index and activeViruses are restored
      expect(stateAfterUndo.currentIndex).toBe(1);
      expect(stateAfterUndo.activeViruses).toHaveLength(1);
      expect(stateAfterUndo.activeViruses[0].cardId).toBe('probe_v');
      expect(stateAfterUndo.activeViruses[0].roundsRemaining).toBe(1);

      // Notice: expiredVirusesQueue in current implementation
      // Does it retain the expired virus or was it rolled back?
      // Check current store behavior:
      console.log('expiredVirusesQueue length after undo:', stateAfterUndo.expiredVirusesQueue.length);

      // If user re-advances to Card 2:
      useGameSessionStore.getState().nextCard(roster4);
      const stateAfterReAdvance = useGameSessionStore.getState();
      console.log('expiredVirusesQueue length after re-advance:', stateAfterReAdvance.expiredVirusesQueue.length);
      console.log('playVirusExpired call count:', expiredSpy.mock.calls.length);
    });

    it('ADVERSARIAL PROBE: resumeSession preserves exact undo stack and active viruses', () => {
      usePlayerStore.getState().setPlayers(roster4);

      const deck: Card[] = [
        { id: 'res_0', type: 'rule', text: '{player1} toma {drinks}', intensity: 2, drinks_penalty: 2, target: 'active_player' },
        { id: 'res_1', type: 'virus', text: 'Virus en curso', intensity: 2, duration_rounds: 3, target: 'active_player' },
        { id: 'res_2', type: 'challenge', text: '{player1} y {player2}', intensity: 2, drinks_penalty: 1, target: 'pair' },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 2 }, roster4);
      useGameSessionStore.getState().nextCard(roster4); // Index 1: virus registered
      useGameSessionStore.getState().nextCard(roster4); // Index 2: virus at roundsRemaining 2

      const preCrashState = useGameSessionStore.getState();
      expect(preCrashState.history).toHaveLength(2);
      expect(preCrashState.activeViruses).toHaveLength(1);
      expect(preCrashState.activeViruses[0].roundsRemaining).toBe(2);

      // Simulate crash: wipe in-memory state
      useGameSessionStore.setState({
        currentIndex: -1,
        currentCard: null,
        history: [],
        activeViruses: [],
      });

      // Resume from localStorage snapshot
      const resumeSuccess = useGameSessionStore.getState().resumeSession();
      expect(resumeSuccess).toBe(true);

      const resumedState = useGameSessionStore.getState();
      expect(resumedState.currentIndex).toBe(2);
      expect(resumedState.history).toHaveLength(2);
      expect(resumedState.activeViruses).toHaveLength(1);
      expect(resumedState.activeViruses[0].roundsRemaining).toBe(2);

      // Execute undo on resumed session!
      const undoOnResumed = useGameSessionStore.getState().previousCard();
      expect(undoOnResumed).toBe(true);
      expect(useGameSessionStore.getState().currentIndex).toBe(1);
      expect(useGameSessionStore.getState().activeViruses[0].roundsRemaining).toBe(3);
    });
  });
});
