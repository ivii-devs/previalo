import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CatalogLoader,
  catalogLoader,
  loadManifest,
  loadCategory,
  loadPreset,
  loadBoard,
  clearCatalogCache,
  CATALOG_CACHE_KEYS,
  type CatalogManifest,
} from '../catalogLoader';
import type { Card } from '../../domain/types/card';
import type { BoardTile } from '../../domain/types/board';

// In-memory mock IDB storage
const mockIdbStore = new Map<string, any>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: IDBValidKey) => mockIdbStore.get(String(key))),
  set: vi.fn(async (key: IDBValidKey, val: any) => {
    mockIdbStore.set(String(key), val);
  }),
  del: vi.fn(async (key: IDBValidKey) => {
    mockIdbStore.delete(String(key));
  }),
  clear: vi.fn(async () => {
    mockIdbStore.clear();
  }),
}));

const mockManifest: CatalogManifest = {
  manifest_version: '1.0.0',
  app_name: 'Previalo',
  generated_at: '2026-10-14T20:00:00Z',
  license: 'Proprietary',
  global_stats: {
    total_categories: 2,
    total_cards: 10,
    total_unique_card_ids: 10,
    total_presets: 1,
    card_counts_by_intensity: { '1': 5, '2': 5 },
    token_system: ['player1', 'drinks'],
    sources_integrated: ['test'],
  },
  categories: [
    {
      category_id: 'yo_nunca',
      name: 'Yo Nunca',
      description: 'Confesiones',
      file: 'by_category/02_yo_nunca.json',
      card_count: 5,
    },
    {
      category_id: 'el_tablero',
      name: 'El Tablero',
      description: 'Tablero',
      file: 'by_category/07_el_tablero.json',
      card_count: 5,
    },
  ],
  presets: [
    {
      preset_id: 'modo_caliente',
      name: 'Modo Caliente',
      description: 'Hot',
      file: 'curated_presets/02_modo_caliente.json',
      card_count: 5,
    },
  ],
};

const mockYoNuncaCards: Card[] = [
  { id: 1, type: 'drink', text: 'Yo nunca he bebido', intensity: 1, category_id: 'yo_nunca' },
  { id: 2, type: 'drink', text: 'Yo nunca he bailado', intensity: 2, category_id: 'yo_nunca' },
];

const mockTableroData = {
  drink_events: [
    { id: 'd1', category_id: 'el_tablero', type: 'drink_event', text: 'Bebe 2', intensity: 1 },
  ],
  board_events: [
    { id: 'b1', category_id: 'el_tablero', type: 'board_event', text: 'Salta', intensity: 1 },
  ],
  hot_events_level1: [
    { id: 'h1', category_id: 'el_tablero', type: 'hot_event', text: 'Beso', intensity: 1 },
  ],
  hot_events_level2: [
    { id: 'h2', category_id: 'el_tablero', type: 'hot_event', text: 'Caricia', intensity: 2 },
  ],
  hot_events_level3: [
    { id: 'h3', category_id: 'el_tablero', type: 'hot_event', text: 'Reto hot', intensity: 3 },
  ],
  tiles_by_board: {
    guatoca_clasica: [
      {
        id: 1,
        board_id: 'guatoca_clasica',
        tile_number: 1,
        tile_type: 'start',
        title: 'Salida',
        description: 'Inicio',
        drinks_action: 0,
        target: 'none',
        action_jump_to: null,
        turns_lost: 0,
        icon: 'flag',
      },
      {
        id: 45,
        board_id: 'guatoca_clasica',
        tile_number: 45,
        tile_type: 'finish',
        title: 'Meta',
        description: 'Fin',
        drinks_action: 0,
        target: 'all',
        action_jump_to: null,
        turns_lost: 0,
        icon: 'trophy',
      },
    ] as BoardTile[],
    guatoca_hot: [
      {
        id: 1,
        board_id: 'guatoca_hot',
        tile_number: 1,
        tile_type: 'start',
        title: 'Antesala',
        description: 'Inicio Hot',
        drinks_action: 0,
        target: 'none',
        action_jump_to: null,
        turns_lost: 0,
        icon: 'flame',
      },
    ] as BoardTile[],
  },
};

