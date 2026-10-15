import { CatalogLoader, CATALOG_CACHE_KEYS } from '../../../src/infrastructure/catalogLoader';
import type { Card } from '../../../src/domain/types/card';

async function runStressTests() {
  console.log('[StressTest] Starting adversarial stress tests on CatalogLoader...');

  // Test 1: Concurrency / Race Conditions
  // Simulate 100 concurrent requests to load the same category simultaneously
  let fetchCount = 0;
  const mockCards: Card[] = [
    { id: '1', type: 'drink', text: 'Test 1', intensity: 1, category_id: 'cat_test' }
  ];

  globalThis.fetch = (async (url: any) => {
    fetchCount++;
    // Simulate network latency
    await new Promise(r => setTimeout(r, 20));
    if (String(url).includes('catalog_manifest')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          manifest_version: '1.0.0',
          categories: [{ category_id: 'cat_test', file: 'by_category/test.json', card_count: 1 }]
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ cards: mockCards })
    };
  }) as any;

  await CatalogLoader.clearCache();

  console.log('[StressTest] 1. Firing 50 concurrent loadCategory calls...');
  const promises = Array.from({ length: 50 }, () => CatalogLoader.loadCategory('cat_test'));
  const results = await Promise.all(promises);

  for (const res of results) {
    if (res.length !== 1 || res[0].id !== '1') {
      throw new Error('Concurrent load returned inconsistent results');
    }
  }
  console.log(`[StressTest] 1. Concurrency test PASSED. Fetches: ${fetchCount}`);

  // Test 2: Network 500 error with existing cache fallback
  console.log('[StressTest] 2. Testing graceful degradation on HTTP 500...');
  globalThis.fetch = (async () => ({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error'
  })) as any;

  const fallbackResult = await CatalogLoader.loadCategory('cat_test', { forceRefresh: true });
  if (fallbackResult.length !== 1 || fallbackResult[0].id !== '1') {
    throw new Error('Fallback failed to return cached data on HTTP 500');
  }
  console.log('[StressTest] 2. HTTP 500 fallback PASSED.');

  // Test 3: Network abort / timeout error with existing cache fallback
  console.log('[StressTest] 3. Testing network abort / timeout error...');
  globalThis.fetch = (async () => {
    throw new DOMException('The user aborted a request.', 'AbortError');
  }) as any;

  const abortFallback = await CatalogLoader.loadCategory('cat_test', { forceRefresh: true });
  if (abortFallback.length !== 1) {
    throw new Error('Fallback failed on AbortError');
  }
  console.log('[StressTest] 3. Network abort fallback PASSED.');

  // Test 4: Missing event arrays in el_tablero payload
  console.log('[StressTest] 4. Testing el_tablero normalization with missing/null event arrays...');
  await CatalogLoader.clearCache();
  globalThis.fetch = (async (url: any) => {
    if (String(url).includes('catalog_manifest')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          categories: [{ category_id: 'el_tablero', file: '07_el_tablero.json', card_count: 0 }]
        })
      };
    }
    // Partial/corrupted event structure: only drink_events present, others null/undefined
    return {
      ok: true,
      status: 200,
      json: async () => ({
        drink_events: [{ id: 'd1', text: 'Solo drink' }],
        board_events: null,
        hot_events_level1: undefined
      })
    };
  }) as any;

  const partialTablero = await CatalogLoader.loadCategory('el_tablero');
  if (partialTablero.length !== 1 || partialTablero[0].id !== 'd1') {
    throw new Error(`Expected defensive normalization to handle null/undefined event pools, got ${partialTablero.length}`);
  }
  console.log('[StressTest] 4. Partial event arrays normalization PASSED.');

  console.log('[StressTest] ALL ADVERSARIAL STRESS TESTS PASSED!');
}

runStressTests().catch(err => {
  console.error('[StressTest] FAILED:', err);
  process.exit(1);
});
