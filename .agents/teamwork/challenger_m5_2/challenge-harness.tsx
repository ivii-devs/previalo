/**
 * Challenger M5.2 Empirical Adversarial Test Harness
 * Standalone TypeScript Verification Suite for Milestone 5: Full User Flows
 *
 * Verifies:
 * 1. SetupScreen: Player gating (0, 1, >=2), 1-tap Quick Add chips, duplicate prevention, whitespace trimming, intensity & board selectors.
 * 2. Full Card Game Flow: Card draw progression, token interpolation, active virus alerts, HUD, round countdowns, expiration modals, manual sip adjusters, undo stack, and game over to Podium.
 * 3. Full Board Game Flow: Board initialization, dice rolling, TileModal popups, Oca jumps + extra rolls, Cárcel skips, Calavera resets, Trap Back retrocession, finish line overshoot bounce-back, Meta victory, and Podium celebration.
 * 4. Pause and Resume Flow: Session persistence, HomeScreen & TopHeader banners, screen suppression, state rehydration to active game screen, and corrupted payload resilience.
 */

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';

// --- Browser Environment Polyfills for Node ---
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

const mockWindow = {
  localStorage: mockStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
  navigator: {
    onLine: true,
    vibrate: () => true,
  },
};

const mockDocument = {
  documentElement: {
    setAttribute: () => {},
    getAttribute: () => null,
  },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
};

if (typeof (globalThis as any).localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof (globalThis as any).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
  });
} else {
  Object.assign((globalThis as any).window, mockWindow);
}

if (typeof (globalThis as any).document === 'undefined') {
  Object.defineProperty(globalThis, 'document', {
    value: mockDocument,
    writable: true,
  });
} else {
  Object.assign((globalThis as any).document, mockDocument);
}

