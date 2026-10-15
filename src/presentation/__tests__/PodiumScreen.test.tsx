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

import { PodiumScreen } from '../screens/PodiumScreen';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';

describe('PodiumScreen Component', () => {
  const samplePlayers = [
    { id: 'p_1', name: 'Lucas', avatar: '🦁', color: '#ec4899', sips: 8, timesTargeted: 5 },
    { id: 'p_2', name: 'Martina', avatar: '🦊', color: '#06b6d4', sips: 12, timesTargeted: 3 },
    { id: 'p_3', name: 'Tomás', avatar: '🐼', color: '#10b981', sips: 4, timesTargeted: 7 },
  ];

  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.setState({
      players: samplePlayers,
      historicalPlayers: [],
    });
    useGameSessionStore.getState().endSession();
  });

  it('renders winner announcement when winner is set', () => {
    useGameSessionStore.setState({
      winner: samplePlayers[1], // Martina
      isGameOver: true,
    });

    const onPlayAgain = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <PodiumScreen onPlayAgain={onPlayAgain} onExitHome={onExitHome} />
    );

    expect(html).toContain('¡Ganó');
    expect(html).toContain('Martina');
    expect(html).toContain('FIN DE LA PREVIA');
    expect(html).toContain('podium-screen');
  });

  it('highlights Más Bebedor correctly based on maximum sips', () => {
    const onPlayAgain = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <PodiumScreen onPlayAgain={onPlayAgain} onExitHome={onExitHome} />
    );

    expect(html).toContain('Más Bebedor');
    // Martina has 12 sips (max drinker)
    expect(html).toContain('Martina');
    expect(html).toContain('12');
  });

  it('highlights Más Buscado correctly based on maximum timesTargeted', () => {
    const onPlayAgain = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <PodiumScreen onPlayAgain={onPlayAgain} onExitHome={onExitHome} />
    );

    expect(html).toContain('Más Buscado');
    // Tomás has 7 targeted (max targeted)
    expect(html).toContain('Tomás');
    expect(html).toContain('7');
  });

  it('renders full scoreboard ranking for all players', () => {
    const onPlayAgain = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <PodiumScreen onPlayAgain={onPlayAgain} onExitHome={onExitHome} />
    );

    expect(html).toContain('Ranking de Jugadores');
    expect(html).toContain('scoreboard-list');
    expect(html).toContain('podium-row-p_1');
    expect(html).toContain('podium-row-p_2');
    expect(html).toContain('podium-row-p_3');
  });

  it('renders action buttons for replaying or returning home', () => {
    const onPlayAgain = vi.fn();
    const onExitHome = vi.fn();
    const html = renderToString(
      <PodiumScreen onPlayAgain={onPlayAgain} onExitHome={onExitHome} />
    );

    expect(html).toContain('JUGAR DE NUEVO');
    expect(html).toContain('Volver al Inicio');
    expect(html).toContain('play-again-btn');
    expect(html).toContain('exit-home-btn');
  });
});
