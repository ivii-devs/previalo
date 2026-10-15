# Handoff Report: Canonical Card Catalog & Game Data Analysis

**Author:** `explorer_catalog_1` (Teamwork Explorer)  
**Date:** 2026-10-14  
**Scope:** Canonical card catalog, game modes, schemas, dynamic tokens, board configurations, and offline caching strategy for "Previalo" Mobile-First PWA.  
**Target File:** `c:/.d/previalo-project/.agents/teamwork/explorer_catalog_1/handoff.md`

---

## 1. Observation

### 1.1 Manifest & Global Metadata
- **File:** `c:/.d/previalo-project/data/03_production/catalog_manifest.json` (328 lines, 10,139 bytes)
- **Top-level properties:** `manifest_version` ("1.0.0"), `app_name` ("Previalo"), `generated_at` ("2026-10-14T18:56:20.677846"), `license` ("Proprietary - Previalo Entertainment"), `global_stats`, `categories` (array of 9 objects), `presets` (array of 2 objects).
- **`global_stats` values:**
  - `total_categories`: 9
  - `total_cards`: 6937
  - `total_unique_card_ids`: 6937
  - `total_presets`: 2
  - `card_counts_by_intensity`: `{"1": 1522, "2": 3429, "3": 1972, "4": 14}` (Sum: $1522 + 3429 + 1972 + 14 = 6937$)
  - `token_system`: `["player1", "player2", "player3", "player4", "team", "drinks"]`
  - `sources_integrated`: `["picolo_apk (v1.x)", "guatoca_apk (v2.x)", "partypal_apk (v1.x)", "game_of_shots_repo", "verdad_o_verdad_ipa (v3.0.2)"]`
- **Cryptographic integrity:**
  SHA-256 hashes for all 9 category files and 2 preset files were recalculated directly from disk and matched 100% against the manifest `sha256` fields (`scripts/verify_catalog_integrity.py` status: `ALL SHA-256 MATCH: true`).

### 1.2 Inventory of Categories & Presets
Observed on disk in `data/03_production/by_category/` and `data/03_production/curated_presets/`:

| File | Category / Preset ID | Name | Size (Bytes) | Cards | Details / Packs |
|---|---|---|---|---|---|
| `by_category/02_yo_nunca.json` | `yo_nunca` | 🤫 Yo Nunca | 753,383 | 1,355 | 3 packs: `yn_fiesta` (442), `yn_picante` (768), `yn_parejas` (145) |
| `by_category/03_que_prefieres.json` | `que_prefieres` | ¿Qué Prefieres? | 186,110 | 289 | 5 source packs: `picolo_default` (155), `picolo_silly` (69), `picolo_hot` (36), `qp_guatoca` (18), `qp_verdad_o_verdad` (11) |
| `by_category/04_retos_y_virus.json` | `retos_y_virus` | Retos y Virus | 1,366,959 | 2,310 | 3 packs: `picolo_default` (1,347), `picolo_silly` (585), `picolo_hot` (378). Includes 394 timed viruses and 217 sequence cards |
| `by_category/05_quien_es_mas_probable.json` | `quien_es_mas_probable` | 🎯 ¿Quién es Más Probable? | 94,040 | 199 | 3 packs: `qemp_fiesta` (131), `qemp_picante` (50), `qemp_parejas` (18) |
| `by_category/06_verdad_o_reto.json` | `verdad_o_reto` | 🔥 Verdad o Reto | 496,980 | 857 | 3 packs: `vor_fiesta` (286: 124 truths, 162 dares), `vor_parejas` (246: 192 truths, 54 dares), `vor_picante` (325: 164 truths, 161 dares) |
| `by_category/07_el_tablero.json` | `el_tablero` | 🎲 El Tablero (La Guatoca) | 362,161 | 721 | Contains board configs + 5 event card pools: `drink_events` (353), `board_events` (132), `hot_events_level1` (118), `hot_events_level2` (61), `hot_events_level3` (57) |
| `by_category/08_mesa_y_minijuegos.json` | `mesa_y_minijuegos` | 🍾 Mesa y Minijuegos | 90,847 | 136 | 4 packs: `pack_partybus` (50), `pack_verdad_o_verdad` (30), `pack_drink_extreme` (30), `pack_ring_of_fire` (26) |
| `by_category/09_guerra_equipos.json` | `guerra_equipos` | ⚔️ Guerra de Equipos | 669,945 | 863 | 2 packs: `picolo_war` (788), `versus` (75). Flagged with `mode_scope: "teams_only"`, `exclude_from_chaos: true` |
| `by_category/10_confesiones.json` | `confesiones` | Confesiones | 140,513 | 207 | 3 packs: `conf_fiesta` (135), `conf_picante` (51), `conf_deep` (21) |
| **CATEGORIES SUM** | | | **4,160,938** | **6,937** | **Zero card ID collisions across all 9 categories** |
| `curated_presets/02_modo_caliente.json` | `modo_caliente` | 🔥 Modo Caliente / Previa Hot | 951,983 | 1,661 | 100% of cards (1,661/1,661) reference existing category card IDs |
| `curated_presets/04_modo_parejas.json` | `modo_parejas` | 💘 Modo Parejas / Citas | 213,555 | 395 | 100% of cards (395/395) reference existing category card IDs |

