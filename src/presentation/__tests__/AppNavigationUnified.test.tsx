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
    value: {
      localStorage: mockStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    },
    writable: true,
  });
} else {
  if (!globalThis.window.localStorage) {
    (globalThis.window as any).localStorage = mockStorage;
  }
  if (!globalThis.window.matchMedia) {
    globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as any;
  }
}

if (typeof globalThis.document === 'undefined') {
  Object.defineProperty(globalThis, 'document', {
    value: {
      documentElement: {
        setAttribute: vi.fn(),
      },
      querySelector: vi.fn().mockReturnValue(null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: 'visible',
    },
    writable: true,
  });
}

import { App } from '../../App';
import { useGameSessionStore } from '../../application/useGameSessionStore';
import { usePlayerStore } from '../../application/usePlayerStore';

describe('App Component Unified Navigation (No BottomNav)', () => {
  beforeEach(() => {
    mockStorage.clear();
    useGameSessionStore.getState().endSession();
    usePlayerStore.setState({
      players: [],
      historicalPlayers: [],
    });
  });

  it('renders App without BottomNav bar or any of its tabs', () => {
    const html = renderToString(<App />);

    // BottomNav elements must NOT be present in the DOM
    expect(html).not.toContain('data-testid="bottom-nav"');
    expect(html).not.toContain('data-testid="nav-tab-cards"');
    expect(html).not.toContain('data-testid="nav-tab-board"');
    expect(html).not.toContain('data-testid="nav-tab-table"');
  });

  it('renders the unified homepage (Mesa) as the primary initial screen', () => {
    const html = renderToString(<App />);

    // Primary initial screen must be HomeScreen
    expect(html).toContain('data-testid="home-screen"');
    expect(html).toContain('PREVIALO');
    expect(html).toContain('Modos Rápidos de Fiesta');
  });

  it('contains the single entry point for Tablero: El Tablero', () => {
    const html = renderToString(<App />);

    expect(html).toContain('data-testid="hero-mode-board"');
    expect(html).toContain('El Tablero');
    expect(html).toContain('45 casillas');
  });

  it('contains entry points for card modes and categories on the unified homepage', () => {
    const html = renderToString(<App />);

    // Fast-start card modes
    expect(html).toContain('data-testid="hero-mode-chaos"');
    expect(html).toContain('data-testid="hero-mode-caliente"');
    expect(html).toContain('data-testid="hero-mode-parejas"');

    // Category grid
    expect(html).toContain('data-testid="categories-grid"');
    expect(html).toContain('Yo Nunca');
    expect(html).toContain('Retos y Virus');
    expect(html).toContain('¿Qué Prefieres?');
    expect(html).toContain('Verdad o Reto');
    expect(html).toContain('¿Quién es Más Probable?');
    expect(html).toContain('Confesiones');
    expect(html).toContain('Mesa y Minijuegos');
    expect(html).toContain('Guerra de Equipos');
    expect(html).toContain('El Tablero');
    expect(html).toContain('data-testid="cat-btn-retos_y_virus"');
  });

  it('applies viewport pinning and base background color classes on app-root', () => {
    const html = renderToString(<App />);

    expect(html).toContain('data-testid="app-root"');
    expect(html).toContain('fixed inset-0');
    expect(html).toContain('bottom-[calc(-1*env(safe-area-inset-top,0px))]');
    expect(html).toContain('bg-[var(--bg-base)]');
    // Ensure height 100% or h-screen are not overriding viewport pinning
    expect(html).not.toContain('h-screen');
  });

  it('verifies normalized safe-area padding without redundant double insets', () => {
    const html = renderToString(<App />);

    // Container has single pb-[calc(1rem+env(safe-area-inset-bottom,0px))]
    expect(html).toContain('pb-[calc(1rem+env(safe-area-inset-bottom,0px))]');
    // Redundant 2.5rem inner padding must NOT be present
    expect(html).not.toContain('pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]');
  });
});
