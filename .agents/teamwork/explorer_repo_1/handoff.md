# Handoff Report: Repository & Tooling Assessment (R1 Readiness)

**Agent ID:** `explorer_repo_1`  
**Working Directory:** `c:/.d/previalo-project/.agents/teamwork/explorer_repo_1/`  
**Mission:** Explore and assess repository workspace at `c:/.d/previalo-project/` for R1 scaffolding, build system, and PWA setup.  
**Date:** 2026-10-14  

---

## 1. Observation

### 1.1 Root Directory Contents & Git Status
- Executing `list_dir` on `c:/.d/previalo-project` revealed 5 directories and 4 files:
  - Directories: `.agents`, `data`, `docs`, `scripts`, `tools`
  - Files: `DECISIONS.md` (5,322 bytes), `deep-investigator-message.md` (15,611 bytes), `descargar_ipa.ps1` (1,060 bytes), `ipatool.exe` (43,183,104 bytes)
  - `src/` directory: **Does not exist**.
  - `public/` directory: **Does not exist**.
  - Root `package.json`: **Does not exist**.
  - Root `vite.config.ts`, `tsconfig.json`, `tailwind.config.*`, `postcss.config.*`, `vitest.config.*`: **Do not exist**.
- Executing `git status` via PowerShell returned exit code 1:
  ```text
  fatal: not a git repository (or any of the parent directories): .git
  ```

### 1.2 Package Managers & Runtime Environment
- Tool version checks executed in Windows PowerShell:
  - `node --version`: `v24.13.0` (Active and verified)
  - `npm --version`: `11.6.2` (Active and verified)
  - `pnpm --version`:
    ```text
    pnpm: El término "pnpm" no se reconoce como nombre de un cmdlet, función, archivo de script o programa ejecutable.
    ```
  - `yarn --version`: Not recognized / not installed.
  - `bun --version`: Not recognized / not installed.
  - `git --version`: `git version 2.52.0.windows.1`
  - `python --version`: `Python 3.14.2`
  - `npm ping`: Successfully contacted `https://registry.npmjs.org/` (PONG 333ms).

### 1.3 Canonical Production Data Status
- Checked `data/03_production/`:
  - `catalog_manifest.json` (10,139 bytes)
  - `by_category/`: Contains 9 JSON files (`02_yo_nunca.json`, `03_que_prefieres.json`, `04_retos_y_virus.json`, `05_quien_es_mas_probable.json`, `06_verdad_o_reto.json`, `07_el_tablero.json`, `08_mesa_y_minijuegos.json`, `09_guerra_equipos.json`, `10_confesiones.json`).
  - `curated_presets/`: Contains 2 JSON files (`02_modo_caliente.json`, `04_modo_parejas.json`).
- Executed `python scripts/verify_catalog_integrity.py`:
  - Output:
    ```text
    [1/5] Verificando Manifiesto Canónico (catalog_manifest.json)...
    [2/5] Verificando Esquema y Datos de Categorías...
       -> Total cartas auditadas en categorías: 6937
       -> Total IDs únicos globales: 6937
    [3/5] Verificando Presets Curados...
       -> Preset 02_modo_caliente.json: 1661 cartas verificadas OK.
       -> Preset 04_modo_parejas.json: 395 cartas verificadas OK.
    ==============================================================================
    ESTADO FINAL: ✅ TODAS LAS PRUEBAS DE INTEGRIDAD PASARON AL 100%
                  Catálogo listo para despliegue y desarrollo PWA
    ==============================================================================
    ```

### 1.4 NPM Registry & Package Versions Check
- Queried NPM registry for target dependency versions:
  - `react`: `19.3.1` (available; React 19 is fully supported)
  - `@tailwindcss/vite`: `4.3.3` (Tailwind CSS v4 Vite plugin)
  - `vite-plugin-pwa`: `2.0.0`
  - `framer-motion`: `14.2.0` (or `12.x`)
  - `zustand`: `5.0.15`
  - `lucide-react`: `1.57.0`
  - `canvas-confetti`: `1.9.4`
  - `idb-keyval`: `6.3.0`
  - `vitest`: `5.0.4` (or `3.x`)