### 1.3 Card Schemas & Structure
By running direct automated inspection over all 6,937 cards:
- **Card ID Types:** Heterogeneous `string | number`.
  - Categories `02_yo_nunca`, `03_que_prefieres`, `04_retos_y_virus`, and `09_guerra_equipos` contain integer IDs (e.g. `921`, `3200`, `6429`) as well as string IDs.
  - Categories `05_quien_es_mas_probable` (`qemp_0001`), `06_verdad_o_reto` (`vor_0001`), `07_el_tablero` (`guatoca_drink_0001`), `08_mesa_y_minijuegos` (`mesa_7292`), and `10_confesiones` (`conf_0001`) use string slug IDs.
- **Universal Fields (present in all 6,937 cards):**
  - `id`: `string | number`
  - `type`: `string`
  - `text`: `string`
  - `intensity`: `number` (range 1 to 4: 1=1522, 2=3429, 3=1972, 4=14)
- **Standard Category Fields (categories 02-06, 08-10, 6,216 cards):**
  - `game_id`: `string`
  - `pack_id`: `string`
  - `drinks_penalty`: `number` (range 1 to 5: 1=1652, 2=4624, 3=491, 4=29, 5=9)
  - `target`: `string` (`"all"` [3034], `"active_player"` [2518], `"pair"` [356], `"majority"` [230], `"team"` [75], `"distributed"` [3])
  - `language`: `string` (`"es-ES"`)
  - `source`: `string`
  - `origin_type`: `string`
  - `option_a` & `option_b`: always `null` in canonical data (dilemma text is embedded directly in `text`).
- **Special Tablero Event Fields (`07_el_tablero.json`, 721 cards):**
  - Stored under 5 event arrays instead of top-level `cards`:
    `drink_events` (353), `board_events` (132), `hot_events_level1` (118), `hot_events_level2` (61), `hot_events_level3` (57).
  - Properties: `id` (string), `category_id` (string), `type` (`"drink_event"`, `"board_event"`, `"hot_event"`), `text`, `board_modes` (`["classic", "xxl", "flash", "hammered"]` or `["hot"]`), `tags`, `intensity`.
  - 589 events have `drinks_penalty`; 132 `board_events` omit `drinks_penalty` (these are physical/reflex challenges without a fixed sip amount, e.g., "El último en tocarse el codo bebe").
  - 236 hot events have `tier` (1, 2, 3) and `action_type` (`"truth"`, etc.).
- **Virus & Chain Schema:**
  - 611 cards contain a `chain` object:
    - **`timed_virus` (394 cards):** Matches all cards with `type === "virus"`.
      - Trigger cards (`role: "trigger"`): specify `chain_id`, `chain_type: "timed_virus"`, `virus_scope` (`"individual"` [262] or `"global"` [132]), `min_delay_cards` (4..8), `max_delay_cards` (6..12).
      - Resolver cards (`role: "resolver"`): specify matching `chain_id` and text like *"Fin de la regla de 'claro' para {player1}"*.
      - 201 timed virus triggers are standalone (no discrete resolver card in JSON; lifecycle governed by `VirusManager` countdown).
    - **`immediate_sequence` (217 cards):**
      - Multi-part prompt (e.g. Card 4456: *"Todo el mundo elige entre Blanco y Negro... (Ahora viene la continuación...)"* followed immediately by resolution cards 4457 (*"¡Blanco!"*), 4458 (*"¡Negro!"*), 4459 (*"¡Gris! ¡Todo el mundo ha perdido!"*)).

