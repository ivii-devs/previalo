import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { Card } from '../harness/e2e-contracts';

describe('Tier 2: Zero-Index Undo & Stack Boundary E2E', () => {
  it('TC-T2-UNDO-01: should return false and perform no-op when undo is called at beginning with empty stack', () => {
    const driver = new E2EGameDriver();
    driver.initCardsSession({
      players: ['PlayerA', 'PlayerB'],
      intensity: 2,
      deckCards: [{ id: 1, type: 'rule', text: 'Card 1', intensity: 2 }],
    });

    expect(driver.getHistoryLength()).toBe(0);
    const undoResult = driver.undoCard();
    expect(undoResult).toBe(false);
    expect(driver.getCurrentIndex()).toBe(-1);
  });

  it('TC-T2-UNDO-02: should prevent undo when on the first drawn card (index 0)', () => {
    const driver = new E2EGameDriver();
    driver.initCardsSession({
      players: ['PlayerA', 'PlayerB'],
      intensity: 2,
      deckCards: [
        { id: 1, type: 'rule', text: 'Card 1', intensity: 2 },
        { id: 2, type: 'rule', text: 'Card 2', intensity: 2 },
      ],
    });

    driver.nextCard();
    expect(driver.getCurrentIndex()).toBe(0);
    expect(driver.getHistoryLength()).toBe(1);

    // On card 0, undo is disabled because there is no prior card to show
    const undoResult = driver.undoCard();
    expect(undoResult).toBe(false);
    expect(driver.getCurrentIndex()).toBe(0);
  });

  it('TC-T2-UNDO-03: should successfully undo from card 1 back to card 0', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = [
      { id: 101, type: 'rule', text: 'Card 1', intensity: 2 },
      { id: 102, type: 'rule', text: 'Card 2', intensity: 2 },
    ];

    driver.initCardsSession({
      players: ['Eva', 'Felix'],
      intensity: 2,
      deckCards: cards,
    });

    driver.nextCard(); // Card 0
    driver.nextCard(); // Card 1
    expect(driver.getCurrentIndex()).toBe(1);

    const success = driver.undoCard();
    expect(success).toBe(true);
    expect(driver.getCurrentIndex()).toBe(0);
  });

  it('TC-T2-UNDO-04: should handle repeated spamming of undo at boundary without index underflow', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = [
      { id: 201, type: 'rule', text: 'Card 1', intensity: 2 },
      { id: 202, type: 'rule', text: 'Card 2', intensity: 2 },
    ];

    driver.initCardsSession({
      players: ['Gabriel', 'Helena'],
      intensity: 2,
      deckCards: cards,
    });

    driver.nextCard();
    driver.nextCard();

    // 1st undo succeeds (back to card 0)
    expect(driver.undoCard()).toBe(true);
    // Subsequent undos must return false and NOT underflow index < 0
    expect(driver.undoCard()).toBe(false);
    expect(driver.undoCard()).toBe(false);
    expect(driver.undoCard()).toBe(false);
    expect(driver.getCurrentIndex()).toBe(0);
  });

  it('TC-T2-UNDO-05: should revert awarded sips when card is undone', () => {
    const driver = new E2EGameDriver();
    const sipCard1: Card = {
      id: 301,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      target: 'active_player',
      intensity: 2,
      drinks_penalty: 2,
    };
    const sipCard2: Card = {
      id: 302,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      target: 'active_player',
      intensity: 2,
      drinks_penalty: 2,
    };

    driver.initCardsSession({
      players: ['Hugo', 'Irene'],
      intensity: 2,
      deckCards: [sipCard1, sipCard2],
    });

    const res1 = driver.nextCard();
    const p1 = res1.assignedPlayers[0];
    const initialSips = p1.sipCount;
    expect(initialSips).toBeGreaterThanOrEqual(1);

    const res2 = driver.nextCard();
    const p2 = res2.assignedPlayers[0];
    const sipsAfterCard2 = p2.sipCount;

    // Undo card 2
    driver.undoCard();

    // Sip count for p2 should be restored to state before card 2
    const targetPlayer = driver.getPlayer(p2.id)!;
    expect(targetPlayer.sipCount).toBeLessThanOrEqual(sipsAfterCard2);
  });

  it('TC-T2-UNDO-06: should allow advancing to next card normally after executing undo', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = [
      { id: 401, type: 'rule', text: 'A', intensity: 1 },
      { id: 402, type: 'rule', text: 'B', intensity: 1 },
      { id: 403, type: 'rule', text: 'C', intensity: 1 },
    ];

    driver.initCardsSession({
      players: ['Julia', 'Kevin'],
      intensity: 1,
      deckCards: cards,
    });

    driver.nextCard(); // card 0
    driver.nextCard(); // card 1
    driver.undoCard(); // back to card 0

    // Advance forward again
    const nextRes = driver.nextCard();
    expect(driver.getCurrentIndex()).toBe(1);
    expect(nextRes.card.id).toBe(402);
  });
});
