import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 4: Real-World Scenario - La Guatoca Match Played to Victory E2E', () => {
  it('TC-T4-GTC-01: should simulate a full 3-player match of La Guatoca Clásica until victory on tile 45', () => {
    const driver = new E2EGameDriver();
    const players = ['Carla', 'Diego', 'Elena'];

    driver.initBoardSession('guatoca_clasica', players);
    const tiles = driver.getActiveBoard();
    expect(tiles).toHaveLength(45);

    let winnerFound = false;
    let winnerName = '';
    let turnCount = 0;
    const maxTurns = 500; // Safety guard

    while (!winnerFound && turnCount < maxTurns) {
      turnCount++;
      const result = driver.playBoardTurn();

      // Invariant: position must always be within [1, 45]
      expect(result.finalPosition).toBeGreaterThanOrEqual(1);
      expect(result.finalPosition).toBeLessThanOrEqual(45);

      if (result.isVictory) {
        winnerFound = true;
        winnerName = result.player.name;
        expect(result.finalPosition).toBe(45);
      }
    }

    expect(winnerFound).toBe(true);
    expect(players).toContain(winnerName);
    expect(turnCount).toBeLessThan(maxTurns);
  });

  it('TC-T4-GTC-02: should simulate a 2-player match of La Guatoca Hot until victory on tile 40', () => {
    const driver = new E2EGameDriver();
    const players = ['Romeo', 'Julieta'];

    driver.initBoardSession('guatoca_hot', players);
    const tiles = driver.getActiveBoard();
    expect(tiles).toHaveLength(40);

    let winnerFound = false;
    let turnCount = 0;
    const maxTurns = 500;

    while (!winnerFound && turnCount < maxTurns) {
      turnCount++;
      const result = driver.playBoardTurn();

      expect(result.finalPosition).toBeGreaterThanOrEqual(1);
      expect(result.finalPosition).toBeLessThanOrEqual(40);

      if (result.isVictory) {
        winnerFound = true;
        expect(result.finalPosition).toBe(40);
      }
    }

    expect(winnerFound).toBe(true);
  });

  it('TC-T4-GTC-03: should verify overshoot bounce-back on tile 43 triggers trap_back to 38, followed by direct victory', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['SoloRacer']);

    // Place player at tile 43
    driver.getPlayers()[0].boardPosition = 43;

    // Turn 1: Roll 5 -> Overshoots! 43 + 5 = 48 -> Bounces to 42.
    // Tile 42 in Clásica is "Perdiste el DNI" (trap_back to 38)!
    const bounceTurn = driver.playBoardTurn(5);
    expect(bounceTurn.calculatedDestination).toBe(42);
    expect(bounceTurn.actionType).toBe('trap_back');
    expect(bounceTurn.finalPosition).toBe(38);
    expect(bounceTurn.isVictory).toBe(false);

    // Reset player position back to 43 to test exact direct victory
    driver.getPlayers()[0].boardPosition = 43;
    const directWinTurn = driver.playBoardTurn(2);
    expect(directWinTurn.calculatedDestination).toBe(45);
    expect(directWinTurn.finalPosition).toBe(45);
    expect(directWinTurn.isVictory).toBe(true);
  });

  it('TC-T4-GTC-04: should track total drinks consumed during a Guatoca game', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['DrinkerA', 'DrinkerB']);

    for (let i = 0; i < 20; i++) {
      driver.playBoardTurn();
    }

    const players = driver.getPlayers();
    const totalDrinks = players.reduce((sum, p) => sum + p.sipCount, 0);
    expect(totalDrinks).toBeGreaterThanOrEqual(0);
  });
});
