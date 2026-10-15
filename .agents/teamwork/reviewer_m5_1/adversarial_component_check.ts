import React from 'react';
import { renderToString } from 'react-dom/server';

// Browser mocks for server-side evaluation
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
  get length(): number { return this.store.size; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
}

const mockStorage = new MockLocalStorage();
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });
}
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: mockStorage,
      addEventListener: () => {},
      removeEventListener: () => {},
      navigator: { onLine: true },
    },
    writable: true,
  });
}

import { BoardGrid } from '../../../src/presentation/components/BoardGrid';
import { Dice3D } from '../../../src/presentation/components/Dice3D';
import { SwipeableCard } from '../../../src/presentation/components/SwipeableCard';
import { CardDeck } from '../../../src/presentation/components/CardDeck';
import { VirusHUD } from '../../../src/presentation/components/VirusHUD';
import { VirusExpiredModal } from '../../../src/presentation/components/VirusExpiredModal';
import { TileModal } from '../../../src/presentation/components/TileModal';
import { SettingsModal } from '../../../src/presentation/components/SettingsModal';
import { TopHeader } from '../../../src/presentation/components/TopHeader';
import { BottomNav } from '../../../src/presentation/components/BottomNav';
import type { BoardTile } from '../../../src/domain/types/board';
import type { Player } from '../../../src/domain/types/player';

// Strip React 19 <!-- --> comments for text content comparison
function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, '');
}

console.log('=== STARTING ADVERSARIAL PRESENTATION AUDIT ===');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    failCount++;
  }
}

// TEST 1: BoardGrid Serpentine Alternation & Pawns
const mockTiles45: BoardTile[] = Array.from({ length: 45 }, (_, i) => ({
  tile_number: i + 1,
  tile_type: i === 0 ? 'start' : i === 44 ? 'finish' : i === 8 ? 'jump' : i === 15 ? 'trap_jail' : i === 25 ? 'trap_skull' : i === 5 ? 'drink' : 'normal',
  title: `Casilla ${i + 1}`,
  description: `Desc ${i + 1}`,
  drinks_action: i === 5 ? 2 : 0,
}));

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Alice', avatar: '🐱', color: '#ff0055', sips: 5, timesTargeted: 2 },
  { id: 'p2', name: 'Bob', avatar: '🐶', color: '#00ffcc', sips: 2, timesTargeted: 4 },
  { id: 'p3', name: 'Charlie', avatar: '🦊', color: '#ffcc00', sips: 1, timesTargeted: 1 },
];

const boardHtml = renderToString(
  React.createElement(BoardGrid, {
    tiles: mockTiles45,
    boardPositions: { p1: 1, p2: 15, p3: 15 },
    boardJails: { p2: 2 },
    players: mockPlayers,
    currentTurnPlayerId: 'p1',
  })
);

assert(boardHtml.includes('board-grid'), 'BoardGrid renders container element');
assert(boardHtml.includes('data-testid="pawn-p1"'), 'BoardGrid renders pawn for player 1');
assert(boardHtml.includes('data-testid="pawn-p2"'), 'BoardGrid renders pawn for player 2');
assert(boardHtml.includes('🔒'), 'BoardGrid renders jail padlock for jailed player p2');
assert(boardHtml.includes('animate-pulse'), 'BoardGrid highlights active turn player with animation');
assert(boardHtml.includes('data-testid="board-tile-45"'), 'BoardGrid renders final finish tile 45');

// TEST 2: Dice3D Pip Calculations & Rolling
for (let face = 1; face <= 6; face++) {
  const diceHtml = renderToString(
    React.createElement(Dice3D, {
      rolling: false,
      value: face,
      onRoll: () => {},
    })
  );
  // Match the colored pip dots (w-3.5 h-3.5 rounded-full bg-[var(--accent-primary)])
  const pipMatches = diceHtml.match(/rounded-full bg-\[var\(--accent-primary\)\]/g) || [];
  assert(pipMatches.length === face, `Dice3D face ${face} renders exactly ${face} active pips (got ${pipMatches.length})`);
}

const rollingDiceHtml = renderToString(
  React.createElement(Dice3D, {
    rolling: true,
    value: 3,
    onRoll: () => {},
  })
);
assert(rollingDiceHtml.includes('Lanzando...'), 'Dice3D displays "Lanzando..." when rolling is true');

// TEST 3: SwipeableCard Options, Flames, Drink Penalties
const cardWithOptions = {
  id: 'c1',
  type: 'question' as const,
  text: '¿Qué prefieres en una fiesta?',
  option_a: 'Cerveza fría ilimitada',
  option_b: 'Tequila de calidad',
  intensity: 3 as const,
};

const cardHtml = renderToString(
  React.createElement(SwipeableCard, {
    card: cardWithOptions,
    interpolatedText: '¿Qué prefieres en una fiesta?',
    calculatedDrinks: 3,
    assignedPlayers: [mockPlayers[0], mockPlayers[1]],
    onSwipeNext: () => {},
  })
);

