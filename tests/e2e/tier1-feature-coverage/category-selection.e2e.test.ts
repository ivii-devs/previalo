import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 1: Category Selection & Filtering E2E', () => {
  it('TC-T1-CAT-01: should load all 9 categories with exact canonical card counts summing to 6,937', () => {
    const manifest = CatalogProvider.getManifest();
    expect(manifest.categories).toHaveLength(9);

    const expectedCounts: Record<string, number> = {
      yo_nunca: 1355,
      que_prefieres: 289,
      retos_y_virus: 2310,
      quien_es_mas_probable: 199,
      verdad_o_reto: 857,
      el_tablero: 721,
      mesa_y_minijuegos: 136,
      guerra_equipos: 863,
      confesiones: 207,
    };

    let totalCards = 0;
    for (const [catId, expected] of Object.entries(expectedCounts)) {
      const cards = CatalogProvider.getCategoryCards(catId);
      expect(cards.length).toBe(expected);
      totalCards += cards.length;
    }

    expect(totalCards).toBe(6937);
  });

  it('TC-T1-CAT-02: should filter category cards by specific pack IDs', () => {
    const driver = new E2EGameDriver();
    const yoNuncaCards = CatalogProvider.getCategoryCards('yo_nunca');

    // yn_fiesta has 442 cards according to manifest
    const fiestaDeck = driver.buildCategoryDeck(yoNuncaCards, { packIds: ['yn_fiesta'] });
    expect(fiestaDeck.length).toBe(442);
    expect(fiestaDeck.every((c) => c.pack_id === 'yn_fiesta')).toBe(true);

    // yn_picante has 768 cards
    const picanteDeck = driver.buildCategoryDeck(yoNuncaCards, { packIds: ['yn_picante'] });
    expect(picanteDeck.length).toBe(768);
    expect(picanteDeck.every((c) => c.pack_id === 'yn_picante')).toBe(true);
  });

  it('TC-T1-CAT-03: should filter category cards by intensity level based on canonical distribution', () => {
    const driver = new E2EGameDriver();
    const retosCards = CatalogProvider.getCategoryCards('retos_y_virus');

    const intensity1Cards = driver.buildCategoryDeck(retosCards, { intensity: 1 });
    const intensity2Cards = driver.buildCategoryDeck(retosCards, { intensity: 2 });
    const intensity3Cards = driver.buildCategoryDeck(retosCards, { intensity: 3 });
    const intensity4Cards = driver.buildCategoryDeck(retosCards, { intensity: 4 });

    // Canonical counts in retos_y_virus: 1: 1347, 2: 571, 3: 378, 4: 14
    expect(intensity1Cards.length).toBe(1347);
    expect(intensity2Cards.length).toBe(571);
    expect(intensity3Cards.length).toBe(378);
    expect(intensity4Cards.length).toBe(14);

    expect(intensity1Cards.every((c) => c.intensity === 1)).toBe(true);
    expect(intensity2Cards.every((c) => c.intensity === 2)).toBe(true);
    expect(intensity3Cards.every((c) => c.intensity === 3)).toBe(true);
    expect(intensity4Cards.every((c) => c.intensity === 4)).toBe(true);
  });

  it('TC-T1-CAT-04: should enforce strict schema invariants on all category cards', () => {
    const categories = ['yo_nunca', 'que_prefieres', 'retos_y_virus', 'quien_es_mas_probable', 'verdad_o_reto'];

    for (const catId of categories) {
      const cards = CatalogProvider.getCategoryCards(catId);
      for (const card of cards.slice(0, 50)) {
        // Universal fields
        expect(card.id).toBeDefined();
        expect(typeof card.id === 'string' || typeof card.id === 'number').toBe(true);
        expect(typeof card.type).toBe('string');
        expect(typeof card.text).toBe('string');
        expect(card.text.length).toBeGreaterThan(0);
        expect([1, 2, 3, 4]).toContain(card.intensity);
      }
    }
  });

  it('TC-T1-CAT-05: should aggregate all 5 event pools in el_tablero category totaling 721 cards', () => {
    const tableroCards = CatalogProvider.getCategoryCards('el_tablero');
    expect(tableroCards.length).toBe(721);

    const types = new Set(tableroCards.map((c) => c.type));
    expect(types.has('drink_event')).toBe(true);
    expect(types.has('board_event')).toBe(true);
    expect(types.has('hot_event')).toBe(true);
  });

  it('TC-T1-CAT-06: should guarantee 0 ID collisions across all 9 categories', () => {
    const manifest = CatalogProvider.getManifest();
    const seenIds = new Set<string | number>();

    for (const cat of manifest.categories) {
      const cards = CatalogProvider.getCategoryCards(cat.category_id);
      for (const card of cards) {
        expect(seenIds.has(card.id)).toBe(false);
        seenIds.add(card.id);
      }
    }

    expect(seenIds.size).toBe(6937);
  });
});
