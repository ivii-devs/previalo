import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 1: Variable Token Detection & Replacement E2E', () => {
  it('TC-T1-TOK-01: should verify only canonical whitelisted tokens exist across all 6,937 cards', () => {
    const allCards = CatalogProvider.getAllCards();
    const tokenRegex = /\{([^}]+)\}/g;
    const foundTokens = new Set<string>();

    for (const card of allCards) {
      const matches = card.text.match(tokenRegex);
      if (matches) {
        matches.forEach((t) => foundTokens.add(t));
      }
    }

    const whitelistedTokens = new Set([
      '{player1}',
      '{player2}',
      '{player3}',
      '{player4}',
      '{drinks}',
      '{team}',
    ]);

    for (const token of foundTokens) {
      expect(whitelistedTokens.has(token)).toBe(true);
    }
  });

  it('TC-T1-TOK-02: should verify 0 broken braces or malformed interpolation markers', () => {
    const allCards = CatalogProvider.getAllCards();
    for (const card of allCards) {
      // Check for unmatched opening brace
      const opens = (card.text.match(/\{/g) || []).length;
      const closes = (card.text.match(/\}/g) || []).length;
      expect(opens).toBe(closes);

      // Check for malformed syntax
      expect(card.text).not.toContain('{{');
      expect(card.text).not.toContain('}}');
      expect(card.text).not.toContain('${');
      expect(card.text).not.toContain('%s');
    }
  });

  it('TC-T1-TOK-03: should scale {drinks} token dynamically according to session intensity', () => {
    const driver = new E2EGameDriver();
    const sampleCard = {
      id: 99999,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      intensity: 2 as const,
      drinks_penalty: 2,
    };

    // Level 1: Chill -> always 1 trago
    driver.initCardsSession({ players: ['Alice', 'Bob'], intensity: 1, deckCards: [sampleCard] });
    const resChill = driver.nextCard();
    expect(resChill.interpolatedText).toContain('1 trago');
    expect(resChill.calculatedDrinks).toBe(1);

    // Level 2: Fiesta -> 1-2 tragos
    driver.initCardsSession({ players: ['Alice', 'Bob'], intensity: 2, deckCards: [sampleCard] });
    const resFiesta = driver.nextCard();
    expect(resFiesta.calculatedDrinks).toBeGreaterThanOrEqual(1);
    expect(resFiesta.calculatedDrinks).toBeLessThanOrEqual(2);

    // Level 3: Hot -> 2-3 tragos
    driver.initCardsSession({ players: ['Alice', 'Bob'], intensity: 3, deckCards: [sampleCard] });
    const resHot = driver.nextCard();
    expect(resHot.calculatedDrinks).toBeGreaterThanOrEqual(2);
    expect(resHot.calculatedDrinks).toBeLessThanOrEqual(3);

    // Level 4: Extremo -> 3-5 tragos
    driver.initCardsSession({ players: ['Alice', 'Bob'], intensity: 4, deckCards: [sampleCard] });
    const resExtremo = driver.nextCard();
    expect(resExtremo.calculatedDrinks).toBeGreaterThanOrEqual(3);
  });

  it('TC-T1-TOK-04: should substitute {team} token without leaving unparsed placeholders', () => {
    const driver = new E2EGameDriver();
    const teamCard = {
      id: 88888,
      type: 'challenge',
      text: 'El {team} elige a un rival para un duelo',
      intensity: 2 as const,
    };

    driver.initCardsSession({
      players: ['Player A', 'Player B', 'Player C', 'Player D'],
      intensity: 2,
      deckCards: [teamCard],
    });

    const res = driver.nextCard();
    expect(res.interpolatedText).not.toContain('{team}');
    expect(res.interpolatedText).toMatch(/Equipo (Neón|Fuego)/);
  });

  it('TC-T1-TOK-05: should guarantee strict distinctness {player1} !== {player2} across 50 multi-player cards', () => {
    const driver = new E2EGameDriver();
    const cards = CatalogProvider.getCategoryCards('retos_y_virus');
    const pairCards = cards.filter((c) => c.text.includes('{player1}') && c.text.includes('{player2}')).slice(0, 50);

    expect(pairCards.length).toBeGreaterThanOrEqual(20);

    driver.initCardsSession({
      players: ['Elena', 'Marco', 'Lucia', 'Gonzalo'],
      intensity: 2,
      deckCards: pairCards,
    });

    for (let i = 0; i < pairCards.length; i++) {
      const res = driver.nextCard();
      expect(res.assignedPlayers.length).toBeGreaterThanOrEqual(2);
      const p1 = res.assignedPlayers[0];
      const p2 = res.assignedPlayers[1];
      expect(p1.id).not.toBe(p2.id);
      expect(p1.name).not.toBe(p2.name);
    }
  });

  it('TC-T1-TOK-06: should distribute player picks fairly with <= 15% deviation in 100 draws', () => {
    const driver = new E2EGameDriver();
    const singlePlayerCard = {
      id: 77777,
      type: 'rule',
      text: '{player1} debe confesar un secreto',
      intensity: 2 as const,
    };
    const deck = Array.from({ length: 100 }, () => ({ ...singlePlayerCard }));

    driver.initCardsSession({
      players: ['Player1', 'Player2', 'Player3', 'Player4'],
      intensity: 2,
      deckCards: deck,
    });

    for (let i = 0; i < 100; i++) {
      driver.nextCard();
    }

    const players = driver.getPlayers();
    const expectedPicksPerPlayer = 100 / 4; // 25
    const maxAllowedDeviation = 100 * 0.15; // 15 picks

    for (const p of players) {
      const deviation = Math.abs(p.targetCount - expectedPicksPerPlayer);
      expect(deviation).toBeLessThanOrEqual(maxAllowedDeviation);
    }
  });
});
