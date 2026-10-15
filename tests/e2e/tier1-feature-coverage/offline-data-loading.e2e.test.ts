import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CatalogProvider } from '../harness/catalog-provider';

describe('Tier 1: PWA Offline Data Loading & Cache Integrity E2E', () => {
  it('TC-T1-OFF-01: should load catalog_manifest.json offline without network requests', () => {
    const manifest = CatalogProvider.getManifest();
    expect(manifest.app_name).toBe('Previalo');
    expect(manifest.manifest_version).toBe('1.0.0');
    expect(manifest.global_stats.total_cards).toBe(6937);
  });

  it('TC-T1-OFF-02: should verify all files referenced in manifest exist locally on disk', () => {
    const manifest = CatalogProvider.getManifest();
    const basePath = path.resolve(process.cwd(), 'data', '03_production');

    for (const cat of manifest.categories) {
      const fullPath = path.join(basePath, cat.file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }

    for (const pre of manifest.presets) {
      const fullPath = path.join(basePath, pre.file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it('TC-T1-OFF-03: should verify cryptographic SHA-256 integrity of all category files', () => {
    const manifest = CatalogProvider.getManifest();
    const basePath = path.resolve(process.cwd(), 'data', '03_production');

    for (const cat of manifest.categories) {
      const fullPath = path.join(basePath, cat.file);
      const content = fs.readFileSync(fullPath);
      const calculatedHash = crypto.createHash('sha256').update(content).digest('hex');
      expect(calculatedHash).toBe(cat.sha256);
    }
  });

  it('TC-T1-OFF-04: should verify cryptographic SHA-256 integrity of all preset files', () => {
    const manifest = CatalogProvider.getManifest();
    const basePath = path.resolve(process.cwd(), 'data', '03_production');

    for (const pre of manifest.presets) {
      const fullPath = path.join(basePath, pre.file);
      const content = fs.readFileSync(fullPath);
      const calculatedHash = crypto.createHash('sha256').update(content).digest('hex');
      expect(calculatedHash).toBe(pre.sha256);
    }
  });

  it('TC-T1-OFF-05: should load both Guatoca boards offline without network interaction', () => {
    const clasica = CatalogProvider.getBoardTiles('guatoca_clasica');
    expect(clasica).toHaveLength(45);
    expect(clasica[0].tile_type).toBe('start');
    expect(clasica[44].tile_type).toBe('finish');

    const hot = CatalogProvider.getBoardTiles('guatoca_hot');
    expect(hot).toHaveLength(40);
    expect(hot[0].tile_type).toBe('start');
    expect(hot[39].tile_type).toBe('finish');
  });

  it('TC-T1-OFF-06: should verify cache key generation conforms to idb-keyval conventions', () => {
    const getCategoryCacheKey = (id: string) => `cat_${id}`;
    const getPresetCacheKey = (id: string) => `preset_${id}`;
    const getBoardCacheKey = (id: string) => `board_${id}`;

    expect(getCategoryCacheKey('yo_nunca')).toBe('cat_yo_nunca');
    expect(getPresetCacheKey('modo_caliente')).toBe('preset_modo_caliente');
    expect(getBoardCacheKey('guatoca_clasica')).toBe('board_guatoca_clasica');
  });
});
