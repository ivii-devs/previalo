/**
 * Unit & Integration Tests: useSettingsStore
 * Verifies theme switching, sound/haptic toggles, soundService synchronization,
 * DOM data-theme attribute updates, and localStorage persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';

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

const docAttrs: Record<string, string> = {};
if (typeof globalThis.document === 'undefined') {
  const mockDocumentElement = {
    setAttribute: (k: string, v: string) => {
      docAttrs[k] = v;
    },
    getAttribute: (k: string) => docAttrs[k] ?? null,
  };
  Object.defineProperty(globalThis, 'document', {
    value: {
      documentElement: mockDocumentElement,
    },
    writable: true,
  });
}

import { useSettingsStore, type Theme } from '../useSettingsStore';
import { soundService } from '../../infrastructure/soundService';

describe('useSettingsStore (R4)', () => {
  beforeEach(() => {
    mockStorage.clear();
    // Reset store to defaults
    useSettingsStore.setState({
      theme: 'cyber-neon',
      soundEnabled: true,
      hapticsEnabled: true,
    });
    soundService.setSoundEnabled(true);
    soundService.setHapticsEnabled(true);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'cyber-neon');
    }
  });

  it('TC-SET-01: should initialize with cyber-neon theme, sound on, and haptics on by default', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('cyber-neon');
    expect(state.soundEnabled).toBe(true);
    expect(state.hapticsEnabled).toBe(true);
  });

  it('TC-SET-02: should switch between all 4 dark neon themes and 1 day mode, updating DOM data-theme', () => {
    const themes: Theme[] = [
      'electric-purple',
      'acid-lime',
      'sunset-hot',
      'day-mode',
      'cyber-neon',
    ];

    for (const theme of themes) {
      useSettingsStore.getState().setTheme(theme);
      expect(useSettingsStore.getState().theme).toBe(theme);
      if (typeof document !== 'undefined') {
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      }
    }
  });

  it('TC-SET-03: should toggle and set soundEnabled, syncing with soundService', () => {
    const store = useSettingsStore.getState();
    expect(store.soundEnabled).toBe(true);
    expect(soundService.isSoundEnabled()).toBe(true);

    // Toggle sound off
    store.toggleSound();
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(soundService.isSoundEnabled()).toBe(false);

    // Toggle sound back on
    useSettingsStore.getState().toggleSound();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
    expect(soundService.isSoundEnabled()).toBe(true);

    // Explicit set
    useSettingsStore.getState().setSoundEnabled(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(soundService.isSoundEnabled()).toBe(false);

    useSettingsStore.getState().setSoundEnabled(true);
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
    expect(soundService.isSoundEnabled()).toBe(true);
  });

  it('TC-SET-04: should toggle and set hapticsEnabled, syncing with soundService', () => {
    const store = useSettingsStore.getState();
    expect(store.hapticsEnabled).toBe(true);
    expect(soundService.isHapticsEnabled()).toBe(true);

    // Toggle haptics off
    store.toggleHaptics();
    expect(useSettingsStore.getState().hapticsEnabled).toBe(false);
    expect(soundService.isHapticsEnabled()).toBe(false);

    // Toggle haptics back on
    useSettingsStore.getState().toggleHaptics();
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
    expect(soundService.isHapticsEnabled()).toBe(true);

    // Explicit set
    useSettingsStore.getState().setHapticsEnabled(false);
    expect(useSettingsStore.getState().hapticsEnabled).toBe(false);
    expect(soundService.isHapticsEnabled()).toBe(false);
  });

  it('TC-SET-05: should persist preferences to localStorage under previalo_settings', () => {
    useSettingsStore.getState().setTheme('sunset-hot');
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().setHapticsEnabled(false);

    const raw = mockStorage.getItem('previalo_settings');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.theme).toBe('sunset-hot');
    expect(parsed.state.soundEnabled).toBe(false);
    expect(parsed.state.hapticsEnabled).toBe(false);
  });

  it('TC-SET-06: should handle repeated state toggles and remain consistent', () => {
    for (let i = 0; i < 10; i++) {
      useSettingsStore.getState().toggleSound();
      useSettingsStore.getState().toggleHaptics();
    }
    // After 10 toggles, it returns to original (true)
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
    expect(soundService.isSoundEnabled()).toBe(true);
    expect(soundService.isHapticsEnabled()).toBe(true);
  });
});