### 1.4 Variable Tokens Extracted
Full scan of all text fields across 6,937 cards yielded:
- **Whitelisted tokens:**
  1. `{player1}`: **2,913 occurrences** (Primary active player)
  2. `{drinks}`: **2,684 occurrences** (Dynamic sips penalty)
  3. `{team}`: **680 occurrences** (Team name / side in team wars)
  4. `{player2}`: **585 occurrences** (Secondary player / opponent / partner)
  5. `{player3}`: **26 occurrences** (Third player for trios)
  6. `{player4}`: **2 occurrences** (Fourth player for quads, e.g. cards 5050 and 5932)
- **Token purity:** 0 broken tokens, 0 unmatched braces, 0 corrupt patterns (`{{`, `}}`, `%s`, `${}`, `NaN`, `null`, `undefined`, `[object Object]`).

### 1.5 Board Configurations (La Guatoca)
Found in `data/03_production/by_category/07_el_tablero.json` under `boards` and `tiles_by_board`:
- **Board 1: `guatoca_clasica` (45 casillas):**
  - Total tiles: 45 (tile numbers 1 to 45).
  - Casilla 1: `tile_type: "start"`, "Salida".
  - Casilla 45: `tile_type: "finish"`, "¡La Discoteca! (Meta)".
  - Casilla 10: `tile_type: "trap_jail"`, "La Cárcel" (`turns_lost: 1`).
  - Casilla 37: `tile_type: "trap_skull"`, "La Muerte / Vuelve a empezar" (`action_jump_to: 1`).
  - Oca jumps ("De bar en bar", `tile_type: "jump"`, grants roll again):
    $5 \rightarrow 9 \rightarrow 14 \rightarrow 18 \rightarrow 23 \rightarrow 27 \rightarrow 32 \rightarrow 36 \rightarrow 41 \rightarrow 44 \rightarrow 45$.
  - Backward traps (`trap_back`):
    Casilla 17 ("Resacón", jump to 14), Casilla 28 ("El control policial", jump to 24), Casilla 42 ("Perdiste el DNI", jump to 38).
  - Other tiles: `drink` (6), `give_drink` (5), `challenge` (6), `truth` (4), `versus` (3), `group_event` (3), `yo_nunca` (1).
- **Board 2: `guatoca_hot` (40 casillas):**
  - Total tiles: 40 (tile numbers 1 to 40).
  - Casilla 1: `tile_type: "start"`, "La Antesala".
  - Casilla 40: `tile_type: "finish"`, "El Clímax (Meta)".
  - Casilla 10: `tile_type: "trap_jail"`, "La Mazmorra" (`turns_lost: 1`).
  - Casilla 36: `tile_type: "trap_skull"`, "Cremallera rota" (`action_jump_to: 1`).
  - Oca jumps ("Fiebre nocturna", `tile_type: "jump"`, grants roll again):
    $5 \rightarrow 9 \rightarrow 13 \rightarrow 17 \rightarrow 21 \rightarrow 25 \rightarrow 29 \rightarrow 33 \rightarrow 37 \rightarrow 39 \rightarrow 40$.
  - Backward traps (`trap_back`):
    Casilla 18 ("Arrepentimiento", jump to 14), Casilla 28 ("Ducha fría", jump to 22).
  - Other tiles: `challenge` (9), `truth` (7), `drink` (3), `give_drink` (2), `versus` (2), `group_event` (1).

---

## 2. Logic Chain

1. **Card Count & Integrity:**
   - Observation 1.1 records 6,937 cards in `catalog_manifest.json`.
   - Observation 1.2 sums cards across 9 category files: $1355 + 289 + 2310 + 199 + 857 + 721 + 136 + 863 + 207 = 6,937$.
   - Observation 1.3 confirms 6,937 unique IDs with 0 collisions and 100% SHA-256 match.
   - *Inference:* The canonical production dataset in `data/03_production/` is complete, verified, and ready for deployment without further deduplication.

2. **Schema Invariance & TypeScript Typing:**
   - Observation 1.3 shows `id` is `number` in some files (Picolo/Yo Nunca raw IDs) and `string` in others (`vor_0001`, `qemp_0001`, `guatoca_drink_0001`).
   - *Inference:* TypeScript interface `Card` must define `id: string | number`.
   - Observation 1.3 shows `option_a` and `option_b` are always `null`, while `text` contains the full prompt.
   - *Inference:* The UI can render `card.text` directly without needing mandatory fallback buttons for options A/B.
   - Observation 1.3 shows `07_el_tablero.json` partitions its 721 cards into 5 event arrays (`drink_events`, `board_events`, `hot_events_level1..3`).
   - *Inference:* `catalogLoader.ts` must normalize `07_el_tablero.json` by aggregating these 5 arrays when returning cards for category `el_tablero`.

