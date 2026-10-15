import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { Card } from '../harness/e2e-contracts';

describe('Tier 3: Pairwise Integration - Hot-Joining Player During Active Deck E2E', () => {
  it('TC-T3-HOT-01: should hot-join a 4th player mid-game and update player roster seamlessly', () => {
    const driver = new E2EGameDriver();
    const sampleCards: Card[] = Array.from({ length: 20 }, (_, i) => ({
      id: 100 + i,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      intensity: 2,
    }));

    driver.initCardsSession({
      players: ['Alice', 'Bob', 'Charlie'],
      intensity: 2,
      deckCards: sampleCards,
    });

    expect(driver.getPlayers()).toHaveLength(3);

    // Draw 5 cards with 3 players
    for (let i = 0; i < 5; i++) {
      driver.nextCard();
    }

    // Hot-join David mid-game
    const newPlayer = driver.hotJoinPlayer('David');
    expect(newPlayer.name).toBe('David');
    expect(driver.getPlayers()).toHaveLength(4);
    expect(newPlayer.sipCount).toBe(0);
  });

  it('TC-T3-HOT-02: should immediately include hot-joined player in candidate selection pool', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = Array.from({ length: 30 }, (_, i) => ({
      id: 200 + i,
      type: 'rule',
      text: '{player1} hace un brindis',
      intensity: 1,
    }));

    driver.initCardsSession({
      players: ['P1', 'P2', 'P3'],
      intensity: 1,
      deckCards: cards,
    });

    for (let i = 0; i < 10; i++) {
      driver.nextCard();
    }

    // Hot-join 'Elena'
    const elena = driver.hotJoinPlayer('Elena');

    // Draw next 15 cards
    let elenaPicked = false;
    for (let i = 0; i < 15; i++) {
      const res = driver.nextCard();
      if (res.assignedPlayers.some((p) => p.name === 'Elena')) {
        elenaPicked = true;
      }
    }

    expect(elenaPicked).toBe(true);
    expect(elena.targetCount).toBeGreaterThan(0);
  });

  it('TC-T3-HOT-03: should preserve prior player sip counts when new player joins with 0 sips', () => {
    const driver = new E2EGameDriver();
    const sipCard: Card = {
      id: 301,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      target: 'active_player',
      intensity: 2,
      drinks_penalty: 2,
    };
    const deck = Array.from({ length: 20 }, () => ({ ...sipCard }));

    driver.initCardsSession({
      players: ['Veteran1', 'Veteran2'],
      intensity: 2,
      deckCards: deck,
    });

    for (let i = 0; i < 8; i++) {
      driver.nextCard();
    }

    const [v1, v2] = driver.getPlayers();
    const sipsV1 = v1.sipCount;
    const sipsV2 = v2.sipCount;
    expect(sipsV1 + sipsV2).toBeGreaterThan(0);

    // Newbie joins
    const newbie = driver.hotJoinPlayer('Newbie');
    expect(newbie.sipCount).toBe(0);

    // Prior sips must remain unchanged
    expect(v1.sipCount).toBe(sipsV1);
    expect(v2.sipCount).toBe(sipsV2);
  });

  it('TC-T3-HOT-04: should enable cards with {player4} safely after reaching 4 players', () => {
    const driver = new E2EGameDriver();
    const quadCard: Card = {
      id: 401,
      type: 'quad',
      text: '{player1}, {player2}, {player3} y {player4} compiten todos',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['A', 'B', 'C'],
      intensity: 2,
      deckCards: [{ ...quadCard }, { ...quadCard }],
    });

    // Hot-join 4th player
    driver.hotJoinPlayer('D');
    expect(driver.getPlayers()).toHaveLength(4);

    const res = driver.nextCard();
    expect(res.assignedPlayers).toHaveLength(4);

    const names = new Set(res.assignedPlayers.map((p) => p.name));
    expect(names.size).toBe(4);
    expect(names.has('A')).toBe(true);
    expect(names.has('B')).toBe(true);
    expect(names.has('C')).toBe(true);
    expect(names.has('D')).toBe(true);
  });

  it('TC-T3-HOT-05: should support undo operation across cards drawn after hot-join', () => {
    const driver = new E2EGameDriver();
    const cards: Card[] = [
      { id: 501, type: 'rule', text: 'Card 1', intensity: 1 },
      { id: 502, type: 'rule', text: 'Card 2', intensity: 1 },
      { id: 503, type: 'rule', text: 'Card 3', intensity: 1 },
    ];

    driver.initCardsSession({
      players: ['Alpha', 'Beta'],
      intensity: 1,
      deckCards: cards,
    });

    driver.nextCard(); // card 1
    driver.hotJoinPlayer('Gamma'); // Gamma joins
    driver.nextCard(); // card 2
    driver.nextCard(); // card 3

    expect(driver.getCurrentIndex()).toBe(2);

    // Undo card 3
    expect(driver.undoCard()).toBe(true);
    expect(driver.getCurrentIndex()).toBe(1);

    // Gamma remains in player roster
    expect(driver.getPlayers()).toHaveLength(3);
    expect(driver.getPlayer('Gamma')).toBeDefined();
  });
});
