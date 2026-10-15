/**
 * Challenger M4.2 Empirical Adversarial Test Harness
 * Directly verifies:
 * 1. Crash recovery serialization & rehydration (Card & Board, in-memory store wiping, 100% state fidelity)
 * 2. Corrupted localStorage payload resilience (malformed JSON, broken schemas, zero unhandled errors)
 * 3. Board game state machine (4 players on Clásica 45 and Hot 40, jail skips countdown, overshoot bounce-back at 43/44 with rolls 1-6, game termination on victory)
 */

import fs from 'node:fs';
import path from 'node:path';

// --- Global Browser Environment Polyfill for Node ---
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

// Import stores and engines
import {
  useGameSessionStore,
  SESSION_STORAGE_KEY,
} from '../../../src/application/useGameSessionStore';
import { usePlayerStore } from '../../../src/application/usePlayerStore';
import { BoardEngine } from '../../../src/domain/engines/BoardEngine';
import type { Card } from '../../../src/domain/types/card';
import type { BoardTile } from '../../../src/domain/types/board';
import type { Player } from '../../../src/domain/types/player';

// Test reporting counters
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedAssertions++;
    const err = `  [FAIL] ${message}`;
    console.error(err);
    failureDetails.push(message);
  }
}

// Load real board tiles from public/data/by_category/07_el_tablero.json
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
  { id: 106, type: 'rule', text: 'Todos los jugadores brindan y toman 1 trago.', intensity: 1, target: 'all' },
];

function resetAllStores() {
  mockStorage.clear();
  usePlayerStore.getState().clearPlayers();
  useGameSessionStore.getState().endSession();
}

console.log('======================================================================');
console.log('CHALLENGER M4.2: EMPIRICAL ADVERSARIAL STRESS HARNESS');
console.log('======================================================================\n');

// ======================================================================
// SUITE 1: CRASH RECOVERY SERIALIZATION & REHYDRATION (100% FIDELITY)
// ======================================================================
console.log('--- SUITE 1: Crash Recovery Serialization & Rehydration ---');

// Test 1.1: Card Session Crash Recovery
(() => {
  console.log('\n[Subtest 1.1] Card Session Serialization, In-Memory Wipe, Rehydration Fidelity');
  resetAllStores();

  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startCardSession(sampleCards, 'category', { intensity: 2 }, fourPlayers);

  // Advance card 0 -> card 1 (virus registered)
  useGameSessionStore.getState().nextCard();
  // Advance card 1 -> card 2 (virus ticked from 3 to 2 rounds, challenge pair)
  useGameSessionStore.getState().nextCard();
  // Advance card 2 -> card 3 (first virus ticked to 1, second virus registered with 2)
  useGameSessionStore.getState().nextCard();

  const preState = useGameSessionStore.getState();
  const prePlayers = usePlayerStore.getState().players;

  assert(preState.currentIndex === 3, 'Pre-crash card index is 3');
  assert(preState.currentCard?.id === 104, 'Pre-crash currentCard ID is 104 (second virus)');
  assert(preState.activeViruses.length === 2, 'Pre-crash has 2 active viruses');
  assert(preState.history.length === 3, 'Pre-crash history stack has 3 snapshots');

  // Verify that localStorage contains the snapshot
  const rawStorage = mockStorage.getItem(SESSION_STORAGE_KEY);
  assert(rawStorage !== null && rawStorage.length > 50, 'Snapshot serialized into localStorage');

  // SIMULATE BROWSER CRASH: Completely wipe Zustand in-memory state properties
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

  // Assert in-memory store is completely empty
  assert(useGameSessionStore.getState().currentIndex === -1, 'In-memory game store wiped to blank state');
  assert(usePlayerStore.getState().players.length === 0, 'In-memory player store wiped to blank state');

  // Verify hasActiveSession recognizes the persisted snapshot
  const hasActive = useGameSessionStore.getState().hasActiveSession();
  assert(hasActive === true, 'hasActiveSession() correctly returns true after memory wipe');

  // Perform Rehydration!
  const resumeSuccess = useGameSessionStore.getState().resumeSession();
  assert(resumeSuccess === true, 'resumeSession() executed successfully');

  // Verify 100% state fidelity
  const postState = useGameSessionStore.getState();
  const postPlayers = usePlayerStore.getState().players;

  assert(postState.mode === preState.mode, `Fidelity: mode matches ('${postState.mode}')`);
  assert(postState.currentIndex === preState.currentIndex, `Fidelity: currentIndex matches (${postState.currentIndex})`);
  assert(postState.currentCard?.id === preState.currentCard?.id, `Fidelity: currentCard.id matches (${postState.currentCard?.id})`);
  assert(postState.interpolatedText === preState.interpolatedText, 'Fidelity: interpolatedText matches exact string');
  assert(postState.calculatedDrinks === preState.calculatedDrinks, `Fidelity: calculatedDrinks matches (${postState.calculatedDrinks})`);
  assert(postState.activeViruses.length === preState.activeViruses.length, `Fidelity: activeViruses length matches (${postState.activeViruses.length})`);

  for (let i = 0; i < postState.activeViruses.length; i++) {
    const postV = postState.activeViruses[i];
    const preV = preState.activeViruses[i];
    assert(
      postV.cardId === preV.cardId && postV.roundsRemaining === preV.roundsRemaining,
      `Fidelity: Virus ${i} (cardId=${postV.cardId}) roundsRemaining=${postV.roundsRemaining} matches pre-crash`
    );
  }

  assert(postState.history.length === preState.history.length, `Fidelity: history stack length matches (${postState.history.length})`);
  for (let i = 0; i < postState.history.length; i++) {
    assert(
      postState.history[i].card.id === preState.history[i].card.id &&
      postState.history[i].turnIndex === preState.history[i].turnIndex,
      `Fidelity: History snapshot ${i} card ${postState.history[i].card.id} turn ${postState.history[i].turnIndex} matches`
    );
  }

  assert(postPlayers.length === fourPlayers.length, `Fidelity: Active player count restored to usePlayerStore (${postPlayers.length} players)`);
  for (let i = 0; i < fourPlayers.length; i++) {
    const pPost = postPlayers.find(p => p.id === fourPlayers[i].id);
    const pPre = prePlayers.find(p => p.id === fourPlayers[i].id);
    assert(pPost !== undefined, `Fidelity: Player ${fourPlayers[i].name} exists in restored player store`);
    assert(pPost?.name === pPre?.name, `Fidelity: Player name matches (${pPost?.name})`);
    if (pPost && pPre && (pPost.sips !== pPre.sips || pPost.timesTargeted !== pPre.timesTargeted)) {
      console.warn(`    [DEFECT OBSERVED in 1.1] Player ${fourPlayers[i].name} stats desynchronized: in-memory pre-crash had (sips=${pPre.sips}, tgt=${pPre.timesTargeted}), but rehydrated storage had (sips=${pPost.sips}, tgt=${pPost.timesTargeted}) due to stale activePlayers capture in nextCard.`);
    }
  }

  // Verify gameplay continues normally after recovery
  useGameSessionStore.getState().nextCard(postPlayers);
  assert(useGameSessionStore.getState().currentIndex === 4, 'Post-recovery gameplay: nextCard() advances cleanly to index 4');

  // Verify undo works normally after recovery
  const undoResult = useGameSessionStore.getState().previousCard();
  assert(undoResult === true, 'Post-recovery gameplay: previousCard() (undo) successfully pops rehydrated history snapshot');
  assert(useGameSessionStore.getState().currentIndex === 3, 'Post-recovery undo: restored currentIndex to 3');
})();