3. **Domain Engine Requirements (VariableReplacer & CardEngine):**
   - Observation 1.4 identifies tokens: `{player1}`, `{player2}`, `{player3}`, `{player4}`, `{team}`, `{drinks}`.
   - *Inference 3A (Player Count Guard):*
     - If game session has 2 players, cards with `{player3}` (26 cards) or `{player4}` (2 cards) must be excluded from the deck by `CardEngine` or filtered before draw.
     - If game session has 3 players, cards with `{player4}` (2 cards) must be excluded.
     - If game mode is `guerra_equipos` (`mode_scope: "teams_only"`), a minimum of 4 players (2 teams of 2) is required.
   - *Inference 3B (Fairness & Inequality):*
     - `{player1}` must be chosen via fairness weighting (cooldown/least recently picked).
     - `{player2}` must strictly enforce `player2 !== player1`.
     - `{player3}` must strictly enforce `player3 !== player1 && player3 !== player2`.
     - `{player4}` must strictly enforce all 4 are distinct.
   - *Inference 3C (Drinks Scaling):*
     - `{drinks}` must replace with `card.drinks_penalty` (or default 1) scaled by session intensity (Chill=1, Fiesta=1..2, Hot=2..3, Extremo=3..5).

4. **Virus Engine Requirements (VirusManager):**
   - Observation 1.3 proves that 394 cards are `timed_virus` and 217 are `immediate_sequence`.
   - *Inference 4A:* When drawing a `timed_virus` with `role: "trigger"`:
     - If a matching resolver card exists (139 pairs), `CardEngine` must inject the resolver card into the deck $N$ slots ahead (where $N = \text{random}(\text{min\_delay\_cards}, \text{max\_delay\_cards})$).
     - In all cases, `VirusManager` tracks the active rule and remaining rounds, triggering a `VirusExpiredModal` when the rule elapses.
   - *Inference 4B:* When drawing an `immediate_sequence` trigger (e.g. Card 4456), `CardEngine` must immediately schedule one of the paired resolvers (cards 4457..4459) as the next card.

5. **Board Engine Requirements (BoardEngine):**
   - Observation 1.5 confirms both `guatoca_clasica` (45 casillas) and `guatoca_hot` (40 casillas) are already defined with tile numbers, icons, titles, descriptions, jump destinations, turns lost, and drink actions.
   - *Inference:* `BoardEngine` does NOT need any hardcoded tile schemas. It can load the boards directly from `tiles_by_board.guatoca_clasica` and `tiles_by_board.guatoca_hot`.
   - Bounce-back rule: If a player at tile 43 rolls 4 on Clásica (target 47, max 45), target overshoots by 2, bouncing back to tile 43 ($45 - 2 = 43$).
   - Oca rule: If destination tile is `jump` ("De bar en bar" / "Fiebre nocturna"), player pawn jumps to `action_jump_to` and receives an extra roll (`grants_extra_roll: true`).
   - Trap rules: `trap_jail` sets `turns_lost: 1`, `trap_back` jumps backward, `trap_skull` resets player to tile 1.

6. **Catalog Exposure & Client-Side Caching (catalogLoader & idb-keyval):**
   - Observation 1.2 records total catalog size of 4.16 MB for categories + 1.16 MB for presets + 10 KB for manifest (~5.33 MB total).
   - In modern mobile networks, downloading 5 MB on initial splash degrades First Contentful Paint (FCP).
   - *Inference:* Decouple loading:
     1. Sync `data/03_production/` into `public/data/`.
     2. Service Worker (`vite-plugin-pwa` + Workbox) caches all `/data/**.json` under CacheFirst strategy.
     3. `catalogLoader.ts` uses `idb-keyval` for IndexedDB storage:
        - Key `'catalog_manifest'` stores manifest metadata.
        - Key `'cat_' + categoryId` stores category cards.
        - Key `'preset_' + presetId` stores preset cards.
        - On first launch: fetch manifest and selected category, write to IDB. Subsequent launches read from IDB in < 15ms.

---

## 3. Caveats

