/**
 * Previalo Infrastructure: CatalogLoader
 * Loads catalog manifest, categories, presets, and boards on-demand
 * with client-side IndexedDB caching (idb-keyval) and robust offline fallbacks.
 */

import { get, set, del, clear } from 'idb-keyval';
import type { Card } from '../domain/types/card';
import type { BoardTile, BoardId } from '../domain/types/board';
import { CardEngine } from '../domain/engines/CardEngine';

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
  categoryHash: (id: string) => `cat_hash_${id}`,
  preset: (id: string) => `preset_${id}`,
  presetHash: (id: string) => `preset_hash_${id}`,
  board: (id: string) => `board_${id}`,
} as const;

const LEGACY_RETOS_SHA256 = new Set([
  'b1ef1aa283efff1d6ccde0838b5b4547da883583deedb640a7afdda3b245a34d',
  'ee4ba68d218a9199c62f4277fa870c06c64860484f235ff7c954dc29b03bc177',
  'c487bb55f122b67286bd6b0cda411db87317cb7360e3736b79f0a7ae734aebc1',
  '986c8fea23099990af3f1021589482a2c2840dd9a079445a63f2b9c947605c9b',
]);

export class CatalogLoader {
  public static readonly DEFAULT_BASE_PATH = '/data';
  private static memoryCache = new Map<string, any>();

  private static hasLegacyCatalogHash(manifest?: CatalogManifest): boolean {
    if (!manifest) return false;
    const hasLegacyCategory = Boolean(
      manifest.categories?.some(
        (c) => c.category_id === 'retos_y_virus' && c.sha256 && LEGACY_RETOS_SHA256.has(c.sha256)
      )
    );
    const hasLegacyPreset = Boolean(
      manifest.presets?.some(
        (p) => p.preset_id === 'modo_caliente' && p.sha256 && LEGACY_RETOS_SHA256.has(p.sha256)
      )
    );
    return hasLegacyCategory || hasLegacyPreset;
  }

  private static hasLegacyCards(cards?: Card[]): boolean {
    if (!Array.isArray(cards)) return false;
    return cards.some(
      (c) =>
        (c.id === 3266 && c.chain?.role !== 'resolver') ||
        ((c.id === 3120 || c.id === 3483 || c.id === 3625 || c.id === 6248 || c.id === 6253) &&
          !c.chain) ||
        (c.id === 5287 && typeof c.text === 'string' && c.text.includes('más bajos')) ||
        (c.id === 5288 && typeof c.text === 'string' && c.text.includes('más altos')) ||
        (CardEngine.isResolverOrCure(c) && c.chain?.role !== 'resolver')
    );
  }

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
   * Automatically invalidates cached manifests that still carry known legacy retos_y_virus hashes.
   */
  public static async loadManifest(options?: CatalogLoaderOptions): Promise<CatalogManifest> {
    const key = CATALOG_CACHE_KEYS.manifest;
    const cached = await this.getFromCache<CatalogManifest>(key);

    if (cached && !options?.forceRefresh && !this.hasLegacyCatalogHash(cached)) {
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
   * validates cached SHA-256 against manifest SHA-256 when available,
   * normalizes 07_el_tablero.json (concatenates drink_events, board_events, hot_events_level1..3),
   * and caches in IDB.
   */
  public static async loadCategory(
    categoryId: string,
    options?: CatalogLoaderOptions
  ): Promise<Card[]> {
    const key = CATALOG_CACHE_KEYS.category(categoryId);
    const hashKey = CATALOG_CACHE_KEYS.categoryHash(categoryId);
    const cached = await this.getFromCache<Card[]>(key);
    const cachedHash = await this.getFromCache<string>(hashKey);

    if (
      cached &&
      !options?.forceRefresh &&
      !(cachedHash && LEGACY_RETOS_SHA256.has(cachedHash)) &&
      !this.hasLegacyCards(cached)
    ) {
      const cachedManifest = await this.getFromCache<CatalogManifest>(CATALOG_CACHE_KEYS.manifest);
      if (!this.hasLegacyCatalogHash(cachedManifest)) {
        const cachedCatMeta = cachedManifest?.categories?.find(
          (c) => c.category_id === categoryId
        );

        if (cachedCatMeta?.sha256) {
          if (cachedHash === cachedCatMeta.sha256) {
            return cached;
          }
        } else if (!cachedHash && (!cachedManifest || Boolean(cachedCatMeta))) {
          return cached;
        } else if (cachedHash) {
          const manifest = await this.loadManifest(options);
          const catMeta = manifest.categories.find((c) => c.category_id === categoryId);
          if (!catMeta?.sha256 || cachedHash === catMeta.sha256) {
            return cached;
          }
        }
      }
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
      if (catMeta.sha256) {
        await this.setToCache(hashKey, catMeta.sha256);
      }
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
   * Loads preset cards from IDB or /data/curated_presets/<file>,
   * validates cached SHA-256 against manifest SHA-256 when available, and caches in IDB.
   */
  public static async loadPreset(
    presetId: string,
    options?: CatalogLoaderOptions
  ): Promise<Card[]> {
    const key = CATALOG_CACHE_KEYS.preset(presetId);
    const hashKey = CATALOG_CACHE_KEYS.presetHash(presetId);
    const cached = await this.getFromCache<Card[]>(key);
    const cachedHash = await this.getFromCache<string>(hashKey);

    if (
      cached &&
      !options?.forceRefresh &&
      !(cachedHash && LEGACY_RETOS_SHA256.has(cachedHash)) &&
      !this.hasLegacyCards(cached)
    ) {
      const cachedManifest = await this.getFromCache<CatalogManifest>(CATALOG_CACHE_KEYS.manifest);
      if (!this.hasLegacyCatalogHash(cachedManifest)) {
        const cachedPreMeta = cachedManifest?.presets?.find((p) => p.preset_id === presetId);

        if (cachedPreMeta?.sha256) {
          if (cachedHash === cachedPreMeta.sha256) {
            return cached;
          }
        } else if (!cachedHash && (!cachedManifest || Boolean(cachedPreMeta))) {
          return cached;
        } else if (cachedHash) {
          const manifest = await this.loadManifest(options);
          const preMeta = manifest.presets.find((p) => p.preset_id === presetId);
          if (!preMeta?.sha256 || cachedHash === preMeta.sha256) {
            return cached;
          }
        }
      }
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
      if (preMeta.sha256) {
        await this.setToCache(hashKey, preMeta.sha256);
      }
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
      const tiles: BoardTile[] | undefined =
        data.tiles_by_board?.[boardId] ??
        (boardId === 'guatoca_todos' ? data.tiles_by_board?.['guatoca_clasica'] : undefined);
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
