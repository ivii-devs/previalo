import { describe, it, expect } from 'vitest';
import { BoardEngine } from '../BoardEngine';
import type { BoardTile } from '../../types/board';
import type { Player } from '../../types/player';

describe('BoardEngine Unit Tests', () => {
  describe('Dice Roll RNG (Uniform 1–6)', () => {
    it('should generate integers strictly between 1 and 6', () => {
      for (let i = 0; i < 500; i++) {
        const roll = BoardEngine.rollDice();
        expect(Number.isInteger(roll)).toBe(true);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      }
    });

    it('should exhibit uniform distribution across all 6 faces', () => {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const totalRolls = 6000;
      const expected = totalRolls / 6; // 1000

      for (let i = 0; i < totalRolls; i++) {
        const roll = BoardEngine.rollDice();
        counts[roll]++;
      }

      for (let face = 1; face <= 6; face++) {
        // Within 20% of expected (800 to 1200)
        expect(counts[face]).toBeGreaterThan(expected * 0.8);
        expect(counts[face]).toBeLessThan(expected * 1.2);
      }
    });

    it('should support instance method rollDice', () => {
      const engine = new BoardEngine();
      const roll = engine.rollDice();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    });
  });

  describe('Destination Calculation & Overshoot Bounce-Back', () => {
    const clasicaTiles = 45;
    const hotTiles = 40;

    it('should calculate direct linear destinations accurately', () => {
      expect(BoardEngine.calculateDestination(1, 1, clasicaTiles)).toBe(2);
      expect(BoardEngine.calculateDestination(1, 6, clasicaTiles)).toBe(7);
      expect(BoardEngine.calculateDestination(10, 5, clasicaTiles)).toBe(15);
      expect(BoardEngine.calculateDestination(35, 4, clasicaTiles)).toBe(39);
    });

    it('should reach exact finish tile without overshoot', () => {
      // Clásica: 45
      expect(BoardEngine.calculateDestination(44, 1, clasicaTiles)).toBe(45);
      expect(BoardEngine.calculateDestination(42, 3, clasicaTiles)).toBe(45);
      expect(BoardEngine.calculateDestination(39, 6, clasicaTiles)).toBe(45);

      // Hot: 40
      expect(BoardEngine.calculateDestination(39, 1, hotTiles)).toBe(40);
      expect(BoardEngine.calculateDestination(37, 3, hotTiles)).toBe(40);
      expect(BoardEngine.calculateDestination(34, 6, hotTiles)).toBe(40);
    });

    it('should calculate bounce-back destination on finish overshoot: maxTiles - (target - maxTiles)', () => {
      // Clásica: pos 43 + roll 5 = 48. Excess: 3. Destination: 45 - 3 = 42
      expect(BoardEngine.calculateDestination(43, 5, clasicaTiles)).toBe(42);

      // Clásica: pos 44 + roll 3 = 47. Excess: 2. Destination: 45 - 2 = 43
      expect(BoardEngine.calculateDestination(44, 3, clasicaTiles)).toBe(43);

      // Clásica: pos 44 + roll 6 = 50. Excess: 5. Destination: 45 - 5 = 40
      expect(BoardEngine.calculateDestination(44, 6, clasicaTiles)).toBe(40);

      // Hot: pos 38 + roll 5 = 43. Excess: 3. Destination: 40 - 3 = 37
      expect(BoardEngine.calculateDestination(38, 5, hotTiles)).toBe(37);

      // Hot: pos 39 + roll 6 = 45. Excess: 5. Destination: 40 - 5 = 35
      expect(BoardEngine.calculateDestination(39, 6, hotTiles)).toBe(35);
    });

    it('should clamp bounce-back destination to at least tile 1', () => {
      // Extreme hypothetical: small board of 3 tiles, at tile 3, roll 6 -> target 9, excess 6 -> 3 - 6 = -3 -> clamped to 1
      expect(BoardEngine.calculateDestination(3, 6, 3)).toBe(1);
    });

    it('isVictory should detect exact finish arrival', () => {
      expect(BoardEngine.isVictory(45, 45)).toBe(true);
      expect(BoardEngine.isVictory(44, 45)).toBe(false);
      expect(BoardEngine.isVictory(40, 40)).toBe(true);
      expect(BoardEngine.isVictory(39, 40)).toBe(false);
    });
  });

  describe('Special Tile Resolution (resolveTile)', () => {
    it('should resolve Oca/Jump tile with extra roll and forward jump', () => {
      const ocaTile: BoardTile = {
        id: 5,
        board_id: 'guatoca_clasica',
        tile_number: 5,
        tile_type: 'jump',
        title: 'De bar en bar',
        description: 'De bar en bar y tiro porque me da la gana',
        drinks_action: 0,
        target: 'active_player',
        action_jump_to: 9,
        turns_lost: 0,
        icon: 'beer',
      };

      const result = BoardEngine.resolveTile(ocaTile);
      expect(result.actionType).toBe('jump');
      expect(result.destination).toBe(9);
      expect(result.extraRoll).toBe(true);
      expect(result.turnsLost).toBe(0);
    });

    it('should resolve La Cárcel tile with turns lost and no extra roll', () => {
      const jailTile: BoardTile = {
        id: 10,
        board_id: 'guatoca_clasica',
        tile_number: 10,
        tile_type: 'trap_jail',
        title: 'La Cárcel',
        description: 'Quedas encerrado 2 turnos',
        drinks_action: 2,
        target: 'active_player',
        action_jump_to: null,
        turns_lost: 2,
        icon: 'lock',
      };

      const result = BoardEngine.resolveTile(jailTile);
      expect(result.actionType).toBe('trap_jail');
      expect(result.destination).toBe(10);
      expect(result.extraRoll).toBe(false);
      expect(result.turnsLost).toBe(2);
      expect(result.drinks).toBe(2);
    });

    it('should resolve La Muerte skull tile resetting pawn to tile 1 (Salida)', () => {
      const skullTile: BoardTile = {
        id: 37,
        board_id: 'guatoca_clasica',
        tile_number: 37,
        tile_type: 'trap_skull',
        title: 'La Muerte',
        description: 'Vuelve a la casilla 1',
        drinks_action: 3,
        target: 'active_player',
        action_jump_to: 1,
        turns_lost: 0,
        icon: 'skull',
      };

      const result = BoardEngine.resolveTile(skullTile);
      expect(result.actionType).toBe('trap_skull');
      expect(result.destination).toBe(1);
      expect(result.extraRoll).toBe(false);
      expect(result.drinks).toBe(3);
    });

    it('should resolve trap_back backward movement correctly', () => {
      const trapBackTile: BoardTile = {
        id: 17,
        board_id: 'guatoca_clasica',
        tile_number: 17,
        tile_type: 'trap_back',
        title: 'Resacón',
        description: 'Vuelve a la casilla 14',
        drinks_action: 1,
        target: 'active_player',
        action_jump_to: 14,
        turns_lost: 0,
        icon: 'rewind',
      };

      const result = BoardEngine.resolveTile(trapBackTile);
      expect(result.actionType).toBe('trap_back');
      expect(result.destination).toBe(14);
      expect(result.extraRoll).toBe(false);
    });

    it('should resolve finish tile correctly', () => {
      const finishTile: BoardTile = {
        id: 45,
        board_id: 'guatoca_clasica',
        tile_number: 45,
        tile_type: 'finish',
        title: 'Meta',
        description: '¡La Discoteca!',
        drinks_action: 0,
        target: 'all',
        action_jump_to: null,
        turns_lost: 0,
        icon: 'trophy',
      };

      const result = BoardEngine.resolveTile(finishTile);
      expect(result.actionType).toBe('finish');
      expect(result.destination).toBe(45);
      expect(result.extraRoll).toBe(false);
    });

    it('should resolve standard drink tile correctly', () => {
      const drinkTile: BoardTile = {
        id: 3,
        board_id: 'guatoca_clasica',
        tile_number: 3,
        tile_type: 'drink',
        title: 'Trago',
        description: 'Bebe 2 tragos',
        drinks_action: 2,
        target: 'active_player',
        action_jump_to: null,
        turns_lost: 0,
        icon: 'wine',
      };

      const result = BoardEngine.resolveTile(drinkTile);
      expect(result.actionType).toBe('drink');
      expect(result.destination).toBe(3);
      expect(result.drinks).toBe(2);
      expect(result.extraRoll).toBe(false);
    });
  });

  describe('Jail Turn Handler (handleJailTurn)', () => {
    it('should decrement jail turns and disallow roll when in jail', () => {
      const jailedPlayer: Player = { id: 'p1', name: 'Jailed', jailTurns: 2 };

      const turn1 = BoardEngine.handleJailTurn(jailedPlayer);
      expect(turn1.canRoll).toBe(false);
      expect(turn1.updatedJailTurns).toBe(1);

      jailedPlayer.jailTurns = turn1.updatedJailTurns;
      const turn2 = BoardEngine.handleJailTurn(jailedPlayer);
      expect(turn2.canRoll).toBe(false);
      expect(turn2.updatedJailTurns).toBe(0);

      jailedPlayer.jailTurns = turn2.updatedJailTurns;
      const turn3 = BoardEngine.handleJailTurn(jailedPlayer);
      expect(turn3.canRoll).toBe(true);
      expect(turn3.updatedJailTurns).toBe(0);
    });
  });
});
