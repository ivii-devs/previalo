import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const PROJECT_ROOT = 'c:/.d/previalo-project';
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

const results = {
  hashes: { total: 0, passed: 0, failed: 0, details: [] },
  cardCounts: { totalCategoriesCards: 0, uniqueCardIds: 0, duplicates: 0, duplicateDetails: [], categoryBreakdown: {} },
  presets: { validPresets: 0, totalPresetCards: 0, errors: [] },
  pwaManifest: { valid: false, errors: [] },
  serviceWorker: { valid: false, errors: [] },
  bundleSize: { jsGzipKb: 0, cssGzipKb: 0, totalGzipKb: 0, withinLimit: false, details: [] }
};

console.log('================================================================');
console.log(' PREVIALO CHALLENGER M1: EMPIRICAL VERIFICATION HARNESS');
console.log('================================================================\n');

// 1. Verify Manifest & SHA-256 Hashes
const manifestPath = path.join(PUBLIC_DATA_DIR, 'catalog_manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Manifest not found at ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`[1] Loaded catalog_manifest.json (v${manifest.manifest_version || '1.0.0'})`);
console.log(`    Global stats declared: ${manifest.global_stats.total_cards} cards across ${manifest.global_stats.total_categories} categories and ${manifest.global_stats.total_presets} presets.\n`);

const allCategoryCards = new Map();
const duplicateCardIds = [];

const filesToVerify = [];

// Add 9 categories
for (const cat of manifest.categories || []) {
  filesToVerify.push({
    type: 'category',
    id: cat.category_id,
    relPath: cat.file,
    expectedSha256: cat.sha256,
    expectedCount: cat.card_count,
    expectedSize: cat.size_bytes
  });
}

// Add 2 presets
for (const preset of manifest.presets || []) {
  filesToVerify.push({
    type: 'preset',
    id: preset.preset_id,
    relPath: preset.file,
    expectedSha256: preset.sha256,
    expectedCount: preset.card_count,
    expectedSize: preset.size_bytes
  });
}

results.hashes.total = filesToVerify.length;
console.log(`[2] Verifying cryptographic SHA-256 hashes for all ${filesToVerify.length} catalog JSON files...`);

for (const item of filesToVerify) {
  const fullPath = path.join(PUBLIC_DATA_DIR, item.relPath);
  if (!fs.existsSync(fullPath)) {
    results.hashes.failed++;
    results.hashes.details.push(`MISSING: ${item.relPath}`);
    console.error(`  [FAIL] MISSING: ${item.relPath}`);
    continue;
  }

  const content = fs.readFileSync(fullPath);
  const actualHash = crypto.createHash('sha256').update(content).digest('hex');
  const actualSize = content.length;

  if (actualHash.toLowerCase() === item.expectedSha256.toLowerCase()) {
    results.hashes.passed++;
    console.log(`  [PASS] ${item.relPath} (SHA-256 match, ${actualSize} bytes)`);
  } else {
    results.hashes.failed++;
    console.error(`  [FAIL] ${item.relPath}: expected ${item.expectedSha256}, got ${actualHash}`);
    results.hashes.details.push(`HASH_MISMATCH: ${item.relPath}`);
  }

  // Parse JSON and extract cards
  try {
    const data = JSON.parse(content.toString('utf8'));
    let extractedCards = [];

    if (Array.isArray(data.cards)) {
      extractedCards = data.cards;
    } else if (item.relPath.includes('07_el_tablero.json')) {
      // 07_el_tablero combines drink_events, board_events, and hot_events levels
      extractedCards = [
        ...(data.drink_events || []),
        ...(data.board_events || []),
        ...(data.hot_events_level1 || []),
        ...(data.hot_events_level2 || []),
        ...(data.hot_events_level3 || [])
      ];
    }

    if (extractedCards.length !== item.expectedCount) {
      const msg = `Count mismatch in ${item.relPath}: expected ${item.expectedCount}, extracted ${extractedCards.length}`;
      if (item.type === 'category') results.cardCounts.errors.push(msg);
      else results.presets.errors.push(msg);
    }

    if (item.type === 'category') {
      results.cardCounts.totalCategoriesCards += extractedCards.length;
      results.cardCounts.categoryBreakdown[item.id] = extractedCards.length;

      for (const card of extractedCards) {
        if (!card.id) {
          results.cardCounts.duplicateDetails.push(`Card missing id in ${item.relPath}: ${JSON.stringify(card).slice(0, 50)}`);
          continue;
        }
        if (allCategoryCards.has(card.id)) {
          duplicateCardIds.push({
            id: card.id,
            firstFile: allCategoryCards.get(card.id).file,
            secondFile: item.relPath
          });
        } else {
          allCategoryCards.set(card.id, { card, file: item.relPath });
        }
      }
    } else if (item.type === 'preset') {
      results.presets.validPresets++;
      results.presets.totalPresetCards += extractedCards.length;
      for (const card of extractedCards) {
        if (!card.id) {
          results.presets.errors.push(`Preset ${item.relPath} has card without ID`);
        }
      }
    }
  } catch (err) {
    results.hashes.failed++;
    results.hashes.details.push(`JSON_PARSE_ERROR in ${item.relPath}: ${err.message}`);
  }
}

results.cardCounts.uniqueCardIds = allCategoryCards.size;
results.cardCounts.duplicates = duplicateCardIds.length;
results.cardCounts.duplicateDetails = duplicateCardIds;

console.log(`\n--- Catalog Counts & Uniqueness Integrity ---`);
console.log(`  Total cards across all 9 categories: ${results.cardCounts.totalCategoriesCards} (Expected: 6937)`);
console.log(`  Total unique card IDs:               ${results.cardCounts.uniqueCardIds}`);
console.log(`  Duplicate card IDs:                  ${results.cardCounts.duplicates}`);
console.log(`  Presets verified:                    ${results.presets.validPresets} (Cards: ${results.presets.totalPresetCards})`);

// 3. Challenge PWA Manifest
console.log(`\n[3] Challenging PWA Manifest in dist/manifest.webmanifest...`);
const distManifestPath = path.join(DIST_DIR, 'manifest.webmanifest');
if (fs.existsSync(distManifestPath)) {
  try {
    const webmanifest = JSON.parse(fs.readFileSync(distManifestPath, 'utf8'));
    const checks = [
      webmanifest.display === 'standalone',
      webmanifest.orientation === 'portrait-primary',
      webmanifest.theme_color === '#0b0f19',
      webmanifest.background_color === '#0b0f19',
      Array.isArray(webmanifest.icons) && webmanifest.icons.length >= 2
    ];
    if (checks.every(Boolean)) {
      results.pwaManifest.valid = true;
      console.log(`  [PASS] manifest.webmanifest is valid: standalone, portrait-primary, theme_color=#0b0f19, ${webmanifest.icons.length} icons.`);
    } else {
      results.pwaManifest.errors.push(`Manifest checks failed: ${JSON.stringify(webmanifest)}`);
      console.error(`  [FAIL] Manifest attributes failed verification.`);
    }
  } catch (e) {
    results.pwaManifest.errors.push(`Failed to parse manifest: ${e.message}`);
  }
} else {
  results.pwaManifest.errors.push(`dist/manifest.webmanifest does not exist`);
}

// 4. Challenge Service Worker Caching Logic
console.log(`\n[4] Challenging Service Worker in dist/sw.js...`);
const distSwPath = path.join(DIST_DIR, 'sw.js');
if (fs.existsSync(distSwPath)) {
  const swContent = fs.readFileSync(distSwPath, 'utf8');
  const hasCacheFirst = swContent.includes('CacheFirst');
  const hasDataRoute = swContent.includes('/data/') || swContent.includes('/data/.*\\.json');
  const hasPrecache = swContent.includes('precacheAndRoute');
  const hasCatalogInPrecache = swContent.includes('data/catalog_manifest.json');
  const hasCacheName = swContent.includes('previalo-catalog-cache');

  console.log(`  - Has CacheFirst strategy:            ${hasCacheFirst}`);
  console.log(`  - Has /data/ route interception:      ${hasDataRoute}`);
  console.log(`  - Has precacheAndRoute manifest:      ${hasPrecache}`);
  console.log(`  - Has catalog_manifest in precache:   ${hasCatalogInPrecache}`);
  console.log(`  - Has previalo-catalog-cache name:    ${hasCacheName}`);

  if (hasCacheFirst && hasDataRoute && hasPrecache && hasCatalogInPrecache && hasCacheName) {
    results.serviceWorker.valid = true;
    console.log(`  [PASS] Service Worker provides complete offline coverage for catalog (precache + CacheFirst runtime caching).`);
  } else {
    results.serviceWorker.errors.push('SW missing required caching directives');
    console.error(`  [FAIL] Service Worker caching missing directives.`);
  }
} else {
  results.serviceWorker.errors.push(`dist/sw.js does not exist`);
}

// 5. Challenge Bundle Size
console.log(`\n[5] Challenging Bundle Size (<200KB gzipped)...`);
const assetsDir = path.join(DIST_DIR, 'assets');
let totalJsGzip = 0;
let totalCssGzip = 0;

if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  for (const file of assetFiles) {
    const filePath = path.join(assetsDir, file);
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    const sizeKb = (content.length / 1024).toFixed(2);
    const gzipKb = (gzipped.length / 1024).toFixed(2);
    
    results.bundleSize.details.push({ file, rawKb: parseFloat(sizeKb), gzipKb: parseFloat(gzipKb) });
    console.log(`  - ${file}: ${sizeKb} KB (gzipped: ${gzipKb} KB)`);

    if (file.endsWith('.js')) totalJsGzip += parseFloat(gzipKb);
    if (file.endsWith('.css')) totalCssGzip += parseFloat(gzipKb);
  }
}