// Test 1.2: Board Game Crash Recovery
(() => {
  console.log('\n[Subtest 1.2] Board Session Serialization, In-Memory Wipe, Rehydration Fidelity');
  resetAllStores();

  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

  // Mutate board positions and jail states naturally through dice rolls
  useGameSessionStore.getState().rollBoardDice(3); // Lucas: 1 -> 4, turn -> Martina
  useGameSessionStore.getState().rollBoardDice(5); // Martina: 1 -> 6, turn -> Tomás
  useGameSessionStore.getState().rollBoardDice(9); // Tomás: 1 -> 10 (Cárcel), jailed, turn -> Sofía
  useGameSessionStore.getState().rollBoardDice(1); // Sofía: 1 -> 2, turn -> Lucas
  useGameSessionStore.getState().rollBoardDice(4); // Lucas: 4 -> 8, turn -> Martina
  useGameSessionStore.getState().rollBoardDice(2); // Martina: 6 -> 8, turn -> Tomás (jailed)

  const preState = useGameSessionStore.getState();
  const prePlayers = usePlayerStore.getState().players;

  assert(preState.boardPositions['p_1_lucas'] === 8, 'Pre-crash: Lucas at tile 8');
  assert(preState.boardPositions['p_2_martina'] === 8, 'Pre-crash: Martina at tile 8');
  assert(preState.boardPositions['p_3_tomas'] === 10, 'Pre-crash: Tomás at tile 10 (jail)');
  assert(preState.boardPositions['p_4_sofia'] === 2, 'Pre-crash: Sofía at tile 2');
  assert(preState.boardJails['p_3_tomas'] >= 1, 'Pre-crash: Tomás in jail');
  assert(preState.currentTurnPlayerIndex === 2, 'Pre-crash: Turn is Tomás (index 2)');
  assert(preState.lastDiceRoll === 2, 'Pre-crash: Last dice roll is 2');

  // Verify active session persists
  const rawStorage = mockStorage.getItem(SESSION_STORAGE_KEY);
  assert(rawStorage !== null, 'Board session snapshot persisted to localStorage');

  // SIMULATE BROWSER CRASH: Wipe Zustand memory
  useGameSessionStore.setState({
    mode: null,
    boardPositions: {},
    boardJails: {},
    currentTurnPlayerIndex: 0,
    lastDiceRoll: null,
  });
  usePlayerStore.setState({ players: [] });

  assert(useGameSessionStore.getState().mode === null, 'In-memory board session wiped');
  assert(usePlayerStore.getState().players.length === 0, 'In-memory players wiped');

  assert(useGameSessionStore.getState().hasActiveSession() === true, 'hasActiveSession() returns true for board snapshot');

  const resumed = useGameSessionStore.getState().resumeSession();
  assert(resumed === true, 'resumeSession() succeeds for board session');

  const postState = useGameSessionStore.getState();
  const postPlayers = usePlayerStore.getState().players;

  assert(postState.mode === 'board', 'Fidelity: Board mode is "board"');
  assert(postState.boardPositions['p_1_lucas'] === preState.boardPositions['p_1_lucas'], `Fidelity: Lucas position ${postState.boardPositions['p_1_lucas']} preserved`);
  assert(postState.boardPositions['p_2_martina'] === preState.boardPositions['p_2_martina'], `Fidelity: Martina position ${postState.boardPositions['p_2_martina']} preserved`);
  assert(postState.boardPositions['p_3_tomas'] === preState.boardPositions['p_3_tomas'], `Fidelity: Tomás position ${postState.boardPositions['p_3_tomas']} preserved`);
  assert(postState.boardPositions['p_4_sofia'] === preState.boardPositions['p_4_sofia'], `Fidelity: Sofía position ${postState.boardPositions['p_4_sofia']} preserved`);
  assert(postState.boardJails['p_3_tomas'] === preState.boardJails['p_3_tomas'], `Fidelity: Tomás jail ${postState.boardJails['p_3_tomas']} preserved`);
  assert(postState.currentTurnPlayerIndex === preState.currentTurnPlayerIndex, `Fidelity: Tomás turn index ${postState.currentTurnPlayerIndex} preserved`);
  assert(postState.lastDiceRoll === preState.lastDiceRoll, `Fidelity: lastDiceRoll ${postState.lastDiceRoll} preserved`);
  assert(postPlayers.length === 4, 'Fidelity: All 4 players restored to usePlayerStore');

  // Verify board gameplay continuation post-recovery: Tomás is jailed
  const jailRollResult = useGameSessionStore.getState().rollBoardDice();
  console.log('    Post-recovery Tomás jail roll result:', jailRollResult);
  assert(jailRollResult?.skipped === true, 'Post-recovery: Tomás roll skipped due to jail');
  const expectedRemaining = preState.boardJails['p_3_tomas'] - 1;
  assert(
    jailRollResult?.remainingJailTurns === expectedRemaining,
    `Post-recovery: Tomás remaining jail turns decremented to ${expectedRemaining} (was ${preState.boardJails['p_3_tomas']})`
  );
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 3, 'Post-recovery: Turn advanced to Sofía (index 3)');
})();

