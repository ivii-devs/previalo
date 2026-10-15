import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 1: Dice Roll 1-6 Uniform RNG E2E', () => {
  it('TC-T1-DICE-01: should produce integer values strictly within [1, 6]', () => {
    const driver = new E2EGameDriver();
    for (let i = 0; i < 500; i++) {
      const roll = driver.rollDice();
      expect(Number.isInteger(roll)).toBe(true);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });

  it('TC-T1-DICE-02: should observe minimum bound 1 across multiple trials', () => {
    const driver = new E2EGameDriver();
    let sawOne = false;
    for (let i = 0; i < 1000; i++) {
      if (driver.rollDice() === 1) {
        sawOne = true;
        break;
      }
    }
    expect(sawOne).toBe(true);
  });

  it('TC-T1-DICE-03: should observe maximum bound 6 across multiple trials', () => {
    const driver = new E2EGameDriver();
    let sawSix = false;
    for (let i = 0; i < 1000; i++) {
      if (driver.rollDice() === 6) {
        sawSix = true;
        break;
      }
    }
    expect(sawSix).toBe(true);
  });

  it('TC-T1-DICE-04: should exhibit uniform distribution across 1,200 rolls without statistical bias', () => {
    const driver = new E2EGameDriver();
    const counts = [0, 0, 0, 0, 0, 0];
    const totalRolls = 1200;
    const expectedPerFace = totalRolls / 6; // 200

    for (let i = 0; i < totalRolls; i++) {
      const roll = driver.rollDice();
      counts[roll - 1]++;
    }

    // Every face should appear between 140 and 260 times (reasonable binomial range)
    for (let face = 1; face <= 6; face++) {
      const observed = counts[face - 1];
      expect(observed).toBeGreaterThanOrEqual(140);
      expect(observed).toBeLessThanOrEqual(260);
    }

    // Chi-squared test: sum((O - E)^2 / E) < critical value for 5 df at 0.001 alpha (20.515)
    let chiSquare = 0;
    for (let i = 0; i < 6; i++) {
      chiSquare += Math.pow(counts[i] - expectedPerFace, 2) / expectedPerFace;
    }
    expect(chiSquare).toBeLessThan(20.515);
  });

  it('TC-T1-DICE-05: should reject invalid forced rolls with descriptive validation errors', () => {
    const driver = new E2EGameDriver();
    expect(() => driver.rollDice(0)).toThrow(/between 1 and 6/);
    expect(() => driver.rollDice(7)).toThrow(/between 1 and 6/);
    expect(() => driver.rollDice(3.5)).toThrow(/integer/);
    expect(() => driver.rollDice(-2)).toThrow(/between 1 and 6/);
  });

  it('TC-T1-DICE-06: should move player pawn exactly by rolled amount on linear board tiles', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['PawnTester']);

    // From tile 1, roll forced 3 -> dest 4 (Tile 4 in Clásica is regular drink tile)
    const turn1 = driver.playBoardTurn(3);
    expect(turn1.roll).toBe(3);
    expect(turn1.startPosition).toBe(1);
    expect(turn1.finalPosition).toBe(4);
  });
});
