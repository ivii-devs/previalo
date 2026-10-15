/**
 * Vitest Adversarial Challenge Suite: useGameSessionStore (M4)
 * Authored by: challenger_m4_2
 * Scope: Crash Recovery Serialization & Rehydration, Corrupted Storage Resilience,
 * and La Guatoca Board State Machine (4-player, jail countdowns, overshoot bounce-back at 43/44, victory).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

if (typeof (globalThis as any).localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof (globalThis as any).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockStorage },
    writable: true,
  });
} else if (!(globalThis as any).window.localStorage) {
  (globalThis as any).window.localStorage = mockStorage;
}

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      setAttribute: () => {},
      getAttribute: () => null,
    },
  };
}

import {
  useGameSessionStore,
  SESSION_STORAGE_KEY,
} from '../../../src/application/useGameSessionStore';
import { usePlayerStore } from '../../../src/application/usePlayerStore';
import { BoardEngine } from '../../../src/domain/engines/BoardEngine';
import type { Card } from '../../../src/domain/types/card';
import type { BoardTile } from '../../../src/domain/types/board';
import type { Player } from '../../../src/domain/types/player';

// Load real canonical catalog board tiles
const tableroDataRaw = fs.readFileSync(
  path.resolve(process.cwd(), 'public/data/by_category/07_el_tablero.json'),
  'utf-8'
);
const tableroData = JSON.parse(tableroDataRaw);
const clasicaTilesReal: BoardTile[] = tableroData.tiles_by_board.guatoca_clasica;
const hotTilesReal: BoardTile[] = tableroData.tiles_by_board.guatoca_hot;

const fourPlayers: Player[] = [
  { id: 'p_1_lucas', name: 'Lucas', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#ec4899', avatar: '🦁', jailTurns: 0, boardPosition: 1 },
  { id: 'p_2_martina', name: 'Martina', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#8b5cf6', avatar: '🦊', jailTurns: 0, boardPosition: 1 },
  { id: 'p_3_tomas', name: 'Tomás', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#06b6d4', avatar: '🐼', jailTurns: 0, boardPosition: 1 },
  { id: 'p_4_sofia', name: 'Sofía', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#10b981', avatar: '🐨', jailTurns: 0, boardPosition: 1 },
];

const sampleCards: Card[] = [
  { id: 101, type: 'rule', text: '{player1} toma {drinks} tragos por ser el más alegre.', intensity: 2, drinks_penalty: 2, target: 'active_player' },
  { id: 102, type: 'virus', text: '{player1} no puede decir la palabra "NO" durante 3 rondas.', intensity: 2, duration_rounds: 3, target: 'active_player' },
  { id: 103, type: 'challenge', text: '{player1} y {player2} hacen un pulso. El que pierde toma {drinks} tragos.', intensity: 2, drinks_penalty: 1, target: 'pair' },
  { id: 104, type: 'virus', text: '{player1} debe brindar antes de cada trago durante 2 rondas.', intensity: 2, duration_rounds: 2, target: 'active_player' },
  { id: 105, type: 'rule', text: '{player1} confiesa su mayor vergüenza o toma {drinks} tragos.', intensity: 3, drinks_penalty: 3, target: 'active_player' },
];

describe('CHALLENGER M4.2: Crash Recovery & Board State Machine Adversarial Suite', () => {
  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.getState().clearPlayers();
    useGameSessionStore.getState().endSession();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: CRASH RECOVERY SERIALIZATION & REHYDRATION (FIDELITY AUDIT)
  // =========================================================================
  describe('1. Crash Recovery Serialization & Rehydration', () => {
    it('TC-CHALLENGE-CRASH-01: Card session rehydration preserves deck, index, viruses, and history across memory wipe', () => {
      usePlayerStore.getState().setPlayers(fourPlayers);
      useGameSessionStore.getState().startCardSession(sampleCards, 'category', { intensity: 2 }, fourPlayers);

      // Advance cards to generate active viruses, sips, and history
      useGameSessionStore.getState().nextCard();
      useGameSessionStore.getState().nextCard();
      useGameSessionStore.getState().nextCard();

      const preState = useGameSessionStore.getState();
      expect(preState.currentIndex).toBe(3);
      expect(preState.currentCard?.id).toBe(104);
      expect(preState.activeViruses.length).toBeGreaterThanOrEqual(1);
      expect(preState.history.length).toBe(3);

      // Verify snapshot in localStorage
      expect(mockStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy();

      // Simulate browser crash: wipe Zustand in-memory state
      useGameSessionStore.setState({
        mode: null,
        modeConfig: null,
        deck: [],
        currentIndex: -1,
        currentCard: null,
        interpolatedText: '',
        assignedPlayers: [],
        calculatedDrinks: 0,
        activeViruses: [],
        expiredVirusesQueue: [],
        boardPositions: {},
        boardJails: {},
        currentTurnPlayerIndex: 0,
        lastDiceRoll: null,
        history: [],
        isGameOver: false,
        winner: null,
      });
      usePlayerStore.setState({ players: [] });

      expect(useGameSessionStore.getState().currentIndex).toBe(-1);
      expect(usePlayerStore.getState().players).toHaveLength(0);

      // Resume session
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(true);
      const resumed = useGameSessionStore.getState().resumeSession();
      expect(resumed).toBe(true);

      const postState = useGameSessionStore.getState();
      expect(postState.mode).toBe('category');
      expect(postState.currentIndex).toBe(preState.currentIndex);
      expect(postState.currentCard?.id).toBe(preState.currentCard?.id);
      expect(postState.interpolatedText).toBe(preState.interpolatedText);
      expect(postState.calculatedDrinks).toBe(preState.calculatedDrinks);
      expect(postState.activeViruses).toHaveLength(preState.activeViruses.length);
      expect(postState.history).toHaveLength(preState.history.length);
      expect(usePlayerStore.getState().players).toHaveLength(4);

      // Verify undo after crash recovery
      const undoSuccess = useGameSessionStore.getState().previousCard();
      expect(undoSuccess).toBe(true);
      expect(useGameSessionStore.getState().currentIndex).toBe(2);
    });

    it('TC-CHALLENGE-CRASH-02: Board session rehydration preserves 4 player positions, jails, and turns across memory wipe', () => {
      usePlayerStore.getState().setPlayers(fourPlayers);
      useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

      // Play turns: Lucas (3), Martina (5), Tomás (9 -> Cárcel), Sofía (1), Lucas (4), Martina (2)
      useGameSessionStore.getState().rollBoardDice(3); // Lucas: 1 -> 4
      useGameSessionStore.getState().rollBoardDice(5); // Martina: 1 -> 6
      useGameSessionStore.getState().rollBoardDice(9); // Tomás: 1 -> 10 (Cárcel)
      useGameSessionStore.getState().rollBoardDice(1); // Sofía: 1 -> 2
      useGameSessionStore.getState().rollBoardDice(4); // Lucas: 4 -> 8
      useGameSessionStore.getState().rollBoardDice(2); // Martina: 6 -> 8

      const preState = useGameSessionStore.getState();
      expect(preState.boardPositions['p_1_lucas']).toBe(8);
      expect(preState.boardPositions['p_2_martina']).toBe(8);
      expect(preState.boardPositions['p_3_tomas']).toBe(10);
      expect(preState.boardPositions['p_4_sofia']).toBe(2);
      expect(preState.boardJails['p_3_tomas']).toBeGreaterThanOrEqual(1);
      expect(preState.currentTurnPlayerIndex).toBe(2); // Tomás's turn next

      // Simulate crash
      useGameSessionStore.setState({
        mode: null,
        boardPositions: {},
        boardJails: {},
        currentTurnPlayerIndex: 0,
        lastDiceRoll: null,
      });
      usePlayerStore.setState({ players: [] });

      expect(useGameSessionStore.getState().hasActiveSession()).toBe(true);
      expect(useGameSessionStore.getState().resumeSession()).toBe(true);

      const postState = useGameSessionStore.getState();
      expect(postState.mode).toBe('board');
      expect(postState.boardPositions['p_1_lucas']).toBe(preState.boardPositions['p_1_lucas']);
      expect(postState.boardPositions['p_2_martina']).toBe(preState.boardPositions['p_2_martina']);
      expect(postState.boardPositions['p_3_tomas']).toBe(preState.boardPositions['p_3_tomas']);
      expect(postState.boardPositions['p_4_sofia']).toBe(preState.boardPositions['p_4_sofia']);
      expect(postState.boardJails['p_3_tomas']).toBe(preState.boardJails['p_3_tomas']);
      expect(postState.currentTurnPlayerIndex).toBe(preState.currentTurnPlayerIndex);
      expect(usePlayerStore.getState().players).toHaveLength(4);

      // Verify Tomás takes turn in jail post-recovery
      const jailRoll = useGameSessionStore.getState().rollBoardDice();
      expect(jailRoll?.skipped).toBe(true);
      expect(jailRoll?.reason).toBe('jail');
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(3); // Advanced to Sofía
    });

    it('TC-CHALLENGE-CRASH-03: BUG-M4-01 - Stale activePlayers capture causes loss of active card sips/targeted upon crash', () => {
      const testPlayers: Player[] = [
        { id: 'p_alpha', name: 'Alpha', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#ec4899', avatar: '🦁', jailTurns: 0, boardPosition: 1 },
      ];
      usePlayerStore.getState().setPlayers(testPlayers);

      useGameSessionStore.getState().startCardSession([
        { id: 301, type: 'rule', text: '{player1} toma 2 tragos.', intensity: 2, drinks_penalty: 2, target: 'active_player' },
        { id: 302, type: 'rule', text: '{player1} toma 3 tragos.', intensity: 2, drinks_penalty: 3, target: 'active_player' },
      ], 'category', { intensity: 2 }, testPlayers);

      // Advance to card 1
      useGameSessionStore.getState().nextCard();

      // In-memory player store has updated stats (at least 4 sips and 2 targeted)
      const inMemAlpha = usePlayerStore.getState().players.find(p => p.id === 'p_alpha');
      expect(inMemAlpha?.sips).toBeGreaterThanOrEqual(4);
      expect(inMemAlpha?.timesTargeted).toBe(2);

      // Inspect localStorage snapshot directly
      const rawSnap = JSON.parse(mockStorage.getItem(SESSION_STORAGE_KEY)!);
      const storageAlpha = rawSnap.savedPlayers.find((p: any) => p.id === 'p_alpha');

      // BUG CONFIRMATION: storageAlpha only has 2 sips and 1 target count (card 1 updates were NOT saved because activePlayers was captured before addSips!)
      expect(storageAlpha.sips).toBeLessThan(inMemAlpha!.sips);
      expect(storageAlpha.timesTargeted).toBeLessThan(inMemAlpha!.timesTargeted);
    });
  });

  // =========================================================================
  // SECTION 2: CORRUPTED LOCALSTORAGE PAYLOAD HANDLING
  // =========================================================================
  describe('2. Corrupted localStorage Payload Resilience', () => {
    const corruptions = [
      { name: 'Malformed JSON syntax', raw: '{"mode":"board",invalid}' },
      { name: 'Unclosed string', raw: '{"mode":"card' },
      { name: 'Non-JSON text', raw: 'FATAL_CORRUPTION_STRING' },
      { name: 'Empty string', raw: '' },
      { name: 'Literal null', raw: 'null' },
      { name: 'Literal undefined', raw: 'undefined' },
      { name: 'Primitive integer', raw: '42' },
      { name: 'Array payload', raw: '[1, 2, 3]' },
      { name: 'Empty object', raw: '{}' },
      { name: 'Deck is not array', raw: JSON.stringify({ mode: 'category', deck: 'not-array', currentIndex: 0 }) },
      { name: 'Deck is null', raw: JSON.stringify({ mode: 'category', deck: null, currentIndex: 0 }) },
      { name: 'Card session with negative index', raw: JSON.stringify({ mode: 'category', deck: [{ id: 1 }], currentIndex: -1 }) },
      { name: 'Board session with null positions', raw: JSON.stringify({ mode: 'board', boardPositions: null }) },
      { name: 'SavedPlayers is string', raw: JSON.stringify({ mode: 'board', savedPlayers: 'corrupted' }) },
      { name: 'SavedPlayers is null', raw: JSON.stringify({ mode: 'board', savedPlayers: null }) },
      { name: 'Completed session (isGameOver: true)', raw: JSON.stringify({ mode: 'board', isGameOver: true }) },
    ];

    corruptions.forEach(({ name, raw }) => {
      it(`gracefully handles ${name} without throwing uncaught errors`, () => {
        mockStorage.setItem(SESSION_STORAGE_KEY, raw);

        expect(() => {
          const hasActive = useGameSessionStore.getState().hasActiveSession();
          expect(typeof hasActive).toBe('boolean');
        }).not.toThrow();

        expect(() => {
          const resumed = useGameSessionStore.getState().resumeSession();
          expect(typeof resumed).toBe('boolean');
        }).not.toThrow();
      });
    });

    it('discardSession removes corrupted payload cleanly', () => {
      mockStorage.setItem(SESSION_STORAGE_KEY, '<<<CORRUPTED>>>');
      expect(() => {
        useGameSessionStore.getState().discardSession();
      }).not.toThrow();
      expect(mockStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });

  // =========================================================================
  // SECTION 3: BOARD GAME STATE MACHINE (CLÁSICA 45 & HOT 40)
  // =========================================================================
  describe('3. Board Game State Machine (Clásica 45 & Hot 40)', () => {
    it('TC-CHALLENGE-BOARD-01: 4 players cycle turns, jail decrements turn-by-turn until release', () => {
      usePlayerStore.getState().setPlayers(fourPlayers);
      useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

      // Lock Lucas in jail with 2 turns
      useGameSessionStore.setState({
        boardPositions: { p_1_lucas: 10, p_2_martina: 1, p_3_tomas: 1, p_4_sofia: 1 },
        boardJails: { p_1_lucas: 2, p_2_martina: 0, p_3_tomas: 0, p_4_sofia: 0 },
        currentTurnPlayerIndex: 0,
      });

      // Round 1 for Lucas: jail turn decrements from 2 to 1
      const skip1 = useGameSessionStore.getState().rollBoardDice();
      expect(skip1?.skipped).toBe(true);
      expect(skip1?.remainingJailTurns).toBe(1);
      expect(useGameSessionStore.getState().boardJails['p_1_lucas']).toBe(1);
      expect(useGameSessionStore.getState().boardPositions['p_1_lucas']).toBe(10);
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);

      // Cycle other 3 players
      useGameSessionStore.getState().rollBoardDice(2); // Martina (turn -> 2)
      useGameSessionStore.getState().rollBoardDice(2); // Tomás (turn -> 3)
      useGameSessionStore.getState().rollBoardDice(2); // Sofía (turn -> 0)
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(0);

      // Round 2 for Lucas: jail turn decrements from 1 to 0 (sentence served)
      const skip2 = useGameSessionStore.getState().rollBoardDice();
      expect(skip2?.skipped).toBe(true);
      expect(skip2?.remainingJailTurns).toBe(0);
      expect(useGameSessionStore.getState().boardJails['p_1_lucas']).toBe(0);
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);

      // Cycle other 3 players
      useGameSessionStore.getState().rollBoardDice(1);
      useGameSessionStore.getState().rollBoardDice(1);
      useGameSessionStore.getState().rollBoardDice(1);
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(0);

      // Round 3 for Lucas: FREE!
      const freeRoll = useGameSessionStore.getState().rollBoardDice(3);
      expect(freeRoll?.skipped).toBeFalsy();
      expect(useGameSessionStore.getState().boardPositions['p_1_lucas']).toBeGreaterThan(10);
    });

    it('TC-CHALLENGE-BOARD-02: Overshoot bounce-back at tile 43 and 44 with rolls 1-6 conforms strictly to formula', () => {
      const maxTiles = 45;

      // Tile 43:
      expect(BoardEngine.calculateDestination(43, 1, maxTiles)).toBe(44);
      expect(BoardEngine.calculateDestination(43, 2, maxTiles)).toBe(45);
      expect(BoardEngine.calculateDestination(43, 3, maxTiles)).toBe(44);
      expect(BoardEngine.calculateDestination(43, 4, maxTiles)).toBe(43);
      expect(BoardEngine.calculateDestination(43, 5, maxTiles)).toBe(42);
      expect(BoardEngine.calculateDestination(43, 6, maxTiles)).toBe(41);

      // Tile 44:
      expect(BoardEngine.calculateDestination(44, 1, maxTiles)).toBe(45);
      expect(BoardEngine.calculateDestination(44, 2, maxTiles)).toBe(44);
      expect(BoardEngine.calculateDestination(44, 3, maxTiles)).toBe(43);
      expect(BoardEngine.calculateDestination(44, 4, maxTiles)).toBe(42);
      expect(BoardEngine.calculateDestination(44, 5, maxTiles)).toBe(41);
      expect(BoardEngine.calculateDestination(44, 6, maxTiles)).toBe(40);
    });

    it('TC-CHALLENGE-BOARD-03: Overshoot bounce-back on Hot (40 casillas) at tiles 38 and 39 with rolls 1-6', () => {
      const hotMax = 40;

      // Tile 38:
      expect(BoardEngine.calculateDestination(38, 1, hotMax)).toBe(39);
      expect(BoardEngine.calculateDestination(38, 2, hotMax)).toBe(40);
      expect(BoardEngine.calculateDestination(38, 3, hotMax)).toBe(39);
      expect(BoardEngine.calculateDestination(38, 4, hotMax)).toBe(38);
      expect(BoardEngine.calculateDestination(38, 5, hotMax)).toBe(37);
      expect(BoardEngine.calculateDestination(38, 6, hotMax)).toBe(36);

      // Tile 39:
      expect(BoardEngine.calculateDestination(39, 1, hotMax)).toBe(40);
      expect(BoardEngine.calculateDestination(39, 2, hotMax)).toBe(39);
      expect(BoardEngine.calculateDestination(39, 3, hotMax)).toBe(38);
      expect(BoardEngine.calculateDestination(39, 4, hotMax)).toBe(37);
      expect(BoardEngine.calculateDestination(39, 5, hotMax)).toBe(36);
      expect(BoardEngine.calculateDestination(39, 6, hotMax)).toBe(35);
    });

    it('TC-CHALLENGE-BOARD-04: Victory termination stops game, marks winner, rejects further rolls on Clásica and Hot', () => {
      // Clásica victory
      usePlayerStore.getState().setPlayers(fourPlayers);
      useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);
      useGameSessionStore.setState({
        boardPositions: { p_1_lucas: 43 },
        currentTurnPlayerIndex: 0,
      });

      const clasicaWin = useGameSessionStore.getState().rollBoardDice(2); // Lands on 45
      expect(clasicaWin?.isVictory).toBe(true);
      expect(clasicaWin?.destination).toBe(45);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);
      expect(useGameSessionStore.getState().winner?.id).toBe('p_1_lucas');
      expect(useGameSessionStore.getState().rollBoardDice(3)).toBeNull(); // No further rolls

      // Hot victory
      useGameSessionStore.getState().startBoardSession('guatoca_hot', hotTilesReal, fourPlayers);
      useGameSessionStore.setState({
        boardPositions: { p_2_martina: 39 },
        currentTurnPlayerIndex: 1,
      });

      const hotWin = useGameSessionStore.getState().rollBoardDice(1); // Lands on 40
      expect(hotWin?.isVictory).toBe(true);
      expect(hotWin?.destination).toBe(40);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);
      expect(useGameSessionStore.getState().winner?.id).toBe('p_2_martina');
      expect(useGameSessionStore.getState().rollBoardDice(1)).toBeNull();
    });

    it('TC-CHALLENGE-BOARD-05: BUG-M4-02 - Jump tile on penultimate casilla (44 in Clásica, 39 in Hot) jumps to Meta without victory trigger', () => {
      usePlayerStore.getState().setPlayers(fourPlayers);
      useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

      // Lucas at tile 43 rolls 1 -> lands on tile 44 ("Recta final: Último salto hacia la meta." action_jump_to: 45)
      useGameSessionStore.setState({
        boardPositions: { p_1_lucas: 43 },
        currentTurnPlayerIndex: 0,
      });

      const jumpRoll = useGameSessionStore.getState().rollBoardDice(1);

      // Lucas pawn moves to tile 45
      expect(useGameSessionStore.getState().boardPositions['p_1_lucas']).toBe(45);
      // BUG CONFIRMATION: Because actionType is 'jump', line 551 did not match, so victory is false and extraRoll is true!
      expect(jumpRoll?.isVictory).toBe(false);
      expect(useGameSessionStore.getState().isGameOver).toBe(false);
      expect(useGameSessionStore.getState().winner).toBeNull();
      expect(jumpRoll?.extraRoll).toBe(true);

      // Lucas gets extra roll while sitting on tile 45! Rolling 1 bounces him backwards to tile 44!
      const bounceRoll = useGameSessionStore.getState().rollBoardDice(1);
      // He bounces to 44, and 44 immediately jumps him back to 45!
      expect(bounceRoll?.destination).toBe(45);
      expect(useGameSessionStore.getState().isGameOver).toBe(false);
    });
  });
});