// Test 1.3: Game Over Session Handling
(() => {
  console.log('\n[Subtest 1.3] Finished Game Session Should Not Be Active');
  resetAllStores();

  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

  // Set game over
  useGameSessionStore.setState({
    isGameOver: true,
    winner: fourPlayers[0],
    boardPositions: { p_1_lucas: 45 },
  });

  // Re-persist manually or check
  const raw = JSON.parse(mockStorage.getItem(SESSION_STORAGE_KEY) || '{}');
  raw.isGameOver = true;
  mockStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(raw));

  assert(useGameSessionStore.getState().hasActiveSession() === false, 'hasActiveSession() returns false when isGameOver: true');
})();

// ======================================================================
// SUITE 2: CORRUPTED LOCALSTORAGE PAYLOAD RESILIENCE
// ======================================================================
console.log('\n--- SUITE 2: Corrupted localStorage Payload Resilience ---');

(() => {
  const corruptedPayloads: Array<{ label: string; payload: string }> = [
    { label: 'Unclosed JSON curly brace', payload: '{"mode":"board","deck":' },
    { label: 'Completely malformed text', payload: '<<<INVALID_JSON_CORRUPTION>>>' },
    { label: 'Empty string', payload: '' },
    { label: 'Literal null string', payload: 'null' },
    { label: 'Literal undefined string', payload: 'undefined' },
    { label: 'Numeric primitive string', payload: '12345' },
    { label: 'Array instead of object', payload: '[1, 2, 3]' },
    { label: 'Boolean primitive string', payload: 'true' },
    { label: 'Empty object', payload: '{}' },
    { label: 'Corrupted deck type (string)', payload: JSON.stringify({ mode: 'category', deck: 'not-an-array', currentIndex: 0 }) },
    { label: 'Corrupted deck type (null)', payload: JSON.stringify({ mode: 'category', deck: null, currentIndex: 0 }) },
    { label: 'Card session negative currentIndex', payload: JSON.stringify({ mode: 'category', deck: [{ id: 1 }], currentIndex: -1 }) },
    { label: 'Corrupted savedPlayers (non-array string)', payload: JSON.stringify({ mode: 'category', deck: [{ id: 1 }], currentIndex: 0, savedPlayers: 'corrupted' }) },
    { label: 'Corrupted savedPlayers (null)', payload: JSON.stringify({ mode: 'category', deck: [{ id: 1 }], currentIndex: 0, savedPlayers: null }) },
    { label: 'Corrupted savedPlayers with invalid entries', payload: JSON.stringify({ mode: 'category', deck: [{ id: 1 }], currentIndex: 0, savedPlayers: [null, undefined, 42] }) },
    { label: 'Board session with null boardPositions', payload: JSON.stringify({ mode: 'board', boardPositions: null }) },
    { label: 'Board session with non-object boardJails', payload: JSON.stringify({ mode: 'board', boardJails: 'corrupted' }) },
    { label: 'Object with isGameOver true', payload: JSON.stringify({ isGameOver: true, mode: 'board' }) },
  ];

  for (const item of corruptedPayloads) {
    mockStorage.setItem(SESSION_STORAGE_KEY, item.payload);

    let hasActiveThrew = false;
    let hasActiveResult: boolean | null = null;
    try {
      hasActiveResult = useGameSessionStore.getState().hasActiveSession();
    } catch {
      hasActiveThrew = true;
    }

    assert(
      !hasActiveThrew && typeof hasActiveResult === 'boolean',
      `Corrupted payload [${item.label}]: hasActiveSession() executed safely without throwing (returned ${hasActiveResult})`
    );

    let resumeThrew = false;
    let resumeResult: boolean | null = null;
    try {
      resumeResult = useGameSessionStore.getState().resumeSession();
    } catch {
      resumeThrew = true;
    }

    assert(
      !resumeThrew && typeof resumeResult === 'boolean',
      `Corrupted payload [${item.label}]: resumeSession() executed safely without throwing (returned ${resumeResult})`
    );
  }

  // Verify discardSession cleans up cleanly
  mockStorage.setItem(SESSION_STORAGE_KEY, '{corrupted-json');
  let discardThrew = false;
  try {
    useGameSessionStore.getState().discardSession();
  } catch {
    discardThrew = true;
  }
  assert(!discardThrew, 'discardSession() executes cleanly on corrupted storage');
  assert(mockStorage.getItem(SESSION_STORAGE_KEY) === null, 'discardSession() cleared the corrupted key from storage');
})();

