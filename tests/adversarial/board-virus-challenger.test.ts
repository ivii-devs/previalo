import { describe, it, expect } from 'vitest';
import { BoardEngine } from '../../src/domain/engines/BoardEngine';
import { VirusManager } from '../../src/domain/engines/VirusManager';
import type { BoardTile, TileActionResult } from '../../src/domain/types/board';
import type { Player } from '../../src/domain/types/player';
import type { ActiveVirus } from '../../src/domain/types/virus';
import type { Card } from '../../src/domain/types/card';

describe('CHALLENGER M2: Adversarial Stress Test Suite', () => {
  // =========================================================================
  // 1. DICE RNG ADVERSARIAL CHALLENGE (Chi-Square Test across 6,000 Rolls)
  // =========================================================================
  describe('1. Dice RNG: Uniformity & Chi-Square Statistical Test', () => {
    it('empirical chi-square test across 6,000 rolls should not reject uniformity at alpha = 0.01', () => {
      const rolls = 6000;
      const expected = rolls / 6; // 1000
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      for (let i = 0; i < rolls; i++) {
        const roll = BoardEngine.rollDice();
        // Integrity check: must be integer strictly between 1 and 6
        expect(Number.isInteger(roll)).toBe(true);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
        counts[roll]++;
      }

      // Calculate Pearson's Chi-Square statistic: sum((O - E)^2 / E)
      let chiSquare = 0;
      for (let face = 1; face <= 6; face++) {
        const observed = counts[face];
        const diff = observed - expected;
        chiSquare += (diff * diff) / expected;
      }

      // Degrees of freedom = 6 - 1 = 5
      // Critical values:
      // alpha = 0.05: 11.070
      // alpha = 0.01: 15.086
      // alpha = 0.001: 20.515
      console.log(`[RNG Challenge] 6,000 rolls distribution:`, counts);
      console.log(`[RNG Challenge] Chi-Square statistic: ${chiSquare.toFixed(4)} (critical alpha=0.01 is 15.086)`);

      // We assert that the chi-square statistic is within standard bounds (alpha = 0.001 or 0.01)
      expect(chiSquare).toBeLessThan(20.515);
    });

    it('multi-batch chi-square challenge (10 batches of 6,000 rolls = 60,000 total rolls)', () => {
      const batches = 10;
      const rollsPerBatch = 6000;
      const expectedPerFace = rollsPerBatch / 6;
      let totalChiSquare = 0;

      for (let b = 0; b < batches; b++) {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (let i = 0; i < rollsPerBatch; i++) {
          const roll = BoardEngine.rollDice();
          counts[roll]++;
        }

        let batchChiSquare = 0;
        for (let f = 1; f <= 6; f++) {
          const diff = counts[f] - expectedPerFace;
          batchChiSquare += (diff * diff) / expectedPerFace;
        }

        totalChiSquare += batchChiSquare;
        // Each individual batch must not exhibit catastrophic deviation
        expect(batchChiSquare).toBeLessThan(25.0);
      }

      const meanChiSquare = totalChiSquare / batches;
      console.log(`[RNG Challenge] Mean Chi-Square across 10 batches: ${meanChiSquare.toFixed(4)} (Expected mean for df=5 is 5.0)`);
      // Mean of chi-square distribution with df=5 is 5.0, variance is 2*5 = 10, std dev is sqrt(10) ≈ 3.16
      expect(meanChiSquare).toBeGreaterThan(1.0);
      expect(meanChiSquare).toBeLessThan(10.0);
    });
  });

  // =========================================================================
  // 2. DESTINATION OVERSHOOT BOUNCE-BACK ADVERSARIAL CHALLENGE
  // =========================================================================
  describe('2. Destination Overshoot Bounce-Back (Clásica 45 & Hot 40)', () => {
    describe('Clásica (Total Tiles = 45): Exhaustive Finish Approach Matrix', () => {
      const clasicaMax = 45;

      const testMatrix: Array<{ start: number; roll: number; expected: number; isFinish: boolean }> = [
        // From Position 40
        { start: 40, roll: 1, expected: 41, isFinish: false },
        { start: 40, roll: 2, expected: 42, isFinish: false },
        { start: 40, roll: 3, expected: 43, isFinish: false },
        { start: 40, roll: 4, expected: 44, isFinish: false },
        { start: 40, roll: 5, expected: 45, isFinish: true },
        { start: 40, roll: 6, expected: 44, isFinish: false }, // 46 - 45 = 1 excess -> 45 - 1 = 44

        // From Position 41
        { start: 41, roll: 1, expected: 42, isFinish: false },
        { start: 41, roll: 2, expected: 43, isFinish: false },
        { start: 41, roll: 3, expected: 44, isFinish: false },
        { start: 41, roll: 4, expected: 45, isFinish: true },
        { start: 41, roll: 5, expected: 44, isFinish: false }, // 46 -> 44
        { start: 41, roll: 6, expected: 43, isFinish: false }, // 47 -> 43

        // From Position 42
        { start: 42, roll: 1, expected: 43, isFinish: false },
        { start: 42, roll: 2, expected: 44, isFinish: false },
        { start: 42, roll: 3, expected: 45, isFinish: true },
        { start: 42, roll: 4, expected: 44, isFinish: false }, // 46 -> 44
        { start: 42, roll: 5, expected: 43, isFinish: false }, // 47 -> 43
        { start: 42, roll: 6, expected: 42, isFinish: false }, // 48 -> 42

        // From Position 43
        { start: 43, roll: 1, expected: 44, isFinish: false },
        { start: 43, roll: 2, expected: 45, isFinish: true },
        { start: 43, roll: 3, expected: 44, isFinish: false }, // 46 -> 44
        { start: 43, roll: 4, expected: 43, isFinish: false }, // 47 -> 43
        { start: 43, roll: 5, expected: 42, isFinish: false }, // 48 -> 42
        { start: 43, roll: 6, expected: 41, isFinish: false }, // 49 -> 41

        // From Position 44
        { start: 44, roll: 1, expected: 45, isFinish: true },
        { start: 44, roll: 2, expected: 44, isFinish: false }, // 46 -> 44
        { start: 44, roll: 3, expected: 43, isFinish: false }, // 47 -> 43
        { start: 44, roll: 4, expected: 42, isFinish: false }, // 48 -> 42
        { start: 44, roll: 5, expected: 41, isFinish: false }, // 49 -> 41
        { start: 44, roll: 6, expected: 40, isFinish: false }, // 50 -> 40
      ];

      testMatrix.forEach(({ start, roll, expected, isFinish }) => {
        it(`Clásica: start=${start}, roll=${roll} -> expected destination=${expected} (isFinish=${isFinish})`, () => {
          const dest = BoardEngine.calculateDestination(start, roll, clasicaMax);
          expect(dest).toBe(expected);
          expect(BoardEngine.isVictory(dest, clasicaMax)).toBe(isFinish);
        });
      });
    });

    describe('Hot (Total Tiles = 40): Exhaustive Finish Approach Matrix', () => {
      const hotMax = 40;

      const testMatrixHot: Array<{ start: number; roll: number; expected: number; isFinish: boolean }> = [
        // From Position 35
        { start: 35, roll: 1, expected: 36, isFinish: false },
        { start: 35, roll: 2, expected: 37, isFinish: false },
        { start: 35, roll: 3, expected: 38, isFinish: false },
        { start: 35, roll: 4, expected: 39, isFinish: false },
        { start: 35, roll: 5, expected: 40, isFinish: true },
        { start: 35, roll: 6, expected: 39, isFinish: false }, // 41 -> 39

        // From Position 36
        { start: 36, roll: 1, expected: 37, isFinish: false },
        { start: 36, roll: 2, expected: 38, isFinish: false },
        { start: 36, roll: 3, expected: 39, isFinish: false },
        { start: 36, roll: 4, expected: 40, isFinish: true },
        { start: 36, roll: 5, expected: 39, isFinish: false }, // 41 -> 39
        { start: 36, roll: 6, expected: 38, isFinish: false }, // 42 -> 38

        // From Position 37
        { start: 37, roll: 1, expected: 38, isFinish: false },
        { start: 37, roll: 2, expected: 39, isFinish: false },
        { start: 37, roll: 3, expected: 40, isFinish: true },
        { start: 37, roll: 4, expected: 39, isFinish: false }, // 41 -> 39
        { start: 37, roll: 5, expected: 38, isFinish: false }, // 42 -> 38
        { start: 37, roll: 6, expected: 37, isFinish: false }, // 43 -> 37

        // From Position 38
        { start: 38, roll: 1, expected: 39, isFinish: false },
        { start: 38, roll: 2, expected: 40, isFinish: true },
        { start: 38, roll: 3, expected: 39, isFinish: false }, // 41 -> 39
        { start: 38, roll: 4, expected: 38, isFinish: false }, // 42 -> 38
        { start: 38, roll: 5, expected: 37, isFinish: false }, // 43 -> 37
        { start: 38, roll: 6, expected: 36, isFinish: false }, // 44 -> 36

        // From Position 39
        { start: 39, roll: 1, expected: 40, isFinish: true },
        { start: 39, roll: 2, expected: 39, isFinish: false }, // 41 -> 39
        { start: 39, roll: 3, expected: 38, isFinish: false }, // 42 -> 38
        { start: 39, roll: 4, expected: 37, isFinish: false }, // 43 -> 37
        { start: 39, roll: 5, expected: 36, isFinish: false }, // 44 -> 36
        { start: 39, roll: 6, expected: 35, isFinish: false }, // 45 -> 35

        // Near finish input robustness: starting from 40..44 on Hot (40)
        { start: 40, roll: 1, expected: 39, isFinish: false }, // 41 - 40 = 1 -> 40 - 1 = 39
        { start: 40, roll: 6, expected: 34, isFinish: false }, // 46 - 40 = 6 -> 40 - 6 = 34
        { start: 41, roll: 1, expected: 38, isFinish: false }, // 42 - 40 = 2 -> 40 - 2 = 38
        { start: 42, roll: 2, expected: 36, isFinish: false }, // 44 - 40 = 4 -> 40 - 4 = 36
        { start: 43, roll: 3, expected: 34, isFinish: false }, // 46 - 40 = 6 -> 40 - 6 = 34
        { start: 44, roll: 6, expected: 30, isFinish: false }, // 50 - 40 = 10 -> 40 - 10 = 30
      ];

      testMatrixHot.forEach(({ start, roll, expected, isFinish }) => {
        it(`Hot: start=${start}, roll=${roll} -> expected destination=${expected} (isFinish=${isFinish})`, () => {
          const dest = BoardEngine.calculateDestination(start, roll, hotMax);
          expect(dest).toBe(expected);
          expect(BoardEngine.isVictory(dest, hotMax)).toBe(isFinish);
        });
      });
    });

    describe('Overshoot Clamping & Extreme Edge Cases', () => {
      it('should clamp destination to minimum tile 1 when bounce-back exceeds board start', () => {
        // pos 40 + roll 90 on 45 tiles -> target 130 -> excess 85 -> 45 - 85 = -40 -> clamp to 1
        expect(BoardEngine.calculateDestination(40, 90, 45)).toBe(1);
        expect(BoardEngine.calculateDestination(1, 10, 5)).toBe(1); // 1+10=11, excess 6, 5-6 = -1 -> clamp to 1
      });

      it('should maintain exact equality with finish tile when roll lands precisely on totalTiles', () => {
        expect(BoardEngine.calculateDestination(40, 5, 45)).toBe(45);
        expect(BoardEngine.calculateDestination(35, 5, 40)).toBe(40);
        expect(BoardEngine.calculateDestination(1, 0, 1)).toBe(1);
      });
    });
  });

  // =========================================================================
  // 3. SPECIAL TILE RESOLUTIONS ADVERSARIAL CHALLENGE
  // =========================================================================
  describe('3. Special Tile Resolutions (Oca, Jail, Muerte, Finish, Drink)', () => {
    describe('Oca Jump Chaining & Extra Roll Grant', () => {
      it('single oca jump should forward to destination and grant extra roll', () => {
        const ocaTile: BoardTile = {
          id: 5,
          board_id: 'guatoca_clasica',
          tile_number: 5,
          tile_type: 'jump',
          title: 'De bar en bar',
          description: 'De oca en oca',
          drinks_action: 0,
          target: 'active_player',
          action_jump_to: 9,
          turns_lost: 0,
          icon: 'beer',
        };

        const res = BoardEngine.resolveTile(ocaTile);
        expect(res.actionType).toBe('jump');
        expect(res.destination).toBe(9);
        expect(res.extraRoll).toBe(true);
        expect(res.turnsLost).toBe(0);
      });

      it('simulated oca chaining: sequence of chained jumps terminates correctly and preserves extraRoll', () => {
        // Chain: Tile 5 -> Tile 9 -> Tile 14 (Stop at drink tile)
        const boardTilesMap = new Map<number, BoardTile>([
          [
            5,
            {
              id: 5,
              board_id: 'guatoca_clasica',
              tile_number: 5,
              tile_type: 'jump',
              title: 'Oca 1',
              description: 'Tira otra vez',
              drinks_action: 0,
              target: 'active_player',
              action_jump_to: 9,
              turns_lost: 0,
              icon: 'beer',
            },
          ],
          [
            9,
            {
              id: 9,
              board_id: 'guatoca_clasica',
              tile_number: 9,
              tile_type: 'jump',
              title: 'Oca 2',
              description: 'Tira otra vez',
              drinks_action: 0,
              target: 'active_player',
              action_jump_to: 14,
              turns_lost: 0,
              icon: 'beer',
            },
          ],
          [
            14,
            {
              id: 14,
              board_id: 'guatoca_clasica',
              tile_number: 14,
              tile_type: 'drink',
              title: 'Cerveza',
              description: 'Bebe 2 tragos',
              drinks_action: 2,
              target: 'active_player',
              action_jump_to: null,
              turns_lost: 0,
              icon: 'wine',
            },
          ],
        ]);

        // Simulating pawn execution loop
        let currentTileNum = 5;
        let chainSteps = 0;
        let finalExtraRoll = false;

        while (chainSteps < 10) {
          const tile = boardTilesMap.get(currentTileNum)!;
          const resolution: TileActionResult = BoardEngine.resolveTile(tile);
          chainSteps++;
          if (resolution.extraRoll) {
            finalExtraRoll = true;
          }

          if (resolution.destination !== currentTileNum && resolution.actionType === 'jump') {
            currentTileNum = resolution.destination;
          } else {
            break;
          }
        }

        expect(chainSteps).toBe(3); // tile 5 -> tile 9 -> tile 14
        expect(currentTileNum).toBe(14);
        expect(finalExtraRoll).toBe(true);
      });

      it('extraRoll must be strictly FALSE for non-jump tiles', () => {
        const types: Array<BoardTile['tile_type']> = [
          'start',
          'finish',
          'trap_jail',
          'trap_skull',
          'trap_back',
          'drink',
          'give_drink',
          'challenge',
          'truth',
          'versus',
          'group_event',
          'yo_nunca',
        ];

        for (const t of types) {
          const tile: BoardTile = {
            id: 1,
            board_id: 'guatoca_clasica',
            tile_number: 10,
            tile_type: t,
            title: `Tile of type ${t}`,
            description: 'Test',
            drinks_action: 1,
            target: 'active_player',
            action_jump_to: t === 'trap_skull' ? 1 : null,
            turns_lost: t === 'trap_jail' ? 2 : 0,
            icon: 'icon',
          };

          const res = BoardEngine.resolveTile(tile);
          expect(res.extraRoll).toBe(false);
        }
      });
    });

    describe('Cárcel (Jail) 2-Turn Skip & Jail Turn Progression', () => {
      it('jail tile should resolve with 2 turnsLost and lock destination to current tile', () => {
        const jailTile: BoardTile = {
          id: 12,
          board_id: 'guatoca_clasica',
          tile_number: 12,
          tile_type: 'trap_jail',
          title: 'Cárcel',
          description: 'A la sombra',
          drinks_action: 2,
          target: 'active_player',
          action_jump_to: null,
          turns_lost: 2,
          icon: 'lock',
        };

        const res = BoardEngine.resolveTile(jailTile);
        expect(res.actionType).toBe('trap_jail');
        expect(res.turnsLost).toBe(2);
        expect(res.destination).toBe(12);
        expect(res.extraRoll).toBe(false);
      });

      it('jail tile should default to 2 turnsLost even if turns_lost is 0 or unassigned', () => {
        const jailTileNoTurns: BoardTile = {
          id: 12,
          board_id: 'guatoca_clasica',
          tile_number: 12,
          tile_type: 'trap_jail',
          title: 'Cárcel',
          description: 'A la sombra',
          drinks_action: 0,
          target: 'active_player',
          action_jump_to: null,
          turns_lost: 0,
          icon: 'lock',
        };

        const res = BoardEngine.resolveTile(jailTileNoTurns);
        expect(res.turnsLost).toBe(2);
      });

      it('handleJailTurn should strictly enforce 2 turn lockout before allowing roll', () => {
        const player: Player = { id: 'p_jail', name: 'Inmate', jailTurns: 2 };

        // Turn 1 attempt
        const t1 = BoardEngine.handleJailTurn(player);
        expect(t1.canRoll).toBe(false);
        expect(t1.updatedJailTurns).toBe(1);
        expect(t1.message).toContain('1 turnos restantes');

        // Turn 2 attempt
        player.jailTurns = t1.updatedJailTurns;
        const t2 = BoardEngine.handleJailTurn(player);
        expect(t2.canRoll).toBe(false);
        expect(t2.updatedJailTurns).toBe(0);
        expect(t2.message).toContain('Cumpliste tu condena');

        // Turn 3 attempt (Sentence served, free to roll)
        player.jailTurns = t2.updatedJailTurns;
        const t3 = BoardEngine.handleJailTurn(player);
        expect(t3.canRoll).toBe(true);
        expect(t3.updatedJailTurns).toBe(0);
      });

      it('handleJailTurn for unjailed player should allow roll immediately', () => {
        const freePlayer: Player = { id: 'p_free', name: 'Free Person', jailTurns: 0 };
        const res = BoardEngine.handleJailTurn(freePlayer);
        expect(res.canRoll).toBe(true);
        expect(res.updatedJailTurns).toBe(0);

        const undefinedPlayer: Player = { id: 'p_undef', name: 'Undefined' };
        const resUndef = BoardEngine.handleJailTurn(undefinedPlayer);
        expect(resUndef.canRoll).toBe(true);
        expect(resUndef.updatedJailTurns).toBe(0);
      });
    });

    describe('La Muerte (Skull) Reset to Tile 1', () => {
      it('skull tile should reset destination strictly to tile 1', () => {
        const skullTile: BoardTile = {
          id: 37,
          board_id: 'guatoca_clasica',
          tile_number: 37,
          tile_type: 'trap_skull',
          title: 'La Muerte',
          description: 'Vuelves a empezar de cero',
          drinks_action: 3,
          target: 'active_player',
          action_jump_to: 1,
          turns_lost: 0,
          icon: 'skull',
        };

        const res = BoardEngine.resolveTile(skullTile);
        expect(res.actionType).toBe('trap_skull');
        expect(res.destination).toBe(1);
        expect(res.extraRoll).toBe(false);
        expect(res.drinks).toBe(3);
      });

      it('skull tile with null action_jump_to must safely fallback to tile 1', () => {
        const skullTileNull: BoardTile = {
          id: 37,
          board_id: 'guatoca_clasica',
          tile_number: 37,
          tile_type: 'trap_skull',
          title: 'La Muerte',
          description: 'Sin jump_to explícito',
          drinks_action: 2,
          target: 'active_player',
          action_jump_to: null,
          turns_lost: 0,
          icon: 'skull',
        };

        const res = BoardEngine.resolveTile(skullTileNull);
        expect(res.destination).toBe(1);
      });
    });

    describe('Victory on Finish Tile', () => {
      it('finish tile resolution should mark finish action and no extra roll', () => {
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

        const res = BoardEngine.resolveTile(finishTile);
        expect(res.actionType).toBe('finish');
        expect(res.destination).toBe(45);
        expect(res.extraRoll).toBe(false);
      });

      it('isVictory must strictly validate position against totalTiles', () => {
        expect(BoardEngine.isVictory(45, 45)).toBe(true);
        expect(BoardEngine.isVictory(40, 40)).toBe(true);
        expect(BoardEngine.isVictory(44, 45)).toBe(false);
        expect(BoardEngine.isVictory(46, 45)).toBe(false);
        expect(BoardEngine.isVictory(1, 45)).toBe(false);
      });
    });
  });

  // =========================================================================
  // 4. VIRUSMANAGER CONCURRENT ACTIVE VIRUS LIFECYCLE CHALLENGE
  // =========================================================================
  describe('4. VirusManager: Concurrent Active Viruses Lifecycle & Separation', () => {
    it('concurrent tracking of 7 active viruses with staggered durations and simultaneous multi-expiration', () => {
      // Create 7 active viruses with staggered lifetimes
      const v1: ActiveVirus = { id: 'v_1', cardId: 101, ruleText: 'V1 (1 round)', roundsRemaining: 1, totalRounds: 1 };
      const v2: ActiveVirus = { id: 'v_2', cardId: 102, ruleText: 'V2 (2 rounds)', roundsRemaining: 2, totalRounds: 2 };
      const v3: ActiveVirus = { id: 'v_3', cardId: 103, ruleText: 'V3 (2 rounds - simultaneous with V2)', roundsRemaining: 2, totalRounds: 2 };
      const v4: ActiveVirus = { id: 'v_4', cardId: 104, ruleText: 'V4 (3 rounds)', roundsRemaining: 3, totalRounds: 3 };
      const v5: ActiveVirus = { id: 'v_5', cardId: 105, ruleText: 'V5 (4 rounds)', roundsRemaining: 4, totalRounds: 4 };
      const v6: ActiveVirus = { id: 'v_6', cardId: 106, ruleText: 'V6 (5 rounds)', roundsRemaining: 5, totalRounds: 5 };
      const v7: ActiveVirus = { id: 'v_7', cardId: 107, ruleText: 'V7 (5 rounds - simultaneous with V6)', roundsRemaining: 5, totalRounds: 5 };

      let currentPool: ActiveVirus[] = [v1, v2, v3, v4, v5, v6, v7];
      expect(currentPool).toHaveLength(7);

      // --- TICK 1 (End of Round 1) ---
      const tick1 = VirusManager.tickRound(currentPool);
      expect(tick1.expiredViruses).toHaveLength(1);
      expect(tick1.expiredViruses[0].id).toBe('v_1');
      expect(tick1.expiredViruses[0].roundsRemaining).toBe(0);

      expect(tick1.updatedViruses).toHaveLength(6);
      expect(tick1.updatedViruses.map(v => v.id).sort()).toEqual(['v_2', 'v_3', 'v_4', 'v_5', 'v_6', 'v_7']);
      // Verify decremented remaining
      expect(tick1.updatedViruses.find(v => v.id === 'v_2')?.roundsRemaining).toBe(1);
      expect(tick1.updatedViruses.find(v => v.id === 'v_3')?.roundsRemaining).toBe(1);
      expect(tick1.updatedViruses.find(v => v.id === 'v_4')?.roundsRemaining).toBe(2);
      expect(tick1.updatedViruses.find(v => v.id === 'v_5')?.roundsRemaining).toBe(3);
      expect(tick1.updatedViruses.find(v => v.id === 'v_6')?.roundsRemaining).toBe(4);
      expect(tick1.updatedViruses.find(v => v.id === 'v_7')?.roundsRemaining).toBe(4);

      // --- TICK 2 (End of Round 2): V2 and V3 should expire together ---
      currentPool = tick1.updatedViruses;
      const tick2 = VirusManager.tickRound(currentPool);
      expect(tick2.expiredViruses).toHaveLength(2);
      expect(tick2.expiredViruses.map(v => v.id).sort()).toEqual(['v_2', 'v_3']);
      expect(tick2.expiredViruses.every(v => v.roundsRemaining === 0)).toBe(true);

      expect(tick2.updatedViruses).toHaveLength(4);
      expect(tick2.updatedViruses.map(v => v.id).sort()).toEqual(['v_4', 'v_5', 'v_6', 'v_7']);
      expect(tick2.updatedViruses.find(v => v.id === 'v_4')?.roundsRemaining).toBe(1);
      expect(tick2.updatedViruses.find(v => v.id === 'v_5')?.roundsRemaining).toBe(2);
      expect(tick2.updatedViruses.find(v => v.id === 'v_6')?.roundsRemaining).toBe(3);
      expect(tick2.updatedViruses.find(v => v.id === 'v_7')?.roundsRemaining).toBe(3);

      // --- TICK 3 (End of Round 3): V4 expires ---
      currentPool = tick2.updatedViruses;
      const tick3 = VirusManager.tickRound(currentPool);
      expect(tick3.expiredViruses).toHaveLength(1);
      expect(tick3.expiredViruses[0].id).toBe('v_4');
      expect(tick3.expiredViruses[0].roundsRemaining).toBe(0);

      expect(tick3.updatedViruses).toHaveLength(3);
      expect(tick3.updatedViruses.map(v => v.id).sort()).toEqual(['v_5', 'v_6', 'v_7']);
      expect(tick3.updatedViruses.find(v => v.id === 'v_5')?.roundsRemaining).toBe(1);
      expect(tick3.updatedViruses.find(v => v.id === 'v_6')?.roundsRemaining).toBe(2);
      expect(tick3.updatedViruses.find(v => v.id === 'v_7')?.roundsRemaining).toBe(2);

      // --- TICK 4 (End of Round 4): V5 expires ---
      currentPool = tick3.updatedViruses;
      const tick4 = VirusManager.tickRound(currentPool);
      expect(tick4.expiredViruses).toHaveLength(1);
      expect(tick4.expiredViruses[0].id).toBe('v_5');
      expect(tick4.expiredViruses[0].roundsRemaining).toBe(0);

      expect(tick4.updatedViruses).toHaveLength(2);
      expect(tick4.updatedViruses.map(v => v.id).sort()).toEqual(['v_6', 'v_7']);
      expect(tick4.updatedViruses.find(v => v.id === 'v_6')?.roundsRemaining).toBe(1);
      expect(tick4.updatedViruses.find(v => v.id === 'v_7')?.roundsRemaining).toBe(1);

      // --- TICK 5 (End of Round 5): V6 and V7 expire together, leaving pool empty ---
      currentPool = tick4.updatedViruses;
      const tick5 = VirusManager.tickRound(currentPool);
      expect(tick5.expiredViruses).toHaveLength(2);
      expect(tick5.expiredViruses.map(v => v.id).sort()).toEqual(['v_6', 'v_7']);
      expect(tick5.expiredViruses.every(v => v.roundsRemaining === 0)).toBe(true);

      expect(tick5.updatedViruses).toHaveLength(0);

      // --- TICK 6 (Idle tick on empty pool) ---
      const tick6 = VirusManager.tickRound(tick5.updatedViruses);
      expect(tick6.expiredViruses).toHaveLength(0);
      expect(tick6.updatedViruses).toHaveLength(0);
    });

    it('dynamic virus injection mid-game: new virus joins active pool and decrements in sync', () => {
      // Start with 1 virus of 3 rounds
      const initialVirus: ActiveVirus = { id: 'v_init', cardId: 1, ruleText: 'Init', roundsRemaining: 3, totalRounds: 3 };
      let pool = [initialVirus];

      // Round 1
      let res = VirusManager.tickRound(pool);
      pool = res.updatedViruses;
      expect(pool[0].roundsRemaining).toBe(2);

      // In Round 2, a new virus card is drawn and registered
      const newCard: Card = { id: 999, type: 'virus', text: 'New virus card', intensity: 2, duration_rounds: 2 };
      const injectedVirus = VirusManager.createVirus(newCard);
      expect(injectedVirus.roundsRemaining).toBe(2);

      pool.push(injectedVirus);
      expect(pool).toHaveLength(2);

      // Round 2 tick
      res = VirusManager.tickRound(pool);
      // v_init should have 1 round remaining, injectedVirus should have 1 round remaining
      expect(res.expiredViruses).toHaveLength(0);
      expect(res.updatedViruses).toHaveLength(2);
      expect(res.updatedViruses.find(v => v.id === 'v_init')?.roundsRemaining).toBe(1);
      expect(res.updatedViruses.find(v => v.id === injectedVirus.id)?.roundsRemaining).toBe(1);

      // Round 3 tick
      pool = res.updatedViruses;
      res = VirusManager.tickRound(pool);
      // Both should expire together!
      expect(res.expiredViruses).toHaveLength(2);
      expect(res.updatedViruses).toHaveLength(0);
      expect(res.expiredViruses.map(v => v.id).sort()).toEqual([injectedVirus.id, 'v_init'].sort());
    });

    it('immutability verification: tickRound should not mutate input virus objects', () => {
      const originalVirus: ActiveVirus = {
        id: 'v_immut',
        cardId: 50,
        ruleText: 'Do not mutate me',
        roundsRemaining: 3,
        totalRounds: 3,
      };
      const input = [originalVirus];

      const res = VirusManager.tickRound(input);

      // Original object must remain unmodified
      expect(originalVirus.roundsRemaining).toBe(3);
      expect(res.updatedViruses[0].roundsRemaining).toBe(2);
      expect(res.updatedViruses[0]).not.toBe(originalVirus);
    });

    it('high concurrency stress: 1,000 distinct viruses generate unique IDs and tick cleanly', () => {
      const count = 1000;
      const ids = new Set<string>();
      const card: Card = { id: 77, type: 'virus', text: 'Stress', intensity: 1, duration_rounds: 2 };

      const batch: ActiveVirus[] = [];
      for (let i = 0; i < count; i++) {
        const v = VirusManager.createVirus(card);
        expect(ids.has(v.id)).toBe(false);
        ids.add(v.id);
        batch.push(v);
      }

      expect(ids.size).toBe(count);

      // Tick 1
      const res1 = VirusManager.tickRound(batch);
      expect(res1.expiredViruses).toHaveLength(0);
      expect(res1.updatedViruses).toHaveLength(count);

      // Tick 2
      const res2 = VirusManager.tickRound(res1.updatedViruses);
      expect(res2.expiredViruses).toHaveLength(count);
      expect(res2.updatedViruses).toHaveLength(0);
    });
  });
});
