/**
 * Previalo Domain Layer: BoardEngine
 * Pure domain engine for La Guatoca board gameplay: uniform 1-6 dice RNG,
 * bounce-back destination math on finish overshoot, and special tile resolution.
 */

import type { BoardTile, TileActionResult } from '../types/board';
import type { Player } from '../types/player';

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
