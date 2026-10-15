# Review & Adversarial Quality Report: Milestone 2 — Pure Domain Engines & Domain Types (R2)

**Author:** `reviewer_m2_1` (teamwork_preview_reviewer)  
**Roles:** Reviewer, Critic  
**Date:** 2026-10-14T20:50:00Z  
**Project:** Previalo Mobile-First PWA  
**Target File:** `c:/.d/previalo-project/.agents/teamwork/reviewer_m2_1/handoff.md`  
**Parent Agent:** `1c307a0d-3e51-47ca-87fa-d03b41540886`  
**Verdict:** **APPROVE**  

---

## 1. Observation

### 1.1 Reviewed Work Products
The following files created and maintained under Milestone 2 were independently examined:
- **Domain Interfaces & Types:**
  - `src/domain/types/card.ts`: `Card`, `IntensityLevel` (1 | 2 | 3 | 4), `CardTarget`, `VirusChain`.
  - `src/domain/types/board.ts`: `BoardTile`, `BoardId`, `TileType`, `TileActionType`, `TileActionResult`.
  - `src/domain/types/player.ts`: `Player` interface with `sips`, `sipCount`, `timesTargeted`, `targetCount`, `jailTurns`, `boardPosition`.
  - `src/domain/types/virus.ts`: `ActiveVirus` interface (`roundsRemaining`, `totalRounds`).
  - `src/domain/types/session.ts`: `GameSession`, `HistorySnapshot`, `GameModeId`.
  - `src/domain/types/index.ts` & `src/domain/index.ts`: Barrel exports.
- **Pure Domain Engines:**
  - `src/domain/engines/CardEngine.ts`: Fisher-Yates ($O(N)$) shuffler, mode builders (`buildCategoryDeck`, `buildPresetDeck`, `buildChaosDeck` with $\le 3$ consecutive category limit), and undo stack management (`pushSnapshot`, `popSnapshot`, `restoreSnapshotState`).
  - `src/domain/engines/VariableReplacer.ts`: Whitelisted tokens (`{player1}`, `{player2}`, `{player3}`, `{player4}`, `{team}`, `{drinks}`), fairness weighting $W_p = \frac{1}{C_p + 1} \times (1 + 0.2 \cdot \min(T_p, 5))$, strict distinctness via `usedIds` Set, dynamic `{drinks}` scaling (Chill: 1, Fiesta: 1–2, Hot: 2–3, Extremo: 3–10), and player count limits (`isCardPlayable`).
  - `src/domain/engines/VirusManager.ts`: Virus registration, duration extraction, and `tickRound()` separating unexpired from expired viruses.
  - `src/domain/engines/BoardEngine.ts`: Uniform 1–6 dice RNG, overshoot bounce-back destination math `totalTiles - (pos + roll - totalTiles)`, special tile handling (Oca/Jump, Cárcel, Muerte, Finish, Drink), and `handleJailTurn()`.
- **Unit Test Suites:**
  - `src/domain/engines/__tests__/CardEngine.test.ts` (15 tests)
  - `src/domain/engines/__tests__/VariableReplacer.test.ts` (11 tests)
  - `src/domain/engines/__tests__/VirusManager.test.ts` (10 tests)
  - `src/domain/engines/__tests__/BoardEngine.test.ts` (15 tests)

### 1.2 Independent Verification Results
1. **TypeScript Strict Typecheck:**
   - Command: `npm run typecheck` (`tsc -b --noEmit`)
   - Result: Exited with code 0. Zero compiler errors across all files.

2. **Automated Unit & E2E Testing:**
   - Command: `npm run test` (`vitest run`)
   - Result:
     ```text
     Test Files  26 passed (26)
          Tests  172 passed (172)
       Duration  2.03s
     ```
   - 51 pure domain unit tests in `src/domain/engines/__tests__/`: 100% passing.
   - 121 end-to-end integration tests in `tests/e2e/**`: 100% passing.

3. **Domain Unit Tests Isolated Run:**
   - Command: `npx vitest run src/domain/engines/__tests__/`
   - Result: 4 test files passed, 51 tests passed, 0 failures.

4. **Production Build & PWA Precache:**
   - Command: `npm run build` (`tsc -b && vite build`)
   - Result: Exited with code 0.
     ```text
     ✓ 1933 modules transformed.
     dist/registerSW.js                0.13 kB
     dist/manifest.webmanifest         0.61 kB
     dist/index.html                   1.35 kB │ gzip:  0.65 kB
     dist/assets/index-BGLmGIj4.css   26.42 kB │ gzip:  5.75 kB
     dist/assets/index-DW5r7Ae9.js   241.17 kB │ gzip: 74.52 kB
     PWA v2.0.0 precache 35 entries (5507.23 KiB)
     ```

### 1.3 Integrity Audit
- **Hardcoded test results:** None. Randomizers (`Math.random`) and algorithms are genuinely implemented.
- **Dummy or facade implementations:** None. Real Fisher-Yates array swaps, genuine weighted player selection, actual bounce-back math, real history push/pop state restoration.
- **Shortcuts / task bypass:** None. All classes are built purely from scratch without external library cheats.
- **Fabricated verification outputs:** None. All commands were run directly and validated in live shell.

---

## 2. Logic Chain

