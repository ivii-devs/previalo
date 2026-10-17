/**
 * Previalo Domain Layer: BoardEngine
 * Pure domain engine for La Guatoca board gameplay: uniform 1-6 dice RNG,
 * bounce-back destination math on finish overshoot, and special tile resolution.
 */

import type { BoardTile, TileActionResult, HotTier, BoardId, TileType } from '../types/board';
import type { Card } from '../types/card';
import type { Player } from '../types/player';
import { VariableReplacer } from './VariableReplacer';

export interface DrawTileCardOptions {
  totalTiles?: number;
  hotTiers?: readonly HotTier[];
  boardId?: BoardId;
}

export class BoardEngine {
  /**
   * Generates a uniform pseudo-random dice roll between 1 and 6 (inclusive).
   */
  public static rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Calculates destination position on the board.
   * If move exceeds totalTiles (finish line), calculates overshoot bounce-back:
   * destination = totalTiles - ((currentPosition + roll) - totalTiles)
   */
  public static calculateDestination(
    currentPosition: number,
    roll: number,
    totalTiles: number
  ): number {
    const rawTarget = currentPosition + roll;
    if (rawTarget <= totalTiles) {
      return rawTarget;
    }
    const excess = rawTarget - totalTiles;
    const bounced = totalTiles - excess;
    return Math.max(1, bounced);
  }

  /**
   * Checks whether the given pawn position represents exact arrival at the finish tile (Meta).
   */
  public static isVictory(position: number, totalTiles: number): boolean {
    return position === totalTiles;
  }

  /**
   * Determines which Hot tier (1, 2, or 3) corresponds to a tile's board segment
   * given the user-selected active Hot tiers.
   */
  public static getTargetHotTier(
    tileNumber: number,
    totalTiles: number,
    activeTiers: readonly HotTier[] = [1, 2, 3]
  ): HotTier {
    const uniqueSorted = [...new Set(activeTiers.length > 0 ? activeTiers : [1, 2, 3])].sort(
      (a, b) => a - b
    ) as HotTier[];
    const k = uniqueSorted.length;
    const safeTotal = Math.max(1, totalTiles);
    const clampedTile = Math.max(1, Math.min(tileNumber, safeTotal));
    const idx = Math.min(k - 1, Math.floor(((clampedTile - 1) / safeTotal) * k));
    return uniqueSorted[idx];
  }

  /**
   * Helper predicate checking whether a card matches the semantic category of a board tile.
   */
  private static matchesTileCategory(
    card: Card,
    tileType: TileType,
    boardId?: BoardId
  ): boolean {
    switch (tileType) {
      case 'drink':
      case 'give_drink':
      case 'jump':
        return card.type === 'drink_event';

      case 'truth':
        if (boardId === 'guatoca_hot') {
          return card.type === 'hot_event' && card.action_type === 'truth';
        }
        return (
          (card.type === 'hot_event' && card.action_type === 'truth') ||
          card.type === 'board_event'
        );

      case 'challenge':
      case 'versus':
      case 'group_event':
      case 'yo_nunca':
        if (boardId === 'guatoca_hot') {
          return (
            (card.type === 'hot_event' && card.action_type === 'dare') ||
            card.type === 'board_event'
          );
        }
        return (
          card.type === 'board_event' ||
          (card.type === 'hot_event' && card.action_type === 'dare')
        );

      case 'trap_jail':
      case 'trap_skull':
      case 'trap_back':
        return card.type === 'drink_event' || card.type === 'board_event';

      default:
        return true;
    }
  }

  /**
   * Draws a dynamic card from the board deck matching the landed tile type and
   * progressive board segment tier, cycling without repetition until exhausted.
   */
  public static drawCardForTile(
    tile: BoardTile,
    deck: readonly Card[] | Card[],
    usedCardIds: ReadonlySet<string | number>,
    activePlayerCount: number,
    options?: DrawTileCardOptions
  ): {
    card: Card | null;
    nextUsedIds: Set<string | number>;
    targetTier: HotTier;
  } {
    const safePlayerCount = Math.max(2, activePlayerCount);
    const playable = deck.filter((c) => VariableReplacer.isCardPlayable(c, safePlayerCount));
    const targetTier = this.getTargetHotTier(
      tile.tile_number,
      options?.totalTiles ?? 64,
      options?.hotTiers ?? [1, 2, 3]
    );

    if (playable.length === 0) {
      return {
        card: null,
        nextUsedIds: new Set(usedCardIds),
        targetTier,
      };
    }

    const matchesTier = (c: Card): boolean => {
      if (c.type === 'hot_event') {
        return ((c.tier as HotTier) ?? 1) === targetTier;
      }
      return true;
    };

    const pickFromPool = (pool: Card[]): Card | undefined =>
      // 1. Exact tile category + exact segment tier (prioritizing hot_event when in hot mode on challenge/truth)
      pool.find(
        (c) =>
          options?.boardId === 'guatoca_hot' &&
          (tile.tile_type === 'challenge' || tile.tile_type === 'truth') &&
          c.type === 'hot_event' &&
          this.matchesTileCategory(c, tile.tile_type, options?.boardId) &&
          matchesTier(c)
      ) ??
      pool.find(
        (c) => this.matchesTileCategory(c, tile.tile_type, options?.boardId) && matchesTier(c)
      ) ??
      // 2. If truth/challenge in Hot mode and selected tier only has dare/truth, pick any hot_event of targetTier
      pool.find((c) => c.type === 'hot_event' && matchesTier(c)) ??
      // 3. Any card matching segment tier
      pool.find((c) => matchesTier(c)) ??
      // 4. Any card matching tile category
      pool.find((c) => this.matchesTileCategory(c, tile.tile_type, options?.boardId)) ??
      // 5. Fallback to first available card
      pool[0];

    let nextUsed = new Set(usedCardIds);
    let unusedPlayable = playable.filter((c) => !nextUsed.has(c.id));

    if (unusedPlayable.length === 0) {
      nextUsed = new Set();
      unusedPlayable = playable;
    }

    const chosen = pickFromPool(unusedPlayable) ?? playable[0];
    nextUsed.add(chosen.id);

    return {
      card: chosen,
      nextUsedIds: nextUsed,
      targetTier,
    };
  }

