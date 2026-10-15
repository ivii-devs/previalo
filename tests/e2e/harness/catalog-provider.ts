import fs from 'node:fs';
import path from 'node:path';
import type {
  CatalogManifest,
  Card,
  BoardTile,
  CatalogCategoryMeta,
  CatalogPresetMeta,
} from './e2e-contracts';

export class CatalogProvider {
  private static basePath: string = CatalogProvider.resolveDataPath();
  private static manifestCache: CatalogManifest | null = null;
  private static categoryCache = new Map<string, Card[]>();
  private static presetCache = new Map<string, Card[]>();
  private static boardCache = new Map<string, BoardTile[]>();

  private static resolveDataPath(): string {
    const prodPath = path.resolve(process.cwd(), 'data', '03_production');
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
    const publicPath = path.resolve(process.cwd(), 'public', 'data');
    if (fs.existsSync(publicPath)) {
      return publicPath;
    }
    throw new Error(`Catalog data directory not found in either ${prodPath} or ${publicPath}`);
  }

  public static getManifest(): CatalogManifest {
    if (this.manifestCache) {
      return this.manifestCache;
    }
    const manifestPath = path.join(this.basePath, 'catalog_manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`catalog_manifest.json not found at ${manifestPath}`);
    }
    const raw = fs.readFileSync(manifestPath, 'utf8');
    this.manifestCache = JSON.parse(raw) as CatalogManifest;
    return this.manifestCache;
  }

  public static getCategoryMeta(categoryId: string): CatalogCategoryMeta {
    const manifest = this.getManifest();
    const meta = manifest.categories.find((c) => c.category_id === categoryId);
    if (!meta) {
      throw new Error(`Category metadata for '${categoryId}' not found in manifest`);
    }
    return meta;
  }

  public static getPresetMeta(presetId: string): CatalogPresetMeta {
    const manifest = this.getManifest();
    const meta = manifest.presets.find((p) => p.preset_id === presetId);
    if (!meta) {
      throw new Error(`Preset metadata for '${presetId}' not found in manifest`);
    }
    return meta;
  }

  public static getCategoryCards(categoryId: string): Card[] {
    if (this.categoryCache.has(categoryId)) {
      return this.categoryCache.get(categoryId)!;
    }

    const meta = this.getCategoryMeta(categoryId);
    const filePath = path.join(this.basePath, meta.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Category data file not found at ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    let cards: Card[] = [];

    if (Array.isArray(data.cards)) {
      cards = data.cards;
    } else if (categoryId === 'el_tablero') {
      cards = [
        ...(data.drink_events || []),
        ...(data.board_events || []),
        ...(data.hot_events_level1 || []),
        ...(data.hot_events_level2 || []),
        ...(data.hot_events_level3 || []),
      ];
    } else {
      throw new Error(`Unrecognized card storage format in ${filePath}`);
    }

    this.categoryCache.set(categoryId, cards);
    return cards;
  }

  public static getPresetCards(presetId: string): Card[] {
    if (this.presetCache.has(presetId)) {
      return this.presetCache.get(presetId)!;
    }

    const meta = this.getPresetMeta(presetId);
    const filePath = path.join(this.basePath, meta.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Preset data file not found at ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.cards)) {
      throw new Error(`Cards array missing in preset file ${filePath}`);
    }

    this.presetCache.set(presetId, data.cards);
    return data.cards;
  }

  public static getBoardTiles(boardId: 'guatoca_clasica' | 'guatoca_hot'): BoardTile[] {
    if (this.boardCache.has(boardId)) {
      return this.boardCache.get(boardId)!;
    }

    const filePath = path.join(this.basePath, 'by_category', '07_el_tablero.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`El Tablero data file not found at ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    const tiles: BoardTile[] = data.tiles_by_board?.[boardId];
    if (!Array.isArray(tiles)) {
      throw new Error(`Board tiles for '${boardId}' not found in ${filePath}`);
    }

    this.boardCache.set(boardId, tiles);
    return tiles;
  }

  public static getAllCards(): Card[] {
    const manifest = this.getManifest();
    const all: Card[] = [];
    for (const cat of manifest.categories) {
      all.push(...this.getCategoryCards(cat.category_id));
    }
    return all;
  }
}
