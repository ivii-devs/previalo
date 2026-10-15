# Original User Request

## 2026-10-14T20:09:36Z

Implement the complete, modular, production-ready Mobile-First PWA for "Previalo" (party & drinking game with Pass-and-Play single shared device mechanics), following Clean Architecture, 100% offline-first capability, neon multi-theme styling, procedural Web Audio API, and powered by the audited catalog of 6,937 cards and events.

Working directory: c:/.d/previalo-project
Integrity mode: development

## Reference Documentation
- Architecture: docs/ARCHITECTURE_AND_DIAGRAMS.md
- Requirements: docs/SRS_REQUIREMENTS.md
- Master Plan: C:/Users/ivanc/.gemini/antigravity/brain/c6eec7a0-c3ac-4a2b-8dc2-490162853417/plan_desarrollo_pwa_previalo.md
- Canonical Catalog: data/03_production/ (6,937 cards across 9 categories and 2 presets)

## Requirements

### R1. Project Scaffold, Build System & PWA Offline Configuration
- Initialize Vite + React 19 + TypeScript (Strict Mode) in c:/.d/previalo-project/.
- Configure Tailwind CSS with the 4 agreed neon dark themes (cyber-neon, electric-purple, acid-lime, sunset-hot) and Day/High-contrast mode.
- Configure vite-plugin-pwa with Workbox Cache-First strategy for static assets and /data/** JSON catalogs.
- Configure Web App Manifest with display: standalone, orientation: portrait-primary, and mobile viewport tags (viewport-fit=cover, overscroll-behavior-y: none, touch-action: manipulation).
- Expose production catalog from data/03_production/ in public/data/.

### R2. Pure Domain Engines (Clean Architecture)
- Implement CardEngine.ts with strict Fisher-Yates shuffling, mode builders (pure categories, curated presets, chaos mix with interleaving), and undo/history stack.
- Implement VariableReplacer.ts with fairness algorithm, cooldown/weighting to prevent consecutive picks, strict distinctness {player1} !== {player2}, and {drinks} intensity scaling.
- Implement VirusManager.ts managing temporal rule lifecycle, round countdown on card transitions, and expiration alert detection.
- Implement BoardEngine.ts for La Guatoca (Clásica 45 casillas, Hot 40 casillas), uniform 1-6 dice roll, destination calculation with overshoot bounce-back, and special tiles (oca, puente, cárcel, muerte, meta).

### R3. Infrastructure & Services
- Implement catalogLoader.ts loading catalog_manifest.json, categories, and presets on-demand with IndexedDB caching (idb-keyval).
- Implement soundService.ts with procedural Web Audio API synthesizers (swipe whoosh, dice rattle/stop, virus fanfarria, victory chords, tap click) and navigator.vibrate fallback.
- Implement registerSW.ts with install prompt management.

### R4. State Management (Zustand Stores)
- useGameSessionStore: active game state, deck, index, active viruses, board positions, turns, and crash/reload recovery.
- usePlayerStore: active players, sip counts, targets, and historical players for 1-tap Quick Add.
- useSettingsStore: sound, haptics, neon theme selection, and day/night mode toggle.

### R5. UI Presentation & Screens
- TopHeader: Logo, offline indicator, PWA install button, settings toggle, conditional "Reanudar Previa" banner.
- BottomNav: Thumb-zone fixed navigation bar ("🃏 Cartas", "🎲 Tableros", "🍾 Mesa").
- HomeScreen: Fast-start Hero zone (Modo Caos, Modo Caliente, Modo Parejas), 1:1 touch grid of all categories, and mode selection.
- SetupScreen: Player management (Quick Add chips, input, color avatars), intensity selector (Todas/Chill/Fiesta/Hot/Extremo), pack filters, and start button.
- GameCardsScreen: Framer Motion bilateral SwipeableCard, CardDeck depth perspective, VirusHUD, VirusExpiredModal, manual sip adjusters [+1]/[-1], and Undo button.
- GameBoardScreen: Mobile vertical serpentine BoardGrid, animated Dice3D, and TileModal.
- PodiumScreen: Confetti celebration (canvas-confetti), "Más Bebedor", "Más Buscado", game stats, and replay/home CTAs.
- SettingsModal: Theme switcher, sound/vibration toggles, and day mode switch.

### R6. Automated Testing (Vitest)
- Unit tests for CardEngine (Fisher-Yates, intensity filter, chaos interleaving, undo).
- Unit tests for VariableReplacer (fairness distribution, strict distinctness {player1} !== {player2}, token interpolation).
- Unit tests for VirusManager (registration, round countdown, expiration).
- Unit tests for BoardEngine (dice distribution, oca jumps, bounce-back, victory).

## Acceptance Criteria

### Verification
- [ ] npm run test passes 100% of unit tests in Vitest with 0 failures.
- [ ] npm run typecheck (tsc --noEmit) passes with 0 TypeScript errors in strict mode.
- [ ] npm run build succeeds generating production bundle and service worker.
- [ ] Offline operation functional via Service Worker Cache-First and IndexedDB.
- [ ] Crash/reload recovery preserves and restores active game state from localStorage.
