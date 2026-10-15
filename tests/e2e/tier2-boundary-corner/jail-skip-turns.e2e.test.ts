import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 2: Jail Skip Turns & State Lock E2E', () => {
  it('TC-T2-JAL-01: should set jailTurns to 1 when landing on Cárcel tile 10 in Clásica', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Inmate1', 'Player2']);

    // Set position to 6, rolling 4 lands directly on tile 10 (La Cárcel)
    driver.getPlayers()[0].boardPosition = 6;
    const turn1 = driver.playBoardTurn(4);
    expect(turn1.finalPosition).toBe(10);
    expect(turn1.actionType).toBe('trap_jail');
    expect(turn1.player.jailTurns).toBeGreaterThanOrEqual(1);
    expect(turn1.extraRoll).toBe(false);
  });

  it('TC-T2-JAL-02: should skip turn and decrement jail lock when player in jail is up', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Inmate', 'Companion']);

    // Put Inmate on tile 10 with 1 jail turn
    const p1 = driver.getPlayers()[0];
    p1.boardPosition = 10;
    p1.jailTurns = 1;

    // Player 1's turn
    const skipTurn = driver.playBoardTurn();
    expect(skipTurn.actionType).toBe('jail_skip');
    expect(skipTurn.roll).toBe(0);
    expect(skipTurn.finalPosition).toBe(10);
    expect(p1.jailTurns).toBe(0);
  });

  it('TC-T2-JAL-03: should restore normal dice rolling and movement after jail turns reach 0', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['SoloInmate']);

    const p = driver.getPlayers()[0];
    p.boardPosition = 10;
    p.jailTurns = 1;

    // Turn 1: jail skip
    driver.playBoardTurn();
    expect(p.jailTurns).toBe(0);

    // Turn 2: normal roll of 3 from tile 10 -> lands on tile 13
    const normalTurn = driver.playBoardTurn(3);
    expect(normalTurn.actionType).not.toBe('jail_skip');
    expect(normalTurn.roll).toBe(3);
    expect(normalTurn.startPosition).toBe(10);
    expect(normalTurn.finalPosition).toBe(13);
  });

  it('TC-T2-JAL-04: should track independent jail locks for multiple incarcerated players', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['PrisonerA', 'PrisonerB']);

    const [pA, pB] = driver.getPlayers();
    pA.boardPosition = 10;
    pA.jailTurns = 2;

    pB.boardPosition = 10;
    pB.jailTurns = 1;

    // Turn 1: pA turn -> skips, jailTurns becomes 1
    const turnA1 = driver.playBoardTurn();
    expect(turnA1.player.name).toBe('PrisonerA');
    expect(turnA1.actionType).toBe('jail_skip');
    expect(pA.jailTurns).toBe(1);

    // Turn 2: pB turn -> skips, jailTurns becomes 0
    const turnB1 = driver.playBoardTurn();
    expect(turnB1.player.name).toBe('PrisonerB');
    expect(turnB1.actionType).toBe('jail_skip');
    expect(pB.jailTurns).toBe(0);

    // Turn 3: pA turn -> skips again, jailTurns becomes 0
    const turnA2 = driver.playBoardTurn();
    expect(turnA2.player.name).toBe('PrisonerA');
    expect(turnA2.actionType).toBe('jail_skip');
    expect(pA.jailTurns).toBe(0);

    // Turn 4: pB turn -> free! Normal roll
    const turnB2 = driver.playBoardTurn(3);
    expect(turnB2.player.name).toBe('PrisonerB');
    expect(turnB2.roll).toBe(3);
    expect(turnB2.finalPosition).toBeGreaterThan(10);
  });

  it('TC-T2-JAL-05: should advance turn rotation to next player when turn is skipped', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Alice', 'Bob', 'Charlie']);

    const [p1] = driver.getPlayers();
    p1.jailTurns = 1;

    // Alice skips
    const resAlice = driver.playBoardTurn();
    expect(resAlice.player.name).toBe('Alice');

    // Next turn must belong to Bob
    const resBob = driver.playBoardTurn(2);
    expect(resBob.player.name).toBe('Bob');

    // Next turn must belong to Charlie
    const resCharlie = driver.playBoardTurn(3);
    expect(resCharlie.player.name).toBe('Charlie');
  });

  it('TC-T2-JAL-06: should verify La Cárcel in Hot board (tile 10, "La Mazmorra") enforces jail trap rules', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_hot', ['DungeonPlayer']);

    const tiles = driver.getActiveBoard();
    const dungeonTile = tiles.find((t) => t.tile_number === 10)!;
    expect(dungeonTile.title).toContain('La Mazmorra');
    expect(dungeonTile.tile_type).toBe('trap_jail');

    const res = driver.resolveTile(dungeonTile);
    expect(res.actionType).toBe('trap_jail');
    expect(res.turnsLost).toBeGreaterThanOrEqual(1);
    expect(res.extraRoll).toBe(false);
  });
});
