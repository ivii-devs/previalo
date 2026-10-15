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

import { GameBoardScreen } from '../screens/GameBoardScreen';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';

describe('GameBoardScreen Component', () => {
  const samplePlayers = [
    { id: 'p_1', name: 'Lucas', avatar: '🦁', color: '#ec4899', sips: 0, timesTargeted: 0 },
    { id: 'p_2', name: 'Martina', avatar: '🦊', color: '#06b6d4', sips: 0, timesTargeted: 0 },
  ];

  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.setState({
      players: samplePlayers,
      historicalPlayers: [],
    });
    useGameSessionStore.getState().endSession();
  });

  it('renders turn player banner, board mode toggle, and roll dice button', () => {
    useGameSessionStore.setState({
      mode: 'board',
      boardPositions: { p_1: 1, p_2: 1 },
      boardJails: { p_1: 0, p_2: 0 },
      currentTurnPlayerIndex: 0,
      lastDiceRoll: null,
      isGameOver: false,
    });

    const onVictory = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <GameBoardScreen onVictory={onVictory} onExitHome={onExitHome} />
    );

    expect(html).toContain('Turno de');
    expect(html).toContain('Lucas');
    expect(html).toContain('Clásica (45)');
    expect(html).toContain('Hot (40)');
    expect(html).toContain('dice-3d');
    expect(html).toContain('roll-dice-btn');
  });

  it('renders current dice value on dice button when roll is present', () => {
    useGameSessionStore.setState({
      mode: 'board',
      boardPositions: { p_1: 5, p_2: 1 },
      boardJails: { p_1: 0, p_2: 0 },
      currentTurnPlayerIndex: 0,
      lastDiceRoll: 4,
      isGameOver: false,
    });

    const onVictory = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <GameBoardScreen onVictory={onVictory} onExitHome={onExitHome} />
    );

    expect(html).toContain('Dado:');
    expect(html).toContain('4');
  });

  it('displays turn position in turn banner', () => {
    useGameSessionStore.setState({
      mode: 'board',
      boardPositions: { p_1: 14, p_2: 1 },
      boardJails: { p_1: 0, p_2: 0 },
      currentTurnPlayerIndex: 0,
      lastDiceRoll: null,
      isGameOver: false,
    });

    const onVictory = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <GameBoardScreen onVictory={onVictory} onExitHome={onExitHome} />
    );

    expect(html).toContain('Casilla actual');
    expect(html).toContain('14');
  });
});