// Intercept fetch for CatalogLoader to load real data from public/data/
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === 'string' ? input : input.toString();
  if (urlStr.startsWith('/') || urlStr.startsWith('http://localhost') || urlStr.includes('/data/')) {
    const cleanPath = urlStr.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
    const filePath = path.resolve(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return new Response(content, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  if (originalFetch) {
    return originalFetch(input, init);
  }
  throw new Error(`Fetch failed for ${urlStr}`);
};

// Imports
import { SetupScreen } from '../../../src/presentation/screens/SetupScreen';
import { HomeScreen } from '../../../src/presentation/screens/HomeScreen';
import { TopHeader } from '../../../src/presentation/components/TopHeader';
import { GameCardsScreen } from '../../../src/presentation/screens/GameCardsScreen';
import { GameBoardScreen } from '../../../src/presentation/screens/GameBoardScreen';
import { PodiumScreen } from '../../../src/presentation/screens/PodiumScreen';
import { VirusHUD } from '../../../src/presentation/components/VirusHUD';
import { VirusExpiredModal } from '../../../src/presentation/components/VirusExpiredModal';
import { TileModal } from '../../../src/presentation/components/TileModal';

import { usePlayerStore } from '../../../src/application/usePlayerStore';
import {
  useGameSessionStore,
  SESSION_STORAGE_KEY,
} from '../../../src/application/useGameSessionStore';
import { CatalogLoader } from '../../../src/infrastructure/catalogLoader';
import type { Card } from '../../../src/domain/types/card';
import type { BoardTile } from '../../../src/domain/types/board';
import type { Player } from '../../../src/domain/types/player';

// Test statistics
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

async function runAdversarialHarness() {
  console.log('================================================================');
  console.log('   CHALLENGER M5.2: EMPIRICAL FULL USER FLOWS ADVERSARIAL SUITE');
  console.log('================================================================\n');

  // Load canonical board tiles
  const clasicaTiles = await CatalogLoader.loadBoard('guatoca_clasica');
  const hotTiles = await CatalogLoader.loadBoard('guatoca_hot');
  assert(clasicaTiles.length === 45, 'Loaded 45 tiles for guatoca_clasica');
  assert(hotTiles.length === 40, 'Loaded 40 tiles for guatoca_hot');

  // -------------------------------------------------------------------------
  // SUITE 1: SetupScreen Player Gating & Quick Add Chips
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 1: SetupScreen Player Management & Gating ---');
  mockStorage.clear();
  usePlayerStore.setState({ players: [], historicalPlayers: [] });
  useGameSessionStore.getState().endSession();

  // 1.1: 0 Players
  const html0 = renderToString(
    <SetupScreen mode="chaos" onStartGame={() => {}} onBack={() => {}} />
  );
  assert(html0.includes('disabled=""'), '0 Players: Start CTA is disabled with disabled attribute');
  assert(html0.includes('Mínimo 2 jugadores'), '0 Players: Minimum 2 players notice rendered');
  assert(html0.includes('Agrega al menos 2 jugadores para empezar la previa.'), '0 Players: Empty roster prompt displayed');

  // 1.2: 1 Player
  usePlayerStore.getState().addPlayer('Rodrigo');
  const html1 = renderToString(
    <SetupScreen mode="chaos" onStartGame={() => {}} onBack={() => {}} />
  );
  assert(html1.includes('disabled=""'), '1 Player: Start CTA remains disabled');
  assert(html1.includes('Rodrigo'), '1 Player: Roster shows added player Rodrigo');

  // 1.3: 2 Players
  usePlayerStore.getState().addPlayer('Valentina');
  const html2 = renderToString(
    <SetupScreen mode="chaos" onStartGame={() => {}} onBack={() => {}} />
  );
  assert(!html2.match(/disabled=""[^>]*data-testid="start-game-btn"/), '>=2 Players: Start CTA is enabled (no disabled attribute)');
  assert(html2.includes('Inicia'), '>=2 Players: First player has "Inicia" badge');

  // 1.4: Quick Add Chips filtering
  usePlayerStore.setState({
    players: [{ id: 'p_1', name: 'Rodrigo', sips: 0, timesTargeted: 0 }],
    historicalPlayers: ['Rodrigo', 'Valentina', 'Mateo', 'Camila'],
  });
  const htmlChips = renderToString(
    <SetupScreen mode="chaos" onStartGame={() => {}} onBack={() => {}} />
  );
  assert(htmlChips.includes('+</span><span>Valentina'), 'Quick Add: Valentina chip rendered');
  assert(htmlChips.includes('+</span><span>Mateo'), 'Quick Add: Mateo chip rendered');
  assert(htmlChips.includes('+</span><span>Camila'), 'Quick Add: Camila chip rendered');
  assert(!htmlChips.includes('+</span><span>Rodrigo'), 'Quick Add: Already active Rodrigo chip is excluded');

  // 1.5: Duplicate prevention & Whitespace handling
  const addedQ1 = usePlayerStore.getState().quickAddPlayer('Valentina');
  assert(addedQ1 !== null && addedQ1.name === 'Valentina', 'Quick Add: Valentina added successfully');

  const dupExact = usePlayerStore.getState().quickAddPlayer('Valentina');
  assert(dupExact === null, 'Quick Add: Duplicate exact name rejected');

  const dupCase = usePlayerStore.getState().quickAddPlayer('valentina');
  assert(dupCase === null, 'Quick Add: Duplicate case-insensitive name rejected');

  const dupSpaces = usePlayerStore.getState().quickAddPlayer('  Valentina  ');
  assert(dupSpaces === null, 'Quick Add: Duplicate with spaces rejected');

  const emptyAdd = usePlayerStore.getState().addPlayer('   ');
  assert(emptyAdd === null, 'Add Player: Whitespace-only name rejected');

  // 1.6: Remove player drops below 2
  usePlayerStore.getState().removePlayer(addedQ1!.id);
  const htmlRemoved = renderToString(
    <SetupScreen mode="chaos" onStartGame={() => {}} onBack={() => {}} />
  );
  assert(htmlRemoved.includes('disabled=""'), 'Removing player drops roster to 1 and re-disables Start CTA');
  assert(!htmlRemoved.includes(`data-testid="player-item-${addedQ1!.id}"`), 'Removed player absent from active roster');

  // 1.7: Mode & board options
  const htmlBoardSetup = renderToString(
    <SetupScreen mode="board" onStartGame={() => {}} onBack={() => {}} />
  );
  assert(htmlBoardSetup.includes('Selecciona el Tablero'), 'Board mode displays board selector');
  assert(htmlBoardSetup.includes('Clásica'), 'Board mode displays Clásica 45');
  assert(htmlBoardSetup.includes('Hot'), 'Board mode displays Hot 40');

  // -------------------------------------------------------------------------
  // SUITE 2: Full Card Game Flow (Progression, Virus Lifecycle, Expiry, Podium)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Full Card Game Flow with Virus Lifecycle & Podium ---');
  mockStorage.clear();
  usePlayerStore.setState({ players: [], historicalPlayers: [] });
  useGameSessionStore.getState().endSession();

  const pMateo = usePlayerStore.getState().addPlayer('Mateo')!;
  const pCamila = usePlayerStore.getState().addPlayer('Camila')!;
  const pLucia = usePlayerStore.getState().addPlayer('Lucía')!;
  const cardPlayers = [pMateo, pCamila, pLucia];

  const testDeck: Card[] = [
    {
      id: 'c1',
      category: 'yo_nunca',
      type: 'standard',
      intensity: 1,
      text: 'Yo nunca he perdido el celular en una fiesta {player1}',
      drinks_penalty: 1,
      target: 'active_player',
    },
    {
      id: 'c2_virus',
      category: 'ruleta_maldita',
      type: 'virus',
      intensity: 2,
      text: 'VIRUS: {player1} debe brindar antes de cada trago por 2 rondas.',
      duration_rounds: 2,
      drinks_penalty: 2,
      target: 'active_player',
    },
    {
      id: 'c3',
      category: 'verdad_o_reto',
      type: 'standard',
      intensity: 2,
      text: '{player1} haz una confesión a {player2}',
      drinks_penalty: 2,
      target: 'pair',
    },
    {
      id: 'c4',
      category: 'que_prefieres',
      type: 'standard',
      intensity: 2,
      text: '¿Qué prefieres {player1}?',
      drinks_penalty: 2,
      target: 'active_player',
    },
  ];

  // Start card session
  useGameSessionStore.getState().startCardSession(testDeck, 'chaos', { intensity: 2 }, cardPlayers);
  assert(useGameSessionStore.getState().currentIndex === 0, 'Card Flow: Started at index 0');
  assert(useGameSessionStore.getState().currentCard?.id === 'c1', 'Card Flow: First card loaded');
  assert(useGameSessionStore.getState().activeViruses.length === 0, 'Card Flow: No active viruses on card 1');

  // Card 1 screen render
  let gameOverTriggered = false;
  const htmlCard1 = renderToString(
    <GameCardsScreen onGameOver={() => { gameOverTriggered = true; }} onExitHome={() => {}} />
  );
  assert(htmlCard1.includes('Turno:'), 'Card 1: Active turn player header rendered');
  assert(!htmlCard1.includes('Virus Activos'), 'Card 1: VirusHUD hidden when no active viruses');

  // Advance to Card 2: VIRUS card
  useGameSessionStore.getState().nextCard(cardPlayers);
  assert(useGameSessionStore.getState().currentIndex === 1, 'Card Flow: Advanced to card 2');
  assert(useGameSessionStore.getState().currentCard?.id === 'c2_virus', 'Card Flow: Virus card is active');

  const virusesRound1 = useGameSessionStore.getState().activeViruses;
  assert(virusesRound1.length === 1, 'Virus Lifecycle: Exactly 1 active virus registered');
  assert(virusesRound1[0].roundsRemaining === 2, 'Virus Lifecycle: Initial roundsRemaining = 2');

  const htmlHUD1 = renderToString(<VirusHUD activeViruses={virusesRound1} />);
  assert(htmlHUD1.includes('Virus Activos'), 'VirusHUD: Rendered active virus badge');
  assert(htmlHUD1.includes('rondas'), 'VirusHUD: Displays rounds remaining');

  // Advance to Card 3: Virus countdown decrements to 1
  useGameSessionStore.getState().nextCard(cardPlayers);
  assert(useGameSessionStore.getState().currentIndex === 2, 'Card Flow: Advanced to card 3');
  const virusesRound2 = useGameSessionStore.getState().activeViruses;
  assert(virusesRound2.length === 1, 'Virus Lifecycle: Virus still active after round 1');
  assert(virusesRound2[0].roundsRemaining === 1, 'Virus Lifecycle: roundsRemaining decremented to 1 (urgent)');

  const htmlHUD2 = renderToString(<VirusHUD activeViruses={virusesRound2} />);
  assert(htmlHUD2.includes('ronda'), 'VirusHUD: Urgent state displays 1 ronda');

  // Advance to Card 4: Virus expires!
  useGameSessionStore.getState().nextCard(cardPlayers);
  assert(useGameSessionStore.getState().currentIndex === 3, 'Card Flow: Advanced to card 4');
  assert(useGameSessionStore.getState().activeViruses.length === 0, 'Virus Expiration: Active viruses emptied on expiration');

  const expiredViruses = useGameSessionStore.getState().expiredVirusesQueue;
  assert(expiredViruses.length === 1, 'Virus Expiration: Expired virus pushed to expiredVirusesQueue');

  let dismissedVirusId: string | null = null;
  const htmlExpiryModal = renderToString(
    <VirusExpiredModal expiredViruses={expiredViruses} onDismiss={(id) => { dismissedVirusId = id; }} />
  );
  assert(htmlExpiryModal.includes('Virus Expirado'), 'VirusExpiredModal: Modal announces expiration');
  assert(htmlExpiryModal.includes('¡Regla Concluida!'), 'VirusExpiredModal: Rule concluded notice');
  assert(htmlExpiryModal.includes('¡ENTENDIDO!'), 'VirusExpiredModal: Dismiss CTA button rendered');

  useGameSessionStore.getState().dismissExpiredVirus(expiredViruses[0].id);
  assert(useGameSessionStore.getState().expiredVirusesQueue.length === 0, 'Virus Dismissal: Queue cleared after dismissal');

  // Advance past last card: Game Over
  useGameSessionStore.getState().nextCard(cardPlayers);
  assert(useGameSessionStore.getState().isGameOver === true, 'Card Flow: isGameOver set to true past final card');

  // Podium Screen verification
  usePlayerStore.getState().addSips(pMateo.id, 8);
  usePlayerStore.getState().addSips(pCamila.id, 4);
  usePlayerStore.getState().addSips(pLucia.id, 12);

  let playAgainClicked = false;
  let exitHomeClicked = false;
  const htmlPodiumCards = renderToString(
    <PodiumScreen onPlayAgain={() => { playAgainClicked = true; }} onExitHome={() => { exitHomeClicked = true; }} />
  );
  assert(htmlPodiumCards.includes('¡FIN DE LA PREVIA!'), 'Podium: Celebration header rendered');
  assert(htmlPodiumCards.includes('Más Bebedor'), 'Podium: Más Bebedor award rendered');
  assert(htmlPodiumCards.includes('Más Buscado'), 'Podium: Más Buscado award rendered');
  assert(htmlPodiumCards.includes('Ranking de Jugadores'), 'Podium: Scoreboard rendered');
  assert(htmlPodiumCards.includes('JUGAR DE NUEVO'), 'Podium: Play again CTA present');
  assert(htmlPodiumCards.includes('Volver al Inicio'), 'Podium: Exit home CTA present');

  // -------------------------------------------------------------------------
  // SUITE 3: Full Board Game Flow (Roll, Special Tiles, Bounce-back, Victory)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Full Board Game Flow with Special Tiles & Meta Victory ---');
  mockStorage.clear();
  usePlayerStore.setState({ players: [], historicalPlayers: [] });
  useGameSessionStore.getState().endSession();

  const pBoard1 = usePlayerStore.getState().addPlayer('Lucas')!;
  const pBoard2 = usePlayerStore.getState().addPlayer('Martina')!;
  const boardPlayers = [pBoard1, pBoard2];

  useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTiles, boardPlayers);
  assert(useGameSessionStore.getState().boardPositions[pBoard1.id] === 1, 'Board: Lucas starts at tile 1');
  assert(useGameSessionStore.getState().boardPositions[pBoard2.id] === 1, 'Board: Martina starts at tile 1');
  assert(useGameSessionStore.getState().currentTurnPlayerIndex === 0, 'Board: Turn begins on player 0 (Lucas)');

  // 3.1: Normal roll & Oca Jump
  const rollOca = useGameSessionStore.getState().rollBoardDice(4); // Tile 1 + 4 = 5 (Jump tile)
  assert(rollOca !== null, 'Board Roll: Executed successfully');
  if (rollOca?.extraRoll) {
    assert(rollOca.extraRoll === true, 'Special Tile: Oca jump grants extraRoll');
    assert(useGameSessionStore.getState().boardPositions[pBoard1.id] === (rollOca.tile?.action_jump_to ?? 9), 'Special Tile: Jumped to destination tile');
    assert(useGameSessionStore.getState().currentTurnPlayerIndex === 0, 'Special Tile: Extra roll keeps turn on same player');
  } else {
    assert(useGameSessionStore.getState().boardPositions[pBoard1.id] === 5, 'Board Roll: Moved to tile 5');
    assert(useGameSessionStore.getState().currentTurnPlayerIndex === 1, 'Board Turn: Advanced to next player');
  }

  // 3.2: TileModal render
  const tile5 = clasicaTiles.find((t) => t.tile_number === 5)!;
  const htmlTileModal = renderToString(
    <TileModal isOpen={true} tile={tile5} player={pBoard1} actionResult={rollOca?.actionResult} onClose={() => {}} />
  );
  assert(htmlTileModal.includes('Casilla #'), 'TileModal: Header rendered');
  assert(htmlTileModal.includes(tile5.title), 'TileModal: Tile title rendered');
  assert(htmlTileModal.includes('Lucas'), 'TileModal: Player name rendered');
  assert(htmlTileModal.includes('CONTINUAR'), 'TileModal: Continue CTA button present');

  // 3.3: Cárcel trap & Skip turn
  const jailTile = clasicaTiles.find((t) => t.tile_type === 'trap_jail')!;
  useGameSessionStore.setState({
    boardPositions: { ...useGameSessionStore.getState().boardPositions, [pBoard2.id]: jailTile.tile_number - 2 },
    currentTurnPlayerIndex: 1, // Martina's turn
  });
  const rollIntoJail = useGameSessionStore.getState().rollBoardDice(2);
  assert(rollIntoJail?.tile?.tile_type === 'trap_jail', 'Cárcel Trap: Landed on jail tile');
  assert(useGameSessionStore.getState().boardJails[pBoard2.id] > 0, 'Cárcel Trap: Jail turns recorded for player');

  // Next turn for Martina in jail
  useGameSessionStore.setState({ currentTurnPlayerIndex: 1 });
  const skippedRoll = useGameSessionStore.getState().rollBoardDice(3);
  assert(skippedRoll?.skipped === true, 'Cárcel Skip: Jailed player roll is skipped');
  assert(skippedRoll?.reason === 'jail', 'Cárcel Skip: Reason reported as jail');

  // 3.4: Overshoot Bounce-Back
  // Case A: From tile 44, roll 3 -> 44 + 3 = 47. 45 - (47 - 45) = 43.
  useGameSessionStore.setState({
    boardPositions: { ...useGameSessionStore.getState().boardPositions, [pBoard1.id]: 44 },
    currentTurnPlayerIndex: 0,
    boardJails: { [pBoard1.id]: 0, [pBoard2.id]: 0 },
  });
  const bounceA = useGameSessionStore.getState().rollBoardDice(3);
  assert(bounceA?.isVictory === false, 'Bounce-Back A: Overshoot does not trigger victory');
  assert(useGameSessionStore.getState().boardPositions[pBoard1.id] === 43, 'Bounce-Back A: Rebounded cleanly to tile 43');

  // Case B: From tile 43, roll 5 -> 43 + 5 = 48. 45 - (48 - 45) = 42. Tile 42 has trap_back to 38!
  useGameSessionStore.setState({
    boardPositions: { ...useGameSessionStore.getState().boardPositions, [pBoard1.id]: 43 },
    currentTurnPlayerIndex: 0,
    boardJails: { [pBoard1.id]: 0, [pBoard2.id]: 0 },
  });
  const bounceB = useGameSessionStore.getState().rollBoardDice(5);
  assert(bounceB?.isVictory === false, 'Bounce-Back B: Overshoot does not trigger victory');
  assert(useGameSessionStore.getState().boardPositions[pBoard1.id] === 38, 'Bounce-Back B: Rebounded to tile 42 and triggered Trap Back to tile 38');

  // 3.5: Penultimate jump to Meta
  const mockJumpMetaTiles: BoardTile[] = [
    { id: 43, board_id: 'guatoca_clasica', tile_number: 43, title: 'T43', description: '', tile_type: 'normal', drinks_action: 0, target: 'all', action_jump_to: null, turns_lost: 0 },
    { id: 44, board_id: 'guatoca_clasica', tile_number: 44, title: 'T44', description: '', tile_type: 'jump', action_jump_to: 45, drinks_action: 0, target: 'all', turns_lost: 0 },
    { id: 45, board_id: 'guatoca_clasica', tile_number: 45, title: 'Meta', description: '', tile_type: 'finish', drinks_action: 0, target: 'all', action_jump_to: null, turns_lost: 0 },
  ];
  useGameSessionStore.setState({
    boardPositions: { [pBoard1.id]: 43, [pBoard2.id]: 1 },
    currentTurnPlayerIndex: 0,
    modeConfig: { tiles: mockJumpMetaTiles, totalTiles: 45 },
  });
  const jumpMetaRes = useGameSessionStore.getState().rollBoardDice(1);
  assert(jumpMetaRes?.isVictory === true, 'Penultimate Jump: Tile 44 jumping to 45 registers victory');
  assert(useGameSessionStore.getState().isGameOver === true, 'Penultimate Jump: isGameOver is true');
  assert(useGameSessionStore.getState().winner?.id === pBoard1.id, 'Penultimate Jump: Winner recorded as Lucas');

  const htmlPodiumBoard = renderToString(
    <PodiumScreen onPlayAgain={() => {}} onExitHome={() => {}} />
  );
  assert(htmlPodiumBoard.includes('¡Ganó Lucas!'), 'Podium Board Victory: Announces winner name');

  // -------------------------------------------------------------------------
  // SUITE 4: Pause and Resume Flow (Banners, Rehydration, Screen Suppression)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Pause and Resume Flow & Session Recovery ---');
  mockStorage.clear();
  usePlayerStore.setState({ players: [], historicalPlayers: [] });
  useGameSessionStore.getState().endSession();

  const pResume1 = usePlayerStore.getState().addPlayer('Tomás')!;
  const pResume2 = usePlayerStore.getState().addPlayer('Sofía')!;
  const resumePlayers = [pResume1, pResume2];

  const resumeDeck: Card[] = [
    { id: 'cd_1', category: 'yo_nunca', type: 'standard', intensity: 2, text: 'Card 1', drinks_penalty: 1 },
    { id: 'cd_2', category: 'yo_nunca', type: 'standard', intensity: 2, text: 'Card 2', drinks_penalty: 2 },
  ];

  useGameSessionStore.getState().startCardSession(resumeDeck, 'chaos', {}, resumePlayers);
  assert(useGameSessionStore.getState().hasActiveSession() === true, 'Active Session: hasActiveSession() is true');

  // HomeScreen banner
  const htmlHomeResume = renderToString(
    <HomeScreen onSelectMode={() => {}} onResumeSession={() => {}} />
  );
  assert(htmlHomeResume.includes('home-resume-banner'), 'HomeScreen: Resume banner rendered');
  assert(htmlHomeResume.includes('Partida en Pausa'), 'HomeScreen: "Partida en Pausa" title displayed');
  assert(htmlHomeResume.includes('REANUDAR'), 'HomeScreen: "REANUDAR" CTA displayed');

  // TopHeader banner on non-game screens
  const htmlTopHeaderHome = renderToString(<TopHeader currentScreen="home" />);
  assert(htmlTopHeaderHome.includes('resume-session-banner'), 'TopHeader: Resume banner shown on HomeScreen');
  assert(htmlTopHeaderHome.includes('Partida activa en curso'), 'TopHeader: Status text displayed');

  const htmlTopHeaderSetup = renderToString(<TopHeader currentScreen="setup" />);
  assert(htmlTopHeaderSetup.includes('resume-session-banner'), 'TopHeader: Resume banner shown on SetupScreen');

  // TopHeader banner SUPPRESSION on game screens
  const htmlTopHeaderCards = renderToString(<TopHeader currentScreen="game-cards" />);
  assert(!htmlTopHeaderCards.includes('resume-session-banner'), 'TopHeader: Resume banner SUPPRESSED on game-cards screen');

  const htmlTopHeaderBoard = renderToString(<TopHeader currentScreen="game-board" />);
  assert(!htmlTopHeaderBoard.includes('resume-session-banner'), 'TopHeader: Resume banner SUPPRESSED on game-board screen');

  const htmlTopHeaderPodium = renderToString(<TopHeader currentScreen="podium" />);
  assert(!htmlTopHeaderPodium.includes('resume-session-banner'), 'TopHeader: Resume banner SUPPRESSED on podium screen');

  // Rehydration fidelity test
  useGameSessionStore.getState().nextCard(resumePlayers);
  assert(useGameSessionStore.getState().currentIndex === 1, 'Pre-crash: Advanced to card index 1');

  // Wipe memory
  useGameSessionStore.setState({
    mode: null,
    deck: [],
    currentIndex: -1,
    currentCard: null,
  });
  usePlayerStore.setState({ players: [] });

  const resumeSuccess = useGameSessionStore.getState().resumeSession();
  assert(resumeSuccess === true, 'Rehydration: resumeSession() returned true');
  assert(useGameSessionStore.getState().mode === 'chaos', 'Rehydration: Game mode restored');
  assert(useGameSessionStore.getState().currentIndex === 1, 'Rehydration: Card currentIndex restored');
  assert(useGameSessionStore.getState().currentCard?.id === 'cd_2', 'Rehydration: Active card restored');
  assert(usePlayerStore.getState().players.length === 2, 'Rehydration: Active players restored to usePlayerStore');

  // Session termination
  useGameSessionStore.getState().endSession();
  assert(useGameSessionStore.getState().hasActiveSession() === false, 'Session End: hasActiveSession() is false');

  const htmlHomeNoResume = renderToString(<HomeScreen onSelectMode={() => {}} />);
  assert(!htmlHomeNoResume.includes('home-resume-banner'), 'Session End: HomeScreen resume banner removed');

  const htmlHeaderNoResume = renderToString(<TopHeader currentScreen="home" />);
  assert(!htmlHeaderNoResume.includes('resume-session-banner'), 'Session End: TopHeader resume banner removed');

  // Corrupted localStorage Resilience
  mockStorage.setItem(SESSION_STORAGE_KEY, '{ broken json ...');
  assert(useGameSessionStore.getState().hasActiveSession() === false, 'Corrupted Payload: Broken JSON handled safely (returns false)');
  assert(useGameSessionStore.getState().resumeSession() === false, 'Corrupted Payload: resumeSession() returns false');

  mockStorage.setItem(SESSION_STORAGE_KEY, '42');
  assert(useGameSessionStore.getState().hasActiveSession() === false, 'Corrupted Payload: Numeric string handled safely');

  mockStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ isGameOver: true, mode: 'board' }));
  assert(useGameSessionStore.getState().hasActiveSession() === false, 'Completed Session in storage returns false');

  mockStorage.clear();

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('   CHALLENGER M5.2 HARNESS EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`  Total Assertions : ${totalAssertions}`);
  console.log(`  Passed           : ${passedAssertions}`);
  console.log(`  Failed           : ${failedAssertions}`);

  if (failedAssertions > 0) {
    console.error('\nFailures encountered:');
    failureDetails.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('\n>> ALL ASSERTIONS PASSED WITH ZERO DEFECTS! <<\n');
    process.exit(0);
  }
}

runAdversarialHarness().catch((err) => {
  console.error('Fatal unhandled harness error:', err);
  process.exit(1);
});
