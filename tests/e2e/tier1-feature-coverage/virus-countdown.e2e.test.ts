import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { Card } from '../harness/e2e-contracts';

describe('Tier 1: Virus Lifecycle & Countdown E2E', () => {
  it('TC-T1-VIR-01: should register new active virus with duration when virus card is drawn', () => {
    const driver = new E2EGameDriver();
    const virusCard: Card = {
      id: 5001,
      type: 'virus',
      text: '{player1} tiene prohibido decir la palabra "no"',
      intensity: 2,
      chain: {
        chain_id: 'virus_no_say',
        chain_type: 'timed_virus',
        role: 'trigger',
        min_delay_cards: 4,
        max_delay_cards: 6,
      },
    };

    driver.initCardsSession({
      players: ['Santiago', 'Martina'],
      intensity: 2,
      deckCards: [virusCard],
    });

    expect(driver.getActiveViruses()).toHaveLength(0);

    const res = driver.nextCard();
    expect(res.activeViruses).toHaveLength(1);
    expect(res.activeViruses[0].cardId).toBe(5001);
    expect(res.activeViruses[0].roundsRemaining).toBe(4);
    expect(res.activeViruses[0].totalRounds).toBe(4);
    expect(res.activeViruses[0].targetPlayerName).toBeDefined();
  });

  it('TC-T1-VIR-02: should decrement roundsRemaining by 1 on each subsequent card transition', () => {
    const driver = new E2EGameDriver();
    const virusCard: Card = {
      id: 5002,
      type: 'virus',
      text: 'Regla del silencio para {player1}',
      intensity: 2,
      chain: { chain_id: 'silence', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 3 },
    };
    const normalCard: Card = {
      id: 6001,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['Ignacio', 'Paula'],
      intensity: 2,
      deckCards: [virusCard, normalCard, normalCard],
    });

    // Draw virus card (round 1)
    const res1 = driver.nextCard();
    expect(res1.activeViruses[0].roundsRemaining).toBe(3);

    // Draw regular card (round 2) -> decrements to 2
    const res2 = driver.nextCard();
    expect(res2.activeViruses[0].roundsRemaining).toBe(2);

    // Draw regular card (round 3) -> decrements to 1
    const res3 = driver.nextCard();
    expect(res3.activeViruses[0].roundsRemaining).toBe(1);
  });

  it('TC-T1-VIR-03: should detect expiration at 0 and move virus to expiredViruses', () => {
    const driver = new E2EGameDriver();
    const virusCard: Card = {
      id: 5003,
      type: 'virus',
      text: 'Beber con la mano izquierda',
      intensity: 2,
      chain: { chain_id: 'left_hand', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 2 },
    };
    const normalCard: Card = {
      id: 6002,
      type: 'rule',
      text: 'Todos beben {drinks}',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['Lucas', 'Valeria'],
      intensity: 2,
      deckCards: [virusCard, normalCard, normalCard],
    });

    // Draw virus (initial remaining = 2)
    driver.nextCard();
    // 1st transition (remaining = 1)
    const res1 = driver.nextCard();
    expect(res1.activeViruses).toHaveLength(1);
    expect(res1.expiredViruses).toHaveLength(0);

    // 2nd transition (remaining = 0 -> expired!)
    const res2 = driver.nextCard();
    expect(res2.activeViruses).toHaveLength(0);
    expect(res2.expiredViruses).toHaveLength(1);
    expect(res2.expiredViruses[0].cardId).toBe(5003);
  });

  it('TC-T1-VIR-04: should support multiple simultaneous active viruses with independent countdowns', () => {
    const driver = new E2EGameDriver();
    const virus1: Card = {
      id: 5010,
      type: 'virus',
      text: 'Virus A',
      intensity: 2,
      chain: { chain_id: 'v_a', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 4 },
    };
    const virus2: Card = {
      id: 5020,
      type: 'virus',
      text: 'Virus B',
      intensity: 2,
      chain: { chain_id: 'v_b', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 2 },
    };
    const normal: Card = {
      id: 6010,
      type: 'rule',
      text: 'Card normal',
      intensity: 2,
    };

    driver.initCardsSession({
      players: ['Andres', 'Belen'],
      intensity: 2,
      deckCards: [virus1, virus2, normal],
    });

    // Draw virus1
    driver.nextCard();
    expect(driver.getActiveViruses()).toHaveLength(1);
    expect(driver.getActiveViruses()[0].roundsRemaining).toBe(4);

    // Draw virus2 (virus1 decrements to 3, virus2 registered with 2)
    const res2 = driver.nextCard();
    expect(res2.activeViruses).toHaveLength(2);
    expect(res2.activeViruses.find((v) => v.cardId === 5010)?.roundsRemaining).toBe(3);
    expect(res2.activeViruses.find((v) => v.cardId === 5020)?.roundsRemaining).toBe(2);

    // Draw normal (virus1 decrements to 2, virus2 decrements to 1)
    const res3 = driver.nextCard();
    expect(res3.activeViruses).toHaveLength(2);
    expect(res3.activeViruses.find((v) => v.cardId === 5010)?.roundsRemaining).toBe(2);
    expect(res3.activeViruses.find((v) => v.cardId === 5020)?.roundsRemaining).toBe(1);
  });

  it('TC-T1-VIR-05: should handle dual virus expiration on the exact same card transition', () => {
    const driver = new E2EGameDriver();
    const virus1: Card = {
      id: 5030,
      type: 'virus',
      text: 'Virus 1',
      intensity: 2,
      chain: { chain_id: 'v1', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 1 },
    };
    const virus2: Card = {
      id: 5040,
      type: 'virus',
      text: 'Virus 2',
      intensity: 2,
      chain: { chain_id: 'v2', chain_type: 'timed_virus', role: 'trigger', min_delay_cards: 1 },
    };
    const normal: Card = {
      id: 6020,
      type: 'rule',
      text: 'Normal',
      intensity: 2,
    };

    // Note: virus1 will tick once on virus2 draw (so 1 -> 0, expires).
    // Let's test with 2 rounds on both
    const vA: Card = { ...virus1, chain: { ...virus1.chain!, min_delay_cards: 2 } };
    const vB: Card = { ...virus2, chain: { ...virus2.chain!, min_delay_cards: 1 } };

    driver.initCardsSession({
      players: ['Player1', 'Player2'],
      intensity: 2,
      deckCards: [vA, vB, normal],
    });

    driver.nextCard(); // vA created (rounds = 2)
    driver.nextCard(); // vA decremented to 1, vB created (rounds = 1)
    const res = driver.nextCard(); // Both vA and vB decrement to 0 and expire together!

    expect(res.expiredViruses).toHaveLength(2);
    expect(res.activeViruses).toHaveLength(0);
  });

  it('TC-T1-VIR-06: should verify real canonical virus cards from retos_y_virus trigger valid lifecycle', () => {
    const retosCards = CatalogProvider.getCategoryCards('retos_y_virus');
    const realVirus = retosCards.find((c) => c.type === 'virus' && c.chain?.chain_type === 'timed_virus');
    expect(realVirus).toBeDefined();

    const normalCard = retosCards.find((c) => c.type !== 'virus')!;

    const driver = new E2EGameDriver();
    driver.initCardsSession({
      players: ['TestUser1', 'TestUser2'],
      intensity: 2,
      deckCards: [realVirus!, normalCard],
    });

    const res = driver.nextCard();
    expect(res.activeViruses.length).toBe(1);
    expect(res.activeViruses[0].cardId).toBe(realVirus!.id);
    expect(res.activeViruses[0].roundsRemaining).toBeGreaterThan(0);
  });
});