---

## 2. Logic Chain

1. **State of the Repository**:
   - Because `package.json`, `node_modules/`, `vite.config.ts`, `src/`, and `public/` do not exist at the repository root (Observation 1.1), the frontend project is currently in a **clean, pre-scaffold state**. There are no legacy configurations, conflicting build steps, or deprecated dependencies to migrate.

2. **Package Manager Choice**:
   - Observation 1.2 shows that `node` (`v24.13.0`) and `npm` (`11.6.2`) are installed and functional, while `pnpm`, `yarn`, and `bun` are not in the system's PATH.
   - Therefore, the implementation agent must use `npm` as the package manager for all installations and build scripts (`npm install`, `npm run dev`, `npm run build`, `npm run test`, `npm run typecheck`).

3. **Tailwind CSS Architecture (v4 vs v3)**:
   - Tailwind CSS v4 (`tailwindcss@^4` and `@tailwindcss/vite@^4`) is now the default in the npm ecosystem and provides a dedicated Vite plugin (`@tailwindcss/vite`).
   - Using Tailwind v4 eliminates the need for `postcss.config.js` and `tailwind.config.js`. Themes, custom colors, and resets can be declared natively in `src/index.css` via `@import "tailwindcss";` and `@theme` / CSS variables.
   - Neon theme requirements from `ORIGINAL_REQUEST.md` (cyber-neon, electric-purple, acid-lime, sunset-hot, day-mode) can be mapped directly to CSS variables scoped to `[data-theme="..."]` and `[data-color-mode="day"]`.

4. **Data Exposition & PWA Offline Strategy**:
   - As observed in 1.3, the canonical catalog of 6,937 cards resides in `data/03_production/`.
   - The PWA cannot import 5.3 MB of JSON directly into the initial JavaScript bundle without violating RNF-01-04 (<200 KB gzipped).
   - Hence, `data/03_production/` must be exposed at `public/data/` (`public/data/catalog_manifest.json`, `public/data/by_category/*.json`, and `public/data/curated_presets/*.json`).
   - `vite-plugin-pwa`'s Workbox configuration must include a `runtimeCaching` rule with `CacheFirst` strategy for `/data/**` requests with long expiration (30 days), coupled with `idb-keyval` in `catalogLoader.ts` for instant offline reads.

5. **Test Runner & Verification Architecture**:
   - Observation 1.1 showed no existing unit tests or test configuration.
   - Requirement R6 specifies Vitest unit tests for the 4 pure domain engines (`CardEngine`, `VariableReplacer`, `VirusManager`, `BoardEngine`).
   - Vitest integrates directly into `vite.config.ts` or standalone `vitest.config.ts` without separate Babel/Webpack overhead. Pure domain engines do not depend on the DOM, allowing fast Node-environment test execution.

---

## 3. Caveats

1. **Git Repository Status**: `c:/.d/previalo-project` is currently not initialized as a git repository (`.git` is missing). If version control or git hooks are desired, `git init` should be performed, but this does not block frontend scaffolding.
2. **Icons Asset Generation**: While `vite-plugin-pwa` requires icon references (`icon-192.png`, `icon-512.png`, `favicon.ico`, `apple-touch-icon.png`), real binary PNGs or SVGs will need to be placed in `public/` or `public/icons/` so the Web App Manifest does not 404.
3. **Data Sync Automation**: Because `data/03_production/` is the canonical source of truth, files placed in `public/data/` should be synchronized via a dedicated script (e.g. `scripts/sync_production_data.py` or Node script) rather than maintained as separate diverging duplicates.

---

## 4. Conclusion & Recommendations for R1 Scaffolding

The workspace is ready for immediate R1 initialization. The recommended blueprint for the implementation phase is:

