/**
 * Unit & Integration Tests: useGameSessionStore
 * Comprehensive verification of card sessions, variable token interpolation,
 * virus lifecycle & expiration, reversible undo history, La Guatoca board movement,
 * overshoot bounce-back math, jail turns, victory condition, and localStorage crash recovery.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup browser globals for Node test environment
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

import {
  useGameSessionStore,
  SESSION_STORAGE_KEY,
} from '../useGameSessionStore';
import { usePlayerStore } from '../usePlayerStore';
import { soundService } from '../../infrastructure/soundService';
import type { Card } from '../../domain/types/card';
import type { BoardTile } from '../../domain/types/board';

describe('useGameSessionStore (R4)', () => {
  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.getState().clearPlayers();
    useGameSessionStore.getState().endSession();
    vi.restoreAllMocks();
  });

  const samplePlayers = [
    { id: 'p_1_lucas', name: 'Lucas', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
    { id: 'p_2_martina', name: 'Martina', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
    { id: 'p_3_tomas', name: 'Tomás', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0 },
  ];

  const sampleDeck: Card[] = [
    {
      id: 101,
      type: 'rule',
      text: '{player1} toma {drinks} si alguna vez llegó tarde.',
      intensity: 2,
      drinks_penalty: 2,
      target: 'active_player',
    },
    {
      id: 102,
      type: 'virus',
      text: '{player1} tiene que hablar con acento extranjero durante 2 rondas.',
      intensity: 2,
      duration_rounds: 2,
      target: 'active_player',
    },
    {
      id: 103,
      type: 'challenge',
      text: '{player1} y {player2} hacen un duelo de miradas.',
      intensity: 2,
      drinks_penalty: 1,
      target: 'pair',
    },
    {
      id: 104,
      type: 'rule',
      text: 'Ronda final de tragos libres.',
      intensity: 1,
    },
  ];

  const sampleBoardTiles: BoardTile[] = [
    {
      id: 1,
      board_id: 'guatoca_clasica',
      tile_number: 1,
      tile_type: 'start',
      title: 'Salida',
      description: 'Casilla de inicio',
      drinks_action: 0,
      target: 'self',
      action_jump_to: null,
      turns_lost: 0,
      icon: 'flag',
    },
    {
      id: 5,
      board_id: 'guatoca_clasica',
      tile_number: 5,
      tile_type: 'jump',
      title: 'De bar en bar',
      description: 'Salta a la casilla 9 y tira otra vez',
      drinks_action: 0,
      target: 'self',
      action_jump_to: 9,
      turns_lost: 0,
      icon: 'beer',
    },
    {
      id: 9,
      board_id: 'guatoca_clasica',
      tile_number: 9,
      tile_type: 'drink',
      title: 'Trago express',
      description: 'Bebe 2 tragos',
      drinks_action: 2,
      target: 'self',
      action_jump_to: null,
      turns_lost: 0,
      icon: 'wine',
    },
    {
      id: 10,
      board_id: 'guatoca_clasica',
      tile_number: 10,
      tile_type: 'trap_jail',
      title: 'Cárcel',
      description: 'Pierdes 2 turnos',
      drinks_action: 1,
      target: 'self',
      action_jump_to: null,
      turns_lost: 2,
      icon: 'jail',
    },
    {
      id: 37,
      board_id: 'guatoca_clasica',
      tile_number: 37,
      tile_type: 'trap_skull',
      title: 'Calavera',
      description: 'Vuelves a la casilla 1',
      drinks_action: 3,
      target: 'self',
      action_jump_to: 1,
      turns_lost: 0,
      icon: 'skull',
    },
    {
      id: 45,
      board_id: 'guatoca_clasica',
      tile_number: 45,
      tile_type: 'finish',
      title: 'Meta',
      description: '¡Has ganado la partida!',
      drinks_action: 0,
      target: 'self',
      action_jump_to: null,
      turns_lost: 0,
      icon: 'trophy',
    },
  ];

  // ==========================================
  // SECTION 1: Card Session Flow & Tokens
  // ==========================================
  describe('Card Session Flow & Tokens', () => {
    it('TC-SES-01: startCardSession should initialize card deck, interpolate first card tokens and trigger swipe sound', () => {
      const swipeSpy = vi.spyOn(soundService, 'playSwipe');
      usePlayerStore.getState().setPlayers(samplePlayers);

      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      const state = useGameSessionStore.getState();
      expect(state.mode).toBe('category');
      expect(state.deck).toHaveLength(4);
      expect(state.currentIndex).toBe(0);
      expect(state.currentCard?.id).toBe(101);
      expect(state.interpolatedText).toMatch(/(Lucas|Martina|Tomás) toma 2 tragos/);
      expect(state.assignedPlayers).toHaveLength(1);
      expect(state.calculatedDrinks).toBe(2);
      expect(swipeSpy).toHaveBeenCalled();

      // Assigned player had sips & targeted updated
      const assigned = state.assignedPlayers[0];
      const playerInStore = usePlayerStore.getState().players.find((p) => p.id === assigned.id);
      expect(playerInStore?.timesTargeted).toBeGreaterThanOrEqual(1);
      expect(playerInStore?.sips).toBe(2);
    });

    it('TC-SES-02: startCardSession with empty deck should gracefully set idle state', () => {
      useGameSessionStore.getState().startCardSession([], 'chaos', { intensity: 2 }, samplePlayers);

      const state = useGameSessionStore.getState();
      expect(state.currentIndex).toBe(-1);
      expect(state.currentCard).toBeNull();
      expect(state.deck).toHaveLength(0);
      expect(state.isGameOver).toBe(false);
    });

    it('TC-SES-03: nextCard should save history snapshot and progress to next card', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      expect(useGameSessionStore.getState().currentIndex).toBe(0);
      expect(useGameSessionStore.getState().history).toHaveLength(0);

      // Advance to card 1 (virus card)
      useGameSessionStore.getState().nextCard(samplePlayers);

      const state = useGameSessionStore.getState();
      expect(state.currentIndex).toBe(1);
      expect(state.currentCard?.id).toBe(102);
      expect(state.history).toHaveLength(1);
      expect(state.history[0].card.id).toBe(101);
    });

    it('TC-SES-04: nextCard at end of deck should set isGameOver: true', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      // Advance through all cards
      useGameSessionStore.getState().nextCard(samplePlayers); // index 1
      useGameSessionStore.getState().nextCard(samplePlayers); // index 2
      useGameSessionStore.getState().nextCard(samplePlayers); // index 3
      expect(useGameSessionStore.getState().currentIndex).toBe(3);
      expect(useGameSessionStore.getState().isGameOver).toBe(false);

      // Next at end
      useGameSessionStore.getState().nextCard(samplePlayers);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);
    });
  });

  // ==========================================
  // SECTION 2: Virus Lifecycle & Expiration
  // ==========================================
  describe('Virus Lifecycle & Expiration', () => {
    it('TC-SES-05: drawing a virus card should register ActiveVirus and play virus alert', () => {
      const alertSpy = vi.spyOn(soundService, 'playVirusAlert');
      usePlayerStore.getState().setPlayers(samplePlayers);

      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      // Card 0 is a regular rule. Card 1 is a virus.
      expect(useGameSessionStore.getState().activeViruses).toHaveLength(0);

      useGameSessionStore.getState().nextCard(samplePlayers);

      const state = useGameSessionStore.getState();
      expect(state.currentIndex).toBe(1);
      expect(state.activeViruses).toHaveLength(1);
      expect(state.activeViruses[0].cardId).toBe(102);
      expect(state.activeViruses[0].roundsRemaining).toBe(2);
      expect(alertSpy).toHaveBeenCalled();
    });

    it('TC-SES-06: virus rounds should tick down on card transition and trigger expiration fanfare when 0', () => {
      const expiredSpy = vi.spyOn(soundService, 'playVirusExpired');
      usePlayerStore.getState().setPlayers(samplePlayers);

      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      // Step to Card 1: virus registered with duration 2 rounds
      useGameSessionStore.getState().nextCard(samplePlayers);
      expect(useGameSessionStore.getState().activeViruses[0].roundsRemaining).toBe(2);

      // Step to Card 2: virus ticks to 1 round remaining
      useGameSessionStore.getState().nextCard(samplePlayers);
      expect(useGameSessionStore.getState().activeViruses).toHaveLength(1);
      expect(useGameSessionStore.getState().activeViruses[0].roundsRemaining).toBe(1);
      expect(useGameSessionStore.getState().expiredVirusesQueue).toHaveLength(0);

      // Step to Card 3: virus ticks from 1 to 0 -> expires!
      useGameSessionStore.getState().nextCard(samplePlayers);
      const state = useGameSessionStore.getState();
      expect(state.activeViruses).toHaveLength(0);
      expect(state.expiredVirusesQueue).toHaveLength(1);
      expect(state.expiredVirusesQueue[0].cardId).toBe(102);
      expect(expiredSpy).toHaveBeenCalled();
    });

    it('TC-SES-07: dismissExpiredVirus should remove virus from queue', () => {
      useGameSessionStore.setState({
        expiredVirusesQueue: [
          {
            id: 'v_expired_1',
            cardId: 102,
            ruleText: 'Test virus',
            roundsRemaining: 0,
            totalRounds: 2,
          },
        ],
      });

      expect(useGameSessionStore.getState().expiredVirusesQueue).toHaveLength(1);
      useGameSessionStore.getState().dismissExpiredVirus('v_expired_1');
      expect(useGameSessionStore.getState().expiredVirusesQueue).toHaveLength(0);
    });
  });

  // ==========================================
  // SECTION 3: Reversible Undo Stack
  // ==========================================
  describe('Reversible Undo Stack', () => {
    it('TC-SES-08: previousCard should return false when history is empty', () => {
      const success = useGameSessionStore.getState().previousCard();
      expect(success).toBe(false);
    });

    it('TC-SES-09: previousCard should pop history snapshot, restore prior card and revert awarded drinks', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);

      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      const initialAssigned = useGameSessionStore.getState().assignedPlayers[0];
      const initialSips = usePlayerStore.getState().players.find((p) => p.id === initialAssigned.id)?.sips ?? 0;
      expect(initialSips).toBe(2);

      // Advance to Card 1
      useGameSessionStore.getState().nextCard(samplePlayers);
      expect(useGameSessionStore.getState().currentIndex).toBe(1);

      // Perform Undo!
      const undoSuccess = useGameSessionStore.getState().previousCard();
      expect(undoSuccess).toBe(true);

      const state = useGameSessionStore.getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentCard?.id).toBe(101);
      expect(state.history).toHaveLength(0);
    });
  });

  // ==========================================
  // SECTION 4: La Guatoca Board Mechanics
  // ==========================================
  describe('La Guatoca Board Mechanics', () => {
    it('TC-SES-10: startBoardSession should initialize pawns at tile 1 and jails at 0', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);

      useGameSessionStore.getState().startBoardSession(
        'guatoca_clasica',
        sampleBoardTiles,
        samplePlayers
      );

      const state = useGameSessionStore.getState();
      expect(state.mode).toBe('board');
      expect(state.currentTurnPlayerIndex).toBe(0);
      expect(state.boardPositions['p_1_lucas']).toBe(1);
      expect(state.boardPositions['p_2_martina']).toBe(1);
      expect(state.boardPositions['p_3_tomas']).toBe(1);
      expect(state.boardJails['p_1_lucas']).toBe(0);
    });

    it('TC-SES-11: rollBoardDice should advance pawn and advance turn to next player', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startBoardSession(
        'guatoca_clasica',
        sampleBoardTiles,
        samplePlayers
      );

      // Player 1 (Lucas) rolls a 3 -> lands on tile 4 (normal)
      const res = useGameSessionStore.getState().rollBoardDice(3);
      expect(res).toBeDefined();
      expect(res?.roll).toBe(3);
      expect(res?.destination).toBe(4);

      const state = useGameSessionStore.getState();
      expect(state.boardPositions['p_1_lucas']).toBe(4);
      // Turn advanced to player 2 (Martina)
      expect(state.currentTurnPlayerIndex).toBe(1);
    });

    it('TC-SES-12: jump tile should move pawn to destination and grant extra roll (turn does not advance)', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startBoardSession(
        'guatoca_clasica',
        sampleBoardTiles,
        samplePlayers
      );

      // Player 1 at tile 1 rolls 4 -> lands on tile 5 (jump to 9)
      const res = useGameSessionStore.getState().rollBoardDice(4);
      expect(res?.destination).toBe(9);
      expect(res?.extraRoll).toBe(true);

      const state = useGameSessionStore.getState();
      expect(state.boardPositions['p_1_lucas']).toBe(9);
      // Extra roll: player turn remains 0!
      expect(state.currentTurnPlayerIndex).toBe(0);
    });

    it('TC-SES-13: overshoot bounce-back math should bounce back excess tiles', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startBoardSession(
        'guatoca_clasica',
        sampleBoardTiles,
        samplePlayers
      );

      // Position Lucas at tile 43 (totalTiles = 45)
      useGameSessionStore.setState({
        boardPositions: { p_1_lucas: 43 },
        currentTurnPlayerIndex: 0,
      });

      // Roll 5 -> raw move 48 -> overshoot excess 3 -> bounces to 42
      const res = useGameSessionStore.getState().rollBoardDice(5);
      expect(res?.destination).toBe(42);
      expect(useGameSessionStore.getState().boardPositions['p_1_lucas']).toBe(42);
    });

    it('TC-SES-14: exact landing on finish tile should trigger victory condition and victory sound', () => {
      const victorySpy = vi.spyOn(soundService, 'playVictory');
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startBoardSession(
        'guatoca_clasica',
        sampleBoardTiles,
        samplePlayers
      );

      // Position Lucas at tile 43
      useGameSessionStore.setState({
        boardPositions: { p_1_lucas: 43 },
        currentTurnPlayerIndex: 0,
      });

      // Roll exactly 2 -> lands on tile 45 (Meta)
      const res = useGameSessionStore.getState().rollBoardDice(2);
      expect(res?.isVictory).toBe(true);
      expect(res?.destination).toBe(45);
      expect(victorySpy).toHaveBeenCalled();

      const state = useGameSessionStore.getState();
      expect(state.isGameOver).toBe(true);
      expect(state.winner?.id).toBe('p_1_lucas');
    });

    it('TC-SES-15: jail tile should lock player and skip subsequent turns until released', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startBoardSession(
        'guatoca_clasica',
        sampleBoardTiles,
        samplePlayers
      );

      // Position Lucas at tile 9 and roll 1 -> lands on tile 10 (Cárcel)
      useGameSessionStore.setState({
        boardPositions: { p_1_lucas: 9 },
        currentTurnPlayerIndex: 0,
      });

      useGameSessionStore.getState().rollBoardDice(1);
      expect(useGameSessionStore.getState().boardJails['p_1_lucas']).toBe(2);
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);

      // Fast-forward turn back to Lucas (index 0)
      useGameSessionStore.setState({ currentTurnPlayerIndex: 0 });

      // Lucas tries to roll -> locked in jail (turns remaining: 1), turn skipped to Martina!
      const skipRes = useGameSessionStore.getState().rollBoardDice();
      expect(skipRes?.skipped).toBe(true);
      expect(skipRes?.reason).toBe('jail');
      expect(skipRes?.remainingJailTurns).toBe(1);
      expect(useGameSessionStore.getState().boardJails['p_1_lucas']).toBe(1);
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);
    });

    it('TC-SES-16: skull tile should reset pawn to tile 1 (Salida)', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startBoardSession(
        'guatoca_clasica',
        sampleBoardTiles,
        samplePlayers
      );

      // Position Lucas at tile 36, roll 1 -> lands on tile 37 (Calavera)
      useGameSessionStore.setState({
        boardPositions: { p_1_lucas: 36 },
        currentTurnPlayerIndex: 0,
      });

      const res = useGameSessionStore.getState().rollBoardDice(1);
      expect(res?.destination).toBe(1); // Reset to 1
      expect(useGameSessionStore.getState().boardPositions['p_1_lucas']).toBe(1);
    });
  });

  // ==========================================
  // SECTION 5: Crash & Reload Recovery
  // ==========================================
  describe('Crash & Reload Recovery (localStorage)', () => {
    it('TC-SES-17: should persist active session to localStorage on every state mutation', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      const raw = mockStorage.getItem(SESSION_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const snapshot = JSON.parse(raw!);
      expect(snapshot.mode).toBe('category');
      expect(snapshot.currentIndex).toBe(0);
      expect(snapshot.deck).toHaveLength(4);
      expect(snapshot.savedPlayers).toHaveLength(3);
    });

    it('TC-SES-18: hasActiveSession should detect valid saved session, and return false if gameOver or absent', () => {
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(false);

      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      expect(useGameSessionStore.getState().hasActiveSession()).toBe(true);

      // When session ends, active session is cleared
      useGameSessionStore.getState().endSession();
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(false);
    });

    it('TC-SES-19: resumeSession should rehydrate full session and player state from localStorage', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );
      useGameSessionStore.getState().nextCard(samplePlayers); // index 1

      // Simulate complete page reload: reset stores in memory
      useGameSessionStore.setState({
        mode: null,
        deck: [],
        currentIndex: -1,
        currentCard: null,
        activeViruses: [],
      });
      usePlayerStore.setState({ players: [] });

      expect(useGameSessionStore.getState().currentIndex).toBe(-1);
      expect(usePlayerStore.getState().players).toHaveLength(0);

      // Rehydrate from localStorage!
      const resumed = useGameSessionStore.getState().resumeSession();
      expect(resumed).toBe(true);

      const state = useGameSessionStore.getState();
      expect(state.mode).toBe('category');
      expect(state.currentIndex).toBe(1);
      expect(state.currentCard?.id).toBe(102);
      expect(state.deck).toHaveLength(4);
      expect(usePlayerStore.getState().players).toHaveLength(3);
    });

    it('TC-SES-20: discardSession should clear saved session and reset store', () => {
      usePlayerStore.getState().setPlayers(samplePlayers);
      useGameSessionStore.getState().startCardSession(
        sampleDeck,
        'category',
        { intensity: 2 },
        samplePlayers
      );

      expect(mockStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy();
      useGameSessionStore.getState().discardSession();
      expect(mockStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(useGameSessionStore.getState().mode).toBeNull();
    });
  });
});
