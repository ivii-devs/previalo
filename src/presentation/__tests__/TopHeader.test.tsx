import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TopHeader } from '../components/TopHeader';
import { useGameSessionStore, SESSION_STORAGE_KEY } from '../../application/useGameSessionStore';
import { PWAHelper } from '../../infrastructure/registerSW';

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
      navigator: { onLine: true },
    },
    writable: true,
  });
} else {
  if (!globalThis.window.localStorage) {
    (globalThis.window as any).localStorage = mockStorage;
  }
  if (!globalThis.window.addEventListener) {
    globalThis.window.addEventListener = vi.fn();
  }
  if (!globalThis.window.removeEventListener) {
    globalThis.window.removeEventListener = vi.fn();
  }
}

describe('TopHeader Component', () => {
  beforeEach(() => {
    mockStorage.clear();
    useGameSessionStore.getState().endSession();
    vi.restoreAllMocks();
  });

  it('renders brand logo and title PREVIALO', () => {
    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).toContain('PREVIALO');
    expect(html).toContain('header-logo-btn');
  });

  it('renders network status indicator', () => {
    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).toContain('network-status-badge');
  });

  it('renders settings trigger button', () => {
    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).toContain('settings-btn');
  });

  it('renders install button when PWAHelper reports installable', () => {
    vi.spyOn(PWAHelper, 'isInstallable').mockReturnValue(true);

    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).toContain('install-pwa-btn');
    expect(html).toContain('Instalar');
  });

  it('does not render resume banner when no active session exists', () => {
    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).not.toContain('resume-session-banner');
  });

  it('renders active session resume banner when active session exists and on home screen', () => {
    mockStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        mode: 'chaos',
        currentIndex: 2,
        deck: [{ id: 1, type: 'rule', text: 'Test', intensity: 1 }],
        isGameOver: false,
      })
    );

    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).toContain('resume-session-banner');
    expect(html).toContain('Partida activa en curso');
    expect(html).toContain('Reanudar');
  });

  it('does not render resume banner when user is already in game-cards screen', () => {
    mockStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        mode: 'chaos',
        currentIndex: 2,
        deck: [{ id: 1, type: 'rule', text: 'Test', intensity: 1 }],
        isGameOver: false,
      })
    );

    const html = renderToString(<TopHeader currentScreen="game-cards" />);

    expect(html).not.toContain('resume-session-banner');
  });

  it('includes pt-safe class for iOS notch and status bar safe area', () => {
    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).toContain('pt-safe');
  });

  it('provides accessible min-w-[44px] and min-h-[44px] touch target for settings button', () => {
    const html = renderToString(<TopHeader currentScreen="home" />);

    expect(html).toContain('min-w-[44px]');
    expect(html).toContain('min-h-[44px]');
  });
});