// ======================================================================
// SUITE 3: BOARD GAME STATE MACHINE (CLÁSICA 45 & HOT 40)
// ======================================================================
console.log('\n--- SUITE 3: Board Game State Machine (Clásica 45 & Hot 40) ---');

// Test 3.1: Clásica 45 - 4 Players Setup & Jail Skip Turn-by-Turn Countdowns
(() => {
  console.log('\n[Subtest 3.1] La Guatoca Clásica (45 casillas): 4-Player Turn Cycle & Jail Skip Countdowns');
  resetAllStores();

  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

  const state = useGameSessionStore.getState();
  assert(state.mode === 'board', 'Board session mode initialized');
  assert(state.currentTurnPlayerIndex === 0, 'Current turn starts at player 0 (Lucas)');
  assert(fourPlayers.every(p => state.boardPositions[p.id] === 1), 'All 4 player pawns start at tile 1');
  assert(fourPlayers.every(p => state.boardJails[p.id] === 0), 'All 4 player jails start at 0');

  // Verify tile 10 in Clásica is Cárcel
  const tile10 = clasicaTilesReal.find(t => t.tile_number === 10);
  assert(tile10?.tile_type === 'trap_jail', 'Tile 10 is trap_jail in Clásica catalog');

  // Setup: Player 1 (Lucas) lands in jail with 2 turns (or tile turns_lost)
  // Let's set Lucas at tile 9 and roll 1 -> lands on tile 10
  useGameSessionStore.setState({
    boardPositions: { ...useGameSessionStore.getState().boardPositions, p_1_lucas: 9 },
    currentTurnPlayerIndex: 0,
  });

  const rollJailRes = useGameSessionStore.getState().rollBoardDice(1);
  assert(rollJailRes?.destination === 10, 'Lucas lands on tile 10 (Cárcel)');
  const lucasJailInit = useGameSessionStore.getState().boardJails['p_1_lucas'];
  assert(lucasJailInit >= 1, `Lucas jailed with ${lucasJailInit} turns penalty`);
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 1, 'Turn immediately advanced to Martina (player 1)');

  // Ensure Lucas has 2 turns penalty for full multi-round countdown testing
  useGameSessionStore.setState({
    boardJails: { ...useGameSessionStore.getState().boardJails, p_1_lucas: 2 },
  });

  // Cycle Martina (p1), Tomás (p2), Sofía (p3)
  // Martina's turn
  const p2Roll = useGameSessionStore.getState().rollBoardDice(3);
  assert(p2Roll?.destination === 4, 'Martina rolls 3 and reaches tile 4');
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 2, 'Turn advanced to Tomás (player 2)');

  // Tomás's turn
  const p3Roll = useGameSessionStore.getState().rollBoardDice(2);
  assert(p3Roll?.destination === 3, 'Tomás rolls 2 and reaches tile 3');
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 3, 'Turn advanced to Sofía (player 3)');

  // Sofía's turn
  const p4Roll = useGameSessionStore.getState().rollBoardDice(1);
  assert(p4Roll?.destination === 2, 'Sofía rolls 1 and reaches tile 2');
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 0, 'Turn cycled back to Lucas (player 0)!');

  // --- ROUND 1 OF JAIL FOR LUCAS ---
  const jailSkip1 = useGameSessionStore.getState().rollBoardDice();
  assert(jailSkip1?.skipped === true, 'Round 1: Lucas roll was skipped');
  assert(jailSkip1?.reason === 'jail', 'Round 1: Skip reason is "jail"');
  assert(jailSkip1?.remainingJailTurns === 1, 'Round 1: Remaining jail turns decremented to 1');
  assert(useGameSessionStore.getState().boardJails['p_1_lucas'] === 1, 'Round 1: boardJails state is 1');
  assert(useGameSessionStore.getState().boardPositions['p_1_lucas'] === 10, 'Round 1: Lucas remains at tile 10');
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 1, 'Round 1: Turn advanced to Martina (player 1)');

  // Cycle Martina, Tomás, Sofía again
  useGameSessionStore.getState().rollBoardDice(2); // Martina: 4 + 2 = 6
  useGameSessionStore.getState().rollBoardDice(2); // Tomás: 3 + 2 = 5 (jump to 9, extra roll)
  if (useGameSessionStore.getState().currentTurnPlayerIndex === 2) {
    useGameSessionStore.getState().rollBoardDice(2); // Tomás extra roll -> 9 + 2 = 11
  }
  useGameSessionStore.getState().rollBoardDice(1); // Sofía: 2 + 1 = 3

  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 0, 'Turn cycled back to Lucas for Round 2!');

  // --- ROUND 2 OF JAIL FOR LUCAS ---
  const jailSkip2 = useGameSessionStore.getState().rollBoardDice();
  assert(jailSkip2?.skipped === true, 'Round 2: Lucas roll was skipped');
  assert(jailSkip2?.remainingJailTurns === 0, 'Round 2: Remaining jail turns decremented to 0');
  assert(useGameSessionStore.getState().boardJails['p_1_lucas'] === 0, 'Round 2: boardJails state is now 0 (served sentence)');
  assert(useGameSessionStore.getState().boardPositions['p_1_lucas'] === 10, 'Round 2: Lucas remains at tile 10');
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 1, 'Round 2: Turn advanced to Martina');

  // Cycle Martina, Tomás, Sofía again
  useGameSessionStore.getState().rollBoardDice(1); // Martina
  useGameSessionStore.getState().rollBoardDice(1); // Tomás
  useGameSessionStore.getState().rollBoardDice(1); // Sofía

  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 0, 'Turn cycled back to Lucas for Round 3 (Free)!');

  // --- ROUND 3: LUCAS IS FREE! ---
  const freeRoll = useGameSessionStore.getState().rollBoardDice(4);
  assert(freeRoll?.skipped === undefined || freeRoll?.skipped === false, 'Round 3: Lucas roll is NOT skipped');
  assert(freeRoll?.destination === 14 || freeRoll?.destination === 18, `Round 3: Lucas successfully advanced to tile ${freeRoll?.destination}`);
  assert(useGameSessionStore.getState().boardPositions['p_1_lucas'] > 10, 'Round 3: Lucas pawn moved beyond tile 10');
})();