### 4.1 Recommended `package.json` Specification
```json
{
  "name": "previalo",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "sync:data": "python scripts/sync_production_data.py"
  },
  "dependencies": {
    "canvas-confetti": "^1.9.4",
    "framer-motion": "^12.45.0",
    "idb-keyval": "^6.3.0",
    "lucide-react": "^1.57.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^22.13.0",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.3.3",
    "typescript": "^5.7.3",
    "vite": "^6.2.0",
    "vite-plugin-pwa": "^2.0.0",
    "vitest": "^3.0.7"
  }
}
```

### 4.2 Recommended `vite.config.ts`
- Use `@vitejs/plugin-react()`, `@tailwindcss/vite()`, and `VitePWA()`.
- Define path alias: `'@': path.resolve(__dirname, './src')`.
- Configure `VitePWA`:
  - `registerType: 'autoUpdate'`
  - `manifest`:
    - `name: 'Previalo - Juegos de Previa y Fiesta'`
    - `short_name: 'Previalo'`
    - `start_url: '/'`
    - `display: 'standalone'`
    - `orientation: 'portrait-primary'`
    - `background_color: '#0b0f19'`
    - `theme_color: '#0b0f19'`
  - `workbox`:
    - `globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']`
    - `runtimeCaching`: CacheFirst handler for `/data/.*\.json` (cacheName: `previalo-catalog-cache`).

### 4.3 Recommended `tsconfig.json` & `tsconfig.app.json`
- Strict Mode enabled (`"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`).
- Path mapping: `"baseUrl": "."`, `"paths": { "@/*": ["src/*"] }`.

### 4.4 Recommended `index.html` Viewport & PWA Headers
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#0b0f19" />
```

### 4.5 Recommended `src/index.css` & Theme Architecture
- Import `@import "tailwindcss";`.
- Add mobile gestures and viewport lock:
  ```css
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    overscroll-behavior-y: none;
  }
  ```
- Configure the 4 neon themes + Day mode:
  - `cyber-neon`: Dark base `#0b0f19`, accents `#ec4899`, `#8b5cf6`, `#06b6d4`, `#f59e0b`.
  - `electric-purple`: Dark base `#0d0b1a`, accents `#a855f7`, `#3b82f6`, `#f43f5e`.
  - `acid-lime`: Dark base `#08100c`, accents `#10b981`, `#84cc16`, `#06b6d4`.
  - `sunset-hot`: Dark base `#160b0e`, accents `#f97316`, `#ef4444`, `#eab308`.
  - `day-mode`: Light base `#f8fafc`, text `#0f172a`, high contrast `#db2777` & `#7c3aed`.

### 4.6 Recommended Catalog Sync Script
- Create `scripts/sync_production_data.py` (or Node.js script) that copies:
  - `data/03_production/catalog_manifest.json` -> `public/data/catalog_manifest.json`
  - `data/03_production/by_category/*.json` -> `public/data/by_category/`
  - `data/03_production/curated_presets/*.json` -> `public/data/curated_presets/`

---

## 5. Verification Method

To independently verify the observations and recommendations:

1. **Verify Root State**:
   ```powershell
   Test-Path c:/.d/previalo-project/package.json
   Test-Path c:/.d/previalo-project/src
   Test-Path c:/.d/previalo-project/public
   ```
   *Expected result*: All return `False`.

2. **Verify Tooling Versions**:
   ```powershell
   node --version      # Returns v24.13.0
   npm --version       # Returns 11.6.2
   python --version    # Returns Python 3.14.2
   ```

3. **Verify Catalog Integrity**:
   ```powershell
   python scripts/verify_catalog_integrity.py
   ```
   *Expected result*: Exits with code 0 and reports all 6,937 cards verified with 0 errors.

4. **Invalidation Conditions**:
   - If pnpm or yarn is preferred by the user, global installation would be required first.
   - If Tailwind v3 (with PostCSS) is strictly required rather than Tailwind v4 with `@tailwindcss/vite`, a `postcss.config.js` and `tailwind.config.js` would need to be created.
