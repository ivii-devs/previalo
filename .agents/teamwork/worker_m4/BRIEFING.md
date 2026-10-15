# BRIEFING — 2026-10-14T21:22:00Z

## Mission
Implement Milestone 4 (State Management - Zustand Stores - R4): useSettingsStore, usePlayerStore, useGameSessionStore with crash recovery, barrel export in src/application/index.ts, and comprehensive unit/integration test suites in src/application/__tests__/.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:/.d/previalo-project/.agents/teamwork/worker_m4/
- Original parent: 1c307a0d-3e51-47ca-87fa-d03b41540886
- Milestone: Milestone 4 (State Management - Zustand Stores - R4)

## 🔒 Key Constraints
- Exclusive write ownership: src/application/** (useGameSessionStore.ts, usePlayerStore.ts, useSettingsStore.ts, index.ts, and __tests__/**).
- DO NOT hardcode test results or fabricate logic.
- Follow Clean Architecture: stores orchestrate domain engines (CardEngine, VariableReplacer, VirusManager, BoardEngine) and infrastructure adapters (soundService).
- Pass all checks: npm run typecheck (tsc -b --noEmit), npm run test (vitest run), npm run build (tsc -b && vite build) with 0 errors.

## Current Parent
- Conversation ID: 1c307a0d-3e51-47ca-87fa-d03b41540886
- Updated: 2026-10-14T21:22:00Z

## Task Summary
- **What to build**:
  1. `src/application/useSettingsStore.ts`: theme ('cyber-neon' | 'electric-purple' | 'acid-lime' | 'sunset-hot' | 'day-mode'), soundEnabled, hapticsEnabled, actions, persist to 'previalo_settings', document data-theme sync, soundService sync.
  2. `src/application/usePlayerStore.ts`: players, historicalPlayers, addPlayer (neon colors & avatars), removePlayer, updatePlayer, addSips, incrementTargeted, quickAddPlayer, removeHistoricalPlayer, resetPlayerStats, clearPlayers, persist historicalPlayers to 'previalo_player_history'.
  3. `src/application/useGameSessionStore.ts`: card & board session state, token replacement, virus ticking & expiration, undo stack, board movement with bounce-back & jail, victory handling, audio triggers, crash recovery ('previalo_active_session', hasActiveSession, resumeSession, endSession).
  4. `src/application/index.ts`: barrel export.
  5. `src/application/__tests__/`: unit and integration tests for all 3 stores.
- **Success criteria**: 100% passing tests, 0 typecheck errors, successful production build.
- **Interface contracts**: PROJECT.md & SRS_REQUIREMENTS.md.
- **Code layout**: PROJECT.md § Code Layout.

## Key Decisions Made
- Used Zustand 5 `create` with `persist` middleware for settings and player history, using a resilient `dynamicStorage` proxy supporting both browser `window.localStorage`, Node.js `globalThis.localStorage`, and memory fallback.
- For crash recovery in `useGameSessionStore`, active game state is serialized and persisted under `'previalo_active_session'` on every mutation, with validation on `hasActiveSession()` and hydration in `resumeSession()`.
- Synchronized `useSettingsStore` with procedural `soundService` methods and DOM `document.documentElement.setAttribute('data-theme', theme)`.

## Artifact Index
- `src/application/useSettingsStore.ts` — Settings store with theme, sound, haptic toggles & persistence.
- `src/application/usePlayerStore.ts` — Player store with auto neon styling, stats tracking, Quick Add history.
- `src/application/useGameSessionStore.ts` — Game session store coordinating domain engines, board rules, viruses, undo stack, audio, and reload recovery.
- `src/application/index.ts` — Barrel export for application layer.
- `src/application/__tests__/useSettingsStore.test.ts` — 6 unit tests for settings store.
- `src/application/__tests__/usePlayerStore.test.ts` — 11 unit tests for player store.
- `src/application/__tests__/useGameSessionStore.test.ts` — 20 unit & integration tests for game session store.

## Change Tracker
- **Files modified**:
  - `src/application/useSettingsStore.ts` (created)
  - `src/application/usePlayerStore.ts` (created)
  - `src/application/useGameSessionStore.ts` (created)
  - `src/application/index.ts` (created)
  - `src/application/__tests__/useSettingsStore.test.ts` (created)
  - `src/application/__tests__/usePlayerStore.test.ts` (created)
  - `src/application/__tests__/useGameSessionStore.test.ts` (created)
- **Build status**: Pass (`npm run typecheck`, `npm run test`, `npm run build` all passing).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: 36 test files, 404 tests passing (0 failures).
- **Lint status**: Clean (tsc -b --noEmit passed).
- **Tests added/modified**: 37 new tests across 3 suites in `src/application/__tests__/`.

## Loaded Skills
- None required.