// Test 3.2: Overshoot Bounce-Back Calculations at Tiles 43 and 44 with rolls 1-6 (Clásica 45)
(() => {
  console.log('\n[Subtest 3.2] La Guatoca Clásica (45 casillas): Overshoot Bounce-Back Oracle at Tiles 43 and 44');

  // Pure engine oracle verification first
  const clasicaMax = 45;

  console.log('  Testing BoardEngine.calculateDestination oracle for Tile 43 (rolls 1-6):');
  // At tile 43:
  // roll 1: 43 + 1 = 44
  // roll 2: 43 + 2 = 45 (Meta)
  // roll 3: 43 + 3 = 46 -> 45 - 1 = 44
  // roll 4: 43 + 4 = 47 -> 45 - 2 = 43
  // roll 5: 43 + 5 = 48 -> 45 - 3 = 42
  // roll 6: 43 + 6 = 49 -> 45 - 4 = 41
  const oracle43 = [
    { roll: 1, expected: 44 },
    { roll: 2, expected: 45 },
    { roll: 3, expected: 44 },
    { roll: 4, expected: 43 },
    { roll: 5, expected: 42 },
    { roll: 6, expected: 41 },
  ];

  for (const { roll, expected } of oracle43) {
    const dest = BoardEngine.calculateDestination(43, roll, clasicaMax);
    assert(dest === expected, `Oracle pos=43 roll=${roll} => dest=${dest} (expected=${expected})`);
  }

  console.log('  Testing BoardEngine.calculateDestination oracle for Tile 44 (rolls 1-6):');
  // At tile 44:
  // roll 1: 44 + 1 = 45 (Meta)
  // roll 2: 44 + 2 = 46 -> 45 - 1 = 44
  // roll 3: 44 + 3 = 47 -> 45 - 2 = 43
  // roll 4: 44 + 4 = 48 -> 45 - 3 = 42
  // roll 5: 44 + 5 = 49 -> 45 - 4 = 41
  // roll 6: 44 + 6 = 50 -> 45 - 5 = 40
  const oracle44 = [
    { roll: 1, expected: 45 },
    { roll: 2, expected: 44 },
    { roll: 3, expected: 43 },
    { roll: 4, expected: 42 },
    { roll: 5, expected: 41 },
    { roll: 6, expected: 40 },
  ];

  for (const { roll, expected } of oracle44) {
    const dest = BoardEngine.calculateDestination(44, roll, clasicaMax);
    assert(dest === expected, `Oracle pos=44 roll=${roll} => dest=${dest} (expected=${expected})`);
  }

  // Now test through useGameSessionStore state machine
  console.log('  Testing useGameSessionStore state machine transitions for Tile 43 & 44:');

  // Non-special tiles synthetic board to isolate pure bounce-back movement
  const plainTiles45: BoardTile[] = Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    board_id: 'guatoca_clasica',
    tile_number: i + 1,
    tile_type: i + 1 === 45 ? 'finish' : i + 1 === 1 ? 'start' : 'drink',
    title: `Casilla ${i + 1}`,
    description: `Tile ${i + 1}`,
    drinks_action: 0,
    target: 'self',
    action_jump_to: null,
    turns_lost: 0,
    icon: 'dice',
  }));

  // Test overshoot rolls 3, 4, 5, 6 from tile 43
  for (const { roll, expected } of oracle43) {
    if (roll === 2) continue; // Skip victory roll here to test separately
    resetAllStores();
    usePlayerStore.getState().setPlayers(fourPlayers);
    useGameSessionStore.getState().startBoardSession('guatoca_clasica', plainTiles45, fourPlayers);

    useGameSessionStore.setState({
      boardPositions: { p_1_lucas: 43, p_2_martina: 1, p_3_tomas: 1, p_4_sofia: 1 },
      currentTurnPlayerIndex: 0,
    });

    const res = useGameSessionStore.getState().rollBoardDice(roll);
    assert(
      res?.destination === expected && useGameSessionStore.getState().boardPositions['p_1_lucas'] === expected,
      `Store state machine: Lucas at 43 rolled ${roll} => pawn moved to ${res?.destination} (expected ${expected})`
    );
    assert(res?.isVictory !== true, `Roll ${roll} does not prematurely trigger victory`);
  }

  // Test overshoot rolls 2, 3, 4, 5, 6 from tile 44
  for (const { roll, expected } of oracle44) {
    if (roll === 1) continue; // Skip victory roll here to test separately
    resetAllStores();
    usePlayerStore.getState().setPlayers(fourPlayers);
    useGameSessionStore.getState().startBoardSession('guatoca_clasica', plainTiles45, fourPlayers);

    useGameSessionStore.setState({
      boardPositions: { p_1_lucas: 44, p_2_martina: 1, p_3_tomas: 1, p_4_sofia: 1 },
      currentTurnPlayerIndex: 0,
    });

    const res = useGameSessionStore.getState().rollBoardDice(roll);
    assert(
      res?.destination === expected && useGameSessionStore.getState().boardPositions['p_1_lucas'] === expected,
      `Store state machine: Lucas at 44 rolled ${roll} => pawn moved to ${res?.destination} (expected ${expected})`
    );
    assert(res?.isVictory !== true, `Roll ${roll} does not prematurely trigger victory`);
  }
})();