assert(cardHtml.includes('swipeable-card'), 'SwipeableCard renders main container');
assert(cardHtml.includes('Cerveza fría ilimitada'), 'SwipeableCard renders Option A text');
assert(cardHtml.includes('Tequila de calidad'), 'SwipeableCard renders Option B text');
assert(stripComments(cardHtml).includes('3 Tragos'), 'SwipeableCard renders plural "3 Tragos" consequence pill');
assert(cardHtml.includes('Alice'), 'SwipeableCard renders assigned player Alice');
assert(cardHtml.includes('Bob'), 'SwipeableCard renders assigned player Bob');

// TEST 4: CardDeck Depth Layers
const deck1 = renderToString(React.createElement(CardDeck, { remainingCount: 1 }, 'Card 1'));
const deck2 = renderToString(React.createElement(CardDeck, { remainingCount: 2 }, 'Card 2'));
const deck3 = renderToString(React.createElement(CardDeck, { remainingCount: 5 }, 'Card 3'));

assert(!deck1.includes('scale-[0.96]'), 'CardDeck with 1 card does not render background shadow card');
assert(deck2.includes('scale-[0.96]') && !deck2.includes('scale-[0.92]'), 'CardDeck with 2 cards renders exactly 1 shadow card');
assert(deck3.includes('scale-[0.96]') && deck3.includes('scale-[0.92]'), 'CardDeck with 5 cards renders 2 depth shadow cards');

// TEST 5: VirusHUD Display & Urgent Pluralization
const emptyVirusHtml = renderToString(React.createElement(VirusHUD, { activeViruses: [] }));
assert(emptyVirusHtml === '', 'VirusHUD renders empty string when no active viruses');

const activeViruses = [
  {
    id: 'v1',
    cardId: 'c10',
    ruleText: 'Habla con acento francés',
    targetPlayerName: 'Alice',
    roundsRemaining: 1,
    totalRounds: 3,
  },
  {
    id: 'v2',
    cardId: 'c11',
    ruleText: 'No puedes usar las manos',
    roundsRemaining: 2,
    totalRounds: 2,
  },
];

const virusHudHtml = renderToString(React.createElement(VirusHUD, { activeViruses }));
assert(stripComments(virusHudHtml).includes('Virus Activos (2)'), 'VirusHUD displays correct count (2)');
assert(stripComments(virusHudHtml).includes('1 ronda'), 'VirusHUD renders singular "1 ronda" for urgent virus');
assert(stripComments(virusHudHtml).includes('2 rondas'), 'VirusHUD renders plural "2 rondas"');
assert(virusHudHtml.includes('Alice'), 'VirusHUD renders target player name Alice');
assert(virusHudHtml.includes('Todos'), 'VirusHUD renders fallback "Todos" when no target player');

// TEST 6: VirusExpiredModal Audio Trigger & Dismissal
const emptyExpiredHtml = renderToString(
  React.createElement(VirusExpiredModal, {
    expiredViruses: [],
    onDismiss: () => {},
  })
);
assert(emptyExpiredHtml === '', 'VirusExpiredModal renders empty string when queue is empty');

const expiredHtml = renderToString(
  React.createElement(VirusExpiredModal, {
    expiredViruses: [activeViruses[0]],
    onDismiss: () => {},
  })
);
assert(expiredHtml.includes('virus-expired-modal'), 'VirusExpiredModal renders modal container');
assert(expiredHtml.includes('¡Regla Concluida!'), 'VirusExpiredModal displays celebration header');
assert(expiredHtml.includes('Habla con acento francés'), 'VirusExpiredModal displays expired rule');
assert(expiredHtml.includes('Liberado:'), 'VirusExpiredModal shows released player');

// TEST 7: TileModal Landing Consequences
const jumpTile: BoardTile = {
  tile_number: 9,
  tile_type: 'jump',
  title: 'La Oca Veloz',
  description: 'Salta y vuela',
  action_jump_to: 18,
};

const tileModalHtml = renderToString(
  React.createElement(TileModal, {
    isOpen: true,
    tile: jumpTile,
    player: mockPlayers[0],
    actionResult: { actionType: 'jump', destination: 18, extraRoll: true },
    onClose: () => {},
  })
);

assert(stripComments(tileModalHtml).includes('Casilla #9'), 'TileModal displays correct tile number');
assert(tileModalHtml.includes('La Oca Veloz'), 'TileModal displays tile title');
assert(stripComments(tileModalHtml).includes('¡De oca a oca! Salta a la casilla 18'), 'TileModal displays jump callout');
assert(tileModalHtml.includes('CONTINUAR'), 'TileModal has dismissal button');

// TEST 8: BottomNav Navigation States
const bottomNavHtml = renderToString(
  React.createElement(BottomNav, {
    currentScreen: 'game-board',
    onNavigate: () => {},
  })
);
assert(bottomNavHtml.includes('nav-tab-cards'), 'BottomNav renders Cartas tab');
assert(bottomNavHtml.includes('nav-tab-board'), 'BottomNav renders Tableros tab');
assert(bottomNavHtml.includes('nav-tab-table'), 'BottomNav renders Mesa tab');
assert(bottomNavHtml.includes('theme-accent-primary font-black scale-105'), 'BottomNav applies active styling to selected tab');

console.log(`=== AUDIT COMPLETE: ${passCount} PASSED, ${failCount} FAILED ===`);
process.exit(failCount === 0 ? 0 : 1);
