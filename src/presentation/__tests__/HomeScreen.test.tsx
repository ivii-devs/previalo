import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HomeScreen } from '../screens/HomeScreen';
import { useGameSessionStore, SESSION_STORAGE_KEY } from '../../application/useGameSessionStore';

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

describe('HomeScreen Component', () => {
  beforeEach(() => {
    mockStorage.clear();
    useGameSessionStore.getState().endSession();
  });

  it('renders hero modes for Modo Caos, Modo Spicy, Modo Parejas, and El Tablero', () => {
    const onSelectMode = vi.fn();
    const html = renderToString(<HomeScreen onSelectMode={onSelectMode} />);

    expect(html).toContain('Modo Caos');
    expect(html).toContain('Modo Spicy');
    expect(html).toContain('Modo Parejas');
    expect(html).toContain('El Tablero');
    expect(html).toContain('hero-mode-chaos');
    expect(html).toContain('hero-mode-caliente');
    expect(html).toContain('hero-mode-parejas');
    expect(html).toContain('hero-mode-board');

    // Subtitles should show card counts instead of old text
    expect(html).not.toContain('Picante & Subido');
    expect(html).not.toContain('Cómplice & Íntimo');
    expect(html).toContain('cartas');
  });

  it('renders the touch categories grid containing all 9 party categories with paragraph multiline formatting', () => {
    const onSelectMode = vi.fn();
    const html = renderToString(<HomeScreen onSelectMode={onSelectMode} />);

    expect(html).toContain('Yo Nunca');
    expect(html).toContain('Retos y Virus');
    expect(html).toContain('¿Qué Prefieres?');
    expect(html).toContain('Verdad o Reto');
    expect(html).toContain('¿Quién es Más Probable?');
    expect(html).toContain('Confesiones');
    expect(html).toContain('Mesa y Minijuegos');
    expect(html).toContain('Guerra de Equipos');
    expect(html).toContain('El Tablero');
    expect(html).toContain('categories-grid');
    // Ensure line-clamp-1 was removed to allow paragraph multiline display
    expect(html).not.toContain('line-clamp-1');
  });

  it('renders total canonical card count indicator', () => {
    const onSelectMode = vi.fn();
    const html = renderToString(<HomeScreen onSelectMode={onSelectMode} />);

    expect(html).toContain('6937');
    expect(html).toContain('Cartas');
  });

  it('does not render resume banner when no active session exists', () => {
    const onSelectMode = vi.fn();
    const html = renderToString(<HomeScreen onSelectMode={onSelectMode} />);

    expect(html).not.toContain('home-resume-banner');
    expect(html).not.toContain('Partida en Pausa');
    expect(html).not.toContain('Toca aquí para continuar jugando');
  });

  it('never renders duplicate home-resume-banner even when an active session is in progress (delegated to TopHeader)', () => {
    mockStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        mode: 'chaos',
        currentIndex: 3,
        deck: [{ id: 1, type: 'rule', text: 'Test', intensity: 2 }],
        isGameOver: false,
      })
    );

    const onSelectMode = vi.fn();
    const html = renderToString(<HomeScreen onSelectMode={onSelectMode} />);

    expect(html).not.toContain('home-resume-banner');
    expect(html).not.toContain('Partida en Pausa');
    expect(html).not.toContain('Toca aquí para continuar jugando');
  });

  it('formats category titles as paragraphs with break-words to prevent overflow on narrow screens', () => {
    const onSelectMode = vi.fn();
    const html = renderToString(<HomeScreen onSelectMode={onSelectMode} />);

    expect(html).toContain('break-words');
    expect(html).toContain('leading-[1.15]');
  });
});

describe('cleanCategoryName Helper', () => {
  it('cleans leading emojis and removes legacy (La Guatoca) substring', async () => {
    const { cleanCategoryName } = await import('../screens/HomeScreen');

    expect(cleanCategoryName('🎲 El Tablero (La Guatoca)', 'el_tablero')).toBe('El Tablero');
    expect(cleanCategoryName('🎲 El Tablero (La Guatoca)')).toBe('El Tablero');
    expect(cleanCategoryName('El Tablero (La Guatoca)')).toBe('El Tablero');
    expect(cleanCategoryName('🤫 Yo Nunca', 'yo_nunca')).toBe('Yo Nunca');
    expect(cleanCategoryName('⚔️ Guerra de Equipos', 'guerra_equipos')).toBe('Guerra de Equipos');
    expect(cleanCategoryName('🎯 ¿Quién es Más Probable?', 'quien_es_mas_probable')).toBe('¿Quién es Más Probable?');
  });
});