  /**
   * Evaluates special tile mechanics when a player's pawn lands on a tile.
   * Handles jump/oca, cárcel (jail), muerte (skull reset), trap_back, drink, and finish tiles.
   */
  public static resolveTile(tile: BoardTile): TileActionResult {
    switch (tile.tile_type) {
      case 'jump':
        return {
          actionType: 'jump',
          destination: tile.action_jump_to ?? tile.tile_number,
          extraRoll: true,
          turnsLost: 0,
          drinks: tile.drinks_action ?? 0,
          modalPrompt: tile.description || '¡De bar en bar! Tira otra vez.',
        };

      case 'trap_skull':
        return {
          actionType: 'trap_skull',
          destination: tile.action_jump_to ?? 1,
          extraRoll: false,
          turnsLost: 0,
          drinks: tile.drinks_action ?? 0,
          modalPrompt: tile.description || '¡La muerte! Vuelves a empezar.',
        };

      case 'trap_jail':
        return {
          actionType: 'trap_jail',
          destination: tile.tile_number,
          extraRoll: false,
          turnsLost: tile.turns_lost > 0 ? tile.turns_lost : 2,
          drinks: tile.drinks_action ?? 0,
          modalPrompt: tile.description || '¡A la cárcel! Pierdes tu turno.',
        };

      case 'trap_back':
        return {
          actionType: 'trap_back',
          destination: tile.action_jump_to ?? tile.tile_number,
          extraRoll: false,
          turnsLost: tile.turns_lost ?? 0,
          drinks: tile.drinks_action ?? 0,
          modalPrompt: tile.description,
        };

      case 'finish':
        return {
          actionType: 'finish',
          destination: tile.tile_number,
          extraRoll: false,
          turnsLost: 0,
          drinks: 0,
          modalPrompt: tile.description || '¡Meta! Has ganado la partida.',
        };

      case 'drink':
        return {
          actionType: 'drink',
          destination: tile.tile_number,
          extraRoll: false,
          turnsLost: 0,
          drinks: tile.drinks_action > 0 ? tile.drinks_action : 1,
          modalPrompt: tile.description,
        };

      default:
        return {
          actionType: tile.tile_type,
          destination: tile.action_jump_to ?? tile.tile_number,
          extraRoll: false,
          turnsLost: tile.turns_lost ?? 0,
          drinks: tile.drinks_action ?? 0,
          modalPrompt: tile.description,
        };
    }
  }

  /**
   * Helper to handle jail state check before turn roll.
   * If player is in jail, decrements turns and skips roll.
   */
  public static handleJailTurn(player: Player): {
    canRoll: boolean;
    updatedJailTurns: number;
    message?: string;
  } {
    const currentJail = player.jailTurns ?? 0;
    if (currentJail > 0) {
      const remaining = currentJail - 1;
      return {
        canRoll: false,
        updatedJailTurns: remaining,
        message:
          remaining > 0
            ? `En la cárcel (${remaining} turnos restantes)`
            : '¡Cumpliste tu condena! En el próximo turno podrás tirar.',
      };
    }
    return {
      canRoll: true,
      updatedJailTurns: 0,
    };
  }

  // --- Instance methods matching interface contracts ---

  public rollDice(): number {
    return BoardEngine.rollDice();
  }

  public calculateDestination(
    currentPosition: number,
    roll: number,
    totalTiles: number
  ): number {
    return BoardEngine.calculateDestination(currentPosition, roll, totalTiles);
  }

  public resolveTile(tile: BoardTile): TileActionResult {
    return BoardEngine.resolveTile(tile);
  }
}