// Test 3.3: Hot 40 - Overshoot Bounce-Back Oracle at Tiles 38 and 39 with rolls 1-6
(() => {
  console.log('\n[Subtest 3.3] La Guatoca Hot (40 casillas): Overshoot Bounce-Back Oracle at Tiles 38 and 39');
  const hotMax = 40;

  // At tile 38 (totalTiles = 40):
  // roll 1: 38 + 1 = 39
  // roll 2: 38 + 2 = 40 (Meta)
  // roll 3: 38 + 3 = 41 -> 40 - 1 = 39
  // roll 4: 38 + 4 = 42 -> 40 - 2 = 38
  // roll 5: 38 + 5 = 43 -> 40 - 3 = 37
  // roll 6: 38 + 6 = 44 -> 40 - 4 = 36
  const oracleHot38 = [
    { roll: 1, expected: 39 },
    { roll: 2, expected: 40 },
    { roll: 3, expected: 39 },
    { roll: 4, expected: 38 },
    { roll: 5, expected: 37 },
    { roll: 6, expected: 36 },
  ];

  for (const { roll, expected } of oracleHot38) {
    const dest = BoardEngine.calculateDestination(38, roll, hotMax);
    assert(dest === expected, `Hot Oracle pos=38 roll=${roll} => dest=${dest} (expected=${expected})`);
  }

  // At tile 39 (totalTiles = 40):
  // roll 1: 39 + 1 = 40 (Meta)
  // roll 2: 39 + 2 = 41 -> 40 - 1 = 39
  // roll 3: 39 + 3 = 42 -> 40 - 2 = 38
  // roll 4: 39 + 4 = 43 -> 40 - 3 = 37
  // roll 5: 39 + 5 = 44 -> 40 - 4 = 36
  // roll 6: 39 + 6 = 45 -> 40 - 5 = 35
  const oracleHot39 = [
    { roll: 1, expected: 40 },
    { roll: 2, expected: 39 },
    { roll: 3, expected: 38 },
    { roll: 4, expected: 37 },
    { roll: 5, expected: 36 },
    { roll: 6, expected: 35 },
  ];

  for (const { roll, expected } of oracleHot39) {
    const dest = BoardEngine.calculateDestination(39, roll, hotMax);
    assert(dest === expected, `Hot Oracle pos=39 roll=${roll} => dest=${dest} (expected=${expected})`);
  }
})();

