/**
 * Previalo Application Layer: useSettingsStore
 * Zustand store managing user preferences: matte themes, sound FX, and haptic feedback.
 * Persisted in localStorage under 'previalo_settings'.
 * Automatically migrates legacy theme IDs and synchronizes with soundService and document data-theme.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { soundService } from '../infrastructure/soundService';

export type Theme =
  | 'coral-night'
  | 'indigo-obsidian'
  | 'emerald-forest'
  | 'amber-dusk'
  | 'warm-day';

export const VALID_THEMES: readonly Theme[] = [
  'coral-night',
  'indigo-obsidian',
  'emerald-forest',
  'amber-dusk',
  'warm-day',
] as const;

export const DEFAULT_THEME: Theme = 'coral-night';

export const LEGACY_THEME_MAP: Record<string, Theme> = {
  'cyber-neon': 'coral-night',
  'electric-purple': 'indigo-obsidian',
  'acid-lime': 'emerald-forest',
  'sunset-hot': 'amber-dusk',
  'day-mode': 'warm-day',
};

export function normalizeTheme(raw: unknown): Theme {
  if (typeof raw === 'string') {
    if ((VALID_THEMES as readonly string[]).includes(raw)) {
      return raw as Theme;
    }
    if (raw in LEGACY_THEME_MAP) {
      return LEGACY_THEME_MAP[raw];
    }
  }
  return DEFAULT_THEME;
}

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

let pendingLegacyThemeMigration = false;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      soundEnabled: true,
      hapticsEnabled: true,

      setTheme: (theme: Theme) => {
        const normalized = normalizeTheme(theme);
        applyThemeToDOM(normalized);
        set({ theme: normalized });
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
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<SettingsState> | undefined) ?? {};
        const rawTheme = persisted.theme;
        const normalized = normalizeTheme(rawTheme ?? currentState.theme);
        pendingLegacyThemeMigration =
          rawTheme !== undefined && (rawTheme as string) !== normalized;
        return {
          ...currentState,
          ...persisted,
          theme: normalized,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const normalized = normalizeTheme(state.theme);
          const shouldPersistMigration =
            pendingLegacyThemeMigration || normalized !== state.theme;
          pendingLegacyThemeMigration = false;
          soundService.setSoundEnabled(state.soundEnabled);
          soundService.setHapticsEnabled(state.hapticsEnabled);
          applyThemeToDOM(normalized);
          if (shouldPersistMigration) {
            state.setTheme(normalized);
          }
        }
      },
    }
  )
);