describe('CatalogLoader Infrastructure Service', () => {
  beforeEach(async () => {
    mockIdbStore.clear();
    await CatalogLoader.clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadManifest', () => {
    it('should fetch from /data/catalog_manifest.json and cache in IndexedDB on first load', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockManifest,
      });
      vi.stubGlobal('fetch', fetchMock);

      const manifest = await CatalogLoader.loadManifest();

      expect(fetchMock).toHaveBeenCalledWith('/data/catalog_manifest.json');
      expect(manifest.app_name).toBe('Previalo');
      expect(manifest.categories).toHaveLength(2);

      // Verify cached in IDB
      expect(mockIdbStore.get(CATALOG_CACHE_KEYS.manifest)).toEqual(mockManifest);
    });

    it('should return from IndexedDB cache without network fetch on subsequent calls', async () => {
      mockIdbStore.set(CATALOG_CACHE_KEYS.manifest, mockManifest);
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const manifest = await CatalogLoader.loadManifest();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(manifest).toEqual(mockManifest);
    });

    it('should re-fetch and update IDB when forceRefresh is true', async () => {
      mockIdbStore.set(CATALOG_CACHE_KEYS.manifest, mockManifest);
      const updatedManifest = { ...mockManifest, app_name: 'Previalo Updated' };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => updatedManifest,
      });
      vi.stubGlobal('fetch', fetchMock);

      const manifest = await CatalogLoader.loadManifest({ forceRefresh: true });

      expect(fetchMock).toHaveBeenCalledWith('/data/catalog_manifest.json');
      expect(manifest.app_name).toBe('Previalo Updated');
      expect(mockIdbStore.get(CATALOG_CACHE_KEYS.manifest)).toEqual(updatedManifest);
    });

    it('should fall back to cached manifest when network request fails (offline)', async () => {
      mockIdbStore.set(CATALOG_CACHE_KEYS.manifest, mockManifest);
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error (Airplane Mode)'));
      vi.stubGlobal('fetch', fetchMock);

      const manifest = await CatalogLoader.loadManifest({ forceRefresh: true });

      expect(manifest).toEqual(mockManifest);
    });

    it('should throw an informative error when offline and not cached', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
      vi.stubGlobal('fetch', fetchMock);

      await expect(CatalogLoader.loadManifest()).rejects.toThrow(
        /Manifest unavailable offline and not in IndexedDB/
      );
    });
  });

  describe('loadCategory', () => {
    beforeEach(() => {
      mockIdbStore.set(CATALOG_CACHE_KEYS.manifest, mockManifest);
    });

    it('should fetch category cards, cache in IndexedDB with cat_ prefix, and return cards', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ cards: mockYoNuncaCards }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const cards = await CatalogLoader.loadCategory('yo_nunca');

      expect(fetchMock).toHaveBeenCalledWith('/data/by_category/02_yo_nunca.json');
      expect(cards).toHaveLength(2);
      expect(cards[0].id).toBe(1);

      // Verify IDB key
      expect(mockIdbStore.get('cat_yo_nunca')).toEqual(mockYoNuncaCards);
    });

    it('should return from IDB cache on repeated loadCategory calls without fetching', async () => {
      mockIdbStore.set('cat_yo_nunca', mockYoNuncaCards);
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const cards = await CatalogLoader.loadCategory('yo_nunca');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(cards).toEqual(mockYoNuncaCards);
    });

    it('should normalize 07_el_tablero by concatenating all 5 event pools', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockTableroData,
      });
      vi.stubGlobal('fetch', fetchMock);

      const cards = await CatalogLoader.loadCategory('el_tablero');

      expect(fetchMock).toHaveBeenCalledWith('/data/by_category/07_el_tablero.json');
      // 1 drink + 1 board + 1 hot1 + 1 hot2 + 1 hot3 = 5 total normalized cards
      expect(cards).toHaveLength(5);
      expect(cards.map((c) => c.id)).toEqual(['d1', 'b1', 'h1', 'h2', 'h3']);

      // Cached in IDB
      expect(mockIdbStore.get('cat_el_tablero')).toEqual(cards);
    });

    it('should throw an error for nonexistent category', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await expect(CatalogLoader.loadCategory('categoria_fantasma')).rejects.toThrow(
        /Category 'categoria_fantasma' not found in manifest/
      );
    });

    it('should fall back to cached cards when fetch fails offline', async () => {
      mockIdbStore.set('cat_yo_nunca', mockYoNuncaCards);
      const fetchMock = vi.fn().mockRejectedValue(new Error('Airplane mode'));
      vi.stubGlobal('fetch', fetchMock);

      const cards = await CatalogLoader.loadCategory('yo_nunca', { forceRefresh: true });

      expect(cards).toEqual(mockYoNuncaCards);
    });
  });

  describe('loadPreset', () => {
    beforeEach(() => {
      mockIdbStore.set(CATALOG_CACHE_KEYS.manifest, mockManifest);
    });

    it('should fetch preset cards, cache with preset_ prefix, and return cards', async () => {
      const presetCards: Card[] = [
        { id: 'hc_1', type: 'hot', text: 'Beso o trago', intensity: 3 },
      ];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ cards: presetCards }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const cards = await CatalogLoader.loadPreset('modo_caliente');

      expect(fetchMock).toHaveBeenCalledWith('/data/curated_presets/02_modo_caliente.json');
      expect(cards).toEqual(presetCards);
      expect(mockIdbStore.get('preset_modo_caliente')).toEqual(presetCards);
    });

    it('should throw error if preset ID is not found in manifest', async () => {
      await expect(CatalogLoader.loadPreset('preset_inexistente')).rejects.toThrow(
        /Preset 'preset_inexistente' not found in manifest/
      );
    });
  });

  describe('loadBoard', () => {
    beforeEach(() => {
      mockIdbStore.set(CATALOG_CACHE_KEYS.manifest, mockManifest);
    });

    it('should load guatoca_clasica tiles array from tiles_by_board and cache with board_ key', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockTableroData,
      });
      vi.stubGlobal('fetch', fetchMock);

      const tiles = await CatalogLoader.loadBoard('guatoca_clasica');

      expect(tiles).toHaveLength(2);
      expect(tiles[0].tile_type).toBe('start');
      expect(tiles[1].tile_type).toBe('finish');
      expect(mockIdbStore.get('board_guatoca_clasica')).toEqual(tiles);
    });

    it('should return from IDB cache on repeated loadBoard calls without fetching', async () => {
      const cachedTiles = mockTableroData.tiles_by_board.guatoca_clasica;
      mockIdbStore.set('board_guatoca_clasica', cachedTiles);
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const tiles = await CatalogLoader.loadBoard('guatoca_clasica');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(tiles).toEqual(cachedTiles);
    });

    it('should throw if requested board ID does not exist in tiles_by_board', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ tiles_by_board: {} }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(CatalogLoader.loadBoard('guatoca_clasica')).rejects.toThrow(
        /Board tiles for 'guatoca_clasica' not found/
      );
    });
  });

  describe('cache clearing & direct exports', () => {
    it('should clear specific key or entire cache', async () => {
      mockIdbStore.set('test_key', 'val');
      await CatalogLoader.clearCache('test_key');
      expect(mockIdbStore.has('test_key')).toBe(false);

      mockIdbStore.set('k1', 'v1');
      mockIdbStore.set('k2', 'v2');
      await clearCatalogCache();
      expect(mockIdbStore.size).toBe(0);
    });

    it('should support singleton and standalone helper functions', async () => {
      expect(typeof catalogLoader.loadManifest).toBe('function');
      expect(typeof catalogLoader.loadCategory).toBe('function');
      expect(typeof catalogLoader.loadPreset).toBe('function');
      expect(typeof catalogLoader.loadBoard).toBe('function');
      expect(typeof loadManifest).toBe('function');
      expect(typeof loadCategory).toBe('function');
      expect(typeof loadPreset).toBe('function');
      expect(typeof loadBoard).toBe('function');
    });
  });
});
