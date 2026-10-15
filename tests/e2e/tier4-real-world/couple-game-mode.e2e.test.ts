import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 4: Real-World Scenario - Romantic Couple Game Mode E2E', () => {
  it('TC-T4-CPL-01: should simulate a 30-card couple game session using modo_parejas preset', () => {
    const driver = new E2EGameDriver();
    const partners = ['Alex', 'Sam'];

    const parejasCards = CatalogProvider.getPresetCards('modo_parejas');
    expect(parejasCards).toHaveLength(395);

    const coupleDeck = driver.shuffle(parejasCards).slice(0, 30);

    driver.initCardsSession({
      players: partners,
      intensity: 1, // Chill mode for couples
      deckCards: coupleDeck,
    });

    expect(driver.getPlayers()).toHaveLength(2);

    for (let turn = 0; turn < 30; turn++) {
      const res = driver.nextCard();

      // Invariant: Unresolved player tokens must not leak into presentation text
      expect(res.interpolatedText).not.toContain('{player1}');
      expect(res.interpolatedText).not.toContain('{player2}');
      expect(res.interpolatedText).not.toContain('{drinks}');

      // Invariant: If both partners are named in prompt, they must be distinct
      if (res.assignedPlayers.length === 2) {
        expect(res.assignedPlayers[0].name).not.toBe(res.assignedPlayers[1].name);
        expect(
          res.interpolatedText.includes('Alex') && res.interpolatedText.includes('Sam')
        ).toBe(true);
      }

      // Invariant: Under Chill intensity (level 1), drinks must scale to 1 trago
      expect(res.calculatedDrinks).toBe(1);

      // Invariant: No team tokens in couple mode
      expect(res.interpolatedText).not.toContain('{team}');
      expect(res.card.category_id).not.toBe('guerra_equipos');
    }

    expect(driver.getCurrentIndex()).toBe(29);
  });

  it('TC-T4-CPL-02: should verify 100% of modo_parejas cards exclude team war packs', () => {
    const parejasCards = CatalogProvider.getPresetCards('modo_parejas');

    for (const card of parejasCards) {
      expect(card.category_id).not.toBe('guerra_equipos');
      expect(card.mode_scope).not.toBe('teams_only');
      expect(card.text).not.toContain('{team}');
    }
  });

  it('TC-T4-CPL-03: should distribute intimate prompts evenly between both partners', () => {
    const driver = new E2EGameDriver();
    const parejasCards = CatalogProvider.getPresetCards('modo_parejas').slice(0, 40);

    driver.initCardsSession({
      players: ['Leo', 'Mia'],
      intensity: 1,
      deckCards: parejasCards,
    });

    for (let i = 0; i < 40; i++) {
      driver.nextCard();
    }

    const [leo, mia] = driver.getPlayers();
    // Bounded distribution: difference in target counts should be small (<= 8)
    const diff = Math.abs(leo.targetCount - mia.targetCount);
    expect(diff).toBeLessThanOrEqual(8);
  });
});
