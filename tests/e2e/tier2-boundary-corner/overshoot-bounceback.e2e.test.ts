import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 2: Overshoot Bounce-Back Mathematical Invariant E2E', () => {
  it('TC-T2-BNC-01: should bounce back to tile 44 when rolling 3 from tile 43 on 45-tile board', () => {
    const driver = new E2EGameDriver();
    // 43 + 3 = 46. Excess = 1. Bounce = 45 - 1 = 44.
    expect(driver.calculateDestination(43, 3, 45)).toBe(44);
  });

  it('TC-T2-BNC-02: should bounce back to tile 42 when rolling 5 from tile 43 on 45-tile board', () => {
    const driver = new E2EGameDriver();
    // 43 + 5 = 48. Excess = 3. Bounce = 45 - 3 = 42.
    expect(driver.calculateDestination(43, 5, 45)).toBe(42);
  });

  it('TC-T2-BNC-03: should bounce back to tile 44 when rolling 2 from tile 44 on 45-tile board', () => {
    const driver = new E2EGameDriver();
    // 44 + 2 = 46. Excess = 1. Bounce = 45 - 1 = 44.
    expect(driver.calculateDestination(44, 2, 45)).toBe(44);
  });

  it('TC-T2-BNC-04: should bounce back to tile 42 when rolling 4 from tile 44 on 45-tile board', () => {
    const driver = new E2EGameDriver();
    // 44 + 4 = 48. Excess = 3. Bounce = 45 - 3 = 42.
    expect(driver.calculateDestination(44, 4, 45)).toBe(42);
  });

  it('TC-T2-BNC-05: should bounce back to tile 38 when rolling 4 from tile 38 on 40-tile Hot board', () => {
    const driver = new E2EGameDriver();
    // 38 + 4 = 42. Excess = 2. Bounce = 40 - 2 = 38.
    expect(driver.calculateDestination(38, 4, 40)).toBe(38);
  });

  it('TC-T2-BNC-06: should bounce back to tile 38 when rolling 3 from tile 39 on 40-tile Hot board', () => {
    const driver = new E2EGameDriver();
    // 39 + 3 = 42. Excess = 2. Bounce = 40 - 2 = 38.
    expect(driver.calculateDestination(39, 3, 40)).toBe(38);
  });
});
