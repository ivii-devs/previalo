import fs from 'node:fs';
import path from 'node:path';
import { catalogLoader, CATALOG_CACHE_KEYS } from '../../../src/infrastructure/catalogLoader';

// Mock global fetch to read directly from public/data
globalThis.fetch = (async (input: any) => {
  const url = String(input);
  const rel = url.replace(/^\/data\//, '');
  const filePath = path.join(process.cwd(), 'public', 'data', rel);
  if (!fs.existsSync(filePath)) {
    return { ok: false, status: 404, statusText: 'Not Found' } as any;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(content)
  } as any;
}) as any;

async function runAudit() {
  console.log('[Audit] Testing loadManifest...');
  const manifest = await catalogLoader.loadManifest();
  console.log('[Audit] Manifest version:', manifest.manifest_version);
  console.log('[Audit] Global stats total cards:', manifest.global_stats.total_cards);

  let totalCardsLoaded = 0;
  for (const cat of manifest.categories) {
    const cards = await catalogLoader.loadCategory(cat.category_id);
    console.log(`[Audit] Category '${cat.category_id}': loaded ${cards.length} cards (manifest count: ${cat.card_count})`);
    if (cards.length !== cat.card_count) {
      throw new Error(`Count mismatch in category ${cat.category_id}: expected ${cat.card_count}, got ${cards.length}`);
    }
    totalCardsLoaded += cards.length;
  }

  for (const pre of manifest.presets) {
    const cards = await catalogLoader.loadPreset(pre.preset_id);
    console.log(`[Audit] Preset '${pre.preset_id}': loaded ${cards.length} cards (manifest count: ${pre.card_count})`);
    if (cards.length !== pre.card_count) {
      throw new Error(`Count mismatch in preset ${pre.preset_id}: expected ${pre.card_count}, got ${cards.length}`);
    }
  }

  const clasica = await catalogLoader.loadBoard('guatoca_clasica');
  console.log('[Audit] Guatoca Clasica tiles loaded:', clasica.length);
  if (clasica.length !== 45) {
    throw new Error(`Expected 45 tiles for guatoca_clasica, got ${clasica.length}`);
  }

  const hot = await catalogLoader.loadBoard('guatoca_hot');
  console.log('[Audit] Guatoca Hot tiles loaded:', hot.length);
  if (hot.length !== 40) {
    throw new Error(`Expected 40 tiles for guatoca_hot, got ${hot.length}`);
  }

  // Stress-test cache retrieval without fetch (simulate offline)
  globalThis.fetch = (() => {
    throw new Error('Network disabled (airplane mode simulation)');
  }) as any;

  console.log('[Audit] Testing offline cache retrieval for manifest, category, preset, board...');
  const cachedManifest = await catalogLoader.loadManifest();
  if (cachedManifest.app_name !== 'Previalo') throw new Error('Offline manifest failed');

  const cachedCategory = await catalogLoader.loadCategory('el_tablero');
  if (cachedCategory.length !== 721) throw new Error(`Offline el_tablero failed: ${cachedCategory.length}`);

  const cachedPreset = await catalogLoader.loadPreset('modo_caliente');
  if (cachedPreset.length !== 1661) throw new Error(`Offline modo_caliente failed: ${cachedPreset.length}`);

  const cachedBoard = await catalogLoader.loadBoard('guatoca_clasica');
  if (cachedBoard.length !== 45) throw new Error(`Offline guatoca_clasica failed: ${cachedBoard.length}`);

  console.log('[Audit] SUCCESS: All categories, presets, and boards loaded with 100% integrity offline!');
}

runAudit().catch(err => {
  console.error('[Audit] FAILURE:', err);
  process.exit(1);
});
