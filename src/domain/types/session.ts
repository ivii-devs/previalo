/**
 * Previalo Domain Types: GameSession & History
 * Represents session state, undo/redo history snapshots, and mode identifiers.
 */

import type { Card } from './card';
import type { Player } from './player';
import type { ActiveVirus } from './virus';
import type { BoardId } from './board';

export type GameModeId =
  | 'chaos'
  | 'category'
  | 'preset'
  | 'modo_caliente'
  | 'modo_parejas'
  | 'guatoca';

export interface HistorySnapshot {
  card: Card;
  rawText: string;
  interpolatedText: string;
  assignedPlayers: Player[];
  calculatedDrinks: number;
  sipsAwarded?: Map<string, number> | Record<string, number>;
  previousViruses: ActiveVirus[];
  turnIndex: number;
  deck?: Card[];
  timestamp?: number;
}

export interface GameSession {
  id: string;
  mode: GameModeId;
  deck: Card[];
  currentIndex: number;
  currentCard: Card | null;
  activePlayers: Player[];
  activeViruses: ActiveVirus[];
  historyStack: HistorySnapshot[];
  boardId?: BoardId;
  boardPositions?: Record<string, number>;
  currentTurnPlayerIndex?: number;
  isGameOver?: boolean;
}
