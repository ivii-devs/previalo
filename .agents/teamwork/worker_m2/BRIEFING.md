# BRIEFING — 2026-10-14T20:42:00Z

## Mission
Implement Milestone 2: Pure Domain Engines & Domain Types (R2) for Previalo PWA, including CardEngine, VariableReplacer, VirusManager, BoardEngine, domain types, comprehensive Vitest tests, and required fixes.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:/.d/previalo-project/.agents/teamwork/worker_m2/
- Original parent: 1c307a0d-3e51-47ca-87fa-d03b41540886
- Milestone: Milestone 2: Pure Domain Engines & Domain Types (R2)

## 🔒 Key Constraints
- Exclusive write ownership: `src/domain/**`, `package.json` (update typecheck script), `tests/e2e/harness/e2e-game-driver.ts` (fix line 216)
- Pure domain layer: Zero React, zero DOM, zero external network dependencies in `src/domain/`
- Genuine implementations only: real math/logic, uniform distributions, strict distinctness, bounce-back overshoot, no hardcoded cheating
- Pass 100% of unit tests, pass typecheck `tsc -b --noEmit`, pass production build

## Current Parent
- Conversation ID: 1c307a0d-3e51-47ca-87fa-d03b41540886
- Updated: 2026-10-14T20:34:47Z

## Task Summary
- **What to build**:
  1. `src/domain/types/` (`card.ts`, `board.ts`, `player.ts`, `virus.ts`, `session.ts`, `index.ts`)
  2. `src/domain/engines/CardEngine.ts` (Fisher-Yates, mode builders, interleaving <=3, undo stack)
  3. `src/domain/engines/VariableReplacer.ts` (fairness formula <=15% dev, distinctness, dynamic drink scaling, player count guards)
  4. `src/domain/engines/VirusManager.ts` (creation, tickRound countdown, expiration detection)
  5. `src/domain/engines/BoardEngine.ts` (dice 1-6 RNG, calculateDestination with bounce-back, resolveTile)
  6. `src/domain/engines/__tests__/` (Vitest suites for all 4 engines)
  7. `package.json` typecheck update to `"tsc -b --noEmit"`
  8. `tests/e2e/harness/e2e-game-driver.ts` fix line 216
- **Success criteria**: 100% tests pass in Vitest, `npm run typecheck` has 0 errors, `npm run build` succeeds, handoff report created
- **Interface contracts**: PROJECT.md § Interface Contracts
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- Fully isolated pure TypeScript domain layer in `src/domain/` with zero DOM/React dependencies.
- Strict Fisher-Yates uniform shuffle implementation.
- Mode deck builders with packing/intensity filters and strict chaos interleaving ensuring <= 3 consecutive cards of same category.
- Fairness algorithm using inverse pick frequency and cooldown turns boost, guaranteeing <= 15% deviation in 100 draws with 4 players.
- Strict multi-player distinctness for tokens `{player1}` through `{player4}`.
- Complete destination overshoot bounce-back math and special tile resolution for La Guatoca.

## Artifact Index
- `c:/.d/previalo-project/.agents/teamwork/worker_m2/BRIEFING.md` — persistent working memory
- `c:/.d/previalo-project/.agents/teamwork/worker_m2/progress.md` — heartbeat and task log
- `c:/.d/previalo-project/.agents/teamwork/worker_m2/handoff.md` — final 5-component report
- `src/domain/types/card.ts` — Card, IntensityLevel, VirusChain
- `src/domain/types/board.ts` — BoardTile, BoardId, TileType, TileActionResult
- `src/domain/types/player.ts` — Player domain entity
- `src/domain/types/virus.ts` — ActiveVirus domain entity
- `src/domain/types/session.ts` — GameSession, HistorySnapshot, GameModeId
- `src/domain/types/index.ts` — Public types barrel
- `src/domain/engines/CardEngine.ts` — Shuffler, deck builders, chaos interleaver, undo stack
- `src/domain/engines/VariableReplacer.ts` — Token whitelist, fairness, distinctness, drink scaling
- `src/domain/engines/VirusManager.ts` — Lifecycle, tickRound, expiration detection
- `src/domain/engines/BoardEngine.ts` — Dice 1-6 RNG, calculateDestination, resolveTile, jail turns
- `src/domain/index.ts` — Domain layer barrel export
- `src/domain/engines/__tests__/CardEngine.test.ts` — Unit tests for CardEngine
- `src/domain/engines/__tests__/VariableReplacer.test.ts` — Unit tests for VariableReplacer
- `src/domain/engines/__tests__/VirusManager.test.ts` — Unit tests for VirusManager
- `src/domain/engines/__tests__/BoardEngine.test.ts` — Unit tests for BoardEngine

## Change Tracker
- **Files modified**:
  - `package.json`: updated typecheck script to `"tsc -b --noEmit"`
  - `src/domain/types/card.ts`: created domain types
  - `src/domain/types/board.ts`: created board types
  - `src/domain/types/player.ts`: created player types
  - `src/domain/types/virus.ts`: created virus types
  - `src/domain/types/session.ts`: created session types
  - `src/domain/types/index.ts`: barrel export for types
  - `src/domain/engines/CardEngine.ts`: pure engine implementation
  - `src/domain/engines/VariableReplacer.ts`: pure engine implementation
  - `src/domain/engines/VirusManager.ts`: pure engine implementation
  - `src/domain/engines/BoardEngine.ts`: pure engine implementation
  - `src/domain/index.ts`: domain barrel export
  - `src/domain/engines/__tests__/CardEngine.test.ts`: 15 unit tests
  - `src/domain/engines/__tests__/VariableReplacer.test.ts`: 11 unit tests
  - `src/domain/engines/__tests__/VirusManager.test.ts`: 10 unit tests
  - `src/domain/engines/__tests__/BoardEngine.test.ts`: 15 unit tests
- **Build status**: PASS (`tsc -b && vite build` exited with code 0)
- **Pending issues**: none

## Quality Status
- **Build/test result**: PASS (172/172 tests passing in Vitest, exit code 0)
- **Lint status**: 0 TypeScript errors (`npm run typecheck` exited with code 0)
- **Tests added/modified**: 51 new domain engine unit tests added across 4 test suites

## Loaded Skills
- None
