/**
 * Previalo Application Layer: useSettingsStore
 * Zustand store managing user preferences: neon themes, sound FX, and haptic feedback.
 * Persisted in localStorage under 'previalo_settings'.
 * Automatically synchronizes with soundService and document data-theme attribute.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { soundService } from '../infrastructure/soundService';

export type Theme = 'cyber-neon' | 'electric-purple' | 'acid-lime' | 'sunset-hot' | 'day-mode';

export interface SettingsState {
  theme: Theme;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setTheme: (theme: Theme) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleHaptics: () => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

// In-memory fallback map for environments without localStorage
const inMemoryMap = new Map<string, string>();

const dynamicStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        return (globalThis as any).localStorage.getItem(name);
      }
    } catch {
      // Storage unavailable or security restricted
    }
    return inMemoryMap.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
        return;
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(name, value);
        return;
      }
    } catch {
      // Fallback on QuotaExceededError or security restrictions
    }
    inMemoryMap.set(name, value);
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
        return;
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(name);
        return;
      }
    } catch {
      // Fallback
    }
    inMemoryMap.delete(name);
  },
};

// Apply theme to DOM documentElement if in browser
const applyThemeToDOM = (theme: Theme) => {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'cyber-neon',
      soundEnabled: true,
      hapticsEnabled: true,

      setTheme: (theme: Theme) => {
        applyThemeToDOM(theme);
        set({ theme });
      },

      toggleSound: () => {
        const next = !get().soundEnabled;
        soundService.setSoundEnabled(next);
        set({ soundEnabled: next });
      },

      setSoundEnabled: (enabled: boolean) => {
        soundService.setSoundEnabled(enabled);
        set({ soundEnabled: enabled });
      },

      toggleHaptics: () => {
        const next = !get().hapticsEnabled;
        soundService.setHapticsEnabled(next);
        set({ hapticsEnabled: next });
      },

      setHapticsEnabled: (enabled: boolean) => {
        soundService.setHapticsEnabled(enabled);
        set({ hapticsEnabled: enabled });
      },
    }),
    {
      name: 'previalo_settings',
      storage: createJSONStorage(() => dynamicStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          soundService.setSoundEnabled(state.soundEnabled);
          soundService.setHapticsEnabled(state.hapticsEnabled);
          applyThemeToDOM(state.theme);
        }
      },
    }
  )
);
