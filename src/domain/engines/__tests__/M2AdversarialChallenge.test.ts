/**
 * Previalo Domain Layer: Milestone 2 Adversarial Challenge Suite
 * Standalone empirical test harness challenging CardEngine and VariableReplacer
 * with stress testing, statistical distribution analysis, and boundary validation.
 */

import { describe, it, expect } from 'vitest';
import { CardEngine } from '../CardEngine';
import { VariableReplacer } from '../VariableReplacer';
import type { Card, IntensityLevel } from '../../types/card';
import type { Player } from '../../types/player';
import type { HistorySnapshot } from '../../types/session';
import type { ActiveVirus } from '../../types/virus';

describe('Milestone 2 Adversarial Challenge Suite', () => {
  // =========================================================================
  // CHALLENGE 1: CardEngine - Fisher-Yates Permutation Uniformity & Bias Check
  // =========================================================================
  describe('Challenge 1.1: Fisher-Yates Permutation Distribution & Bias', () => {
    it('empirical chi-squared test on 3 elements across 60,000 iterations (p < 0.001 critical threshold)', () => {
      const items = [1, 2, 3];
      const permutations: Record<string, number> = {
        '1,2,3': 0,
        '1,3,2': 0,
        '2,1,3': 0,
        '2,3,1': 0,
        '3,1,2': 0,
        '3,2,1': 0,
      };

      const iterations = 60000;
      const k = 6; // 3! permutations
      const expected = iterations / k; // 10,000 per permutation

      for (let i = 0; i < iterations; i++) {
        const shuffled = CardEngine.shuffle(items);
        const key = shuffled.join(',');
        permutations[key] = (permutations[key] ?? 0) + 1;
      }

      // Calculate Pearson Chi-Square statistic: sum((O - E)^2 / E)
      let chiSquare = 0;
      let maxDeviation = 0;

      for (const [perm, observed] of Object.entries(permutations)) {
        const diff = Math.abs(observed - expected);
        if (diff > maxDeviation) {
          maxDeviation = diff;
        }
        chiSquare += ((observed - expected) ** 2) / expected;

        // Verify each permutation count is within 5% of theoretical expectation
        const deviationPct = (diff / expected) * 100;
        expect(
          deviationPct,
          `Permutation ${perm} deviated by ${deviationPct.toFixed(2)}% (Observed: ${observed}, Expected: ${expected})`
        ).toBeLessThan(5.0);
      }

      // Degrees of freedom = 5. Critical value for alpha = 0.001 is 20.515
      // An unbiased uniform shuffle must stay well below the critical chi-square value
      expect(
        chiSquare,
        `Chi-square statistic ${chiSquare.toFixed(2)} exceeds critical value 20.515`
      ).toBeLessThan(20.515);

      console.log(
        `[Fisher-Yates 3-item] Iterations: ${iterations}, Chi-Square: ${chiSquare.toFixed(
          3
        )}, Max Deviation: ${maxDeviation} (${((maxDeviation / expected) * 100).toFixed(2)}%)`
      );
    });

    it('empirical distribution across 24 permutations on 4 elements across 24,000 iterations', () => {
      const items = [1, 2, 3, 4];
      const permutations: Record<string, number> = {};
      const iterations = 24000;
      const expected = iterations / 24; // 1,000 per permutation

      for (let i = 0; i < iterations; i++) {
        const shuffled = CardEngine.shuffle(items);
        const key = shuffled.join(',');
        permutations[key] = (permutations[key] ?? 0) + 1;
      }

      // Verify all 24 permutations occurred
      expect(Object.keys(permutations)).toHaveLength(24);

      let chiSquare = 0;
      for (const observed of Object.values(permutations)) {
        chiSquare += ((observed - expected) ** 2) / expected;
        // Verify reasonable bound for 1,000 expected (within 15%)
        expect(observed).toBeGreaterThanOrEqual(850);
        expect(observed).toBeLessThanOrEqual(1150);
      }

      // Degrees of freedom = 23. Critical value for alpha = 0.001 is 49.728
      expect(chiSquare).toBeLessThan(49.728);

      console.log(
        `[Fisher-Yates 4-item] 24 permutations observed. Chi-Square: ${chiSquare.toFixed(
          3
        )} (Critical df=23: 49.728)`
      );
    });

    it('strict immutability and preservation under 10,000-element stress array', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const frozenOriginal = Object.freeze([...largeArray]);

      const shuffled = CardEngine.shuffle(frozenOriginal);

      expect(shuffled).toHaveLength(10000);
      expect(shuffled).not.toBe(frozenOriginal);
      // Sort and verify 100% preservation of all elements
      const sorted = [...shuffled].sort((a, b) => a - b);
      expect(sorted).toEqual(largeArray);
    });
  });

  // =========================================================================
  // CHALLENGE 1.2: CardEngine - Chaos Deck Interleaving Stress Test
  // =========================================================================
  describe('Challenge 1.2: Chaos Deck Interleaving Stress Test', () => {
    const makePool = (catId: string, count: number): Card[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `${catId}_${i}`,
        type: 'rule',
        text: `Text for ${catId} #${i}`,
        intensity: 2,
        category_id: catId,
      }));

    it('large collection stress test (9 categories x 500 cards = 4,500 cards): 0 instances of > 3 consecutive', () => {
      const engine = new CardEngine();
      const categories = [
        'yo_nunca',
        'que_prefieres',
        'verdad_o_reto',
        'retos_y_virus',
        'confesiones',
        'quien_es_mas_probable',
        'cultura_chupistica',
        'mimica',
        'trivia',
      ];

      const pools: Record<string, Card[]> = {};
      for (const cat of categories) {
        pools[cat] = makePool(cat, 500);
      }

      const chaos = engine.buildChaosDeck(pools);
      expect(chaos.length).toBeGreaterThan(4000);

      let consecutiveCount = 1;
      let lastCat = chaos[0].category_id;
      let maxConsecutiveObserved = 1;
      let violations = 0;

      for (let i = 1; i < chaos.length; i++) {
        const curCat = chaos[i].category_id;
        if (curCat === lastCat) {
          consecutiveCount++;
          if (consecutiveCount > maxConsecutiveObserved) {
            maxConsecutiveObserved = consecutiveCount;
          }
          if (consecutiveCount > 3) {
            violations++;
          }
        } else {
          consecutiveCount = 1;
          lastCat = curCat;
        }
      }

      console.log(
        `[Chaos Deck Large] Total Cards: ${chaos.length}, Max Consecutive: ${maxConsecutiveObserved}, Violations: ${violations}`
      );
      expect(violations).toBe(0);
      expect(maxConsecutiveObserved).toBeLessThanOrEqual(3);
    });

    it('adversarial skewed distribution (CatA=2,000 cards, CatB=20 cards, CatC=20 cards): strictly upholds <= 3 invariant', () => {
      const engine = new CardEngine();
      const pools: Record<string, Card[]> = {
        massive_a: makePool('massive_a', 2000),
        tiny_b: makePool('tiny_b', 20),
        tiny_c: makePool('tiny_c', 20),
      };

      const chaos = engine.buildChaosDeck(pools);
      let consecutiveCount = 1;
      let lastCat = chaos[0]?.category_id;
      let maxConsecutiveObserved = 1;
      let violations = 0;

      for (let i = 1; i < chaos.length; i++) {
        const curCat = chaos[i].category_id;
        if (curCat === lastCat) {
          consecutiveCount++;
          if (consecutiveCount > maxConsecutiveObserved) {
            maxConsecutiveObserved = consecutiveCount;
          }
          if (consecutiveCount > 3) {
            violations++;
          }
        } else {
          consecutiveCount = 1;
          lastCat = curCat;
        }
      }

      console.log(
        `[Chaos Deck Skewed] Deck Size: ${chaos.length}, Max Consecutive: ${maxConsecutiveObserved}, Violations: ${violations}`
      );
      expect(violations).toBe(0);
      expect(maxConsecutiveObserved).toBeLessThanOrEqual(3);
    });

    it('multi-trial randomized stress test (50 trials): verify 0 instances of > 3 consecutive and strict category exclusions', () => {
      const engine = new CardEngine();
      let totalViolations = 0;
      let totalGuerraCards = 0;
      let totalExcludedCards = 0;

      for (let trial = 0; trial < 50; trial++) {
        const pools: Record<string, Card[]> = {
          cat_1: makePool('cat_1', 30 + Math.floor(Math.random() * 50)),
          cat_2: makePool('cat_2', 30 + Math.floor(Math.random() * 50)),
          cat_3: makePool('cat_3', 30 + Math.floor(Math.random() * 50)),
          cat_4: makePool('cat_4', 30 + Math.floor(Math.random() * 50)),
          guerra_equipos: makePool('guerra_equipos', 50),
          excluded_sample: [
            { id: `ex_${trial}`, type: 'rule', text: 'Excluded', intensity: 2, exclude_from_chaos: true },
          ],
        };

        const deck = engine.buildChaosDeck(pools);
        let run = 1;
        let last = deck[0]?.category_id;

        for (let i = 1; i < deck.length; i++) {
          const cur = deck[i].category_id;
          if (cur === last) {
            run++;
            if (run > 3) totalViolations++;
          } else {
            run = 1;
            last = cur;
          }

          if (cur === 'guerra_equipos') totalGuerraCards++;
          if (deck[i].exclude_from_chaos) totalExcludedCards++;
        }
      }

      expect(totalViolations).toBe(0);
      expect(totalGuerraCards).toBe(0);
      expect(totalExcludedCards).toBe(0);
      console.log(
        `[Chaos Deck 50 Trials] 0 consecutive violations, 0 guerra_equipos cards, 0 exclude_from_chaos cards.`
      );
    });

    it('single category edge case clamps to at most 3 cards to protect invariant', () => {
      const engine = new CardEngine();
      const pools = {
        lonely_cat: makePool('lonely_cat', 100),
      };

      const deck = engine.buildChaosDeck(pools);
      expect(deck.length).toBeLessThanOrEqual(3);
      console.log(`[Chaos Deck Single Category] 100 cards provided -> yielded ${deck.length} cards (<= 3 clamp).`);
    });
  });

  // =========================================================================
  // CHALLENGE 1.3: CardEngine - Undo / History Stack Multi-State Stress Test
  // =========================================================================
  describe('Challenge 1.3: Undo/History Stack Stress Test', () => {
    it('push and pop 50 distinct states, verifying exact LIFO restoration', () => {
      const engine = new CardEngine();
      const createdSnapshots: HistorySnapshot[] = [];

      for (let i = 0; i < 50; i++) {
        const snap: HistorySnapshot = {
          card: {
            id: `card_${i}`,
            type: 'rule',
            text: `Card Text ${i}`,
            intensity: (1 + (i % 4)) as IntensityLevel,
          },
          rawText: `{player1} bebe ${i} tragos`,
          interpolatedText: `Player_${i} bebe ${i} tragos`,
          assignedPlayers: [{ id: `p_${i % 4}`, name: `Player_${i % 4}` }],
          calculatedDrinks: i % 5,
          sipsAwarded: new Map([[`p_${i % 4}`, i % 5]]),
          previousViruses: [
            {
              id: `v_${i}`,
              cardId: `c_${i}`,
              ruleText: `Virus rule ${i}`,
              roundsRemaining: (i % 3) + 1,
              totalRounds: 3,
            },
          ],
          turnIndex: i,
        };
        createdSnapshots.push(snap);
        engine.pushSnapshot(snap);
      }

      expect(engine.getHistoryLength()).toBe(50);
      expect(engine.canUndo()).toBe(true);

      // Pop all in reverse order and verify strict equality
      for (let i = 49; i >= 0; i--) {
        const popped = engine.popSnapshot();
        expect(popped).not.toBeNull();
        expect(popped?.card.id).toBe(`card_${i}`);
        expect(popped?.turnIndex).toBe(i);
        expect(popped?.calculatedDrinks).toBe(i % 5);
        expect(popped?.previousViruses[0].id).toBe(`v_${i}`);
      }

      expect(engine.getHistoryLength()).toBe(0);
      expect(engine.canUndo()).toBe(false);
      expect(engine.popSnapshot()).toBeNull();
    });

    it('exact multi-player sip deduction and virus restoration across multiple state rewinds', () => {
      const players: Player[] = [
        { id: 'p1', name: 'Ana', sips: 12, sipCount: 12 },
        { id: 'p2', name: 'Bob', sips: 8, sipCount: 8 },
        { id: 'p3', name: 'Cami', sips: 15, sipCount: 15 },
        { id: 'p4', name: 'Dani', sips: 4, sipCount: 4 },
      ];

      const previousViruses: ActiveVirus[] = [
        { id: 'vir_1', cardId: 101, ruleText: 'Rule A', roundsRemaining: 2, totalRounds: 3 },
        { id: 'vir_2', cardId: 102, ruleText: 'Rule B', roundsRemaining: 1, totalRounds: 2 },
      ];

      // Snapshot where Ana was awarded 3 sips, and Bob was awarded 2 sips
      const snapshot: HistorySnapshot = {
        card: { id: 999, type: 'rule', text: 'Snapshot card', intensity: 2 },
        rawText: 'Raw',
        interpolatedText: 'Interpolated',
        assignedPlayers: [players[0], players[1]],
        calculatedDrinks: 3,
        sipsAwarded: { p1: 3, p2: 2 }, // Testing Record format
        previousViruses,
        turnIndex: 10,
      };

      const restored = CardEngine.restoreSnapshotState(snapshot, players);

      // Ana: 12 - 3 = 9
      const ana = restored.restoredPlayers.find((p) => p.id === 'p1');
      expect(ana?.sips).toBe(9);
      expect(ana?.sipCount).toBe(9);

      // Bob: 8 - 2 = 6
      const bob = restored.restoredPlayers.find((p) => p.id === 'p2');
      expect(bob?.sips).toBe(6);
      expect(bob?.sipCount).toBe(6);

      // Cami & Dani: unchanged
      const cami = restored.restoredPlayers.find((p) => p.id === 'p3');
      expect(cami?.sips).toBe(15);
      const dani = restored.restoredPlayers.find((p) => p.id === 'p4');
      expect(dani?.sips).toBe(4);

      // Viruses restored
      expect(restored.restoredViruses).toEqual(previousViruses);
    });

    it('sip floor at 0 prevents negative sips on undo', () => {
      const players: Player[] = [{ id: 'p1', name: 'Ana', sips: 1, sipCount: 1 }];
      const snapshot: HistorySnapshot = {
        card: { id: 1, type: 'rule', text: 'Text', intensity: 1 },
        rawText: 'Raw',
        interpolatedText: 'Interpolated',
        assignedPlayers: [players[0]],
        calculatedDrinks: 5,
        sipsAwarded: new Map([['p1', 5]]),
        previousViruses: [],
        turnIndex: 1,
      };

      const restored = CardEngine.restoreSnapshotState(snapshot, players);
      expect(restored.restoredPlayers[0].sips).toBe(0);
      expect(restored.restoredPlayers[0].sipCount).toBe(0);
    });
  });

  // =========================================================================
  // CHALLENGE 2.1: VariableReplacer - Fairness Test Across 500 Draws (4 Players)
  // =========================================================================
  describe('Challenge 2.1: VariableReplacer Fairness Across 500 Draws', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Ana' },
      { id: 'p2', name: 'Bernat' },
      { id: 'p3', name: 'Clara' },
      { id: 'p4', name: 'David' },
    ];

    it('500 draws with 4 players: deviation <= 15% from uniform expectation (125 picks)', () => {
      const pickCounts = new Map<string, number>();
      const lastPicked = new Map<string, number>();
      players.forEach((p) => {
        pickCounts.set(p.id, 0);
        lastPicked.set(p.id, -1);
      });

      const totalDraws = 500;
      const expected = totalDraws / players.length; // 125

      for (let turn = 0; turn < totalDraws; turn++) {
        const res = VariableReplacer.replaceTokens('{player1} bebe {drinks}', players, {
          intensity: 2,
          turnHistory: pickCounts,
          lastPickedTurn: lastPicked,
          currentTurnIndex: turn,
        });

        const picked = res.assignedPlayers[0];
        pickCounts.set(picked.id, (pickCounts.get(picked.id) ?? 0) + 1);
        lastPicked.set(picked.id, turn);
      }

      // Check max deviation for each player
      let maxAbsDeviation = 0;
      let maxPctDeviation = 0;

      for (const p of players) {
        const count = pickCounts.get(p.id) ?? 0;
        const absDiff = Math.abs(count - expected);
        const pctDiff = (absDiff / expected) * 100;

        if (absDiff > maxAbsDeviation) maxAbsDeviation = absDiff;
        if (pctDiff > maxPctDeviation) maxPctDeviation = pctDiff;

        console.log(
          `[Fairness 500] Player ${p.name}: ${count} picks (Deviation: ${absDiff}, ${pctDiff.toFixed(2)}%)`
        );

        // Strict requirement: <= 15% deviation from theoretical expectation (125 * 0.15 = 18.75)
        expect(
          pctDiff,
          `Player ${p.name} had deviation of ${pctDiff.toFixed(2)}% exceeding 15% limit`
        ).toBeLessThanOrEqual(15.0);
      }

      console.log(
        `[Fairness 500 Summary] Expected: ${expected}, Max Absolute Deviation: ${maxAbsDeviation}, Max % Deviation: ${maxPctDeviation.toFixed(
          2
        )}%`
      );
    });

    it('monte carlo test across 20 independent trials of 500 draws: all trials maintain <= 15% deviation', () => {
      const expected = 125;
      let highestDeviationObserved = 0;

      for (let trial = 0; trial < 20; trial++) {
        const pickCounts = new Map<string, number>();
        const lastPicked = new Map<string, number>();
        players.forEach((p) => {
          pickCounts.set(p.id, 0);
          lastPicked.set(p.id, -1);
        });

        for (let turn = 0; turn < 500; turn++) {
          const res = VariableReplacer.replaceTokens('{player1} realiza el reto', players, {
            intensity: 2,
            turnHistory: pickCounts,
            lastPickedTurn: lastPicked,
            currentTurnIndex: turn,
          });

          const picked = res.assignedPlayers[0];
          pickCounts.set(picked.id, (pickCounts.get(picked.id) ?? 0) + 1);
          lastPicked.set(picked.id, turn);
        }

        for (const p of players) {
          const count = pickCounts.get(p.id) ?? 0;
          const pctDiff = (Math.abs(count - expected) / expected) * 100;
          if (pctDiff > highestDeviationObserved) {
            highestDeviationObserved = pctDiff;
          }
          expect(pctDiff).toBeLessThanOrEqual(15.0);
        }
      }

      console.log(
        `[Fairness 20 Trials x 500 Draws] Peak deviation observed across all 20 trials: ${highestDeviationObserved.toFixed(
          2
        )}% (Threshold: 15.0%)`
      );
    });
  });

  // =========================================================================
  // CHALLENGE 2.2: VariableReplacer - Strict Distinctness Challenge
  // =========================================================================
  describe('Challenge 2.2: Strict Distinctness Challenge', () => {
    const allPlayers: Player[] = [
      { id: 'p1', name: 'Ana' },
      { id: 'p2', name: 'Bernat' },
      { id: 'p3', name: 'Clara' },
      { id: 'p4', name: 'David' },
    ];

    it('2 players: cards with {player1} and {player2} guarantee 0 duplicates across 1,000 draws', () => {
      const twoPlayers = allPlayers.slice(0, 2);
      const text = '{player1} y {player2} compiten';

      for (let i = 0; i < 1000; i++) {
        const res = VariableReplacer.replaceTokens(text, twoPlayers, { intensity: 2 });
        expect(res.assignedPlayers).toHaveLength(2);
        const [p1, p2] = res.assignedPlayers;
        expect(p1.id).not.toBe(p2.id);
        expect(p1.name).not.toBe(p2.name);
      }
    });

    it('3 players: cards with {player1}, {player2}, and {player3} guarantee 0 duplicates across 1,000 draws', () => {
      const threePlayers = allPlayers.slice(0, 3);
      const text = '{player1}, {player2} y {player3} beben juntos';

      for (let i = 0; i < 1000; i++) {
        const res = VariableReplacer.replaceTokens(text, threePlayers, { intensity: 2 });
        expect(res.assignedPlayers).toHaveLength(3);
        const ids = new Set(res.assignedPlayers.map((p) => p.id));
        expect(ids.size).toBe(3);
      }
    });

    it('4 players: cards with {player1}, {player2}, {player3}, and {player4} guarantee 0 duplicates across 1,000 draws', () => {
      const text = '{player1}, {player2}, {player3} y {player4} brindan';

      for (let i = 0; i < 1000; i++) {
        const res = VariableReplacer.replaceTokens(text, allPlayers, { intensity: 2 });
        expect(res.assignedPlayers).toHaveLength(4);
        const ids = new Set(res.assignedPlayers.map((p) => p.id));
        expect(ids.size).toBe(4);
      }
    });

    it('player count guards: isCardPlayable correctly blocks unplayable cards before draw', () => {
      const card2P: Card = { id: 1, type: 'rule', text: '{player1} y {player2}', intensity: 2 };
      const card3P: Card = { id: 2, type: 'rule', text: '{player1}, {player2} y {player3}', intensity: 2 };
      const card4P: Card = { id: 3, type: 'rule', text: '{player1}, {player2}, {player3} y {player4}', intensity: 2 };
      const cardTeams: Card = { id: 4, type: 'rule', text: 'Guerra', intensity: 2, mode_scope: 'teams_only' };

      // 1 player
      expect(VariableReplacer.isCardPlayable(card2P, 1)).toBe(false);
      // 2 players
      expect(VariableReplacer.isCardPlayable(card2P, 2)).toBe(true);
      expect(VariableReplacer.isCardPlayable(card3P, 2)).toBe(false);
      expect(VariableReplacer.isCardPlayable(card4P, 2)).toBe(false);
      expect(VariableReplacer.isCardPlayable(cardTeams, 2)).toBe(false);

      // 3 players
      expect(VariableReplacer.isCardPlayable(card3P, 3)).toBe(true);
      expect(VariableReplacer.isCardPlayable(card4P, 3)).toBe(false);
      expect(VariableReplacer.isCardPlayable(cardTeams, 3)).toBe(false);

      // 4 players
      expect(VariableReplacer.isCardPlayable(card4P, 4)).toBe(true);
      expect(VariableReplacer.isCardPlayable(cardTeams, 4)).toBe(true);
    });

    it('graceful fallback when tokens exceed player count without crashing or leaving unresolved tokens', () => {
      const twoPlayers = allPlayers.slice(0, 2);
      // Adversarial test: forcing a 4-player card on a 2-player game
      const res = VariableReplacer.replaceTokens(
        '{player1}, {player2}, {player3} y {player4}',
        twoPlayers,
        { intensity: 2 }
      );

      // Must not contain unresolved brackets
      expect(res.interpolatedText).not.toContain('{player1}');
      expect(res.interpolatedText).not.toContain('{player2}');
      expect(res.interpolatedText).not.toContain('{player3}');
      expect(res.interpolatedText).not.toContain('{player4}');
      expect(res.assignedPlayers).toHaveLength(4);
    });
  });

  // =========================================================================
  // CHALLENGE 2.3: VariableReplacer - Dynamic Drink Scaling Across All Intensities
  // =========================================================================
  describe('Challenge 2.3: Dynamic Drink Scaling for all 4 Intensities', () => {
    it('Intensity 1 (Chill): strictly returns 1 trago regardless of baseDrinks', () => {
      const testBases = [undefined, 0, 1, 2, 3, 5, 10, 99];
      for (const b of testBases) {
        expect(VariableReplacer.calculateDrinks(1, b)).toBe(1);
      }

      const res = VariableReplacer.replaceTokens('Bebe {drinks}', [{ id: '1', name: 'Ana' }], {
        intensity: 1,
        baseDrinks: 5,
      });
      expect(res.calculatedDrinks).toBe(1);
      expect(res.interpolatedText).toBe('Bebe 1 trago');
    });

    it('Intensity 2 (Fiesta): scales within [1, 2] tragos', () => {
      expect(VariableReplacer.calculateDrinks(2, undefined)).toBe(1);
      expect(VariableReplacer.calculateDrinks(2, 0)).toBe(1);
      expect(VariableReplacer.calculateDrinks(2, 1)).toBe(1);
      expect(VariableReplacer.calculateDrinks(2, 2)).toBe(2);
      expect(VariableReplacer.calculateDrinks(2, 3)).toBe(2); // clamped
      expect(VariableReplacer.calculateDrinks(2, 10)).toBe(2); // clamped

      const res1 = VariableReplacer.replaceTokens('{drinks}', [{ id: '1', name: 'Ana' }], {
        intensity: 2,
        baseDrinks: 1,
      });
      expect(res1.interpolatedText).toBe('1 trago');

      const res2 = VariableReplacer.replaceTokens('{drinks}', [{ id: '1', name: 'Ana' }], {
        intensity: 2,
        baseDrinks: 2,
      });
      expect(res2.interpolatedText).toBe('2 tragos');
    });

    it('Intensity 3 (Hot): scales within [2, 3] tragos', () => {
      expect(VariableReplacer.calculateDrinks(3, undefined)).toBe(2);
      expect(VariableReplacer.calculateDrinks(3, 0)).toBe(2);
      expect(VariableReplacer.calculateDrinks(3, 1)).toBe(2);
      expect(VariableReplacer.calculateDrinks(3, 2)).toBe(3);
      expect(VariableReplacer.calculateDrinks(3, 5)).toBe(3); // clamped
      expect(VariableReplacer.calculateDrinks(3, 20)).toBe(3); // clamped

      const res1 = VariableReplacer.replaceTokens('{drinks}', [{ id: '1', name: 'Ana' }], {
        intensity: 3,
        baseDrinks: 1,
      });
      expect(res1.interpolatedText).toBe('2 tragos');

      const res2 = VariableReplacer.replaceTokens('{drinks}', [{ id: '1', name: 'Ana' }], {
        intensity: 3,
        baseDrinks: 3,
      });
      expect(res2.interpolatedText).toBe('3 tragos');
    });

    it('Intensity 4 (Extremo): scales between 3 and 10 tragos', () => {
      expect(VariableReplacer.calculateDrinks(4, undefined)).toBe(3);
      expect(VariableReplacer.calculateDrinks(4, 0)).toBe(3);
      expect(VariableReplacer.calculateDrinks(4, 1)).toBe(3);
      expect(VariableReplacer.calculateDrinks(4, 2)).toBe(4);
      expect(VariableReplacer.calculateDrinks(4, 5)).toBe(7);
      expect(VariableReplacer.calculateDrinks(4, 8)).toBe(10);
      expect(VariableReplacer.calculateDrinks(4, 15)).toBe(10); // capped at 10

      const res = VariableReplacer.replaceTokens('Bebe {drinks}', [{ id: '1', name: 'Ana' }], {
        intensity: 4,
        baseDrinks: 2,
      });
      expect(res.calculatedDrinks).toBe(4);
      expect(res.interpolatedText).toBe('Bebe 4 tragos');
    });
  });
});
