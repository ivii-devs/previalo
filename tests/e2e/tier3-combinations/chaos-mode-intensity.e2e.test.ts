import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { Card } from '../harness/e2e-contracts';

describe('Tier 3: Pairwise Integration - Chaos Mode & Intensity Scaling E2E', () => {
  it('TC-T3-CHS-01: should enforce no more than 3 consecutive cards of the same category in Chaos deck', () => {
    const driver = new E2EGameDriver();
    const categories: Record<string, Card[]> = {
      yo_nunca: CatalogProvider.getCategoryCards('yo_nunca').slice(0, 30),
      retos_y_virus: CatalogProvider.getCategoryCards('retos_y_virus').slice(0, 30),
      que_prefieres: CatalogProvider.getCategoryCards('que_prefieres').slice(0, 30),
      verdad_o_reto: CatalogProvider.getCategoryCards('verdad_o_reto').slice(0, 30),
    };

    // Ensure category_id is set on cards
    for (const [catId, cards] of Object.entries(categories)) {
      cards.forEach((c) => (c.category_id = catId));
    }

    const chaosDeck = driver.buildChaosDeck(categories);
    expect(chaosDeck.length).toBeGreaterThan(50);

    let consecutive = 1;
    let prevCat = chaosDeck[0].category_id;

    for (let i = 1; i < chaosDeck.length; i++) {
      const currentCat = chaosDeck[i].category_id;
      if (currentCat && currentCat === prevCat) {
        consecutive++;
        expect(consecutive).toBeLessThanOrEqual(3);
      } else {
        consecutive = 1;
        prevCat = currentCat;
      }
    }
  });

  it('TC-T3-CHS-02: should strictly exclude guerra_equipos cards from Chaos deck', () => {
    const driver = new E2EGameDriver();
    const warCards = CatalogProvider.getCategoryCards('guerra_equipos').slice(0, 20);
    const ynCards = CatalogProvider.getCategoryCards('yo_nunca').slice(0, 20);

    warCards.forEach((c) => (c.category_id = 'guerra_equipos'));
    ynCards.forEach((c) => (c.category_id = 'yo_nunca'));

    const categories: Record<string, Card[]> = {
      guerra_equipos: warCards,
      yo_nunca: ynCards,
    };

    const chaosDeck = driver.buildChaosDeck(categories);
    const warCardsInChaos = chaosDeck.filter((c) => c.category_id === 'guerra_equipos');
    expect(warCardsInChaos).toHaveLength(0);
  });

  it('TC-T3-CHS-03: should scale {drinks} across all 4 intensity levels during Chaos gameplay', () => {
    const driver = new E2EGameDriver();
    const sampleDrinkCard: Card = {
      id: 9991,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      drinks_penalty: 2,
      intensity: 2,
    };

    const intensities: Array<{ level: 1 | 2 | 3 | 4; minDrinks: number; maxDrinks: number }> = [
      { level: 1, minDrinks: 1, maxDrinks: 1 },
      { level: 2, minDrinks: 1, maxDrinks: 2 },
      { level: 3, minDrinks: 2, maxDrinks: 3 },
      { level: 4, minDrinks: 3, maxDrinks: 10 },
    ];

    for (const { level, minDrinks, maxDrinks } of intensities) {
      driver.initCardsSession({
        players: ['PlayerX', 'PlayerY'],
        intensity: level,
        deckCards: [{ ...sampleDrinkCard }],
      });

      const res = driver.nextCard();
      expect(res.calculatedDrinks).toBeGreaterThanOrEqual(minDrinks);
      expect(res.calculatedDrinks).toBeLessThanOrEqual(maxDrinks);
    }
  });

  it('TC-T3-CHS-04: should filter Chaos deck by intensity level 2', () => {
    const driver = new E2EGameDriver();
    const categories: Record<string, Card[]> = {
      yo_nunca: CatalogProvider.getCategoryCards('yo_nunca').slice(0, 50),
      retos_y_virus: CatalogProvider.getCategoryCards('retos_y_virus').slice(0, 50),
    };

    const intensity2Chaos = driver.buildChaosDeck(categories, { intensity: 2 });
    expect(intensity2Chaos.length).toBeGreaterThan(0);
    expect(intensity2Chaos.every((c) => c.intensity === 2)).toBe(true);
  });

  it('TC-T3-CHS-05: should maintain interleaving invariant on a large 150-card Chaos session', () => {
    const driver = new E2EGameDriver();
    const categories: Record<string, Card[]> = {
      yo_nunca: CatalogProvider.getCategoryCards('yo_nunca').slice(0, 50),
      retos_y_virus: CatalogProvider.getCategoryCards('retos_y_virus').slice(0, 50),
      verdad_o_reto: CatalogProvider.getCategoryCards('verdad_o_reto').slice(0, 50),
    };

    for (const [catId, cards] of Object.entries(categories)) {
      cards.forEach((c) => (c.category_id = catId));
    }

    const chaosDeck = driver.buildChaosDeck(categories);
    expect(chaosDeck.length).toBeGreaterThanOrEqual(140);
    expect(chaosDeck.length).toBeLessThanOrEqual(150);

    let consecutive = 1;
    let prevCat = chaosDeck[0].category_id;

    for (let i = 1; i < chaosDeck.length; i++) {
      const curCat = chaosDeck[i].category_id;
      if (curCat === prevCat) {
        consecutive++;
        expect(consecutive).toBeLessThanOrEqual(3);
      } else {
        consecutive = 1;
        prevCat = curCat;
      }
    }
  });
});
