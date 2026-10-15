import { describe, it, expect } from 'vitest';
import { VirusManager } from '../VirusManager';
import type { Card } from '../../types/card';
import type { Player } from '../../types/player';
import type { ActiveVirus } from '../../types/virus';

describe('VirusManager Unit Tests', () => {
  const targetPlayer: Player = { id: 'p_101', name: 'Laura' };

  describe('Virus Creation & Duration', () => {
    it('should create an ActiveVirus using card.duration_rounds when present', () => {
      const card: Card = {
        id: 'v_custom',
        type: 'virus',
        text: 'Regla del guiño para {player1}',
        intensity: 2,
        duration_rounds: 5,
      };

      const virus = VirusManager.createVirus(card, targetPlayer);

      expect(virus.id).toBeDefined();
      expect(typeof virus.id).toBe('string');
      expect(virus.cardId).toBe('v_custom');
      expect(virus.ruleText).toBe('Regla del guiño para {player1}');
      expect(virus.targetPlayerId).toBe('p_101');
      expect(virus.targetPlayerName).toBe('Laura');
      expect(virus.roundsRemaining).toBe(5);
      expect(virus.totalRounds).toBe(5);
    });

    it('should create an ActiveVirus using chain.min_delay_cards when present', () => {
      const card: Card = {
        id: 7001,
        type: 'virus',
        text: 'Prohibido cruzar los brazos',
        intensity: 2,
        chain: {
          chain_id: 'no_arms',
          chain_type: 'timed_virus',
          role: 'trigger',
          min_delay_cards: 4,
          max_delay_cards: 6,
        },
      };

      const virus = VirusManager.createVirus(card);

      expect(virus.cardId).toBe(7001);
      expect(virus.roundsRemaining).toBe(4);
      expect(virus.totalRounds).toBe(4);
      expect(virus.targetPlayerId).toBeUndefined();
    });

    it('should fall back to default duration of 3 rounds when no duration specified', () => {
      const card: Card = {
        id: 7002,
        type: 'virus',
        text: 'Prohibido decir "sí"',
        intensity: 2,
      };

      const virus = VirusManager.createVirus(card);
      expect(virus.roundsRemaining).toBe(3);
      expect(virus.totalRounds).toBe(3);
    });

    it('should generate unique IDs for each created virus instance', () => {
      const card: Card = { id: 1, type: 'virus', text: 'V', intensity: 2 };
      const v1 = VirusManager.createVirus(card);
      const v2 = VirusManager.createVirus(card);

      expect(v1.id).not.toBe(v2.id);
    });

    it('should detect virus cards correctly with isVirusCard', () => {
      const vCard1: Card = { id: 1, type: 'virus', text: 'V1', intensity: 2 };
      const vCard2: Card = {
        id: 2,
        type: 'rule',
        text: 'V2',
        intensity: 2,
        chain: { chain_id: 'c', chain_type: 'timed_virus', role: 'trigger' },
      };
      const normalCard: Card = { id: 3, type: 'rule', text: 'N', intensity: 2 };

      expect(VirusManager.isVirusCard(vCard1)).toBe(true);
      expect(VirusManager.isVirusCard(vCard2)).toBe(true);
      expect(VirusManager.isVirusCard(normalCard)).toBe(false);
    });
  });

  describe('Countdown Ticking & Expiration', () => {
    it('should decrement roundsRemaining on tickRound without expiring if roundsRemaining > 1', () => {
      const initial: ActiveVirus[] = [
        {
          id: 'v_1',
          cardId: 10,
          ruleText: 'Rule 1',
          roundsRemaining: 3,
          totalRounds: 3,
        },
      ];

      const { updatedViruses, expiredViruses } = VirusManager.tickRound(initial);

      expect(updatedViruses).toHaveLength(1);
      expect(updatedViruses[0].roundsRemaining).toBe(2);
      expect(expiredViruses).toHaveLength(0);
    });

    it('should move virus to expiredViruses when roundsRemaining reaches 0', () => {
      const initial: ActiveVirus[] = [
        {
          id: 'v_exp',
          cardId: 20,
          ruleText: 'Rule expiring',
          roundsRemaining: 1,
          totalRounds: 3,
        },
      ];

      const { updatedViruses, expiredViruses } = VirusManager.tickRound(initial);

      expect(updatedViruses).toHaveLength(0);
      expect(expiredViruses).toHaveLength(1);
      expect(expiredViruses[0].id).toBe('v_exp');
      expect(expiredViruses[0].roundsRemaining).toBe(0);
    });

    it('should handle simultaneous expiration of multiple viruses', () => {
      const initial: ActiveVirus[] = [
        { id: 'v_a', cardId: 1, ruleText: 'A', roundsRemaining: 1, totalRounds: 2 },
        { id: 'v_b', cardId: 2, ruleText: 'B', roundsRemaining: 1, totalRounds: 4 },
        { id: 'v_c', cardId: 3, ruleText: 'C', roundsRemaining: 3, totalRounds: 3 },
      ];

      const { updatedViruses, expiredViruses } = VirusManager.tickRound(initial);

      expect(expiredViruses).toHaveLength(2);
      expect(expiredViruses.map((v) => v.id).sort()).toEqual(['v_a', 'v_b']);
      expect(updatedViruses).toHaveLength(1);
      expect(updatedViruses[0].id).toBe('v_c');
      expect(updatedViruses[0].roundsRemaining).toBe(2);
    });

    it('should handle empty virus list gracefully', () => {
      const res = VirusManager.tickRound([]);
      expect(res.updatedViruses).toEqual([]);
      expect(res.expiredViruses).toEqual([]);
    });

    it('should support instance methods createVirus and tick (PROJECT.md compatibility)', () => {
      const manager = new VirusManager();
      const card: Card = { id: 'inst', type: 'virus', text: 'Text', intensity: 2 };
      const v = manager.createVirus(card);
      expect(v.id).toBeDefined();

      const res = manager.tick([v]);
      expect(res.updatedViruses).toHaveLength(1);
      expect(res.updatedViruses[0].roundsRemaining).toBe(2);
    });
  });
});