1. **Teams Mode Isolation:** Category `09_guerra_equipos.json` (863 cards) is explicitly marked with `exclude_from_chaos: true` and `mode_scope: "teams_only"`. When building "Modo Caos", this category must NOT be included in the general pass-and-play pool because cards ask team-specific questions (e.g. "Equipo {team}...").
2. **Tablero Event Merging:** Category `07_el_tablero.json` does not have a top-level `"cards"` array. If the cards mode plays "El Tablero" as a swipeable card deck, `catalogLoader` must concatenate the 5 event arrays.
3. **No Direct Code Implementation:** As an explorer agent under read-only constraints, no source code in `src/` or files outside `.agents/teamwork/explorer_catalog_1/` were created or altered. All implementation proposals are detailed below for the implementer agent.

---

## 4. Conclusion & Actionable Design

### 4.1 Summary of Findings
- **Data integrity:** 100% verified. 6,937 cards, 9 categories, 2 presets, 0 duplicate IDs, 0 broken tokens, all SHA-256 matching.
- **Variable tokens:** Exactly 6 tokens: `{drinks}`, `{player1}`, `{player2}`, `{player3}`, `{player4}`, `{team}`.
- **Boards:** Clásica (45 casillas) and Hot (40 casillas) are fully specified in `07_el_tablero.json`.
- **Virus chains:** 394 timed viruses (with min/max card delays) and 217 sequence cards documented.

### 4.2 Exact TypeScript Interfaces for Implementer

```typescript
// Proposed Card interface for src/domain/types/card.ts
export type IntensityLevel = 1 | 2 | 3 | 4;

export interface VirusChain {
  chain_id: string;
  chain_type: 'timed_virus' | 'immediate_sequence';
  role: 'trigger' | 'resolver';
  virus_scope?: 'individual' | 'global';
  min_delay_cards?: number;
  max_delay_cards?: number;
}

export interface Card {
  id: string | number;
  game_id?: string;
  category_id?: string;
  pack_id?: string;
  type: string;
  text: string;
  intensity: IntensityLevel;
  drinks_penalty?: number;
  target?: 'all' | 'active_player' | 'pair' | 'majority' | 'team' | 'distributed' | 'board' | string;
  language?: string;
  tags?: string[];
  chain?: VirusChain;
  board_modes?: string[];
  sub_type?: string;
  tier?: number;
  action_type?: string;
  mode_scope?: string;
  exclude_from_chaos?: boolean;
}

// Proposed BoardTile interface for src/domain/types/board.ts
export interface BoardTile {
  id: number;
  board_id: 'guatoca_clasica' | 'guatoca_hot';
  tile_number: number;
  tile_type: 'start' | 'finish' | 'jump' | 'trap_jail' | 'trap_back' | 'trap_skull' | 'drink' | 'give_drink' | 'challenge' | 'truth' | 'versus' | 'group_event' | 'yo_nunca';
  title: string;
  description: string;
  drinks_action: number;
  target: string;
  action_jump_to: number | null;
  turns_lost: number;
  icon: string;
}
```

### 4.3 Catalog Exposure & Sync Plan
During scaffolding (Requirement R1):
1. Create `public/data/` directory.
2. Copy `data/03_production/catalog_manifest.json` -> `public/data/catalog_manifest.json`.
3. Copy `data/03_production/by_category/*.json` -> `public/data/by_category/`.
4. Copy `data/03_production/curated_presets/*.json` -> `public/data/curated_presets/`.
5. Add an npm script to `package.json`:
   `"sync:data": "node -e \"const fs = require('fs'); fs.cpSync('data/03_production', 'public/data', { recursive: true }); console.log('Data synced to public/data');\""`
   And wire it into `"prebuild"` and `"predev"`.

### 4.4 `catalogLoader.ts` Architecture (idb-keyval + Fetch)

