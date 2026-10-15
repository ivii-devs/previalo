import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 1: Card Drawing & Deck Navigation E2E', () => {
  it('TC-T1-DRAW-01: should shuffle cards into an unbiased permutation of identical length and members', () => {
    const driver = new E2EGameDriver();
    const original = CatalogProvider.getCategoryCards('que_prefieres').slice(0, 50);
    const shuffled = driver.shuffle(original);

    expect(shuffled).toHaveLength(original.length);
    const originalIds = new Set(original.map((c) => c.id));
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    expect(shuffledIds).toEqual(originalIds);

    // Permutation order should differ from original (probabilistic check)
    const matchesAtSameIndex = original.filter((c, i) => c.id === shuffled[i].id).length;
    expect(matchesAtSameIndex).toBeLessThan(original.length);
  });

  it('TC-T1-DRAW-02: should increment currentIndex monotonically on each sequential card draw', () => {
    const driver = new E2EGameDriver();
    const deck = CatalogProvider.getCategoryCards('retos_y_virus').slice(0, 20);
    driver.initCardsSession({
      players: ['Sofia', 'Mateo', 'Lucas'],
      intensity: 2,
      deckCards: deck,
    });

    expect(driver.getCurrentIndex()).toBe(-1);

    for (let expectedIdx = 0; expectedIdx < 10; expectedIdx++) {
      const result = driver.nextCard();
      expect(driver.getCurrentIndex()).toBe(expectedIdx);
      expect(result.card.id).toBe(deck[expectedIdx].id);
    }
  });

  it('TC-T1-DRAW-03: should yield interpolated card text without raw token placeholders for player1', () => {
    const driver = new E2EGameDriver();
    const cards = CatalogProvider.getCategoryCards('retos_y_virus');
    const player1Cards = cards.filter((c) => c.text.includes('{player1}')).slice(0, 15);

    driver.initCardsSession({
      players: ['Valentina', 'Joaquín'],
      intensity: 2,
      deckCards: player1Cards,
    });

    for (let i = 0; i < player1Cards.length; i++) {
      const res = driver.nextCard();
      expect(res.interpolatedText).not.toContain('{player1}');
      expect(
        res.interpolatedText.includes('Valentina') || res.interpolatedText.includes('Joaquín')
      ).toBe(true);
      expect(res.assignedPlayers.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('TC-T1-DRAW-04: should push each drawn card onto history stack with complete snapshot', () => {
    const driver = new E2EGameDriver();
    const cards = CatalogProvider.getCategoryCards('yo_nunca').slice(0, 10);

    driver.initCardsSession({
      players: ['Carla', 'Diego'],
      intensity: 1,
      deckCards: cards,
    });

    expect(driver.getHistoryLength()).toBe(0);

    for (let i = 1; i <= 5; i++) {
      driver.nextCard();
      expect(driver.getHistoryLength()).toBe(i);
    }
  });

  it('TC-T1-DRAW-05: should exhaust small deck gracefully and prevent overflow past deck length', () => {
    const driver = new E2EGameDriver();
    const smallDeck = CatalogProvider.getCategoryCards('mesa_y_minijuegos').slice(0, 5);

    driver.initCardsSession({
      players: ['Bruno', 'Camila'],
      intensity: 2,
      deckCards: smallDeck,
    });

    // Draw all 5 cards
    for (let i = 0; i < 5; i++) {
      expect(() => driver.nextCard()).not.toThrow();
    }
    expect(driver.getCurrentIndex()).toBe(4);

    // 6th draw must throw end of deck error
    expect(() => driver.nextCard()).toThrow(/End of deck reached/i);
  });

  it('TC-T1-DRAW-06: should preserve card payload identity across draws', () => {
    const driver = new E2EGameDriver();
    const cards = CatalogProvider.getCategoryCards('confesiones').slice(0, 10);

    driver.initCardsSession({
      players: ['Esteban', 'Florencia'],
      intensity: 3,
      deckCards: cards,
    });

    for (let i = 0; i < 5; i++) {
      const res = driver.nextCard();
      expect(res.card.id).toBe(cards[i].id);
      expect(res.rawText).toBe(cards[i].text);
      expect(res.card.intensity).toBe(cards[i].intensity);
    }
  });
});