// Test 3.4: Game Termination on Victory (Clásica 45 & Hot 40)
(() => {
  console.log('\n[Subtest 3.4] Victory Termination on Both Clásica and Hot');

  // Victory in Clásica (Tile 45)
  resetAllStores();
  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

  // Position Martina at tile 43, current turn = 1
  useGameSessionStore.setState({
    boardPositions: { p_1_lucas: 10, p_2_martina: 43, p_3_tomas: 5, p_4_sofia: 8 },
    currentTurnPlayerIndex: 1,
  });

  // Martina rolls 2 -> lands exactly on tile 45 (Meta)
  const victoryResClasica = useGameSessionStore.getState().rollBoardDice(2);
  assert(victoryResClasica?.isVictory === true, 'Clásica: Victory triggered on landing on tile 45');
  assert(victoryResClasica?.destination === 45, 'Clásica: Winner destination is 45');
  assert(victoryResClasica?.winner?.id === 'p_2_martina', 'Clásica: Winner is Martina');

  const clasicaState = useGameSessionStore.getState();
  assert(clasicaState.isGameOver === true, 'Clásica: Store isGameOver is true');
  assert(clasicaState.winner?.id === 'p_2_martina', 'Clásica: Store winner is Martina');
  assert(clasicaState.boardPositions['p_2_martina'] === 45, 'Clásica: Martina pawn is on tile 45');

  // Attempting to roll after game over should return null and not modify state
  const postGameOverRoll = useGameSessionStore.getState().rollBoardDice(3);
  assert(postGameOverRoll === null, 'Post-game-over roll returns null');
  assert(useGameSessionStore.getState().isGameOver === true, 'State remains game over');

  // Victory in Hot (Tile 40)
  resetAllStores();
  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startBoardSession('guatoca_hot', hotTilesReal, fourPlayers);

  // Position Sofía at tile 39, current turn = 3
  useGameSessionStore.setState({
    boardPositions: { p_1_lucas: 12, p_2_martina: 20, p_3_tomas: 15, p_4_sofia: 39 },
    currentTurnPlayerIndex: 3,
  });

  // Sofía rolls 1 -> lands exactly on tile 40 (Meta in Hot)
  const victoryResHot = useGameSessionStore.getState().rollBoardDice(1);
  assert(victoryResHot?.isVictory === true, 'Hot: Victory triggered on landing on tile 40');
  assert(victoryResHot?.destination === 40, 'Hot: Winner destination is 40');
  assert(victoryResHot?.winner?.id === 'p_4_sofia', 'Hot: Winner is Sofía');

  const hotState = useGameSessionStore.getState();
  assert(hotState.isGameOver === true, 'Hot: Store isGameOver is true');
  assert(hotState.winner?.id === 'p_4_sofia', 'Hot: Store winner is Sofía');
  assert(hotState.boardPositions['p_4_sofia'] === 40, 'Hot: Sofía pawn is on tile 40');
})();

// Test 3.5: Investigation of Jump Tiles at Tile 44 (Clásica) and Tile 39 (Hot)
(() => {
  console.log('\n[Subtest 3.5] Investigation: Jump Tile on Penultimate Tile (Tile 44 in Clásica, Tile 39 in Hot)');

  // Let's test what happens when using real catalog tiles:
  // Lucas at tile 43 rolls 1 -> lands on tile 44 (which has action_jump_to: 45)
  resetAllStores();
  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

  useGameSessionStore.setState({
    boardPositions: { p_1_lucas: 43, p_2_martina: 1, p_3_tomas: 1, p_4_sofia: 1 },
    currentTurnPlayerIndex: 0,
  });

  const jumpRes = useGameSessionStore.getState().rollBoardDice(1);
  console.log('  Lucas at tile 43 rolls 1 on real Clásica board:');
  console.log('  -> res.destination:', jumpRes?.destination);
  console.log('  -> res.tile.tile_number:', jumpRes?.tile?.tile_number);
  console.log('  -> res.actionResult:', jumpRes?.actionResult);
  console.log('  -> res.isVictory:', jumpRes?.isVictory);
  console.log('  -> store.isGameOver:', useGameSessionStore.getState().isGameOver);
  console.log('  -> store.boardPositions.p_1_lucas:', useGameSessionStore.getState().boardPositions['p_1_lucas']);
  console.log('  -> store.currentTurnPlayerIndex:', useGameSessionStore.getState().currentTurnPlayerIndex);
})();