1. **Clean Architecture Boundary Adherence:**
   - Direct inspection of all files in `src/domain/types/` and `src/domain/engines/` verifies zero imports of React, DOM APIs, Zustand stores, or network primitives.
   - All engines are pure TypeScript classes that can run identically in browser runtimes, service workers, or Node.js test environments.

2. **Mathematical Correctness & Anti-Cheat Validation:**
   - **Fisher-Yates (`CardEngine.shuffle`):** Loops from $N-1$ down to 1, swapping indices uniformly with $j = \lfloor \text{rand} \times (i+1) \rfloor$. Tested with 6,000 permutations confirming uniform probability across all 6 permutations of 3 elements within $\pm 25\%$ tolerance.
   - **Chaos Interleaving Invariant (`CardEngine.buildChaosDeck`):** Actively switches categories when $consecutiveCategoryCount \ge 2$, and strictly terminates if only the active category remains once reaching 3 consecutive cards. Tested against 160-card decks and skewed category distributions (30 vs 5 cards), proving no category ever exceeds 3 consecutive appearances.
   - **Fairness Weighted Sampling (`VariableReplacer.pickWeightedPlayer`):** Uses formula $W_p = \frac{1}{C_p + 1} \times (1 + 0.2 \cdot \min(T_p, 5))$. Tested over 100 draws with 4 players, verifying all players fall within $\le 15\%$ deviation of the theoretical mean ($25$).
   - **Strict Distinctness (`VariableReplacer.replaceTokens`):** Uses a `Set<string>` of `usedIds`. Each subsequent token (`{player2}`, `{player3}`, `{player4}`) filters out already assigned players. Tested across 50 iterations per multi-player pattern with zero duplicates.
   - **Dynamic Drink Scaling (`VariableReplacer.calculateDrinks`):** Tested across intensities 1 to 4:
     - Level 1 (Chill): strictly 1 trago.
     - Level 2 (Fiesta): 1–2 tragos.
     - Level 3 (Hot): 2–3 tragos.
     - Level 4 (Extremo): 3–10 tragos (minimum 3).
   - **Board Bounce-Back Destination Math (`BoardEngine.calculateDestination`):** When $rawTarget > totalTiles$, destination is $totalTiles - (rawTarget - totalTiles)$, clamped to at least tile 1. Exact match on $totalTiles$ triggers victory.

3. **Compiler and Build Hygiene:**
   - `package.json` uses `"typecheck": "tsc -b --noEmit"`, successfully validating the composite TypeScript configuration across `src/domain/`.
   - `npm run build` compiles without warnings, generating bundled assets $<250$ KB and the PWA Service Worker.

---

## 3. Caveats & Adversarial Edge Cases

1. **Defensive Edge Case — Empty Player Array in `replaceTokens`:**
   - *Observation:* If `replaceTokens` is called with an empty player list `players: []`, `pickWeightedPlayer` falls back to `players[0]` (which evaluates to `undefined`), causing `p1.name` to throw a `TypeError`.
   - *Impact / Mitigation:* In normal gameplay, `SetupScreen` and session initialization enforce $\ge 1$ (cards) or $\ge 2$ players. For Tier 5 adversarial hardening (M6), adding a 1-line guard `if (players.length === 0) return { interpolatedText: rawText, assignedPlayers: [], calculatedDrinks: drinks };` is recommended as defensive best practice.
2. **Defensive Edge Case — Player Names with Special Replacement Tokens (`$`):**
   - *Observation:* `String.prototype.replace(/\{player1\}/g, p1.name)` is used. If a player enters a nickname containing `$` characters (e.g. `$100`), JavaScript regex substitution could treat `$` specially.
   - *Impact / Mitigation:* Recommend changing to `replaceAll('{player1}', p1.name)` or `replace(/\{player1\}/g, () => p1.name)` during M6 hardening.
3. **Single-Category Input to Chaos Builder:**
   - *Observation:* If `buildChaosDeck` is passed only 1 category, it stops after 3 cards to protect the interleaving invariant.
   - *Mitigation:* Complies with the invariant contract; UI flow mandates multiple category selection for Chaos mode.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 (Pure Domain Engines & Domain Types - R2) meets 100% of the project specification and acceptance criteria:
- **Clean Architecture:** Strict decoupling with zero external dependencies in `src/domain/`.
- **Integrity:** Zero facade logic, zero hardcoded cheat values, zero integrity violations.
- **Verification:**
  - `npm run typecheck` passes with 0 errors.
  - `npm run test` passes 172/172 tests (51 engine unit tests + 121 E2E tests).
  - `npm run build` succeeds cleanly with production bundle and PWA service worker.
- **Ready for Milestone 3:** Infrastructure & Services (`catalogLoader`, `soundService`, `registerSW`).

---

## 5. Verification Method

To independently reproduce and verify this review:

1. **Verify TypeScript Strict Compilation:**
   ```bash
   npm run typecheck
   ```
   *Expected:* Exit code 0, 0 errors.

2. **Verify All Unit & E2E Tests:**
   ```bash
   npm run test
   ```
   *Expected:* 26 test files passed, 172 tests passed, 0 failures.

3. **Verify Domain Unit Tests Exclusively:**
   ```bash
   npx vitest run src/domain/engines/__tests__/
   ```
   *Expected:* 4 test files passed, 51 tests passed.

4. **Verify Production Build:**
   ```bash
   npm run build
   ```
   *Expected:* Exit code 0, dist/ generated with Service Worker.
