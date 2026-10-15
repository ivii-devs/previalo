/**
 * Previalo Infrastructure: CatalogLoader
 * Loads catalog manifest, categories, presets, and boards on-demand
 * with client-side IndexedDB caching (idb-keyval) and robust offline fallbacks.
 */

import { get, set, del, clear } from 'idb-keyval';
import type { Card } from '../domain/types/card';
import type { BoardTile, BoardId } from '../domain/types/board';

export interface CatalogPackMeta {
  id?: string;
  pack_id?: string;
  name: string;
  intensity?: number;
  count?: number;
  actual_count?: number;
  card_count?: number;
}

export interface CatalogCategoryMeta {
  category_id: string;
  name: string;
  description: string;
  file: string;
  size_bytes?: number;
  sha256?: string;
  card_count: number;
  packs?: CatalogPackMeta[];
  icon?: string;
  color?: string;
}

export interface CatalogPresetMeta {
  preset_id: string;
  name: string;
  description: string;
  file: string;
  size_bytes?: number;
  sha256?: string;
  card_count: number;
  icon?: string;
}

export interface CatalogGlobalStats {
  total_categories: number;
  total_cards: number;
  total_unique_card_ids: number;
  total_presets: number;
  card_counts_by_intensity: Record<string, number>;
  token_system: string[];
  sources_integrated: string[];
}

export interface CatalogManifest {
  manifest_version: string;
  app_name: string;
  generated_at: string;
  license: string;
  global_stats: CatalogGlobalStats;
  categories: CatalogCategoryMeta[];
  presets: CatalogPresetMeta[];
}

export interface CatalogLoaderOptions {
  forceRefresh?: boolean;
  basePath?: string;
}

export const CATALOG_CACHE_KEYS = {
  manifest: 'previalo_catalog_manifest',
  category: (id: string) => `cat_${id}`,
  preset: (id: string) => `preset_${id}`,
  board: (id: string) => `board_${id}`,
} as const;

export class CatalogLoader {
  public static readonly DEFAULT_BASE_PATH = '/data';
  private static memoryCache = new Map<string, any>();

  /**
   * Internal cache getter: tries idb-keyval first, with fallback to memoryCache.
   */
  public static async getFromCache<T>(key: IDBValidKey): Promise<T | undefined> {
    try {
      const val = await get<T>(key);
      if (val !== undefined) {
        return val;
      }
    } catch {
      // IndexedDB unavailable or threw error (e.g. node environment / privacy mode)
    }
    return this.memoryCache.get(String(key)) as T | undefined;
  }

  /**
   * Internal cache setter: writes to memoryCache and idb-keyval.
   */
  public static async setToCache<T>(key: IDBValidKey, value: T): Promise<void> {
    this.memoryCache.set(String(key), value);
    try {
      await set(key, value);
    } catch {
      // IndexedDB unavailable or quota exceeded
    }
  }

  /**
   * Internal cache deleter.
   */
  public static async deleteFromCache(key: IDBValidKey): Promise<void> {
    this.memoryCache.delete(String(key));
    try {
      await del(key);
    } catch {
      // Ignored
    }
  }