// ======================================================================
// SUITE 4: ADVERSARIAL VULNERABILITY FORENSICS (BUG-M4-01 & BUG-M4-02)
// ======================================================================
console.log('\n--- SUITE 4: Adversarial Vulnerability Forensics ---');

// Forensics 4.1: Bug-M4-01 - Stale activePlayers variable captured before sips/targeted mutation in nextCard()
(() => {
  console.log('\n[Forensics 4.1] Reproduction of BUG-M4-01: Stale activePlayers captured in persistActiveSession');
  resetAllStores();

  const testPlayers: Player[] = [
    { id: 'p_alpha', name: 'Alpha', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#ec4899', avatar: '🦁', jailTurns: 0, boardPosition: 1 },
    { id: 'p_beta', name: 'Beta', sips: 0, sipCount: 0, timesTargeted: 0, targetCount: 0, color: '#8b5cf6', avatar: '🦊', jailTurns: 0, boardPosition: 1 },
  ];
  usePlayerStore.getState().setPlayers(testPlayers);

  // Single card that awards 3 sips to active_player
  const singleCardDeck: Card[] = [
    { id: 201, type: 'rule', text: '{player1} toma {drinks} tragos ahora mismo.', intensity: 2, drinks_penalty: 3, target: 'active_player' },
    { id: 202, type: 'rule', text: '{player1} toma {drinks} tragos en la segunda ronda.', intensity: 2, drinks_penalty: 2, target: 'active_player' },
  ];

  useGameSessionStore.getState().startCardSession(singleCardDeck, 'category', { intensity: 2 }, testPlayers);

  // Advance to card 1
  useGameSessionStore.getState().nextCard();

  // In-memory player store has updated stats
  const memoryPlayers = usePlayerStore.getState().players;
  const targetedInMem = memoryPlayers.find(p => p.id === useGameSessionStore.getState().assignedPlayers[0].id);

  // In localStorage, inspect savedPlayers directly
  const savedRaw = mockStorage.getItem(SESSION_STORAGE_KEY);
  const parsedSnapshot = JSON.parse(savedRaw!);
  const targetedInStorage = parsedSnapshot.savedPlayers.find((p: any) => p.id === targetedInMem?.id);

  console.log(`    Targeted player: ${targetedInMem?.name}`);
  console.log(`    In-memory sips=${targetedInMem?.sips}, targeted=${targetedInMem?.timesTargeted}`);
  console.log(`    Storage sips=${targetedInStorage?.sips}, targeted=${targetedInStorage?.timesTargeted}`);

  const hasStaleCaptureDefect = (targetedInStorage.timesTargeted !== targetedInMem?.timesTargeted) || (targetedInStorage.sips !== targetedInMem?.sips);
  assert(
    hasStaleCaptureDefect === true,
    'BUG-M4-01 PROVEN: localStorage snapshot contains stale player stats (sips/targeted not persisted on active card)'
  );
})();

// Forensics 4.2: Bug-M4-02 - Penultimate jump tile to Meta loop
(() => {
  console.log('\n[Forensics 4.2] Reproduction of BUG-M4-02: Jump tile to Meta (casilla 44 -> 45) fails to set victory');
  resetAllStores();

  usePlayerStore.getState().setPlayers(fourPlayers);
  useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTilesReal, fourPlayers);

  // Put player at tile 43, roll 1 -> lands on tile 44 (which jumps to 45 Meta)
  useGameSessionStore.setState({
    boardPositions: { p_1_lucas: 43, p_2_martina: 1, p_3_tomas: 1, p_4_sofia: 1 },
    currentTurnPlayerIndex: 0,
  });

  const jumpResult = useGameSessionStore.getState().rollBoardDice(1);

  // Player pawn is moved to tile 45
  assert(useGameSessionStore.getState().boardPositions['p_1_lucas'] === 45, 'Pawn moved to tile 45 via jump');
  // BUT isGameOver is false!
  const hasMetaJumpDefect = useGameSessionStore.getState().isGameOver === false && jumpResult?.isVictory !== true;
  assert(
    hasMetaJumpDefect === true,
    'BUG-M4-02 PROVEN: Jump tile to Meta places pawn on tile 45 without triggering victory or ending game'
  );

  // Demonstrate infinite bounce: player on tile 45 has extra roll, rolls 1 -> bounces back to 44
  const bounceRoll = useGameSessionStore.getState().rollBoardDice(1);
  assert(
    bounceRoll?.destination === 45, // Bounces to 44, and tile 44 jumps back to 45!
    'BUG-M4-02 CONSEQUENCE PROVEN: Extra roll from tile 45 rolls 1, bounces to 44, and jumps back to 45 in an infinite loop!'
  );
})();

// ======================================================================
// SUMMARY
// ======================================================================
console.log('\n======================================================================');
console.log(`TEST RESULTS: Total: ${totalAssertions} | Passed: ${passedAssertions} | Failed: ${failedAssertions}`);
if (failedAssertions > 0) {
  console.log('FAILURES:');
  for (const f of failureDetails) {
    console.log(` - ${f}`);
  }
}
console.log('======================================================================');

process.exit(failedAssertions > 0 ? 1 : 0);
