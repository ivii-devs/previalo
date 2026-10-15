import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { Card } from '../harness/e2e-contracts';

describe('Tier 2: Two Players Boundary & Token Distinctness E2E', () => {
  it('TC-T2-2PL-01: should guarantee strict distinctness {player1} !== {player2} in 100 consecutive draws with only 2 players', () => {
    const driver = new E2EGameDriver();
    const pairCard: Card = {
      id: 1001,
      type: 'duel',
      text: '{player1} y {player2} compiten en miradas fijas',
      intensity: 2,
    };
    const deck = Array.from({ length: 100 }, () => ({ ...pairCard }));

    driver.initCardsSession({
      players: ['Ana', 'Bob'],
      intensity: 2,
      deckCards: deck,
    });

    for (let i = 0; i < 100; i++) {
      const res = driver.nextCard();
      expect(res.assignedPlayers).toHaveLength(2);
      const [p1, p2] = res.assignedPlayers;
      expect(p1.name).not.toBe(p2.name);
      expect(res.interpolatedText).toContain('Ana');
      expect(res.interpolatedText).toContain('Bob');
      expect(res.interpolatedText).not.toContain('{player1}');
      expect(res.interpolatedText).not.toContain('{player2}');
    }
  });

  it('TC-T2-2PL-02: should gracefully handle cards with {player3} when only 2 players exist without crashing', () => {
    const driver = new E2EGameDriver();
    const trioCard: Card = {
      id: 1002,
      type: 'rule',
      text: '{player1}, {player2} y {player3} deben brindar juntos',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['PlayerOne', 'PlayerTwo'],
      intensity: 2,
      deckCards: [trioCard],
    });

    expect(() => {
      const res = driver.nextCard();
      expect(res.interpolatedText).not.toContain('{player1}');
      expect(res.interpolatedText).not.toContain('{player2}');
      expect(res.interpolatedText).not.toContain('{player3}');
    }).not.toThrow();
  });

  it('TC-T2-2PL-03: should gracefully handle cards with {player4} when only 2 players exist without crashing', () => {
    const driver = new E2EGameDriver();
    const quadCard: Card = {
      id: 1003,
      type: 'rule',
      text: '{player1}, {player2}, {player3} y {player4} forman dos equipos',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['Alpha', 'Beta'],
      intensity: 2,
      deckCards: [quadCard],
    });

    expect(() => {
      const res = driver.nextCard();
      expect(res.interpolatedText).not.toContain('{player4}');
    }).not.toThrow();
  });

  it('TC-T2-2PL-04: should preserve unicode accents, tildes, and emojis in player names', () => {
    const driver = new E2EGameDriver();
    const card: Card = {
      id: 1004,
      type: 'rule',
      text: '{player1} le guiña un ojo a {player2}',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['María José 💃', 'François Müller 🍻'],
      intensity: 2,
      deckCards: [card],
    });

    const res = driver.nextCard();
    expect(
      res.interpolatedText.includes('María José 💃') &&
      res.interpolatedText.includes('François Müller 🍻')
    ).toBe(true);
  });

  it('TC-T2-2PL-05: should distribute targets evenly between 2 players across 60 draws', () => {
    const driver = new E2EGameDriver();
    const card: Card = {
      id: 1005,
      type: 'rule',
      text: '{player1} debe beber 1 trago',
      intensity: 1,
    };
    const deck = Array.from({ length: 60 }, () => ({ ...card }));

    driver.initCardsSession({
      players: ['Carlos', 'Diana'],
      intensity: 1,
      deckCards: deck,
    });

    for (let i = 0; i < 60; i++) {
      driver.nextCard();
    }

    const [p1, p2] = driver.getPlayers();
    // In 60 draws, both should have between 21 and 39 picks (<= 15% deviation from expected 30)
    expect(p1.targetCount).toBeGreaterThanOrEqual(21);
    expect(p1.targetCount).toBeLessThanOrEqual(39);
    expect(p2.targetCount).toBeGreaterThanOrEqual(21);
    expect(p2.targetCount).toBeLessThanOrEqual(39);
  });

  it('TC-T2-2PL-06: should reject session initialization with empty player list', () => {
    const driver = new E2EGameDriver();
    expect(() => {
      driver.initCardsSession({ players: [], intensity: 2 });
    }).toThrow(/At least 1 player is required/);
  });
});
