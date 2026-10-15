import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';

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
}

const mockStorage = new MockLocalStorage();

const mockWindow = {
  localStorage: mockStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
  });
} else {
  if (!globalThis.window.localStorage) {
    (globalThis.window as any).localStorage = mockStorage;
  }
  if (!globalThis.window.addEventListener) {
    (globalThis.window as any).addEventListener = () => {};
    (globalThis.window as any).removeEventListener = () => {};
  }
}

import { GameCardsScreen } from '../screens/GameCardsScreen';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';

describe('GameCardsScreen Component', () => {
  const samplePlayers = [
    { id: 'p_1', name: 'Lucas', avatar: '🦁', color: '#ec4899', sips: 2, timesTargeted: 1 },
    { id: 'p_2', name: 'Martina', avatar: '🦊', color: '#06b6d4', sips: 4, timesTargeted: 2 },
  ];

  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.setState({
      players: samplePlayers,
      historicalPlayers: [],
    });
    useGameSessionStore.getState().endSession();
  });

  it('renders turn player, card counter, and progress bar', () => {
    useGameSessionStore.setState({
      deck: [
        { id: 1, type: 'rule', text: 'Lucas toma 2 tragos', intensity: 2 },
        { id: 2, type: 'challenge', text: 'Martina cuenta un chiste', intensity: 2 },
      ],
      currentIndex: 0,
      currentCard: { id: 1, type: 'rule', text: 'Lucas toma 2 tragos', intensity: 2 },
      interpolatedText: 'Lucas toma 2 tragos',
      assignedPlayers: [samplePlayers[0]],
      calculatedDrinks: 2,
      activeViruses: [],
      expiredVirusesQueue: [],
      isGameOver: false,
    });

    const onGameOver = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <GameCardsScreen onGameOver={onGameOver} onExitHome={onExitHome} />
    );

    expect(html).toContain('Turno:');
    expect(html).toContain('Lucas');
    expect(html).toContain('Lucas toma 2 tragos');
    expect(html).toContain('Tragos');
    expect(html).toContain('Para:');
  });

  it('renders VirusHUD when active viruses are present', () => {
    useGameSessionStore.setState({
      deck: [{ id: 1, type: 'virus', text: 'Virus rule', intensity: 2 }],
      currentIndex: 0,
      currentCard: { id: 1, type: 'virus', text: 'Virus rule', intensity: 2 },
      interpolatedText: 'Lucas habla en rima',
      assignedPlayers: [samplePlayers[0]],
      calculatedDrinks: 0,
      activeViruses: [
        {
          id: 'v_1',
          cardId: 1,
          ruleText: 'Lucas habla en rima',
          targetPlayerId: 'p_1',
          targetPlayerName: 'Lucas',
          roundsRemaining: 2,
          totalRounds: 3,
        },
      ],
      expiredVirusesQueue: [],
      isGameOver: false,
    });

    const onGameOver = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <GameCardsScreen onGameOver={onGameOver} onExitHome={onExitHome} />
    );

    expect(html).toContain('virus-hud');
    expect(html).toContain('Virus Activos');
    expect(html).toContain('ronda');
    expect(html).toContain('Lucas habla en rima');
  });

  it('renders manual sip adjustments for all active players', () => {
    useGameSessionStore.setState({
      deck: [{ id: 1, type: 'rule', text: 'Card', intensity: 2 }],
      currentIndex: 0,
      currentCard: { id: 1, type: 'rule', text: 'Card', intensity: 2 },
      interpolatedText: 'Card',
      assignedPlayers: [samplePlayers[0]],
      calculatedDrinks: 1,
      activeViruses: [],
      expiredVirusesQueue: [],
      isGameOver: false,
    });

    const onGameOver = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <GameCardsScreen onGameOver={onGameOver} onExitHome={onExitHome} />
    );

    expect(html).toContain('player-sips-bar');
    expect(html).toContain('Lucas');
    expect(html).toContain('Martina');
    expect(html).toContain('minus-sip-p_1');
    expect(html).toContain('plus-sip-p_1');
  });

  it('disables undo button when on first card (currentIndex <= 0)', () => {
    useGameSessionStore.setState({
      deck: [{ id: 1, type: 'rule', text: 'Card', intensity: 2 }],
      currentIndex: 0,
      currentCard: { id: 1, type: 'rule', text: 'Card', intensity: 2 },
      interpolatedText: 'Card',
      assignedPlayers: [samplePlayers[0]],
      calculatedDrinks: 0,
      activeViruses: [],
      expiredVirusesQueue: [],
      isGameOver: false,
    });

    const onGameOver = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <GameCardsScreen onGameOver={onGameOver} onExitHome={onExitHome} />
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('Deshacer');
  });
});
