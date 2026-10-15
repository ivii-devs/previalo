import { describe, it, expect } from 'vitest';
import { VariableReplacer } from '../VariableReplacer';
import type { Player } from '../../types/player';
import type { Card } from '../../types/card';

describe('VariableReplacer Unit Tests', () => {
  const testPlayers: Player[] = [
    { id: 'p1', name: 'Alba' },
    { id: 'p2', name: 'Bernat' },
    { id: 'p3', name: 'Clara' },
    { id: 'p4', name: 'David' },
  ];

  describe('Token Whitelist & Interpolation', () => {
    it('should interpolate {player1} token correctly', () => {
      const res = VariableReplacer.replaceTokens(
        '{player1} debe bailar',
        testPlayers,
        { intensity: 2 }
      );

      expect(res.assignedPlayers).toHaveLength(1);
      expect(testPlayers.map((p) => p.name)).toContain(res.assignedPlayers[0].name);
      expect(res.interpolatedText).toBe(`${res.assignedPlayers[0].name} debe bailar`);
    });

    it('should interpolate {team} token without unparsed placeholders', () => {
      const res1 = VariableReplacer.replaceTokens('El {team} elige reto', testPlayers, {
        intensity: 2,
        currentTurnIndex: 0,
      });
      const res2 = VariableReplacer.replaceTokens('El {team} elige reto', testPlayers, {
        intensity: 2,
        currentTurnIndex: 1,
      });

      expect(res1.interpolatedText).toContain('Equipo Neón');
      expect(res2.interpolatedText).toContain('Equipo Fuego');
      expect(res1.interpolatedText).not.toContain('{team}');
    });
  });

  describe('Strict Distinctness Guarantee', () => {
    it('should guarantee {player1} !== {player2}', () => {
      for (let i = 0; i < 50; i++) {
        const res = VariableReplacer.replaceTokens(
          '{player1} le da un beso a {player2}',
          testPlayers,
          { intensity: 2 }
        );

        expect(res.assignedPlayers).toHaveLength(2);
        const [p1, p2] = res.assignedPlayers;
        expect(p1.id).not.toBe(p2.id);
        expect(p1.name).not.toBe(p2.name);
        expect(res.interpolatedText).not.toContain('{player1}');
        expect(res.interpolatedText).not.toContain('{player2}');
      }
    });

    it('should guarantee {player1}, {player2}, and {player3} are all mutually distinct', () => {
      for (let i = 0; i < 50; i++) {
        const res = VariableReplacer.replaceTokens(
          '{player1}, {player2} y {player3} brindan juntos',
          testPlayers,
          { intensity: 2 }
        );

        expect(res.assignedPlayers).toHaveLength(3);
        const [p1, p2, p3] = res.assignedPlayers;
        const ids = new Set([p1.id, p2.id, p3.id]);
        expect(ids.size).toBe(3);
      }
    });

    it('should guarantee all 4 players are distinct when {player4} is present', () => {
      for (let i = 0; i < 50; i++) {
        const res = VariableReplacer.replaceTokens(
          '{player1}, {player2}, {player3} y {player4} compiten',
          testPlayers,
          { intensity: 2 }
        );

        expect(res.assignedPlayers).toHaveLength(4);
        const ids = new Set(res.assignedPlayers.map((p) => p.id));
        expect(ids.size).toBe(4);
      }
    });
  });

  describe('Dynamic Drinks Intensity Scaling', () => {
    it('Level 1 (Chill) should always return 1 trago', () => {
      expect(VariableReplacer.calculateDrinks(1)).toBe(1);
      expect(VariableReplacer.calculateDrinks(1, 5)).toBe(1);

      const res = VariableReplacer.replaceTokens('Bebe {drinks}', testPlayers, {
        intensity: 1,
        baseDrinks: 3,
      });
      expect(res.calculatedDrinks).toBe(1);
      expect(res.interpolatedText).toBe('Bebe 1 trago');
    });

    it('Level 2 (Fiesta) should scale between 1 and 2 tragos', () => {
      expect(VariableReplacer.calculateDrinks(2, 1)).toBe(1);
      expect(VariableReplacer.calculateDrinks(2, 2)).toBe(2);
      expect(VariableReplacer.calculateDrinks(2, 4)).toBe(2); // Clamped to 2

      const res = VariableReplacer.replaceTokens('Bebe {drinks}', testPlayers, {
        intensity: 2,
        baseDrinks: 2,
      });
      expect(res.calculatedDrinks).toBe(2);
      expect(res.interpolatedText).toBe('Bebe 2 tragos');
    });

    it('Level 3 (Hot) should scale between 2 and 3 tragos', () => {
      expect(VariableReplacer.calculateDrinks(3, 1)).toBe(2);
      expect(VariableReplacer.calculateDrinks(3, 2)).toBe(3);
      expect(VariableReplacer.calculateDrinks(3, 5)).toBe(3); // Clamped to 3

      const res = VariableReplacer.replaceTokens('Bebe {drinks}', testPlayers, {
        intensity: 3,
        baseDrinks: 1,
      });
      expect(res.calculatedDrinks).toBe(2);
      expect(res.interpolatedText).toBe('Bebe 2 tragos');
    });

    it('Level 4 (Extremo) should scale to 3–10 tragos', () => {
      expect(VariableReplacer.calculateDrinks(4, 1)).toBe(3);
      expect(VariableReplacer.calculateDrinks(4, 2)).toBe(4);
      expect(VariableReplacer.calculateDrinks(4, 5)).toBe(7);
      expect(VariableReplacer.calculateDrinks(4, 15)).toBe(10); // Capped at 10

      const res = VariableReplacer.replaceTokens('Bebe {drinks}', testPlayers, {
        intensity: 4,
        baseDrinks: 2,
      });
      expect(res.calculatedDrinks).toBeGreaterThanOrEqual(3);
      expect(res.interpolatedText).toContain('tragos');
    });
  });

  describe('Fairness Distribution (<= 15% deviation in 100 draws with 4 players)', () => {
    it('should balance player selection with <= 15% deviation over 100 draws', () => {
      const pickCounts = new Map<string, number>();
      const lastPicked = new Map<string, number>();
      testPlayers.forEach((p) => {
        pickCounts.set(p.id, 0);
        lastPicked.set(p.id, -1);
      });

      const totalDraws = 100;
      for (let turn = 0; turn < totalDraws; turn++) {
        const res = VariableReplacer.replaceTokens(
          '{player1} bebe {drinks}',
          testPlayers,
          {
            intensity: 2,
            turnHistory: pickCounts,
            lastPickedTurn: lastPicked,
            currentTurnIndex: turn,
          }
        );

        const pickedPlayer = res.assignedPlayers[0];
        pickCounts.set(pickedPlayer.id, (pickCounts.get(pickedPlayer.id) || 0) + 1);
        lastPicked.set(pickedPlayer.id, turn);
      }

      const expectedPerPlayer = totalDraws / testPlayers.length; // 25
      const maxAllowedDeviation = totalDraws * 0.15; // 15 picks

      for (const p of testPlayers) {
        const count = pickCounts.get(p.id) || 0;
        const deviation = Math.abs(count - expectedPerPlayer);
        expect(
          deviation,
          `Player ${p.name} was picked ${count} times (deviation: ${deviation}, max allowed: ${maxAllowedDeviation})`
        ).toBeLessThanOrEqual(maxAllowedDeviation);
      }
    });
  });

  describe('Player Count Guards', () => {
    it('isCardPlayable should enforce player limits', () => {
      const card2P: Card = { id: 1, type: 'rule', text: '{player1} reta a {player2}', intensity: 2 };
      const card3P: Card = { id: 2, type: 'rule', text: '{player1}, {player2} y {player3}', intensity: 2 };
      const card4P: Card = { id: 3, type: 'rule', text: '{player1}, {player2}, {player3} y {player4}', intensity: 2 };
      const warCard: Card = { id: 4, type: 'rule', text: 'Guerra', intensity: 2, mode_scope: 'teams_only' };

      // 1 player
      expect(VariableReplacer.isCardPlayable(card2P, 1)).toBe(false);
      // 2 players
      expect(VariableReplacer.isCardPlayable(card2P, 2)).toBe(true);
      expect(VariableReplacer.isCardPlayable(card3P, 2)).toBe(false);
      // 3 players
      expect(VariableReplacer.isCardPlayable(card3P, 3)).toBe(true);
      expect(VariableReplacer.isCardPlayable(card4P, 3)).toBe(false);
      // 4 players
      expect(VariableReplacer.isCardPlayable(card4P, 4)).toBe(true);
      expect(VariableReplacer.isCardPlayable(warCard, 4)).toBe(true);
      expect(VariableReplacer.isCardPlayable(warCard, 3)).toBe(false);
    });
  });
});
