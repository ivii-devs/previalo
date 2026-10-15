/**
 * Previalo Application Layer: useGameSessionStore
 * Zustand store managing active game session lifecycle:
 * card deck progression, token replacement, virus lifecycle & expiration,
 * reversible undo history stack, La Guatoca board movement & bounce-back math,
 * victory detection, procedural audio coordination, and crash/reload recovery.
 */

import { create } from 'zustand';
import type { Card } from '../domain/types/card';
import type { Player } from '../domain/types/player';
import type { ActiveVirus } from '../domain/types/virus';
import type { BoardTile, BoardId, TileActionResult } from '../domain/types/board';
import type { GameModeId, HistorySnapshot } from '../domain/types/session';
import { VariableReplacer } from '../domain/engines/VariableReplacer';
import { VirusManager } from '../domain/engines/VirusManager';
import { BoardEngine } from '../domain/engines/BoardEngine';
import { soundService } from '../infrastructure/soundService';
import { usePlayerStore } from './usePlayerStore';

export const SESSION_STORAGE_KEY = 'previalo_active_session';

export interface BoardRollResult {
  roll?: number;
  destination?: number;
  tile?: BoardTile;
  actionResult?: TileActionResult;
  isVictory?: boolean;
  winner?: Player;
  skipped?: boolean;
  reason?: string;
  remainingJailTurns?: number;
  extraRoll?: boolean;
  player?: Player;
}

export interface GameSessionState {
  // State
  mode: GameModeId | 'chaos' | 'category' | 'preset' | 'board' | null;
  modeConfig: any;
  deck: Card[];
  currentIndex: number;
  currentCard: Card | null;
  interpolatedText: string;
  assignedPlayers: Player[];
  calculatedDrinks: number;
  activeViruses: ActiveVirus[];
  expiredVirusesQueue: ActiveVirus[];
  boardPositions: Record<string, number>;
  boardJails: Record<string, number>;
  currentTurnPlayerIndex: number;
  lastDiceRoll: number | null;
  history: HistorySnapshot[];
  isGameOver: boolean;
  winner: Player | null;

  // Actions
  startCardSession: (
    deck: Card[],
    mode: GameModeId,
    config: any,
    players: Player[]
  ) => void;
  nextCard: (players?: Player[]) => void;
  previousCard: () => boolean;
  dismissExpiredVirus: (virusId: string) => void;
  startBoardSession: (
    boardId: BoardId,
    tiles: BoardTile[],
    players: Player[]
  ) => void;
  rollBoardDice: (forcedRoll?: number) => BoardRollResult | null;
  adjustSips: (playerId: string, delta: number) => void;
  endSession: () => void;
  hasActiveSession: () => boolean;
  resumeSession: () => boolean;
  discardSession: () => void;
}

// Memory fallback storage for non-browser / SSR environments
const getLocalStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

// Helper to persist active session snapshot to localStorage
const persistActiveSession = (state: Partial<GameSessionState>, players?: Player[]) => {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    const sessionSnapshot = {
      mode: state.mode,
      modeConfig: state.modeConfig,
      deck: state.deck,
      currentIndex: state.currentIndex,
      currentCard: state.currentCard,
      interpolatedText: state.interpolatedText,
      assignedPlayers: state.assignedPlayers,
      calculatedDrinks: state.calculatedDrinks,
      activeViruses: state.activeViruses,
      expiredVirusesQueue: state.expiredVirusesQueue,
      boardPositions: state.boardPositions,
      boardJails: state.boardJails,
      currentTurnPlayerIndex: state.currentTurnPlayerIndex,
      lastDiceRoll: state.lastDiceRoll,
      history: state.history,
      isGameOver: state.isGameOver,
      winner: state.winner,
      savedPlayers: players || usePlayerStore.getState().players,
      timestamp: Date.now(),
    };

    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionSnapshot));
  } catch {
    // Graceful ignore of quota exceeded or disabled storage
  }
};

const clearActiveSessionFromStorage = () => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore error
  }
};

