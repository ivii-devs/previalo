import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { Card } from '../harness/e2e-contracts';

describe('Tier 3: Pairwise Integration - Undo After Virus Tick E2E', () => {
  it('TC-T3-UVT-01: should restore virus roundsRemaining when undoing a card transition', () => {
    const driver = new E2EGameDriver();
    const virusCard: Card = {
      id: 7001,
      type: 'virus',
      text: 'Regla del dinosaurio para {player1}',
      intensity: 2,
      chain: { chain_id: 'dino', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 3 },
    };
    const normalCard: Card = {
      id: 8001,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['PlayerA', 'PlayerB'],
      intensity: 2,
      deckCards: [virusCard, normalCard],
    });

    // 1. Draw virus card
    driver.nextCard();
    expect(driver.getActiveViruses()[0].roundsRemaining).toBe(3);

    // 2. Draw normal card -> ticks virus down to 2
    driver.nextCard();
    expect(driver.getActiveViruses()[0].roundsRemaining).toBe(2);

    // 3. Undo normal card -> virus roundsRemaining must be restored to 3
    const undoSuccess = driver.undoCard();
    expect(undoSuccess).toBe(true);
    expect(driver.getActiveViruses()[0].roundsRemaining).toBe(3);
  });

  it('TC-T3-UVT-02: should resurrect expired virus when undoing the card transition that caused expiration', () => {
    const driver = new E2EGameDriver();
    const virusCard: Card = {
      id: 7002,
      type: 'virus',
      text: 'Regla breve',
      intensity: 2,
      chain: { chain_id: 'brief', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 1 },
    };
    const normalCard: Card = {
      id: 8002,
      type: 'rule',
      text: 'Normal',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['PlayerA', 'PlayerB'],
      intensity: 2,
      deckCards: [virusCard, normalCard],
    });

    // Draw virus (rounds = 1)
    driver.nextCard();
    expect(driver.getActiveViruses()).toHaveLength(1);

    // Draw normal -> virus expires (rounds reaches 0)
    const res = driver.nextCard();
    expect(res.expiredViruses).toHaveLength(1);
    expect(driver.getActiveViruses()).toHaveLength(0);

    // Undo -> virus must be back in activeViruses with roundsRemaining = 1
    driver.undoCard();
    expect(driver.getActiveViruses()).toHaveLength(1);
    expect(driver.getActiveViruses()[0].roundsRemaining).toBe(1);
  });

  it('TC-T3-UVT-03: should cleanly remove virus from active list if its trigger card is undone', () => {
    const driver = new E2EGameDriver();
    const card0: Card = { id: 9000, type: 'rule', text: 'First card', intensity: 1 };
    const virusCard: Card = {
      id: 9001,
      type: 'virus',
      text: 'New Virus',
      intensity: 1,
      chain: { chain_id: 'new_v', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 3 },
    };

    driver.initCardsSession({
      players: ['Alice', 'Bob'],
      intensity: 1,
      deckCards: [card0, virusCard],
    });

    driver.nextCard(); // card 0
    expect(driver.getActiveViruses()).toHaveLength(0);

    driver.nextCard(); // virus card
    expect(driver.getActiveViruses()).toHaveLength(1);

    // Undo virus card
    driver.undoCard();
    expect(driver.getCurrentIndex()).toBe(0);
    expect(driver.getActiveViruses()).toHaveLength(0);
  });

  it('TC-T3-UVT-04: should revert awarded sips while concurrently restoring virus state on undo', () => {
    const driver = new E2EGameDriver();
    const virusCard: Card = {
      id: 7004,
      type: 'virus',
      text: 'Virus prompt',
      intensity: 2,
      chain: { chain_id: 'v4', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 4 },
    };
    const heavyDrinkCard: Card = {
      id: 8004,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      target: 'active_player',
      intensity: 4,
      drinks_penalty: 4,
    };

    driver.initCardsSession({
      players: ['Mateo', 'Sofia'],
      intensity: 4,
      deckCards: [virusCard, heavyDrinkCard],
    });

    driver.nextCard(); // virus
    const res2 = driver.nextCard(); // heavy drink
    const targetP = res2.assignedPlayers[0];
    const sipsAfterCard = targetP.sipCount;
    expect(sipsAfterCard).toBeGreaterThanOrEqual(4);

    // Undo heavy drink card
    driver.undoCard();

    // Verify sips reverted AND virus countdown reverted
    expect(driver.getPlayer(targetP.id)!.sipCount).toBe(0);
    expect(driver.getActiveViruses()[0].roundsRemaining).toBe(4);
  });

  it('TC-T3-UVT-05: should support re-advancing and re-ticking after undo', () => {
    const driver = new E2EGameDriver();
    const virus: Card = {
      id: 7005,
      type: 'virus',
      text: 'Rule',
      intensity: 2,
      chain: { chain_id: 'v5', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 3 },
    };
    const c1: Card = { id: 8005, type: 'rule', text: 'Step 1', intensity: 2 };
    const c2: Card = { id: 8006, type: 'rule', text: 'Step 2', intensity: 2 };

    driver.initCardsSession({
      players: ['P1', 'P2'],
      intensity: 2,
      deckCards: [virus, c1, c2],
    });

    driver.nextCard(); // virus (rounds = 3)
    driver.nextCard(); // c1 (rounds = 2)
    driver.undoCard(); // undo c1 (rounds = 3)

    // Re-draw c1
    const re1 = driver.nextCard();
    expect(re1.activeViruses[0].roundsRemaining).toBe(2);

    // Draw c2
    const re2 = driver.nextCard();
    expect(re2.activeViruses[0].roundsRemaining).toBe(1);
  });
});
