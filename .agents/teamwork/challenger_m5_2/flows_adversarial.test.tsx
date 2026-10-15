import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';

// --- Node Environment Browser Polyfills ---
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
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
  navigator: {
    onLine: true,
    vibrate: vi.fn(() => true),
  },
};

const mockDocument = {
  documentElement: {
    setAttribute: vi.fn(),
    getAttribute: vi.fn(() => null),
  },
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
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

describe('Milestone 5 Full User Flows Adversarial Test Suite', () => {
  let clasicaTiles: BoardTile[] = [];
  let hotTiles: BoardTile[] = [];

  beforeAll(async () => {
    clasicaTiles = await CatalogLoader.loadBoard('guatoca_clasica');
    hotTiles = await CatalogLoader.loadBoard('guatoca_hot');
  });

  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.setState({
      players: [],
      historicalPlayers: [],
    });
    useGameSessionStore.getState().endSession();
  });

  // =========================================================================
  // FLOW 1: SetupScreen (Start CTA gating, Quick Add chips, duplicate checks)
  // =========================================================================
  describe('Flow 1: SetupScreen Player Gating and Quick Add', () => {
    it('blocks start CTA when 0 players are present (renders disabled attribute)', () => {
      const onStartGame = vi.fn();
      const onBack = vi.fn();

      const html = renderToString(
        <SetupScreen
          mode="chaos"
          onStartGame={onStartGame}
          onBack={onBack}
        />
      );

      // Verify disabled attribute is on the start button
      expect(html).toContain('disabled=""');
      expect(html).toContain('¡EMPEZAR PREVIA!');
      expect(html).toContain('Mínimo 2 jugadores');
      expect(html).toContain('Agrega al menos 2 jugadores para empezar la previa.');
    });

    it('blocks start CTA when only 1 player is present', () => {
      usePlayerStore.getState().addPlayer('Rodrigo');

      const onStartGame = vi.fn();
      const onBack = vi.fn();

      const html = renderToString(
        <SetupScreen
          mode="chaos"
          onStartGame={onStartGame}
          onBack={onBack}
        />
      );

      expect(html).toContain('Rodrigo');
      expect(html).toContain('disabled=""');
      expect(html).toContain('¡EMPEZAR PREVIA!');
    });

    it('enables start CTA when >= 2 players are added', () => {
      usePlayerStore.getState().addPlayer('Rodrigo');
      usePlayerStore.getState().addPlayer('Valentina');

      const onStartGame = vi.fn();
      const onBack = vi.fn();

      const html = renderToString(
        <SetupScreen
          mode="chaos"
          onStartGame={onStartGame}
          onBack={onBack}
        />
      );

      expect(html).toContain('Rodrigo');
      expect(html).toContain('Valentina');
      expect(html).toContain('Inicia');
      // Should NOT have disabled attribute on the start button
      expect(html).not.toMatch(/disabled=""[^>]*data-testid="start-game-btn"/);
    });

    it('renders Quick Add chips for historical players not currently active', () => {
      usePlayerStore.setState({
        players: [{ id: 'p_1', name: 'Rodrigo', sips: 0, timesTargeted: 0 }],
        historicalPlayers: ['Rodrigo', 'Valentina', 'Mateo', 'Camila'],
      });

      const onStartGame = vi.fn();
      const onBack = vi.fn();

      const html = renderToString(
        <SetupScreen
          mode="chaos"
          onStartGame={onStartGame}
          onBack={onBack}
        />
      );

      // 'Rodrigo' is already active, so should NOT appear in quick add chips
      expect(html).toContain('Agregar Rápido:');
      expect(html).toContain('+</span><span>Valentina');
      expect(html).toContain('+</span><span>Mateo');
      expect(html).toContain('+</span><span>Camila');
      expect(html).not.toContain('+</span><span>Rodrigo');
    });

    it('quickAddPlayer adds player to active roster and prevents duplicates', () => {
      usePlayerStore.setState({
        players: [],
        historicalPlayers: ['Rodrigo', 'Valentina'],
      });

      // Quick add 'Rodrigo'
      const added1 = usePlayerStore.getState().quickAddPlayer('Rodrigo');
      expect(added1).not.toBeNull();
      expect(added1?.name).toBe('Rodrigo');
      expect(usePlayerStore.getState().players.length).toBe(1);

      // Attempt duplicate quick add (exact match)
      const duplicate1 = usePlayerStore.getState().quickAddPlayer('Rodrigo');
      expect(duplicate1).toBeNull();
      expect(usePlayerStore.getState().players.length).toBe(1);

      // Attempt duplicate quick add (case-insensitive: 'rodrigo')
      const duplicateCase = usePlayerStore.getState().quickAddPlayer('rodrigo');
      expect(duplicateCase).toBeNull();
      expect(usePlayerStore.getState().players.length).toBe(1);

      // Attempt duplicate quick add with surrounding spaces ('  Rodrigo  ')
      const duplicateSpaces = usePlayerStore.getState().quickAddPlayer('  Rodrigo  ');
      expect(duplicateSpaces).toBeNull();
      expect(usePlayerStore.getState().players.length).toBe(1);

      // Quick add second player 'Valentina'
      const added2 = usePlayerStore.getState().quickAddPlayer('Valentina');
      expect(added2).not.toBeNull();
      expect(usePlayerStore.getState().players.length).toBe(2);
    });

    it('rejects adding empty or whitespace-only player names', () => {
      const res1 = usePlayerStore.getState().addPlayer('');
      expect(res1).toBeNull();

      const res2 = usePlayerStore.getState().addPlayer('    ');
      expect(res2).toBeNull();

      expect(usePlayerStore.getState().players.length).toBe(0);
    });

    it('removing a player drops count below 2 and re-disables start CTA', () => {
      const p1 = usePlayerStore.getState().addPlayer('Rodrigo')!;
      const p2 = usePlayerStore.getState().addPlayer('Valentina')!;
      expect(usePlayerStore.getState().players.length).toBe(2);

      // Remove p2
      usePlayerStore.getState().removePlayer(p2.id);
      expect(usePlayerStore.getState().players.length).toBe(1);

      const html = renderToString(
        <SetupScreen
          mode="chaos"
          onStartGame={vi.fn()}
          onBack={vi.fn()}
        />
      );

      expect(html).toContain('disabled=""');
      // Player p2 should be removed from active roster
      expect(html).not.toContain(`data-testid="player-item-${p2.id}"`);
      // But p1 should still be in active roster
      expect(html).toContain(`data-testid="player-item-${p1.id}"`);
      expect(html).toContain('Rodrigo');
    });

    it('renders board selection chips in board mode and intensity options in card mode', () => {
      const htmlBoard = renderToString(
        <SetupScreen
          mode="board"
          onStartGame={vi.fn()}
          onBack={vi.fn()}
        />
      );
      expect(htmlBoard).toContain('Selecciona el Tablero');
      expect(htmlBoard).toContain('Clásica');
      expect(htmlBoard).toContain('Hot');
      expect(htmlBoard).not.toContain('Filtro de Intensidad');

      const htmlCards = renderToString(
        <SetupScreen
          mode="category"
          targetId="yo_nunca"
          onStartGame={vi.fn()}
          onBack={vi.fn()}
        />
      );
      expect(htmlCards).toContain('Filtro de Intensidad');
      expect(htmlCards).not.toContain('Selecciona el Tablero');
    });
  });

  // =========================================================================
  // FLOW 2: Full Card Game Flow (Start -> Draw -> Virus -> Countdown -> Expiry -> Podium)
  // =========================================================================
  describe('Flow 2: Full Card Game Flow with Virus Lifecycle & Podium', () => {
    it('executes full card flow: draw progression, virus countdown, expiration modal, and game over to podium', () => {
      // 1. Setup players
      const p1 = usePlayerStore.getState().addPlayer('Mateo')!;
      const p2 = usePlayerStore.getState().addPlayer('Camila')!;
      const p3 = usePlayerStore.getState().addPlayer('Lucía')!;
      const players = [p1, p2, p3];

      // 2. Prepare synthetic deck with a Virus card
      const mockDeck: Card[] = [
        {
          id: 'c_normal_1',
          category: 'yo_nunca',
          type: 'standard',
          intensity: 1,
          text: 'Yo nunca he fingido estar sobrio {player1}',
          drinks_penalty: 1,
          target: 'active_player',
        },
        {
          id: 'c_virus_1',
          category: 'ruleta_maldita',
          type: 'virus',
          intensity: 2,
          text: 'VIRUS: {player1} debe hablar como locutor de radio por 2 rondas o toma 2 tragos.',
          duration_rounds: 2,
          drinks_penalty: 2,
          target: 'active_player',
        },
        {
          id: 'c_normal_2',
          category: 'verdad_o_reto',
          type: 'standard',
          intensity: 2,
          text: '{player1} confiesa tu peor cita a {player2}',
          drinks_penalty: 2,
          target: 'pair',
        },
        {
          id: 'c_normal_3',
          category: 'que_prefieres',
          type: 'standard',
          intensity: 3,
          text: '¿Qué prefieres {player1}?',
          drinks_penalty: 3,
          target: 'active_player',
        },
      ];

      // 3. Start card session
      useGameSessionStore.getState().startCardSession(mockDeck, 'chaos', { intensity: 2 }, players);

      expect(useGameSessionStore.getState().currentIndex).toBe(0);
      expect(useGameSessionStore.getState().currentCard?.id).toBe('c_normal_1');
      expect(useGameSessionStore.getState().activeViruses.length).toBe(0);
      expect(useGameSessionStore.getState().isGameOver).toBe(false);

      // Verify Screen rendering at Card 1 (Normal)
      const onGameOver = vi.fn();
      const onExitHome = vi.fn();
      let htmlScreen = renderToString(
        <GameCardsScreen onGameOver={onGameOver} onExitHome={onExitHome} />
      );
      expect(htmlScreen).toContain('Turno:');
      expect(htmlScreen).toContain('Mateo');
      expect(htmlScreen).not.toContain('Virus Activos');

      // 4. Advance to Card 2: The VIRUS card
      useGameSessionStore.getState().nextCard(players);
      expect(useGameSessionStore.getState().currentIndex).toBe(1);
      expect(useGameSessionStore.getState().currentCard?.id).toBe('c_virus_1');

      // Verify active virus is created with 2 rounds remaining
      const virusesAfterDraw = useGameSessionStore.getState().activeViruses;
      expect(virusesAfterDraw.length).toBe(1);
      expect(virusesAfterDraw[0].roundsRemaining).toBe(2);
      expect(virusesAfterDraw[0].ruleText).toContain('hablar como locutor de radio');

      // Verify VirusHUD renders the active virus
      const htmlVirusHUD = renderToString(<VirusHUD activeViruses={virusesAfterDraw} />);
      expect(htmlVirusHUD).toContain('Virus Activos');
      expect(htmlVirusHUD).toContain('rondas');
      expect(htmlVirusHUD).toContain('hablar como locutor de radio');

      // 5. Advance to Card 3: Virus ticks down to 1 round remaining
      useGameSessionStore.getState().nextCard(players);
      expect(useGameSessionStore.getState().currentIndex).toBe(2);
      expect(useGameSessionStore.getState().currentCard?.id).toBe('c_normal_2');

      const virusesAfterTick1 = useGameSessionStore.getState().activeViruses;
      expect(virusesAfterTick1.length).toBe(1);
      expect(virusesAfterTick1[0].roundsRemaining).toBe(1);

      const htmlUrgentHUD = renderToString(<VirusHUD activeViruses={virusesAfterTick1} />);
      expect(htmlUrgentHUD).toContain('ronda');

      // 6. Advance to Card 4: Virus ticks down to 0 and EXPIRES!
      useGameSessionStore.getState().nextCard(players);
      expect(useGameSessionStore.getState().currentIndex).toBe(3);
      expect(useGameSessionStore.getState().currentCard?.id).toBe('c_normal_3');

      // Active viruses should now be empty, expiredVirusesQueue has 1 virus
      expect(useGameSessionStore.getState().activeViruses.length).toBe(0);
      const expiredQueue = useGameSessionStore.getState().expiredVirusesQueue;
      expect(expiredQueue.length).toBe(1);
      expect(expiredQueue[0].ruleText).toContain('hablar como locutor de radio');

      // Verify VirusExpiredModal renders with rule and dismiss CTA
      const onDismissVirus = vi.fn();
      const htmlModal = renderToString(
        <VirusExpiredModal expiredViruses={expiredQueue} onDismiss={onDismissVirus} />
      );
      expect(htmlModal).toContain('Virus Expirado');
      expect(htmlModal).toContain('¡Regla Concluida!');
      expect(htmlModal).toContain('hablar como locutor de radio');
      expect(htmlModal).toContain('¡ENTENDIDO!');

      // Dismiss the virus
      useGameSessionStore.getState().dismissExpiredVirus(expiredQueue[0].id);
      expect(useGameSessionStore.getState().expiredVirusesQueue.length).toBe(0);

      // 7. Advance past final card -> triggers Game Over
      useGameSessionStore.getState().nextCard(players);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);

      // 8. Verify PodiumScreen shows celebration, stats, and rankings
      // Give Mateo 6 sips, Camila 2 sips, Lucía 9 sips
      usePlayerStore.getState().addSips(p1.id, 6);
      usePlayerStore.getState().addSips(p2.id, 2);
      usePlayerStore.getState().addSips(p3.id, 9);

      const onPlayAgain = vi.fn();
      const htmlPodium = renderToString(
        <PodiumScreen onPlayAgain={onPlayAgain} onExitHome={onExitHome} />
      );

      expect(htmlPodium).toContain('¡FIN DE LA PREVIA!');
      expect(htmlPodium).toContain('Más Bebedor');
      expect(htmlPodium).toContain('tragos');
      expect(htmlPodium).toContain('Más Buscado');
      expect(htmlPodium).toContain('Ranking de Jugadores');
      expect(htmlPodium).toContain('JUGAR DE NUEVO');
      expect(htmlPodium).toContain('Volver al Inicio');
    });

    it('correctly handles manual sip adjusters and card undo stack', () => {
      const p1 = usePlayerStore.getState().addPlayer('Mateo')!;
      const p2 = usePlayerStore.getState().addPlayer('Camila')!;
      const players = [p1, p2];

      const deck: Card[] = [
        {
          id: 'c1',
          category: 'yo_nunca',
          type: 'standard',
          intensity: 1,
          text: 'Carta 1 {player1}',
          drinks_penalty: 2,
          target: 'active_player',
        },
        {
          id: 'c2',
          category: 'yo_nunca',
          type: 'standard',
          intensity: 1,
          text: 'Carta 2 {player1}',
          drinks_penalty: 3,
          target: 'active_player',
        },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', { intensity: 1 }, players);

      // Identify which player was picked by token replacer for card 1
      const assignedTarget = useGameSessionStore.getState().assignedPlayers[0];
      expect(assignedTarget).toBeDefined();

      // Initial sips for assigned player awarded from card 1 (at intensity 1 Chill, drinks penalty is scaled to 1)
      const initialSipsAssigned = usePlayerStore.getState().players.find((p) => p.id === assignedTarget.id)?.sips ?? 0;
      expect(initialSipsAssigned).toBe(1);

      // Advance to card 2
      useGameSessionStore.getState().nextCard(players);
      expect(useGameSessionStore.getState().currentIndex).toBe(1);

      // Undo back to card 1
      const undoSuccess = useGameSessionStore.getState().previousCard();
      expect(undoSuccess).toBe(true);
      expect(useGameSessionStore.getState().currentIndex).toBe(0);
      expect(useGameSessionStore.getState().currentCard?.id).toBe('c1');

      // Sips should have reverted card 2 penalty back to 1
      const sipsAfterUndo = usePlayerStore.getState().players.find((p) => p.id === assignedTarget.id)?.sips ?? 0;
      expect(sipsAfterUndo).toBe(1);

      // Manual sip adjuster (+1 / -1)
      usePlayerStore.getState().addSips(assignedTarget.id, 1);
      expect(usePlayerStore.getState().players.find((p) => p.id === assignedTarget.id)?.sips).toBe(2);

      usePlayerStore.getState().addSips(assignedTarget.id, -1);
      expect(usePlayerStore.getState().players.find((p) => p.id === assignedTarget.id)?.sips).toBe(1);
    });
  });

  // =========================================================================
  // FLOW 3: Full Board Game Flow (Start -> Roll -> Land -> Modals -> Meta -> Podium)
  // =========================================================================
  describe('Flow 3: Full Board Game Flow with Special Tiles and Meta Victory', () => {
    it('executes full board flow: roll, landing, special tiles, bounce-back, and victory', () => {
      const p1 = usePlayerStore.getState().addPlayer('Lucas')!;
      const p2 = usePlayerStore.getState().addPlayer('Martina')!;
      const players = [p1, p2];

      // Start board session with Clásica 45 tiles
      useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTiles, players);

      expect(useGameSessionStore.getState().mode).toBe('board');
      expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(1);
      expect(useGameSessionStore.getState().boardPositions[p2.id]).toBe(1);
      expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(0);

      // 1. Turn 1: Lucas rolls 4 -> lands on tile 5 (Oca tile in classic rules)
      const roll1 = useGameSessionStore.getState().rollBoardDice(4);
      expect(roll1).not.toBeNull();
      expect(roll1?.roll).toBe(4);

      // Check tile 5 properties
      const tile5 = clasicaTiles.find((t) => t.tile_number === 5);
      expect(tile5).toBeDefined();

      // If tile 5 is jump (oca), destination is jump target, extraRoll is true
      if (tile5?.tile_type === 'jump') {
        expect(roll1?.extraRoll).toBe(true);
        expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(tile5.action_jump_to ?? 9);
        // Lucas gets another turn!
        expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(0);
      } else {
        expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(5);
        expect(useGameSessionStore.getState().currentTurnPlayerIndex).toBe(1);
      }

      // 2. Tile Modal inspection
      const htmlTileModal = renderToString(
        <TileModal
          isOpen={true}
          tile={tile5!}
          player={p1}
          actionResult={roll1?.actionResult}
          onClose={vi.fn()}
        />
      );
      expect(htmlTileModal).toContain('Casilla #');
      expect(htmlTileModal).toContain('5');
      expect(htmlTileModal).toContain(tile5?.title);
      expect(htmlTileModal).toContain(p1.name);
      expect(htmlTileModal).toContain('CONTINUAR');

      // 3. Test Cárcel trap
      const carcelTile = clasicaTiles.find((t) => t.tile_type === 'trap_jail');
      const carcelTileNum = carcelTile?.tile_number ?? 19;

      useGameSessionStore.setState({
        boardPositions: { ...useGameSessionStore.getState().boardPositions, [p2.id]: carcelTileNum - 2 },
        currentTurnPlayerIndex: 1, // Martina's turn
      });

      const rollCarcel = useGameSessionStore.getState().rollBoardDice(2);
      expect(rollCarcel?.tile?.tile_type).toBe('trap_jail');
      expect(useGameSessionStore.getState().boardJails[p2.id]).toBeGreaterThan(0);

      // Martina's next turn should be skipped due to jail!
      useGameSessionStore.setState({ currentTurnPlayerIndex: 1 });
      const skippedTurn = useGameSessionStore.getState().rollBoardDice(3);
      expect(skippedTurn?.skipped).toBe(true);
      expect(skippedTurn?.reason).toBe('jail');

      // 4. Test Overshoot Bounce-Back at finish line
      // Subtest A: Position Lucas at tile 44, roll 3 on 45-tile board.
      // Math: 44 + 3 = 47. Overshoot = 47 - 45 = 2. Bounces to 45 - 2 = 43 (drink tile).
      useGameSessionStore.setState({
        boardPositions: { ...useGameSessionStore.getState().boardPositions, [p1.id]: 44 },
        currentTurnPlayerIndex: 0,
        boardJails: { [p1.id]: 0, [p2.id]: 0 },
      });

      const rollBounceA = useGameSessionStore.getState().rollBoardDice(3);
      expect(rollBounceA?.isVictory).toBe(false);
      expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(43);

      // Subtest B: Position Lucas at tile 43, roll 5 on 45-tile board.
      // Math: 43 + 5 = 48. Overshoot = 48 - 45 = 3. Bounces to 45 - 3 = 42.
      // Tile 42 is trap_back ("Perdiste el DNI"), which sends player to 38!
      useGameSessionStore.setState({
        boardPositions: { ...useGameSessionStore.getState().boardPositions, [p1.id]: 43 },
        currentTurnPlayerIndex: 0,
        boardJails: { [p1.id]: 0, [p2.id]: 0 },
      });

      const rollBounceB = useGameSessionStore.getState().rollBoardDice(5);
      expect(rollBounceB?.isVictory).toBe(false);
      expect(rollBounceB?.destination).toBe(38); // Trap back action resolved!
      expect(useGameSessionStore.getState().boardPositions[p1.id]).toBe(38);

      // 5. Test Meta Landing & Victory Condition
      // Position Lucas at tile 42, roll 3 -> reaches tile 45 (Meta)
      useGameSessionStore.setState({
        boardPositions: { ...useGameSessionStore.getState().boardPositions, [p1.id]: 42 },
        currentTurnPlayerIndex: 0,
      });

      const rollVictory = useGameSessionStore.getState().rollBoardDice(3);
      expect(rollVictory?.isVictory).toBe(true);
      expect(rollVictory?.winner?.id).toBe(p1.id);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);
      expect(useGameSessionStore.getState().winner?.name).toBe('Lucas');

      // Verify PodiumScreen announces Lucas's victory
      const htmlPodium = renderToString(
        <PodiumScreen onPlayAgain={vi.fn()} onExitHome={vi.fn()} />
      );
      expect(htmlPodium).toContain('¡Ganó Lucas!');
    });

    it('handles penultimate tile jump to Meta seamlessly', () => {
      const p1 = usePlayerStore.getState().addPlayer('Lucas')!;
      const p2 = usePlayerStore.getState().addPlayer('Martina')!;
      const players = [p1, p2];

      // Create a mock board where tile 44 has jump to 45
      const mockTiles: BoardTile[] = [
        {
          id: 't_43',
          board_id: 'guatoca_clasica',
          tile_number: 43,
          title: 'Cerca',
          description: 'Cerca de la meta',
          tile_type: 'normal',
          drinks_action: 0,
        },
        {
          id: 't_44',
          board_id: 'guatoca_clasica',
          tile_number: 44,
          title: 'Salto Final',
          description: 'Salta a la Meta',
          tile_type: 'jump',
          action_jump_to: 45,
          drinks_action: 0,
        },
        {
          id: 't_45',
          board_id: 'guatoca_clasica',
          tile_number: 45,
          title: 'Meta',
          description: 'Fin del juego',
          tile_type: 'finish',
          drinks_action: 0,
        },
      ];

      useGameSessionStore.getState().startBoardSession('guatoca_clasica', mockTiles, players);
      useGameSessionStore.setState({
        boardPositions: { [p1.id]: 43, [p2.id]: 1 },
        currentTurnPlayerIndex: 0,
        modeConfig: { tiles: mockTiles, totalTiles: 45 },
      });

      // Lucas rolls 1 to land on tile 44, which jumps to 45
      const res = useGameSessionStore.getState().rollBoardDice(1);
      expect(res?.isVictory).toBe(true);
      expect(res?.winner?.id).toBe(p1.id);
      expect(useGameSessionStore.getState().isGameOver).toBe(true);
    });
  });

  // =========================================================================
  // FLOW 4: Pause and Resume Flow (HomeScreen & TopHeader Banners + Rehydration)
  // =========================================================================
  describe('Flow 4: Pause and Resume Flow', () => {
    it('displays resume banners in HomeScreen and TopHeader during active card session', () => {
      const p1 = usePlayerStore.getState().addPlayer('Lucas')!;
      const p2 = usePlayerStore.getState().addPlayer('Martina')!;
      const players = [p1, p2];

      const deck: Card[] = [
        { id: 'c1', category: 'yo_nunca', type: 'standard', intensity: 1, text: 'Card 1', drinks_penalty: 1 },
        { id: 'c2', category: 'yo_nunca', type: 'standard', intensity: 1, text: 'Card 2', drinks_penalty: 1 },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', {}, players);

      // Verify active session exists
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(true);

      // 1. HomeScreen resume banner
      const onSelectMode = vi.fn();
      const onResumeSession = vi.fn();
      const htmlHome = renderToString(
        <HomeScreen onSelectMode={onSelectMode} onResumeSession={onResumeSession} />
      );
      expect(htmlHome).toContain('home-resume-banner');
      expect(htmlHome).toContain('Partida en Pausa');
      expect(htmlHome).toContain('REANUDAR');

      // 2. TopHeader resume banner
      const onNavigate = vi.fn();
      const htmlHeader = renderToString(
        <TopHeader currentScreen="home" onNavigate={onNavigate} />
      );
      expect(htmlHeader).toContain('resume-session-banner');
      expect(htmlHeader).toContain('Partida activa en curso');
      expect(htmlHeader).toContain('Reanudar');

      // TopHeader should NOT show resume banner when already in game screens
      const htmlHeaderInCards = renderToString(
        <TopHeader currentScreen="game-cards" onNavigate={onNavigate} />
      );
      expect(htmlHeaderInCards).not.toContain('resume-session-banner');

      const htmlHeaderInBoard = renderToString(
        <TopHeader currentScreen="game-board" onNavigate={onNavigate} />
      );
      expect(htmlHeaderInBoard).not.toContain('resume-session-banner');

      const htmlHeaderInPodium = renderToString(
        <TopHeader currentScreen="podium" onNavigate={onNavigate} />
      );
      expect(htmlHeaderInPodium).not.toContain('resume-session-banner');
    });

    it('displays resume banners during active board game session', () => {
      const p1 = usePlayerStore.getState().addPlayer('Lucas')!;
      const p2 = usePlayerStore.getState().addPlayer('Martina')!;
      const players = [p1, p2];

      useGameSessionStore.getState().startBoardSession('guatoca_clasica', clasicaTiles, players);
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(true);

      const htmlHome = renderToString(
        <HomeScreen onSelectMode={vi.fn()} onResumeSession={vi.fn()} />
      );
      expect(htmlHome).toContain('home-resume-banner');

      const htmlHeader = renderToString(
        <TopHeader currentScreen="setup" onNavigate={vi.fn()} />
      );
      expect(htmlHeader).toContain('resume-session-banner');
    });

    it('clicking resume restores active session state and routes to correct screen', () => {
      const p1 = usePlayerStore.getState().addPlayer('Lucas')!;
      const p2 = usePlayerStore.getState().addPlayer('Martina')!;
      const players = [p1, p2];

      const deck: Card[] = [
        { id: 'c1', category: 'yo_nunca', type: 'standard', intensity: 1, text: 'Card 1', drinks_penalty: 1 },
        { id: 'c2', category: 'yo_nunca', type: 'standard', intensity: 1, text: 'Card 2', drinks_penalty: 2 },
      ];

      useGameSessionStore.getState().startCardSession(deck, 'chaos', {}, players);
      useGameSessionStore.getState().nextCard(players);
      expect(useGameSessionStore.getState().currentIndex).toBe(1);

      // Simulate app restart / memory wipe
      useGameSessionStore.setState({
        mode: null,
        deck: [],
        currentIndex: -1,
        currentCard: null,
      });

      // Resume session from localStorage
      const success = useGameSessionStore.getState().resumeSession();
      expect(success).toBe(true);
      expect(useGameSessionStore.getState().mode).toBe('chaos');
      expect(useGameSessionStore.getState().currentIndex).toBe(1);
      expect(useGameSessionStore.getState().currentCard?.id).toBe('c2');
    });

    it('hides resume banners when session is ended or completed', () => {
      // 1. Session ended
      useGameSessionStore.getState().endSession();
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(false);

      const htmlHome = renderToString(
        <HomeScreen onSelectMode={vi.fn()} onResumeSession={vi.fn()} />
      );
      expect(htmlHome).not.toContain('home-resume-banner');

      const htmlHeader = renderToString(
        <TopHeader currentScreen="home" onNavigate={vi.fn()} />
      );
      expect(htmlHeader).not.toContain('resume-session-banner');
    });

    it('gracefully handles corrupted or malformed localStorage payload', () => {
      // Set malformed JSON
      mockStorage.setItem(SESSION_STORAGE_KEY, '{ broken json ...');
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(false);
      expect(useGameSessionStore.getState().resumeSession()).toBe(false);

      // Set non-object
      mockStorage.setItem(SESSION_STORAGE_KEY, '"just a string"');
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(false);

      // Set session with isGameOver = true
      mockStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ isGameOver: true, mode: 'board' }));
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(false);

      // Set empty deck card session
      mockStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ mode: 'chaos', deck: [], currentIndex: -1 }));
      expect(useGameSessionStore.getState().hasActiveSession()).toBe(false);
    });
  });
});