export const useGameSessionStore = create<GameSessionState>()((set, get) => ({
  mode: null,
  modeConfig: null,
  deck: [],
  currentIndex: -1,
  currentCard: null,
  interpolatedText: '',
  assignedPlayers: [],
  calculatedDrinks: 0,
  activeViruses: [],
  expiredVirusesQueue: [],
  boardPositions: {},
  boardJails: {},
  currentTurnPlayerIndex: 0,
  lastDiceRoll: null,
  history: [],
  isGameOver: false,
  winner: null,

  startCardSession: (
    deck: Card[],
    mode: GameModeId,
    config: any,
    players: Player[]
  ) => {
    const activePlayers =
      players && players.length > 0 ? players : usePlayerStore.getState().players;

    if (deck.length === 0) {
      const emptyState = {
        mode,
        modeConfig: config,
        deck: [],
        currentIndex: -1,
        currentCard: null,
        interpolatedText: '',
        assignedPlayers: [],
        calculatedDrinks: 0,
        activeViruses: [],
        expiredVirusesQueue: [],
        history: [],
        isGameOver: false,
        winner: null,
      };
      set(emptyState);
      persistActiveSession(emptyState, activePlayers);
      return;
    }

    const firstCard = deck[0];
    const initialViruses: ActiveVirus[] = [];

    // Interpolate tokens for first card
    const { interpolatedText, assignedPlayers, calculatedDrinks } =
      VariableReplacer.replaceTokens(firstCard.text, activePlayers, {
        intensity: config?.intensity ?? 2,
        baseDrinks: firstCard.drinks_penalty,
        currentTurnIndex: 0,
      });

    // Check if first card is a virus
    if (VirusManager.isVirusCard(firstCard)) {
      const newVirus = VirusManager.createVirus(firstCard, assignedPlayers[0]);
      initialViruses.push(newVirus);
      soundService.playVirusAlert();
    }

    // Award initial targeted & drinks to players
    const sipsAwarded: Record<string, number> = {};
    for (const p of assignedPlayers) {
      usePlayerStore.getState().incrementTargeted(p.id);
    }
    if (
      calculatedDrinks > 0 &&
      (firstCard.target === 'active_player' ||
        firstCard.target === 'pair' ||
        !firstCard.target) &&
      assignedPlayers.length > 0
    ) {
      usePlayerStore.getState().addSips(assignedPlayers[0].id, calculatedDrinks);
      sipsAwarded[assignedPlayers[0].id] = calculatedDrinks;
      if (firstCard.target === 'pair' && assignedPlayers.length > 1) {
        usePlayerStore.getState().addSips(assignedPlayers[1].id, calculatedDrinks);
        sipsAwarded[assignedPlayers[1].id] = calculatedDrinks;
      }
    }

    soundService.playSwipe();

    const nextState = {
      mode,
      modeConfig: config,
      deck: [...deck],
      currentIndex: 0,
      currentCard: firstCard,
      interpolatedText,
      assignedPlayers,
      calculatedDrinks,
      activeViruses: initialViruses,
      expiredVirusesQueue: [],
      history: [],
      isGameOver: false,
      winner: null,
    };

    set(nextState);
    persistActiveSession(nextState, usePlayerStore.getState().players);
  },

  nextCard: (players?: Player[]) => {
    const {
      deck,
      currentIndex,
      currentCard,
      interpolatedText,
      assignedPlayers,
      calculatedDrinks,
      activeViruses,
      expiredVirusesQueue,
      history,
      modeConfig,
    } = get();

    if (deck.length === 0) return;

    const activePlayers =
      players && players.length > 0 ? players : usePlayerStore.getState().players;

    // Check if already at end of deck
    if (currentIndex >= deck.length - 1) {
      set({ isGameOver: true });
      persistActiveSession({ ...get(), isGameOver: true }, activePlayers);
      return;
    }

    // 1. Snapshot current card state to history for undo
    if (currentCard) {
      const sipsAwarded: Record<string, number> = {};
      if (
        calculatedDrinks > 0 &&
        (currentCard.target === 'active_player' ||
          currentCard.target === 'pair' ||
          !currentCard.target) &&
        assignedPlayers.length > 0
      ) {
        sipsAwarded[assignedPlayers[0].id] = calculatedDrinks;
        if (currentCard.target === 'pair' && assignedPlayers.length > 1) {
          sipsAwarded[assignedPlayers[1].id] = calculatedDrinks;
        }
      }

      const snapshot: HistorySnapshot = {
        card: currentCard,
        rawText: currentCard.text,
        interpolatedText,
        assignedPlayers: [...assignedPlayers],
        calculatedDrinks,
        sipsAwarded,
        previousViruses: activeViruses.map((v) => ({ ...v })),
        turnIndex: currentIndex,
        timestamp: Date.now(),
      };
      history.push(snapshot);
    }

    // 2. Tick active viruses
    const { updatedViruses, expiredViruses } = VirusManager.tickRound(activeViruses);
    let newExpiredQueue = [...expiredVirusesQueue];

    if (expiredViruses.length > 0) {
      newExpiredQueue = [...newExpiredQueue, ...expiredViruses];
      soundService.playVirusExpired();
    }

    // 3. Advance to next card
    const nextIndex = currentIndex + 1;
    const nextCard = deck[nextIndex];

    // 4. Token replacement
    const replacement = VariableReplacer.replaceTokens(nextCard.text, activePlayers, {
      intensity: modeConfig?.intensity ?? 2,
      baseDrinks: nextCard.drinks_penalty,
      currentTurnIndex: nextIndex,
    });

    // 5. Register virus if card is virus
    const finalViruses = [...updatedViruses];
    if (VirusManager.isVirusCard(nextCard)) {
      const newVirus = VirusManager.createVirus(nextCard, replacement.assignedPlayers[0]);
      finalViruses.push(newVirus);
      soundService.playVirusAlert();
    }

    // 6. Update player store sips & targeted
    for (const p of replacement.assignedPlayers) {
      usePlayerStore.getState().incrementTargeted(p.id);
    }

    if (
      replacement.calculatedDrinks > 0 &&
      (nextCard.target === 'active_player' ||
        nextCard.target === 'pair' ||
        !nextCard.target) &&
      replacement.assignedPlayers.length > 0
    ) {
      usePlayerStore
        .getState()
        .addSips(replacement.assignedPlayers[0].id, replacement.calculatedDrinks);
      if (nextCard.target === 'pair' && replacement.assignedPlayers.length > 1) {
        usePlayerStore
          .getState()
          .addSips(replacement.assignedPlayers[1].id, replacement.calculatedDrinks);
      }
    }

    soundService.playSwipe();

    const updatedState = {
      currentIndex: nextIndex,
      currentCard: nextCard,
      interpolatedText: replacement.interpolatedText,
      assignedPlayers: replacement.assignedPlayers,
      calculatedDrinks: replacement.calculatedDrinks,
      activeViruses: finalViruses,
      expiredVirusesQueue: newExpiredQueue,
      history: [...history],
    };

    set(updatedState);
    persistActiveSession({ ...get(), ...updatedState }, usePlayerStore.getState().players);
  },

  previousCard: () => {
    const { history, currentCard, calculatedDrinks, assignedPlayers } = get();

    if (history.length === 0) {
      return false;
    }

    // Pop the most recent snapshot
    const snapshot = history.pop()!;

    // Revert sips that were awarded on the card currently being undone
    if (
      currentCard &&
      calculatedDrinks > 0 &&
      (currentCard.target === 'active_player' ||
        currentCard.target === 'pair' ||
        !currentCard.target) &&
      assignedPlayers.length > 0
    ) {
      usePlayerStore.getState().addSips(assignedPlayers[0].id, -calculatedDrinks);
      if (currentCard.target === 'pair' && assignedPlayers.length > 1) {
        usePlayerStore.getState().addSips(assignedPlayers[1].id, -calculatedDrinks);
      }
    }

    // Revert targeted counts on the card being undone
    for (const p of assignedPlayers) {
      const activeP = usePlayerStore
        .getState()
        .players.find((pl) => pl.id === p.id || pl.name === p.name);
      if (activeP) {
        const currentTargeted = activeP.timesTargeted ?? activeP.targetCount ?? 1;
        usePlayerStore.getState().updatePlayer(p.id, {
          timesTargeted: Math.max(0, currentTargeted - 1),
          targetCount: Math.max(0, currentTargeted - 1),
        });
      }
    }

    // Prune any expired viruses that were restored back to active viruses in snapshot
    const restoredVirusIds = new Set((snapshot.previousViruses || []).map((v) => v.id));
    const currentExpiredQueue = get().expiredVirusesQueue || [];
    const prunedExpiredQueue = currentExpiredQueue.filter(
      (v) => !restoredVirusIds.has(v.id)
    );

    const restoredState = {
      currentIndex: snapshot.turnIndex,
      currentCard: snapshot.card,
      interpolatedText: snapshot.interpolatedText,
      assignedPlayers: snapshot.assignedPlayers,
      calculatedDrinks: snapshot.calculatedDrinks,
      activeViruses: snapshot.previousViruses,
      expiredVirusesQueue: prunedExpiredQueue,
      isGameOver: false,
      winner: null,
      history: [...history],
    };

    set(restoredState);
    persistActiveSession({ ...get(), ...restoredState }, usePlayerStore.getState().players);
    return true;
  },

  dismissExpiredVirus: (virusId: string) => {
    set((state) => {
      const updatedQueue = state.expiredVirusesQueue.filter((v) => v.id !== virusId);
      const nextState = { ...state, expiredVirusesQueue: updatedQueue };
      persistActiveSession(nextState);
      return { expiredVirusesQueue: updatedQueue };
    });
  },

  startBoardSession: (
    boardId: BoardId,
    tiles: BoardTile[],
    players: Player[]
  ) => {
    const activePlayers =
      players && players.length > 0 ? players : usePlayerStore.getState().players;

    const boardPositions: Record<string, number> = {};
    const boardJails: Record<string, number> = {};

    for (const p of activePlayers) {
      boardPositions[p.id] = 1;
      boardJails[p.id] = 0;
    }

    const nextState = {
      mode: 'board' as const,
      modeConfig: {
        boardId,
        totalTiles: tiles.length > 0 ? tiles[tiles.length - 1].tile_number : 45,
        tiles,
      },
      boardPositions,
      boardJails,
      currentTurnPlayerIndex: 0,
      lastDiceRoll: null,
      isGameOver: false,
      winner: null,
      deck: [],
      currentIndex: -1,
      currentCard: null,
      interpolatedText: '',
      assignedPlayers: [],
      calculatedDrinks: 0,
      activeViruses: [],
      expiredVirusesQueue: [],
      history: [],
    };

    set(nextState);
    persistActiveSession(nextState, activePlayers);
  },

  rollBoardDice: (forcedRoll?: number): BoardRollResult | null => {
    const {
      modeConfig,
      boardPositions,
      boardJails,
      currentTurnPlayerIndex,
      isGameOver,
    } = get();

    if (isGameOver) return null;

    const activePlayers = usePlayerStore.getState().players;
    if (activePlayers.length === 0) return null;

    const playerIndex = currentTurnPlayerIndex % activePlayers.length;
    const player = activePlayers[playerIndex];

    // Check if player is jailed
    const jailTurns = boardJails[player.id] ?? 0;
    if (jailTurns > 0) {
      const remainingJailTurns = jailTurns - 1;
      const updatedJails = { ...boardJails, [player.id]: remainingJailTurns };
      const nextPlayerIndex = (playerIndex + 1) % activePlayers.length;

      set({
        boardJails: updatedJails,
        currentTurnPlayerIndex: nextPlayerIndex,
      });

      persistActiveSession(
        {
          ...get(),
          boardJails: updatedJails,
          currentTurnPlayerIndex: nextPlayerIndex,
        },
        activePlayers
      );

      return {
        skipped: true,
        reason: 'jail',
        remainingJailTurns,
        player,
      };
    }

    // Roll dice
    const roll =
      forcedRoll !== undefined
        ? forcedRoll
        : BoardEngine.rollDice();

    soundService.playDice();

    const tiles: BoardTile[] = modeConfig?.tiles || [];
    const totalTiles =
      modeConfig?.totalTiles ||
      (tiles.length > 0 ? tiles[tiles.length - 1].tile_number : 45);

    const currentPos = boardPositions[player.id] ?? 1;
    const destination = BoardEngine.calculateDestination(currentPos, roll, totalTiles);
    const destTile = tiles.find((t) => t.tile_number === destination);

    const actionResult = destTile
      ? BoardEngine.resolveTile(destTile)
      : {
          actionType: 'none' as const,
          destination,
          extraRoll: false,
          turnsLost: 0,
          drinks: 0,
        };

    const updatedPositions = { ...boardPositions };
    const updatedJails = { ...boardJails };
    let nextPlayerIndex = playerIndex;
    let victory = false;
    let winnerPlayer: Player | null = null;

    // Evaluate tile action
    if (
      actionResult.actionType === 'finish' ||
      destination === totalTiles ||
      actionResult.destination === totalTiles
    ) {
      updatedPositions[player.id] = totalTiles;
      victory = true;
      winnerPlayer = player;
      soundService.playVictory();
    } else if (actionResult.actionType === 'trap_skull') {
      updatedPositions[player.id] = actionResult.destination; // Resets to 1
      if (actionResult.drinks > 0) {
        usePlayerStore.getState().addSips(player.id, actionResult.drinks);
      }
      nextPlayerIndex = (playerIndex + 1) % activePlayers.length;
    } else if (actionResult.actionType === 'trap_jail') {
      updatedPositions[player.id] = destination;
      updatedJails[player.id] = actionResult.turnsLost > 0 ? actionResult.turnsLost : 2;
      if (actionResult.drinks > 0) {
        usePlayerStore.getState().addSips(player.id, actionResult.drinks);
      }
      nextPlayerIndex = (playerIndex + 1) % activePlayers.length;
    } else if (actionResult.actionType === 'jump') {
      updatedPositions[player.id] = actionResult.destination;
      if (actionResult.drinks > 0) {
        usePlayerStore.getState().addSips(player.id, actionResult.drinks);
      }
      if (!actionResult.extraRoll) {
        nextPlayerIndex = (playerIndex + 1) % activePlayers.length;
      }
      // If extraRoll, nextPlayerIndex remains playerIndex!
    } else {
      updatedPositions[player.id] = actionResult.destination;
      if (actionResult.drinks > 0) {
        usePlayerStore.getState().addSips(player.id, actionResult.drinks);
      }
      nextPlayerIndex = (playerIndex + 1) % activePlayers.length;
    }

    const stateUpdate = {
      boardPositions: updatedPositions,
      boardJails: updatedJails,
      currentTurnPlayerIndex: nextPlayerIndex,
      lastDiceRoll: roll,
      isGameOver: victory,
      winner: winnerPlayer,
    };

    set(stateUpdate);
    persistActiveSession({ ...get(), ...stateUpdate }, activePlayers);

    return {
      roll,
      destination: updatedPositions[player.id],
      tile: destTile,
      actionResult,
      isVictory: victory,
      winner: winnerPlayer || undefined,
      extraRoll: actionResult.extraRoll,
      player,
    };
  },

  adjustSips: (playerId: string, delta: number) => {
    usePlayerStore.getState().addSips(playerId, delta);
    persistActiveSession(get());
  },

  endSession: () => {
    clearActiveSessionFromStorage();
    set({
      mode: null,
      modeConfig: null,
      deck: [],
      currentIndex: -1,
      currentCard: null,
      interpolatedText: '',
      assignedPlayers: [],
      calculatedDrinks: 0,
      activeViruses: [],
      expiredVirusesQueue: [],
      boardPositions: {},
      boardJails: {},
      currentTurnPlayerIndex: 0,
      lastDiceRoll: null,
      history: [],
      isGameOver: false,
      winner: null,
    });
  },

  hasActiveSession: (): boolean => {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
      const raw = storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      if (parsed.isGameOver) return false;
      if (parsed.mode === 'board') return true;
      if (parsed.deck && Array.isArray(parsed.deck) && parsed.deck.length > 0 && parsed.currentIndex >= 0) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  resumeSession: (): boolean => {
    if (!get().hasActiveSession()) {
      return false;
    }
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
      const raw = storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;

      // Restore active players in player store if recorded
      if (parsed.savedPlayers && Array.isArray(parsed.savedPlayers) && parsed.savedPlayers.length > 0) {
        usePlayerStore.getState().setPlayers(parsed.savedPlayers);
      }

      set({
        mode: parsed.mode ?? null,
        modeConfig: parsed.modeConfig ?? null,
        deck: parsed.deck ?? [],
        currentIndex: parsed.currentIndex ?? -1,
        currentCard: parsed.currentCard ?? null,
        interpolatedText: parsed.interpolatedText ?? '',
        assignedPlayers: parsed.assignedPlayers ?? [],
        calculatedDrinks: parsed.calculatedDrinks ?? 0,
        activeViruses: parsed.activeViruses ?? [],
        expiredVirusesQueue: parsed.expiredVirusesQueue ?? [],
        boardPositions: parsed.boardPositions ?? {},
        boardJails: parsed.boardJails ?? {},
        currentTurnPlayerIndex: parsed.currentTurnPlayerIndex ?? 0,
        lastDiceRoll: parsed.lastDiceRoll ?? null,
        history: parsed.history ?? [],
        isGameOver: parsed.isGameOver ?? false,
        winner: parsed.winner ?? null,
      });

      return true;
    } catch {
      return false;
    }
  },

  discardSession: () => {
    get().endSession();
  },
}));
