import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SettingsModal } from '../components/SettingsModal';
import { useSettingsStore } from '../../application/useSettingsStore';

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

describe('SettingsModal Component', () => {
  beforeEach(() => {
    mockStorage.clear();
    useSettingsStore.setState({
      theme: 'cyber-neon',
      soundEnabled: true,
      hapticsEnabled: true,
    });
  });

  it('renders nothing when isOpen is false', () => {
    const onClose = vi.fn();
    const html = renderToString(<SettingsModal isOpen={false} onClose={onClose} />);

    expect(html).toBe('');
  });

  it('renders modal with title and controls when isOpen is true', () => {
    const onClose = vi.fn();
    const html = renderToString(<SettingsModal isOpen={true} onClose={onClose} />);

    expect(html).toContain('settings-modal');
    expect(html).toContain('Configuración');
    expect(html).toContain('Tema Visual Neón');
    expect(html).toContain('Efectos y Respuestas');
  });

  it('renders all 5 theme options', () => {
    const onClose = vi.fn();
    const html = renderToString(<SettingsModal isOpen={true} onClose={onClose} />);

    expect(html).toContain('theme-option-cyber-neon');
    expect(html).toContain('theme-option-electric-purple');
    expect(html).toContain('theme-option-acid-lime');
    expect(html).toContain('theme-option-sunset-hot');
    expect(html).toContain('theme-option-day-mode');

    expect(html).toContain('Cyber Neon');
    expect(html).toContain('Electric Purple');
    expect(html).toContain('Acid Lime');
    expect(html).toContain('Sunset Hot');
    expect(html).toContain('Day Mode');
  });

  it('renders sound and haptics toggle controls', () => {
    const onClose = vi.fn();
    const html = renderToString(<SettingsModal isOpen={true} onClose={onClose} />);

    expect(html).toContain('toggle-sound-btn');
    expect(html).toContain('toggle-haptics-btn');
    expect(html).toContain('Sonido FX');
    expect(html).toContain('Vibración Háptica');
  });

  it('renders modal close buttons', () => {
    const onClose = vi.fn();
    const html = renderToString(<SettingsModal isOpen={true} onClose={onClose} />);

    expect(html).toContain('close-settings-btn');
    expect(html).toContain('modal-done-btn');
    expect(html).toContain('Guardar y Cerrar');
  });

  it('reflects selected theme state correctly', () => {
    useSettingsStore.setState({ theme: 'acid-lime' });

    const onClose = vi.fn();
    const html = renderToString(<SettingsModal isOpen={true} onClose={onClose} />);

    expect(html).toContain('theme-option-acid-lime');
    // Acid lime accent is #84cc16
    expect(html).toContain('#84cc16');
  });
});
