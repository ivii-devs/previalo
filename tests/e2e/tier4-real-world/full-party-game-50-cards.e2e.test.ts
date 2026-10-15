import { describe, it, expect } from 'vitest';
import { CatalogProvider } from '../harness/catalog-provider';
import { E2EGameDriver } from '../harness/e2e-game-driver';

describe('Tier 4: Real-World Scenario - 4-Friend 50-Card Party Game E2E', () => {
  it('TC-T4-PTY-01: should simulate a full 50-card party session with 4 players and verify all mechanics', () => {
    const driver = new E2EGameDriver();
    const friends = ['Lucas', 'Mateo', 'Sofia', 'Valentina'];

    const retos = CatalogProvider.getCategoryCards('retos_y_virus').slice(0, 25);
    const yoNunca = CatalogProvider.getCategoryCards('yo_nunca').slice(0, 15);
    const quePref = CatalogProvider.getCategoryCards('que_prefieres').slice(0, 10);
    const partyDeck = driver.shuffle([...retos, ...yoNunca, ...quePref]);

    driver.initCardsSession({
      players: friends,
      intensity: 2, // Fiesta
      deckCards: partyDeck,
    });

    expect(driver.getPlayers()).toHaveLength(4);

    let virusTriggerCount = 0;
    let virusExpiredCount = 0;

    for (let turn = 0; turn < 50; turn++) {
      const res = driver.nextCard();

      expect(res.interpolatedText).not.toContain('{player1}');
      expect(res.interpolatedText).not.toContain('{player2}');
      expect(res.interpolatedText).not.toContain('{drinks}');

      if (res.assignedPlayers.length >= 2) {
        const uniqueNames = new Set(res.assignedPlayers.map((p) => p.name));
        expect(uniqueNames.size).toBe(res.assignedPlayers.length);
      }

      if (res.card.type === 'virus') {
        virusTriggerCount++;
      }
      if (res.expiredViruses.length > 0) {
        virusExpiredCount += res.expiredViruses.length;
      }

      if (turn === 20) {
        const mateo = driver.getPlayer('Mateo')!;
        const before = mateo.sipCount;
        driver.adjustSips(mateo.id, 1);
        expect(mateo.sipCount).toBe(before + 1);
      }

      if (turn === 30) {
        expect(driver.undoCard()).toBe(true);
        expect(driver.getCurrentIndex()).toBe(29);
        const reDraw = driver.nextCard();
        expect(driver.getCurrentIndex()).toBe(30);
        expect(reDraw).toBeDefined();
      }
    }

    expect(driver.getCurrentIndex()).toBe(49);

    const players = driver.getPlayers();
    const totalPicks = players.reduce((sum, p) => sum + p.targetCount, 0);
    expect(totalPicks).toBeGreaterThanOrEqual(40);

    const avgPicks = totalPicks / 4;
    for (const p of players) {
      const deviation = Math.abs(p.targetCount - avgPicks);
      expect(deviation).toBeLessThanOrEqual(8);
    }

    const stats = driver.getPodiumStats();
    expect(stats.topDrinker).toBeDefined();
    expect(friends).toContain(stats.topDrinker.name);
    expect(stats.mostTargeted).toBeDefined();
    expect(friends).toContain(stats.mostTargeted.name);
    expect(stats.totalSips).toBeGreaterThan(0);
    expect(stats.leaderboard).toHaveLength(4);
  });

  it('TC-T4-PTY-02: should verify crash and reload recovery preserves party state', () => {
    const driver = new E2EGameDriver();
    const friends = ['Lucas', 'Mateo', 'Sofia', 'Valentina'];
    const cards = CatalogProvider.getCategoryCards('yo_nunca').slice(0, 20);

    driver.initCardsSession({
      players: friends,
      intensity: 2,
      deckCards: cards,
    });

    // Play 10 cards
    for (let i = 0; i < 10; i++) {
      driver.nextCard();
    }

    const savedIndex = driver.getCurrentIndex();
    const savedPlayers = driver.getPlayers().map((p) => ({ ...p }));
    const savedTheme = driver.getTheme();

    // Simulate serialized snapshot saved in localStorage
    const snapshotJSON = JSON.stringify({
      currentIndex: savedIndex,
      players: savedPlayers,
      theme: savedTheme,
    });

    // Simulate page reload: new driver rehydrates from snapshot
    const reloadedDriver = new E2EGameDriver();
    const restored = JSON.parse(snapshotJSON);
    reloadedDriver.initCardsSession({
      players: restored.players.map((p: any) => p.name),
      intensity: 2,
      deckCards: cards,
    });

    // Replay/fast-forward state
    for (let i = 0; i <= restored.currentIndex; i++) {
      reloadedDriver.nextCard();
    }

    expect(reloadedDriver.getCurrentIndex()).toBe(savedIndex);
    expect(reloadedDriver.getPlayers()).toHaveLength(4);
  });

  it('TC-T4-PTY-03: should track cumulative drinks per player accurately throughout party', () => {
    const driver = new E2EGameDriver();
    const drinkCard = {
      id: 9991,
      type: 'rule',
      text: '{player1} bebe {drinks}',
      target: 'active_player',
      intensity: 2 as const,
      drinks_penalty: 2,
    };
    const deck = Array.from({ length: 25 }, () => ({ ...drinkCard }));

    driver.initCardsSession({
      players: ['Player1', 'Player2', 'Player3'],
      intensity: 2,
      deckCards: deck,
    });

    for (let i = 0; i < 25; i++) {
      driver.nextCard();
    }

    const stats = driver.getPodiumStats();
    expect(stats.totalSips).toBe(25 * 2); // 25 cards * 2 sips each = 50 total sips
    const sumOfIndividual = driver.getPlayers().reduce((acc, p) => acc + p.sipCount, 0);
    expect(sumOfIndividual).toBe(50);
  });

  it('TC-T4-PTY-04: should generate ordered leaderboard on Podium screen', () => {
    const driver = new E2EGameDriver();
    driver.initCardsSession({
      players: ['Gold', 'Silver', 'Bronze'],
      intensity: 2,
    });

    driver.adjustSips(driver.getPlayer('Gold')!.id, 10);
    driver.adjustSips(driver.getPlayer('Silver')!.id, 7);
    driver.adjustSips(driver.getPlayer('Bronze')!.id, 3);

    const stats = driver.getPodiumStats();
    expect(stats.leaderboard[0].name).toBe('Gold');
    expect(stats.leaderboard[1].name).toBe('Silver');
    expect(stats.leaderboard[2].name).toBe('Bronze');
    expect(stats.topDrinker.name).toBe('Gold');
  });
});
