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

import { SetupScreen } from '../screens/SetupScreen';
import { usePlayerStore } from '../../application/usePlayerStore';

describe('SetupScreen Component', () => {
  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.setState({
      players: [],
      historicalPlayers: [],
    });
  });

  it('renders mode title, player management form, and intensity options for chaos mode', () => {
    const onStartGame = vi.fn();
    const onBack = vi.fn();
    const html = renderToString(
      <SetupScreen
        mode="chaos"
        onStartGame={onStartGame}
        onBack={onBack}
      />
    );

    expect(html).toContain('Modo Caos');
    expect(html).toContain('Jugadores');
    expect(html).toContain('player-name-input');
    expect(html).toContain('add-player-btn');
    expect(html).toContain('Filtro de Intensidad');
    expect(html).toContain('Todas');
    expect(html).toContain('Chill');
    expect(html).toContain('Fiesta');
    expect(html).toContain('Hot');
    expect(html).toContain('Extremo');
  });

  it('renders board selection when mode is board', () => {
    const onStartGame = vi.fn();
    const onBack = vi.fn();
    const html = renderToString(
      <SetupScreen
        mode="board"
        onStartGame={onStartGame}
        onBack={onBack}
      />
    );

    expect(html).toContain('El Tablero');
    expect(html).toContain('Selecciona el Tablero');
    expect(html).toContain('Clásica');
    expect(html).toContain('Hot');
  });

  it('renders Modo Spicy title when mode is preset and targetId is modo_caliente', () => {
    const onStartGame = vi.fn();
    const onBack = vi.fn();
    const html = renderToString(
      <SetupScreen
        mode="preset"
        targetId="modo_caliente"
        onStartGame={onStartGame}
        onBack={onBack}
      />
    );

    expect(html).toContain('Modo Spicy');
  });

  it('renders specific category title when mode is category and targetId is provided', () => {
    const onStartGame = vi.fn();
    const onBack = vi.fn();
    const html = renderToString(
      <SetupScreen
        mode="category"
        targetId="el_tablero"
        onStartGame={onStartGame}
        onBack={onBack}
      />
    );

    expect(html).toContain('El Tablero');
  });

  it('disables start CTA when fewer than 2 players are present', () => {
    usePlayerStore.getState().addPlayer('Lucas');

    const onStartGame = vi.fn();
    const onBack = vi.fn();
    const html = renderToString(
      <SetupScreen
        mode="chaos"
        onStartGame={onStartGame}
        onBack={onBack}
      />
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('¡EMPEZAR PREVIA!');
    expect(html).toContain('Lucas');
  });

  it('renders active player roster when 2 or more players are added', () => {
    usePlayerStore.getState().addPlayer('Lucas');
    usePlayerStore.getState().addPlayer('Martina');

    const onStartGame = vi.fn();
    const onBack = vi.fn();
    const html = renderToString(
      <SetupScreen
        mode="chaos"
        onStartGame={onStartGame}
        onBack={onBack}
      />
    );

    expect(html).toContain('Lucas');
    expect(html).toContain('Martina');
    expect(html).toContain('Inicia');
    expect(html).not.toMatch(/disabled=""[^>]*data-testid="start-game-btn"/);
  });

  it('renders quick add chips for historical players not currently in roster', () => {
    usePlayerStore.setState({
      players: [{ id: 'p_1', name: 'Lucas', sips: 0, timesTargeted: 0 }],
      historicalPlayers: ['Martina', 'Tomás', 'Sofía'],
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

    expect(html).toContain('Agregar Rápido:');
    expect(html).toContain('Martina');
    expect(html).toContain('Tomás');
    expect(html).toContain('Sofía');
  });
});
