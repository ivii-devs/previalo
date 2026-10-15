import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 1: Preset Loading E2E', () => {
  it('TC-T1-PRE-01: should load curated preset modo_caliente with exactly 1,661 cards', () => {
    const meta = CatalogProvider.getPresetMeta('modo_caliente');
    expect(meta.name).toContain('Modo Caliente');
    expect(meta.card_count).toBe(1661);

    const cards = CatalogProvider.getPresetCards('modo_caliente');
    expect(cards).toHaveLength(1661);
  });

  it('TC-T1-PRE-02: should load curated preset modo_parejas with exactly 395 cards', () => {
    const meta = CatalogProvider.getPresetMeta('modo_parejas');
    expect(meta.name).toContain('Modo Parejas');
    expect(meta.card_count).toBe(395);

    const cards = CatalogProvider.getPresetCards('modo_parejas');
    expect(cards).toHaveLength(395);
  });

  it('TC-T1-PRE-03: should verify 100% of modo_caliente card IDs reference existing category cards', () => {
    const allCategoryCards = CatalogProvider.getAllCards();
    const validIds = new Set(allCategoryCards.map((c) => c.id));

    const calienteCards = CatalogProvider.getPresetCards('modo_caliente');
    const missing = calienteCards.filter((c) => !validIds.has(c.id));

    expect(missing).toHaveLength(0);
  });

  it('TC-T1-PRE-04: should verify 100% of modo_parejas card IDs reference existing category cards', () => {
    const allCategoryCards = CatalogProvider.getAllCards();
    const validIds = new Set(allCategoryCards.map((c) => c.id));

    const parejasCards = CatalogProvider.getPresetCards('modo_parejas');
    const missing = parejasCards.filter((c) => !validIds.has(c.id));

    expect(missing).toHaveLength(0);
  });

  it('TC-T1-PRE-05: should verify canonical intensity distributions in curated presets', () => {
    const driver = new E2EGameDriver();
    const calienteCards = CatalogProvider.getPresetCards('modo_caliente');
    const parejasCards = CatalogProvider.getPresetCards('modo_parejas');

    // modo_caliente is 100% intensity 3 (Hot)
    const calienteIntensity3 = driver.buildPresetDeck(calienteCards, { intensity: 3 });
    expect(calienteIntensity3.length).toBe(1661);
    expect(calienteIntensity3.every((c) => c.intensity === 3)).toBe(true);

    // modo_parejas has 387 intensity 2 cards and 8 intensity 3 cards
    const parejasIntensity2 = driver.buildPresetDeck(parejasCards, { intensity: 2 });
    const parejasIntensity3 = driver.buildPresetDeck(parejasCards, { intensity: 3 });
    expect(parejasIntensity2.length).toBe(387);
    expect(parejasIntensity3.length).toBe(8);
  });

  it('TC-T1-PRE-06: should verify schema integrity and non-empty text across all preset cards', () => {
    const presets = ['modo_caliente', 'modo_parejas'];
    for (const p of presets) {
      const cards = CatalogProvider.getPresetCards(p);
      for (const card of cards) {
        expect(card.id).toBeDefined();
        expect(typeof card.text).toBe('string');
        expect(card.text.trim().length).toBeGreaterThan(0);
        expect([1, 2, 3, 4]).toContain(card.intensity);
      }
    }
  });
});
