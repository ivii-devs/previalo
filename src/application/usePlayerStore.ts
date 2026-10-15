/**
 * Previalo Application Layer: usePlayerStore
 * Zustand store managing active players and historical players for 1-tap Quick Add chips.
 * Persists historicalPlayers in localStorage under 'previalo_player_history'.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Player } from '../domain/types/player';

export const NEON_COLORS: readonly string[] = [
  '#ec4899', // Cyber Pink / Magenta
  '#8b5cf6', // Electric Violet
  '#06b6d4', // Cyan Neon
  '#10b981', // Acid Emerald
  '#f59e0b', // Neon Amber
  '#ef4444', // Hot Red
  '#a855f7', // Vivid Purple
  '#3b82f6', // Neon Blue
  '#84cc16', // Acid Lime
  '#f97316', // Sunset Orange
];

export const NEON_AVATARS: readonly string[] = [
  '🦁', '🦊', '🐼', '🐨', '🐯', '🦄', '🐲', '🐙', '🚀', '⚡', '🔥', '🎉',
];

export interface PlayerState {
  players: Player[];
  historicalPlayers: string[];

  // Actions
  addPlayer: (name: string, color?: string, avatar?: string) => Player | null;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  addSips: (id: string, count: number) => void;
  incrementTargeted: (id: string) => void;
  quickAddPlayer: (name: string) => Player | null;
  removeHistoricalPlayer: (name: string) => void;
  resetPlayerStats: () => void;
  clearPlayers: () => void;
  setPlayers: (players: Player[]) => void;
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

let playerCounter = 0;
const generatePlayerId = (name: string): string => {
  playerCounter++;
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `p_${Date.now()}_${playerCounter}_${clean}`;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      players: [],
      historicalPlayers: [],

      addPlayer: (name: string, color?: string, avatar?: string) => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const { players, historicalPlayers } = get();
        const nextIndex = players.length;
        const assignedColor = color || NEON_COLORS[nextIndex % NEON_COLORS.length];
        const assignedAvatar = avatar || NEON_AVATARS[nextIndex % NEON_AVATARS.length];

        const newPlayer: Player = {
          id: generatePlayerId(trimmed),
          name: trimmed,
          color: assignedColor,
          avatar: assignedAvatar,
          sips: 0,
          sipCount: 0,
          timesTargeted: 0,
          targetCount: 0,
          jailTurns: 0,
          boardPosition: 1,
        };

        // Add to historicalPlayers if not present
        const hasHistory = historicalPlayers.some(
          (h) => h.toLowerCase() === trimmed.toLowerCase()
        );
        const updatedHistory = hasHistory
          ? historicalPlayers
          : [...historicalPlayers, trimmed];

        set({
          players: [...players, newPlayer],
          historicalPlayers: updatedHistory,
        });

        return newPlayer;
      },

      removePlayer: (id: string) => {
        set((state) => ({
          players: state.players.filter((p) => p.id !== id && p.name !== id),
        }));
      },

      updatePlayer: (id: string, updates: Partial<Player>) => {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id || p.name === id ? { ...p, ...updates } : p
          ),
        }));
      },

      addSips: (id: string, count: number) => {
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== id && p.name !== id) return p;
            const currentSips = p.sips ?? p.sipCount ?? 0;
            const updated = Math.max(0, currentSips + count);
            return {
              ...p,
              sips: updated,
              sipCount: updated,
            };
          }),
        }));
      },

      incrementTargeted: (id: string) => {
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== id && p.name !== id) return p;
            const current = p.timesTargeted ?? p.targetCount ?? 0;
            return {
              ...p,
              timesTargeted: current + 1,
              targetCount: current + 1,
            };
          }),
        }));
      },

      quickAddPlayer: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const { players } = get();
        const alreadyActive = players.find(
          (p) => p.name.toLowerCase() === trimmed.toLowerCase()
        );

        if (alreadyActive) {
          return null; // Already in game
        }

        return get().addPlayer(trimmed);
      },

      removeHistoricalPlayer: (name: string) => {
        set((state) => ({
          historicalPlayers: state.historicalPlayers.filter(
            (h) => h.toLowerCase() !== name.trim().toLowerCase()
          ),
        }));
      },

      resetPlayerStats: () => {
        set((state) => ({
          players: state.players.map((p) => ({
            ...p,
            sips: 0,
            sipCount: 0,
            timesTargeted: 0,
            targetCount: 0,
            jailTurns: 0,
            boardPosition: 1,
          })),
        }));
      },

      clearPlayers: () => {
        set({ players: [] });
      },

      setPlayers: (players: Player[]) => {
        set({ players });
      },
    }),
    {
      name: 'previalo_player_history',
      storage: createJSONStorage(() => dynamicStorage),
      partialize: (state) => ({ historicalPlayers: state.historicalPlayers }),
    }
  )
);
