import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 1: Board Destination Calculation E2E', () => {
  it('TC-T1-BD-01: should compute linear destinations accurately when move does not exceed finish', () => {
    const driver = new E2EGameDriver();
    const totalTiles = 45;

    expect(driver.calculateDestination(1, 1, totalTiles)).toBe(2);
    expect(driver.calculateDestination(1, 6, totalTiles)).toBe(7);
    expect(driver.calculateDestination(10, 4, totalTiles)).toBe(14);
    expect(driver.calculateDestination(38, 5, totalTiles)).toBe(43);
    expect(driver.calculateDestination(40, 4, totalTiles)).toBe(44);
  });

  it('TC-T1-BD-02: should land exactly on finish tile 45 (or 40 on Hot) when roll matches exact distance', () => {
    const driver = new E2EGameDriver();

    // Clásica board (45 tiles)
    expect(driver.calculateDestination(44, 1, 45)).toBe(45);
    expect(driver.calculateDestination(43, 2, 45)).toBe(45);
    expect(driver.calculateDestination(40, 5, 45)).toBe(45);
    expect(driver.calculateDestination(39, 6, 45)).toBe(45);

    // Hot board (40 tiles)
    expect(driver.calculateDestination(39, 1, 40)).toBe(40);
    expect(driver.calculateDestination(36, 4, 40)).toBe(40);
  });

  it('TC-T1-BD-03: should calculate overshoot bounce-back destination using canonical formula', () => {
    const driver = new E2EGameDriver();
    // Formula: destination = totalTiles - ((pos + roll) - totalTiles)

    // Position 43, roll 5 on 45 tiles -> raw 48, excess 3 -> 45 - 3 = 42
    expect(driver.calculateDestination(43, 5, 45)).toBe(42);

    // Position 44, roll 3 on 45 tiles -> raw 47, excess 2 -> 45 - 2 = 43
    expect(driver.calculateDestination(44, 3, 45)).toBe(43);

    // Position 44, roll 6 on 45 tiles -> raw 50, excess 5 -> 45 - 5 = 40
    expect(driver.calculateDestination(44, 6, 45)).toBe(40);

    // Position 38, roll 5 on 40 tiles -> raw 43, excess 3 -> 40 - 3 = 37
    expect(driver.calculateDestination(38, 5, 40)).toBe(37);
  });

  it('TC-T1-BD-04: should resolve Oca/Jump tile granting jump destination and extra roll', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Mario', 'Luigi']);

    const tiles = driver.getActiveBoard();
    // Tile 5 in Clásica is jump to 9 ("De bar en bar...")
    const jumpTile = tiles.find((t) => t.tile_number === 5)!;
    expect(jumpTile.tile_type).toBe('jump');
    expect(jumpTile.action_jump_to).toBe(9);

    const resolution = driver.resolveTile(jumpTile);
    expect(resolution.actionType).toBe('jump');
    expect(resolution.destination).toBe(9);
    expect(resolution.extraRoll).toBe(true);
  });

  it('TC-T1-BD-05: should resolve La Muerte skull tile resetting pawn to tile 1 (Salida)', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Player1']);

    const tiles = driver.getActiveBoard();
    // Tile 37 is Calavera/Muerte
    const skullTile = tiles.find((t) => t.tile_number === 37)!;
    expect(skullTile.tile_type).toBe('trap_skull');

    const resolution = driver.resolveTile(skullTile);
    expect(resolution.actionType).toBe('trap_skull');
    expect(resolution.destination).toBe(1);
    expect(resolution.extraRoll).toBe(false);
  });

  it('TC-T1-BD-06: should resolve La Cárcel jail tile applying turns_lost without forwarding position', () => {
    const driver = new E2EGameDriver();
    driver.initBoardSession('guatoca_clasica', ['Player1']);

    const tiles = driver.getActiveBoard();
    // Tile 10 is La Cárcel
    const jailTile = tiles.find((t) => t.tile_number === 10)!;
    expect(jailTile.tile_type).toBe('trap_jail');

    const resolution = driver.resolveTile(jailTile);
    expect(resolution.actionType).toBe('trap_jail');
    expect(resolution.destination).toBe(10);
    expect(resolution.turnsLost).toBeGreaterThanOrEqual(1);
    expect(resolution.extraRoll).toBe(false);
  });
});
