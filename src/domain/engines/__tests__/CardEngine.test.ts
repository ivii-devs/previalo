import { describe, it, expect } from 'vitest';
import { CardEngine } from '../CardEngine';
import type { Card } from '../../types/card';
import type { Player } from '../../types/player';
import type { ActiveVirus } from '../../types/virus';
import type { HistorySnapshot } from '../../types/session';

describe('CardEngine Unit Tests', () => {
  describe('Fisher-Yates Shuffler', () => {
    it('should preserve all elements and length without loss or duplication', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = CardEngine.shuffle(original);

      expect(shuffled).toHaveLength(original.length);
      expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
    });

    it('should not mutate the original array (pure function)', () => {
      const original = Object.freeze([10, 20, 30, 40, 50]);
      const shuffled = CardEngine.shuffle(original);

      expect(shuffled).not.toBe(original);
      expect(original).toEqual([10, 20, 30, 40, 50]);
    });

    it('should handle edge cases: empty array and single element', () => {
      expect(CardEngine.shuffle([])).toEqual([]);
      expect(CardEngine.shuffle([42])).toEqual([42]);
    });

    it('should produce uniform distribution across all permutations (chi-square check)', () => {
      // 3 elements -> 6 permutations: 123, 132, 213, 231, 312, 321
      const permutations: Record<string, number> = {
        '1,2,3': 0,
        '1,3,2': 0,
        '2,1,3': 0,
        '2,3,1': 0,
        '3,1,2': 0,
        '3,2,1': 0,
      };

      const iterations = 6000;
      const expectedPerPermutation = iterations / 6; // 1000

      for (let i = 0; i < iterations; i++) {
        const result = CardEngine.shuffle([1, 2, 3]).join(',');
        permutations[result] = (permutations[result] || 0) + 1;
      }

      for (const [perm, count] of Object.entries(permutations)) {
        // Allow reasonable deviation for 1000 expected in 6000 trials (within 25%)
        expect(count, `Permutation ${perm} had unexpected count ${count}`).toBeGreaterThan(expectedPerPermutation * 0.75);
        expect(count, `Permutation ${perm} had unexpected count ${count}`).toBeLessThan(expectedPerPermutation * 1.25);
      }
    });

    it('should support instance method shuffle', () => {
      const engine = new CardEngine();
      const res = engine.shuffle([1, 2, 3]);
      expect(res).toHaveLength(3);
    });
  });

  describe('Mode Deck Builders', () => {
    const sampleCards: Card[] = [
      { id: 1, type: 'rule', text: 'Card 1', intensity: 1, pack_id: 'pack_a' },
      { id: 2, type: 'rule', text: 'Card 2', intensity: 2, pack_id: 'pack_a' },
      { id: 3, type: 'rule', text: 'Card 3', intensity: 2, pack_id: 'pack_b' },
      { id: 4, type: 'rule', text: 'Card 4', intensity: 3, pack_id: 'pack_b' },
      { id: 5, type: 'rule', text: 'Card 5', intensity: 3, pack_id: 'pack_c' },
      { id: 6, type: 'rule', text: 'Card 6', intensity: 4, pack_id: 'pack_c' },
    ];

    it('buildCategoryDeck should filter by intensity correctly', () => {
      const engine = new CardEngine();
      const deckIntensity2 = engine.buildCategoryDeck(sampleCards, { intensity: 2 });
      expect(deckIntensity2).toHaveLength(2);
      expect(deckIntensity2.every((c) => c.intensity === 2)).toBe(true);
    });

    it('buildCategoryDeck should filter by packIds correctly', () => {
      const engine = new CardEngine();
      const deckPackA = engine.buildCategoryDeck(sampleCards, { packIds: ['pack_a'] });
      expect(deckPackA).toHaveLength(2);
      expect(deckPackA.every((c) => c.pack_id === 'pack_a')).toBe(true);

      const deckPacksAB = engine.buildCategoryDeck(sampleCards, { packIds: ['pack_a', 'pack_b'] });
      expect(deckPacksAB).toHaveLength(4);
    });

    it('buildCategoryDeck should combine packIds and intensity filters', () => {
      const engine = new CardEngine();
      const filtered = engine.buildCategoryDeck(sampleCards, {
        intensity: 2,
        packIds: ['pack_a'],
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });

    it('buildPresetDeck should filter by intensity and preserve preset cards', () => {
      const engine = new CardEngine();
      const fullPreset = engine.buildPresetDeck(sampleCards);
      expect(fullPreset).toHaveLength(6);

      const intensity3 = engine.buildPresetDeck(sampleCards, { intensity: 3 });
      expect(intensity3).toHaveLength(2);
      expect(intensity3.every((c) => c.intensity === 3)).toBe(true);
    });

    it('buildChaosDeck should strictly exclude guerra_equipos category', () => {
      const engine = new CardEngine();
      const pools: Record<string, Card[]> = {
        yo_nunca: [
          { id: 'yn1', type: 'rule', text: 'YN 1', intensity: 2 },
          { id: 'yn2', type: 'rule', text: 'YN 2', intensity: 2 },
        ],
        guerra_equipos: [
          { id: 'war1', type: 'rule', text: 'War 1', intensity: 2 },
          { id: 'war2', type: 'rule', text: 'War 2', intensity: 2 },
        ],
      };

      const chaos = engine.buildChaosDeck(pools);
      expect(chaos.length).toBe(2);
      expect(chaos.some((c) => c.id === 'war1' || c.id === 'war2')).toBe(false);
    });

    it('buildChaosDeck should exclude cards flagged with exclude_from_chaos: true', () => {
      const engine = new CardEngine();
      const pools: Record<string, Card[]> = {
        confesiones: [
          { id: 'c1', type: 'rule', text: 'C 1', intensity: 2 },
          { id: 'c2', type: 'rule', text: 'C 2', intensity: 2, exclude_from_chaos: true },
        ],
      };

      const chaos = engine.buildChaosDeck(pools);
      expect(chaos).toHaveLength(1);
      expect(chaos[0].id).toBe('c1');
    });

    it('buildChaosDeck should enforce interleaving invariant: <= 3 consecutive cards of same category', () => {
      const engine = new CardEngine();
      const createPool = (catId: string, count: number): Card[] =>
        Array.from({ length: count }, (_, i) => ({
          id: `${catId}_${i}`,
          type: 'rule',
          text: `Text ${catId} ${i}`,
          intensity: 2,
          category_id: catId,
        }));

      const pools: Record<string, Card[]> = {
        yo_nunca: createPool('yo_nunca', 40),
        que_prefieres: createPool('que_prefieres', 40),
        retos_y_virus: createPool('retos_y_virus', 40),
        verdad_o_reto: createPool('verdad_o_reto', 40),
      };

      const chaos = engine.buildChaosDeck(pools);
      expect(chaos.length).toBeGreaterThanOrEqual(150);

      let consecutive = 1;
      let lastCat = chaos[0].category_id;

      for (let i = 1; i < chaos.length; i++) {
        const curCat = chaos[i].category_id;
        if (curCat === lastCat) {
          consecutive++;
          expect(consecutive, `Exceeded 3 consecutive on card ${i} for category ${curCat}`).toBeLessThanOrEqual(3);
        } else {
          consecutive = 1;
          lastCat = curCat;
        }
      }
    });

    it('buildChaosDeck should maintain invariant even with heavily skewed category counts', () => {
      const engine = new CardEngine();
      const createPool = (catId: string, count: number): Card[] =>
        Array.from({ length: count }, (_, i) => ({
          id: `${catId}_${i}`,
          type: 'rule',
          text: `Text ${catId} ${i}`,
          intensity: 2,
          category_id: catId,
        }));

      // Highly skewed: CatA has 30 cards, CatB has 5 cards, CatC has 5 cards
      const pools: Record<string, Card[]> = {
        cat_a: createPool('cat_a', 30),
        cat_b: createPool('cat_b', 5),
        cat_c: createPool('cat_c', 5),
      };

      const chaos = engine.buildChaosDeck(pools);
      let consecutive = 1;
      let lastCat = chaos[0].category_id;

      for (let i = 1; i < chaos.length; i++) {
        const curCat = chaos[i].category_id;
        if (curCat === lastCat) {
          consecutive++;
          expect(consecutive).toBeLessThanOrEqual(3);
        } else {
          consecutive = 1;
          lastCat = curCat;
        }
      }
    });
  });

  describe('Undo / History Stack Management', () => {
    it('should manage history push, pop, length and clear in LIFO order', () => {
      const engine = new CardEngine();
      expect(engine.canUndo()).toBe(false);
      expect(engine.popSnapshot()).toBeNull();

      const snap1: HistorySnapshot = {
        card: { id: 1, type: 'rule', text: 'Rule 1', intensity: 2 },
        rawText: 'Rule 1',
        interpolatedText: 'Rule 1',
        assignedPlayers: [],
        calculatedDrinks: 2,
        previousViruses: [],
        turnIndex: 0,
      };

      const snap2: HistorySnapshot = {
        card: { id: 2, type: 'rule', text: 'Rule 2', intensity: 2 },
        rawText: 'Rule 2',
        interpolatedText: 'Rule 2',
        assignedPlayers: [],
        calculatedDrinks: 1,
        previousViruses: [],
        turnIndex: 1,
      };

      engine.pushSnapshot(snap1);
      engine.pushSnapshot(snap2);

      expect(engine.canUndo()).toBe(true);
      expect(engine.getHistoryLength()).toBe(2);

      const popped2 = engine.popSnapshot();
      expect(popped2?.card.id).toBe(2);
      expect(engine.getHistoryLength()).toBe(1);

      const popped1 = engine.popSnapshot();
      expect(popped1?.card.id).toBe(1);
      expect(engine.canUndo()).toBe(false);

      engine.pushSnapshot(snap1);
      engine.clearHistory();
      expect(engine.canUndo()).toBe(false);
      expect(engine.getHistoryLength()).toBe(0);
    });

    it('restoreSnapshotState should revert awarded sips and restore prior virus state', () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', sips: 5, sipCount: 5 },
        { id: 'p2', name: 'Bob', sips: 3, sipCount: 3 },
      ];

      const previousViruses: ActiveVirus[] = [
        {
          id: 'v1',
          cardId: 101,
          ruleText: 'Mano izquierda',
          roundsRemaining: 3,
          totalRounds: 3,
        },
      ];

      const snapshot: HistorySnapshot = {
        card: { id: 200, type: 'rule', text: 'Alice bebe 2 tragos', intensity: 2 },
        rawText: '{player1} bebe 2 tragos',
        interpolatedText: 'Alice bebe 2 tragos',
        assignedPlayers: [players[0]],
        calculatedDrinks: 2,
        sipsAwarded: new Map([['p1', 2]]),
        previousViruses,
        turnIndex: 4,
      };

      const restored = CardEngine.restoreSnapshotState(snapshot, players);

      expect(restored.restoredCard.id).toBe(200);
      expect(restored.restoredViruses).toEqual(previousViruses);
      // Alice's sips should be reduced by 2 (from 5 to 3)
      const p1 = restored.restoredPlayers.find((p) => p.id === 'p1');
      expect(p1?.sips).toBe(3);
      expect(p1?.sipCount).toBe(3);
      // Bob's sips should remain untouched
      const p2 = restored.restoredPlayers.find((p) => p.id === 'p2');
      expect(p2?.sips).toBe(3);
    });
  });
});
