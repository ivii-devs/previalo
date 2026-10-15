/**
 * Unit & Integration Tests: usePlayerStore
 * Verifies player roster management, neon color/avatar auto-assignment,
 * sips & timesTargeted counter updates, Quick Add history persistence in localStorage.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Setup browser globals for Node test environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const mockStorage = new MockLocalStorage();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockStorage },
    writable: true,
  });
} else if (!globalThis.window.localStorage) {
  (globalThis.window as any).localStorage = mockStorage;
}

import { usePlayerStore, NEON_COLORS, NEON_AVATARS } from '../usePlayerStore';

describe('usePlayerStore (R4)', () => {
  beforeEach(() => {
    mockStorage.clear();
    usePlayerStore.setState({
      players: [],
      historicalPlayers: [],
    });
  });

  it('TC-PLY-01: should add player with auto-assigned vibrant neon colors and avatars', () => {
    const p1 = usePlayerStore.getState().addPlayer('Nico');
    expect(p1).toBeDefined();
    expect(p1?.name).toBe('Nico');
    expect(p1?.color).toBe(NEON_COLORS[0]);
    expect(p1?.avatar).toBe(NEON_AVATARS[0]);
    expect(p1?.sips).toBe(0);
    expect(p1?.timesTargeted).toBe(0);

    const p2 = usePlayerStore.getState().addPlayer('Sofía');
    expect(p2?.name).toBe('Sofía');
    expect(p2?.color).toBe(NEON_COLORS[1]);
    expect(p2?.avatar).toBe(NEON_AVATARS[1]);

    const activePlayers = usePlayerStore.getState().players;
    expect(activePlayers).toHaveLength(2);
  });

  it('TC-PLY-02: should automatically track added players in historicalPlayers for 1-tap Quick Add', () => {
    usePlayerStore.getState().addPlayer('Mateo');
    usePlayerStore.getState().addPlayer('Lucía');

    const history = usePlayerStore.getState().historicalPlayers;
    expect(history).toContain('Mateo');
    expect(history).toContain('Lucía');
    expect(history).toHaveLength(2);

    // Adding existing name should not duplicate in history
    usePlayerStore.getState().addPlayer('Mateo');
    expect(usePlayerStore.getState().historicalPlayers).toHaveLength(2);
  });

  it('TC-PLY-03: should remove player by id without removing from historicalPlayers', () => {
    const p1 = usePlayerStore.getState().addPlayer('Tomás')!;
    usePlayerStore.getState().addPlayer('Camila');

    expect(usePlayerStore.getState().players).toHaveLength(2);
    usePlayerStore.getState().removePlayer(p1.id);

    expect(usePlayerStore.getState().players).toHaveLength(1);
    expect(usePlayerStore.getState().players[0].name).toBe('Camila');
    // History retains both
    expect(usePlayerStore.getState().historicalPlayers).toContain('Tomás');
  });

  it('TC-PLY-04: should update player properties (e.g. custom color or avatar)', () => {
    const p = usePlayerStore.getState().addPlayer('Joaquín')!;
    usePlayerStore.getState().updatePlayer(p.id, {
      color: '#ffffff',
      avatar: '👑',
    });

    const updated = usePlayerStore.getState().players.find((pl) => pl.id === p.id);
    expect(updated?.color).toBe('#ffffff');
    expect(updated?.avatar).toBe('👑');
  });

  it('TC-PLY-05: should add sips and clamp to >= 0 when decremented', () => {
    const p = usePlayerStore.getState().addPlayer('Elena')!;

    usePlayerStore.getState().addSips(p.id, 3);
    let current = usePlayerStore.getState().players.find((pl) => pl.id === p.id);
    expect(current?.sips).toBe(3);
    expect(current?.sipCount).toBe(3);

    // Subtract 1
    usePlayerStore.getState().addSips(p.id, -1);
    current = usePlayerStore.getState().players.find((pl) => pl.id === p.id);
    expect(current?.sips).toBe(2);

    // Subtract 10 (should clamp to 0)
    usePlayerStore.getState().addSips(p.id, -10);
    current = usePlayerStore.getState().players.find((pl) => pl.id === p.id);
    expect(current?.sips).toBe(0);
    expect(current?.sipCount).toBe(0);
  });

  it('TC-PLY-06: should increment timesTargeted and targetCount correctly', () => {
    const p = usePlayerStore.getState().addPlayer('Andrés')!;
    expect(p.timesTargeted).toBe(0);

    usePlayerStore.getState().incrementTargeted(p.id);
    usePlayerStore.getState().incrementTargeted(p.id);

    const current = usePlayerStore.getState().players.find((pl) => pl.id === p.id);
    expect(current?.timesTargeted).toBe(2);
    expect(current?.targetCount).toBe(2);
  });

  it('TC-PLY-07: quickAddPlayer should re-add player from history if not active, or return null if active', () => {
    usePlayerStore.setState({
      players: [],
      historicalPlayers: ['Martina', 'Lucas', 'Valentina'],
    });

    // Quick add Martina (not active yet)
    const added = usePlayerStore.getState().quickAddPlayer('Martina');
    expect(added).toBeDefined();
    expect(added?.name).toBe('Martina');
    expect(usePlayerStore.getState().players).toHaveLength(1);

    // Quick add Martina again (already active) -> should return null
    const duplicate = usePlayerStore.getState().quickAddPlayer('Martina');
    expect(duplicate).toBeNull();
    expect(usePlayerStore.getState().players).toHaveLength(1);
  });

  it('TC-PLY-08: should remove player from historicalPlayers', () => {
    usePlayerStore.setState({
      players: [],
      historicalPlayers: ['Felipe', 'Bárbara'],
    });

    usePlayerStore.getState().removeHistoricalPlayer('Felipe');
    expect(usePlayerStore.getState().historicalPlayers).toEqual(['Bárbara']);
  });

  it('TC-PLY-09: resetPlayerStats should reset drink and target counters to 0 for a new game', () => {
    const p1 = usePlayerStore.getState().addPlayer('Gabi')!;
    const p2 = usePlayerStore.getState().addPlayer('Leo')!;

    usePlayerStore.getState().addSips(p1.id, 5);
    usePlayerStore.getState().incrementTargeted(p1.id);
    usePlayerStore.getState().addSips(p2.id, 2);

    usePlayerStore.getState().resetPlayerStats();

    const players = usePlayerStore.getState().players;
    for (const pl of players) {
      expect(pl.sips).toBe(0);
      expect(pl.sipCount).toBe(0);
      expect(pl.timesTargeted).toBe(0);
      expect(pl.targetCount).toBe(0);
    }
  });

  it('TC-PLY-10: clearPlayers should clear active roster while preserving historical list', () => {
    usePlayerStore.getState().addPlayer('Diego');
    usePlayerStore.getState().addPlayer('Carla');

    expect(usePlayerStore.getState().players).toHaveLength(2);
    expect(usePlayerStore.getState().historicalPlayers).toHaveLength(2);

    usePlayerStore.getState().clearPlayers();

    expect(usePlayerStore.getState().players).toHaveLength(0);
    expect(usePlayerStore.getState().historicalPlayers).toHaveLength(2);
  });

  it('TC-PLY-11: should persist historicalPlayers in localStorage under previalo_player_history', () => {
    usePlayerStore.getState().addPlayer('Pablo');
    usePlayerStore.getState().addPlayer('Florencia');

    const raw = mockStorage.getItem('previalo_player_history');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.historicalPlayers).toContain('Pablo');
    expect(parsed.state.historicalPlayers).toContain('Florencia');
  });
});
