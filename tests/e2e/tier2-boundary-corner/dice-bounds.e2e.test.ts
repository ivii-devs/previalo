import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 2: Dice Bounds & Edge Roll Movement E2E', () => {
  it('TC-T2-DCE-01: should move pawn from tile 1 to tile 2 on boundary minimum roll 1', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Player1']);

    const move = driver.playBoardTurn(1);
    expect(move.roll).toBe(1);
    expect(move.startPosition).toBe(1);
    expect(move.finalPosition).toBe(2);
    expect(move.isVictory).toBe(false);
  });

  it('TC-T2-DCE-02: should move pawn from tile 1 to tile 7 on boundary maximum roll 6', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Player1']);

    const move = driver.playBoardTurn(6);
    expect(move.roll).toBe(6);
    expect(move.startPosition).toBe(1);
    expect(move.finalPosition).toBe(7);
    expect(move.isVictory).toBe(false);
  });

  it('TC-T2-DCE-03: should declare victory on exact roll 1 from penultimate tile 44 in Clásica', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Champion']);

    // Set player position to 44
    driver.getPlayers()[0].boardPosition = 44;

    const move = driver.playBoardTurn(1);
    expect(move.roll).toBe(1);
    expect(move.startPosition).toBe(44);
    expect(move.finalPosition).toBe(45);
    expect(move.isVictory).toBe(true);
  });

  it('TC-T2-DCE-04: should bounce back on boundary roll 6 from tile 44 in Clásica without victory', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Player1']);

    driver.getPlayers()[0].boardPosition = 44;

    const move = driver.playBoardTurn(6);
    expect(move.roll).toBe(6);
    expect(move.startPosition).toBe(44);
    // 44 + 6 = 50. Excess = 5. Bounce-back = 45 - 5 = 40.
    expect(move.finalPosition).toBe(40);
    expect(move.isVictory).toBe(false);
  });

  it('TC-T2-DCE-05: should declare victory on exact roll 1 from penultimate tile 39 in Hot board', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_hot', ['HotChampion']);

    driver.getPlayers()[0].boardPosition = 39;

    const move = driver.playBoardTurn(1);
    expect(move.roll).toBe(1);
    expect(move.startPosition).toBe(39);
    expect(move.finalPosition).toBe(40);
    expect(move.isVictory).toBe(true);
  });

  it('TC-T2-DCE-06: should bounce back on boundary roll 6 from tile 39 in Hot board', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_hot', ['HotPlayer']);

    driver.getPlayers()[0].boardPosition = 39;

    const move = driver.playBoardTurn(6);
    expect(move.roll).toBe(6);
    expect(move.startPosition).toBe(39);
    // 39 + 6 = 45. Excess = 5. Bounce-back = 40 - 5 = 35.
    expect(move.finalPosition).toBe(35);
    expect(move.isVictory).toBe(false);
  });
});