```typescript
// Proposed structure for src/infrastructure/data/catalogLoader.ts
import { get, set } from 'idb-keyval';
import type { Card } from '../../domain/types/card';
import type { BoardTile } from '../../domain/types/board';

export class CatalogLoader {
  private static MANIFEST_KEY = 'previalo_catalog_manifest';

  static async loadManifest(): Promise<CatalogManifest> {
    const cached = await get<CatalogManifest>(this.MANIFEST_KEY);
    try {
      const res = await fetch('/data/catalog_manifest.json');
      if (res.ok) {
        const fresh = await res.json();
        await set(this.MANIFEST_KEY, fresh);
        return fresh;
      }
    } catch {
      // Offline fallback
    }
    if (cached) return cached;
    throw new Error('Manifest unavailable offline and not in IndexedDB');
  }

  static async loadCategory(categoryId: string): Promise<Card[]> {
    const key = `cat_${categoryId}`;
    const cached = await get<Card[]>(key);
    if (cached) return cached;

    const manifest = await this.loadManifest();
    const catMeta = manifest.categories.find(c => c.category_id === categoryId);
    if (!catMeta) throw new Error(`Category ${categoryId} not found`);

    const res = await fetch(`/data/${catMeta.file}`);
    const data = await res.json();
    let cards: Card[] = [];

    if (data.cards) {
      cards = data.cards;
    } else if (categoryId === 'el_tablero') {
      cards = [
        ...(data.drink_events || []),
        ...(data.board_events || []),
        ...(data.hot_events_level1 || []),
        ...(data.hot_events_level2 || []),
        ...(data.hot_events_level3 || []),
      ];
    }

    await set(key, cards);
    return cards;
  }

  static async loadPreset(presetId: string): Promise<Card[]> {
    const key = `preset_${presetId}`;
    const cached = await get<Card[]>(key);
    if (cached) return cached;

    const manifest = await this.loadManifest();
    const preMeta = manifest.presets.find(p => p.preset_id === presetId);
    if (!preMeta) throw new Error(`Preset ${presetId} not found`);

    const res = await fetch(`/data/${preMeta.file}`);
    const data = await res.json();
    await set(key, data.cards);
    return data.cards;
  }

  static async loadBoard(boardId: 'guatoca_clasica' | 'guatoca_hot'): Promise<BoardTile[]> {
    const key = `board_${boardId}`;
    const cached = await get<BoardTile[]>(key);
    if (cached) return cached;

    const res = await fetch('/data/by_category/07_el_tablero.json');
    const data = await res.json();
    const tiles: BoardTile[] = data.tiles_by_board[boardId];
    await set(key, tiles);
    return tiles;
  }
}
```

---

## 5. Verification Method

To independently reproduce and verify all observations and conclusions:

1. **Run automated catalog integrity suite:**
   ```bash
   python scripts/verify_catalog_integrity.py
   ```
   *Expected result:* 100% PASS, 6,937 cards, 9 categories, 2 presets, 0 errors.

2. **Verify total cards and duplicate check with Node.js:**
   ```bash
   node -e "const fs = require('fs'), path = require('path'); const dir = './data/03_production/by_category'; let total = 0, ids = new Set(); for (const f of fs.readdirSync(dir)) { const d = JSON.parse(fs.readFileSync(path.join(dir, f))); const cards = d.cards || [...(d.drink_events||[]), ...(d.board_events||[]), ...(d.hot_events_level1||[]), ...(d.hot_events_level2||[]), ...(d.hot_events_level3||[])]; total += cards.length; for (const c of cards) ids.add(c.id); } console.log({ total, uniqueIds: ids.size });"
   ```
   *Expected output:* `{ total: 6937, uniqueIds: 6937 }`.

3. **Verify board casillas count for La Guatoca:**
   ```bash
   node -e "const d = require('./data/03_production/by_category/07_el_tablero.json'); console.log({ clasica: d.tiles_by_board.guatoca_clasica.length, hot: d.tiles_by_board.guatoca_hot.length });"
   ```
   *Expected output:* `{ clasica: 45, hot: 40 }`.

4. **Verify variable tokens whitelist:**
   ```bash
   node -e "const fs = require('fs'), path = require('path'); const dir = './data/03_production/by_category'; const tokens = new Set(); for (const f of fs.readdirSync(dir)) { const d = JSON.parse(fs.readFileSync(path.join(dir, f))); const cards = d.cards || [...(d.drink_events||[]), ...(d.board_events||[]), ...(d.hot_events_level1||[]), ...(d.hot_events_level2||[]), ...(d.hot_events_level3||[])]; for (const c of cards) { const m = (c.text||'').match(/\{[^{}]+\}/g); if (m) m.forEach(t => tokens.add(t)); } } console.log(Array.from(tokens).sort());"
   ```
   *Expected output:* `[ '{drinks}', '{player1}', '{player2}', '{player3}', '{player4}', '{team}' ]`.

5. **Invalidation condition:** Any change in card count ($\ne 6,937$), appearance of non-whitelisted variable tokens, or mismatch between `catalog_manifest.json` SHA-256 and production files invalidates this report and requires a re-run of Phase 1 ETL scripts.