const totalInitialGzip = totalJsGzip + totalCssGzip;
results.bundleSize.jsGzipKb = parseFloat(totalJsGzip.toFixed(2));
results.bundleSize.cssGzipKb = parseFloat(totalCssGzip.toFixed(2));
results.bundleSize.totalGzipKb = parseFloat(totalInitialGzip.toFixed(2));
results.bundleSize.withinLimit = totalInitialGzip < 200;

console.log(`\n  Total JS gzipped:        ${totalJsGzip.toFixed(2)} KB`);
console.log(`  Total CSS gzipped:       ${totalCssGzip.toFixed(2)} KB`);
console.log(`  Combined bundle gzipped: ${totalInitialGzip.toFixed(2)} KB (Target: < 200 KB)`);

if (results.bundleSize.withinLimit) {
  console.log(`  [PASS] Bundle is lightweight (${totalInitialGzip.toFixed(2)} KB) and well within 200KB limit!`);
} else {
  console.error(`  [FAIL] Bundle exceeds 200KB gzipped limit!`);
}

// Final Summary Verdict
console.log(`\n================================================================`);
const allPassed = (
  results.hashes.failed === 0 &&
  results.hashes.passed === 11 &&
  results.cardCounts.totalCategoriesCards === 6937 &&
  results.cardCounts.uniqueCardIds === 6937 &&
  results.cardCounts.duplicates === 0 &&
  results.pwaManifest.valid &&
  results.serviceWorker.valid &&
  results.bundleSize.withinLimit
);

const verdict = allPassed ? 'APPROVE' : 'REJECT';
console.log(` FINAL CHALLENGE VERDICT: ${verdict}`);
console.log(`================================================================`);

fs.writeFileSync(
  path.join('c:/.d/previalo-project/.agents/teamwork/challenger_m1_1', 'verification_results.json'),
  JSON.stringify({ verdict, results, timestamp: new Date().toISOString() }, null, 2)
);

process.exit(allPassed ? 0 : 1);
