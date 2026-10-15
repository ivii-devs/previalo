import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { Card } from '../harness/e2e-contracts';

describe('Tier 2: Empty & Exhausted Deck Boundary E2E', () => {
  it('TC-T2-EMP-01: should throw error when drawing from an empty deck (0 cards)', () => {
    const driver = new E2EGameDriver();
    driver.initCardsSession({
      players: ['Player1', 'Player2'],
      intensity: 2,
      deckCards: [],
    });

    expect(() => driver.nextCard()).toThrow(/Deck is empty/);
    expect(driver.getCurrentIndex()).toBe(-1);
  });

  it('TC-T2-EMP-02: should allow exactly 1 draw from a 1-card deck and throw on 2nd draw', () => {
    const driver = new E2EGameDriver();
    const singleCard: Card = {
      id: 999,
      type: 'rule',
      text: 'The lonely card',
      intensity: 1,
    };

    driver.initCardsSession({
      players: ['Player1', 'Player2'],
      intensity: 1,
      deckCards: [singleCard],
    });

    // 1st draw succeeds
    const res = driver.nextCard();
    expect(res.card.id).toBe(999);
    expect(driver.getCurrentIndex()).toBe(0);

    // 2nd draw fails
    expect(() => driver.nextCard()).toThrow(/End of deck reached/);
    expect(driver.getCurrentIndex()).toBe(0);
  });

  it('TC-T2-EMP-03: should prevent currentIndex from advancing beyond deck bounds on repeated draws', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = [
      { id: 1, type: 'rule', text: 'Card 1', intensity: 2 },
      { id: 2, type: 'rule', text: 'Card 2', intensity: 2 },
    ];

    driver.initCardsSession({
      players: ['Alpha', 'Beta'],
      intensity: 2,
      deckCards: cards,
    });

    driver.nextCard(); // index 0
    driver.nextCard(); // index 1

    expect(() => driver.nextCard()).toThrow(/End of deck/);
    expect(driver.getCurrentIndex()).toBe(1);

    expect(() => driver.nextCard()).toThrow(/End of deck/);
    expect(driver.getCurrentIndex()).toBe(1);
  });

  it('TC-T2-EMP-04: should allow undo from the final card of an exhausted deck', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = [
      { id: 10, type: 'rule', text: 'A', intensity: 1 },
      { id: 20, type: 'rule', text: 'B', intensity: 1 },
    ];

    driver.initCardsSession({
      players: ['Gamma', 'Delta'],
      intensity: 1,
      deckCards: cards,
    });

    driver.nextCard();
    driver.nextCard();

    // Now at end of deck
    expect(driver.getCurrentIndex()).toBe(1);

    // Undo should work and step back to card 0
    const undoSuccess = driver.undoCard();
    expect(undoSuccess).toBe(true);
    expect(driver.getCurrentIndex()).toBe(0);

    // Can now draw card 1 again
    const reDraw = driver.nextCard();
    expect(reDraw.card.id).toBe(20);
    expect(driver.getCurrentIndex()).toBe(1);
  });

  it('TC-T2-EMP-05: should reset session state when re-initialized with fresh deck', () => {
    const driver = new E2EGameDriver();
    const firstDeck: Card[] = [{ id: 1, type: 'rule', text: 'Old', intensity: 1 }];

    driver.initCardsSession({
      players: ['P1', 'P2'],
      intensity: 1,
      deckCards: firstDeck,
    });
    driver.nextCard();
    expect(driver.getCurrentIndex()).toBe(0);

    const freshDeck: Card[] = [
      { id: 100, type: 'rule', text: 'New 1', intensity: 2 },
      { id: 200, type: 'rule', text: 'New 2', intensity: 2 },
    ];
    driver.initCardsSession({
      players: ['P1', 'P2'],
      intensity: 2,
      deckCards: freshDeck,
    });

    expect(driver.getCurrentIndex()).toBe(-1);
    expect(driver.getHistoryLength()).toBe(0);
    expect(driver.getDeck()).toHaveLength(2);
  });

  it('TC-T2-EMP-06: should handle building deck with non-matching pack filter gracefully', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = [
      { id: 1, pack_id: 'pack_a', type: 'rule', text: 'Card', intensity: 1 },
    ];

    const emptyResult = driver.buildCategoryDeck(cards, { packIds: ['non_existent_pack'] });
    expect(emptyResult).toHaveLength(0);
  });
});