  /**
   * Clears cached data (all or specific key).
   */
  public static async clearCache(key?: string): Promise<void> {
    if (key) {
      await this.deleteFromCache(key);
    } else {
      this.memoryCache.clear();
      try {
        await clear();
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Loads catalog_manifest.json from IndexedDB or /data/catalog_manifest.json, caches in IDB.
   */
  public static async loadManifest(options?: CatalogLoaderOptions): Promise<CatalogManifest> {
    const key = CATALOG_CACHE_KEYS.manifest;
    const cached = await this.getFromCache<CatalogManifest>(key);

    if (cached && !options?.forceRefresh) {
      return cached;
    }

    const basePath = (options?.basePath ?? this.DEFAULT_BASE_PATH).replace(/\/$/, '');
    const url = `${basePath}/catalog_manifest.json`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const fresh = (await res.json()) as CatalogManifest;
      await this.setToCache(key, fresh);
      return fresh;
    } catch (err) {
      if (cached) {
        return cached;
      }
      throw new Error(`Manifest unavailable offline and not in IndexedDB: ${(err as Error).message}`);
    }
  }

  /**
   * Loads category cards from IDB or /data/by_category/<file>,
   * normalizes 07_el_tablero.json (concatenates drink_events, board_events, hot_events_level1..3),
   * and caches in IDB.
   */
  public static async loadCategory(
    categoryId: string,
    options?: CatalogLoaderOptions
  ): Promise<Card[]> {
    const key = CATALOG_CACHE_KEYS.category(categoryId);
    const cached = await this.getFromCache<Card[]>(key);

    if (cached && !options?.forceRefresh) {
      return cached;
    }

    const manifest = await this.loadManifest(options);
    const catMeta = manifest.categories.find((c) => c.category_id === categoryId);
    if (!catMeta) {
      if (cached) return cached;
      throw new Error(`Category '${categoryId}' not found in manifest`);
    }

    const basePath = (options?.basePath ?? this.DEFAULT_BASE_PATH).replace(/\/$/, '');
    const relFile = catMeta.file.replace(/^\//, '');
    const url = `${basePath}/${relFile}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      let cards: Card[] = [];

      if (Array.isArray(data.cards)) {
        cards = data.cards;
      } else if (
        categoryId === 'el_tablero' ||
        data.drink_events ||
        data.board_events
      ) {
        // Normalize 07_el_tablero.json: concatenate all 5 event pools
        cards = [
          ...(Array.isArray(data.drink_events) ? data.drink_events : []),
          ...(Array.isArray(data.board_events) ? data.board_events : []),
          ...(Array.isArray(data.hot_events_level1) ? data.hot_events_level1 : []),
          ...(Array.isArray(data.hot_events_level2) ? data.hot_events_level2 : []),
          ...(Array.isArray(data.hot_events_level3) ? data.hot_events_level3 : []),
        ];
      } else {
        throw new Error(`Unrecognized card storage format in category file '${url}'`);
      }

      await this.setToCache(key, cards);
      return cards;
    } catch (err) {
      if (cached) {
        return cached;
      }
      throw new Error(
        `Failed to load category '${categoryId}' offline and not in IndexedDB: ${(err as Error).message}`
      );
    }
  }

  /**
   * Loads preset cards from IDB or /data/curated_presets/<file>, caches in IDB.
   */
  public static async loadPreset(
    presetId: string,
    options?: CatalogLoaderOptions
  ): Promise<Card[]> {
    const key = CATALOG_CACHE_KEYS.preset(presetId);
    const cached = await this.getFromCache<Card[]>(key);

    if (cached && !options?.forceRefresh) {
      return cached;
    }

    const manifest = await this.loadManifest(options);
    const preMeta = manifest.presets.find((p) => p.preset_id === presetId);
    if (!preMeta) {
      if (cached) return cached;
      throw new Error(`Preset '${presetId}' not found in manifest`);
    }

    const basePath = (options?.basePath ?? this.DEFAULT_BASE_PATH).replace(/\/$/, '');
    const relFile = preMeta.file.replace(/^\//, '');
    const url = `${basePath}/${relFile}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (!Array.isArray(data.cards)) {
        throw new Error(`Cards array missing in preset file '${url}'`);
      }

      await this.setToCache(key, data.cards);
      return data.cards;
    } catch (err) {
      if (cached) {
        return cached;
      }
      throw new Error(
        `Failed to load preset '${presetId}' offline and not in IndexedDB: ${(err as Error).message}`
      );
    }
  }

  /**
   * Loads board tiles array from tiles_by_board[boardId], caches in IDB.
   */
  public static async loadBoard(
    boardId: BoardId,
    options?: CatalogLoaderOptions
  ): Promise<BoardTile[]> {
    const key = CATALOG_CACHE_KEYS.board(boardId);
    const cached = await this.getFromCache<BoardTile[]>(key);

    if (cached && !options?.forceRefresh) {
      return cached;
    }

    const basePath = (options?.basePath ?? this.DEFAULT_BASE_PATH).replace(/\/$/, '');
    let tableroUrl = `${basePath}/by_category/07_el_tablero.json`;

    try {
      const manifest = await this.loadManifest(options);
      const catMeta = manifest.categories.find((c) => c.category_id === 'el_tablero');
      if (catMeta) {
        tableroUrl = `${basePath}/${catMeta.file.replace(/^\//, '')}`;
      }
    } catch {
      // Use fallback default tableroUrl
    }

    try {
      const res = await fetch(tableroUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      const tiles: BoardTile[] | undefined = data.tiles_by_board?.[boardId];
      if (!Array.isArray(tiles)) {
        throw new Error(`Board tiles for '${boardId}' not found in '${tableroUrl}'`);
      }

      await this.setToCache(key, tiles);
      return tiles;
    } catch (err) {
      if (cached) {
        return cached;
      }
      throw new Error(
        `Failed to load board '${boardId}' offline and not in IndexedDB: ${(err as Error).message}`
      );
    }
  }
}

// Named function exports for direct destructuring
export const loadManifest = (options?: CatalogLoaderOptions) => CatalogLoader.loadManifest(options);
export const loadCategory = (categoryId: string, options?: CatalogLoaderOptions) =>
  CatalogLoader.loadCategory(categoryId, options);
export const loadPreset = (presetId: string, options?: CatalogLoaderOptions) =>
  CatalogLoader.loadPreset(presetId, options);
export const loadBoard = (boardId: BoardId, options?: CatalogLoaderOptions) =>
  CatalogLoader.loadBoard(boardId, options);
export const clearCatalogCache = (key?: string) => CatalogLoader.clearCache(key);

// Default singleton object conforming to PROJECT.md interface contract
export const catalogLoader = {
  loadManifest,
  loadCategory,
  loadPreset,
  loadBoard,
  clearCache: clearCatalogCache,
  getFromCache: (key: IDBValidKey) => CatalogLoader.getFromCache(key),
  setToCache: (key: IDBValidKey, value: any) => CatalogLoader.setToCache(key, value),
};

export default catalogLoader;
