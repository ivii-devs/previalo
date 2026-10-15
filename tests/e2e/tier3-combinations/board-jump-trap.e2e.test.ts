import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 3: Pairwise Integration - Board Jump & Special Tiles E2E', () => {
  it('TC-T3-BJT-01: should execute Oca jump and grant extra turn on tile 5 in Clásica', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Jumper', 'Opponent']);

    // From tile 1, rolling 4 lands on tile 5 (Oca)
    const move1 = driver.playBoardTurn(4);
    expect(move1.startPosition).toBe(1);
    expect(move1.calculatedDestination).toBe(5);
    expect(move1.actionType).toBe('jump');
    expect(move1.finalPosition).toBe(9); // Jumps to tile 9
    expect(move1.extraRoll).toBe(true);

    // Turn must still belong to Jumper because extraRoll was granted!
    const move2 = driver.playBoardTurn(2);
    expect(move2.player.name).toBe('Jumper');
    expect(move2.startPosition).toBe(9);
    expect(move2.finalPosition).toBe(11);
  });

  it('TC-T3-BJT-02: should advance to next player when turn does NOT grant extra roll', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['PlayerOne', 'PlayerTwo']);

    // Rolling 2 lands on tile 3 (drink tile, no extra roll)
    const turn1 = driver.playBoardTurn(2);
    expect(turn1.player.name).toBe('PlayerOne');
    expect(turn1.extraRoll).toBe(false);

    // Next turn must belong to PlayerTwo
    const turn2 = driver.playBoardTurn(3);
    expect(turn2.player.name).toBe('PlayerTwo');
  });

  it('TC-T3-BJT-03: should execute backward trap Resacón on tile 17 in Clásica', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['HangoverGuy']);

    const tiles = driver.getActiveBoard();
    const tile17 = tiles.find((t) => t.tile_number === 17)!;
    expect(tile17.tile_type).toBe('trap_back');
    expect(tile17.action_jump_to).toBe(14);

    const res = driver.resolveTile(tile17);
    expect(res.actionType).toBe('trap_back');
    expect(res.destination).toBe(14);
    expect(res.extraRoll).toBe(false);
  });

  it('TC-T3-BJT-04: should execute La Muerte tile 37 in Clásica resetting pawn to tile 1', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['UnluckyPawn']);

    // Place on tile 35, roll 2 -> lands on tile 37 (La Muerte)
    driver.getPlayers()[0].boardPosition = 35;

    const move = driver.playBoardTurn(2);
    expect(move.calculatedDestination).toBe(37);
    expect(move.actionType).toBe('trap_skull');
    expect(move.finalPosition).toBe(1); // Reset to tile 1
    expect(move.extraRoll).toBe(false);
  });

  it('TC-T3-BJT-05: should verify jump tile 37 in Hot board ("Fiebre nocturna") jumps to tile 39', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_hot', ['HotJumper']);

    const tiles = driver.getActiveBoard();
    const jump37 = tiles.find((t) => t.tile_number === 37)!;
    expect(jump37.tile_type).toBe('jump');
    expect(jump37.action_jump_to).toBe(39);

    const res = driver.resolveTile(jump37);
    expect(res.destination).toBe(39);
    expect(res.extraRoll).toBe(true);
  });
});
