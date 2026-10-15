# Handoff Report: Milestone 2 Adversarial Challenge — BoardEngine & VirusManager

**Author:** `challenger_m2_2` (teamwork_preview_challenger)  
**Date:** 2026-10-14T20:49:00Z  
**Project:** Previalo Mobile-First PWA  
**Target File:** `c:/.d/previalo-project/.agents/teamwork/challenger_m2_2/handoff.md`  
**Parent Agent:** `1c307a0d-3e51-47ca-87fa-d03b41540886`  
**Verdict:** **APPROVE**

---

## 1. Observation

### 1.1 Target Engines & Interfaces
The following target implementations in Milestone 2 were evaluated and stress-tested:
1. `src/domain/engines/BoardEngine.ts`:
   - `rollDice()`: Uniform 1–6 dice RNG generator (`Math.floor(Math.random() * 6) + 1`).
   - `calculateDestination(currentPosition, roll, totalTiles)`: Destination calculation with overshoot bounce-back math (`maxTiles - ((currentPosition + roll) - maxTiles)` clamped to at least 1).
   - `isVictory(position, totalTiles)`: Finish line validation (`position === totalTiles`).
   - `resolveTile(tile: BoardTile)`: Special tile resolution (`jump`, `trap_jail`, `trap_skull`, `trap_back`, `finish`, `drink`).
   - `handleJailTurn(player: Player)`: Jail lockout counter and roll permission logic.
2. `src/domain/engines/VirusManager.ts`:
   - `createVirus(card: Card, targetPlayer?: Player)`: ActiveVirus instantiation with duration detection and collision-resistant ID generation.
   - `tickRound(viruses: ActiveVirus[])` / `tick(activeViruses: ActiveVirus[])`: Round decrement and expiration separation (`roundsRemaining - 1 <= 0` into `expiredViruses`).

### 1.2 Standalone Adversarial Test Suite
A dedicated adversarial test suite was authored and placed at:
- `tests/adversarial/board-virus-challenger.test.ts` (85 unit and statistical tests).

### 1.3 Execution Commands & Verbatim Outputs

#### Command 1: Standalone Adversarial Test Suite Execution
```bash
npx vitest run tests/adversarial/board-virus-challenger.test.ts
```
**Verbatim Output:**
```text
 RUN  v3.2.7 C:/.d/previalo-project

stdout | tests/adversarial/board-virus-challenger.test.ts > CHALLENGER M2: Adversarial Stress Test Suite > 1. Dice RNG: Uniformity & Chi-Square Statistical Test > empirical chi-square test across 6,000 rolls should not reject uniformity at alpha = 0.01
[RNG Challenge] 6,000 rolls distribution: { '1': 982, '2': 972, '3': 983, '4': 1002, '5': 1032, '6': 1029 }
[RNG Challenge] Chi-Square statistic: 3.2660 (critical alpha=0.01 is 15.086)

stdout | tests/adversarial/board-virus-challenger.test.ts > CHALLENGER M2: Adversarial Stress Test Suite > 1. Dice RNG: Uniformity & Chi-Square Statistical Test > multi-batch chi-square challenge (10 batches of 6,000 rolls = 60,000 total rolls)
[RNG Challenge] Mean Chi-Square across 10 batches: 3.8378 (Expected mean for df=5 is 5.0)

 ✓ tests/adversarial/board-virus-challenger.test.ts (85 tests) 259ms

 Test Files  1 passed (1)
      Tests  85 passed (85)
   Start at  22:46:50
   Duration  832ms (transform 90ms, setup 0ms, collect 104ms, tests 259ms, environment 0ms, prepare 172ms)
```

#### Command 2: Complete Project Test Suite Execution
```bash
npm run test
# executes: vitest run
```
**Verbatim Output:**
```text
Test Files  28 passed (28)
     Tests  278 passed (278)
  Duration  2.67s
```

#### Command 3: Strict TypeScript Compilation
```bash
npm run typecheck
# executes: tsc -b --noEmit
```
**Verbatim Output:**
```text
> previalo@1.0.0 typecheck
> tsc -b --noEmit

# Exited with code 0 (0 errors)
```

#### Command 4: Production Build
```bash
npm run build
# executes: tsc -b && vite build
```
**Verbatim Output:**
```text
> previalo@1.0.0 build
> tsc -b && vite build

vite v6.4.4 building for production...
transforming...
✓ 1933 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.61 kB
dist/index.html                   1.35 kB │ gzip:  0.65 kB
dist/assets/index-BGLmGIj4.css   26.42 kB │ gzip:  5.75 kB
dist/assets/index-DW5r7Ae9.js   241.17 kB │ gzip: 74.52 kB
✓ built in 5.06s

PWA v2.0.0
mode      generateSW
precache  35 entries (5507.23 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
```

---

## 2. Logic Chain

### 2.1 Challenge 1: Dice RNG Distribution & Uniformity (Chi-Square Analysis)
1. **Hypothesis:** `BoardEngine.rollDice()` might suffer from modulo bias, edge truncation, or non-uniform face probability under high volume.
2. **Empirical Evaluation:**
   - 6,000 independent rolls were sampled. Every single roll was verified to be strictly an integer $r \in \{1, 2, 3, 4, 5, 6\}$.
   - Observed frequencies: $O = \{1: 982, 2: 972, 3: 983, 4: 1002, 5: 1032, 6: 1029\}$. Expected frequency $E = 1000$.
   - Pearson Chi-Square statistic calculated:
     $$\chi^2 = \sum_{k=1}^6 \frac{(O_k - E)^2}{E} = 3.2660$$
   - Degrees of freedom $df = 5$. Critical value at $\alpha = 0.05$ is $11.070$; at $\alpha = 0.01$ is $15.086$. Since $3.2660 \ll 11.070$, the null hypothesis of uniform distribution cannot be rejected.
   - Furthermore, a 10-batch Monte Carlo test (60,000 rolls total) yielded a mean $\chi^2$ of $3.8378$, adhering closely to the theoretical expected mean of $5.0$ for $df=5$.
3. **Inference:** The RNG implementation is unbiased, uniform, and mathematically sound for board gameplay.

### 2.2 Challenge 2: Destination Overshoot Bounce-Back (Clásica 45 & Hot 40)
1. **Hypothesis:** `BoardEngine.calculateDestination` could miscalculate bounce-back coordinates, mishandle exact landings on finish, or generate coordinates $<1$ when large excess steps occur.
2. **Empirical Evaluation:**
   - **Clásica (Total Tiles = 45):** Tested exhaustively for all combinations of positions 40, 41, 42, 43, 44 with rolls 1–6 (30 scenarios).
     - Exact finish: Landing on tile 45 occurs only when $start + roll = 45$ (e.g., $40+5$, $41+4$, $42+3$, $43+2$, $44+1$). `isVictory` returns `true`.
     - Overshoot: $40+6 \to 44$; $41+5 \to 44$; $41+6 \to 43$; $42+6 \to 42$; $43+6 \to 41$; $44+6 \to 40$. All 100% matched theoretical bounce-back $45 - ((start + roll) - 45)$.
   - **Hot (Total Tiles = 40):** Tested exhaustively for positions 35, 36, 37, 38, 39 with rolls 1–6, as well as 40, 41, 42, 43, 44 with rolls 1–6 (36 scenarios).
     - Exact finish: $35+5 \to 40$; $36+4 \to 40$; $37+3 \to 40$; $38+2 \to 40$; $39+1 \to 40$. `isVictory` returns `true`.
     - Overshoot: $39+6 \to 35$; $40+1 \to 39$; $40+6 \to 34$; $44+6 \to 30$.
   - **Boundary Clamping:** An adversarial roll of 90 from position 40 ($rawTarget = 130$, $excess = 85$, $45 - 85 = -40$) was verified to clamp safely to tile 1 via `Math.max(1, bounced)`.
3. **Inference:** Bounce-back destination math and finish detection are invariant and defect-free.

### 2.3 Challenge 3: Special Tile Mechanics & Chaining
1. **Hypothesis:** Special tiles might fail to grant extra rolls, permit unintended extra rolls on non-jump tiles, loop uncontrollably on chained oca jumps, fail to reset on skull tiles, or bypass jail lockout turns.
2. **Empirical Evaluation:**
   - **Extra Roll Grant:** Confirmed that `resolveTile` sets `extraRoll: true` strictly and exclusively for tile type `jump`. All other 12 tile types (`trap_jail`, `trap_skull`, `trap_back`, `finish`, `drink`, `give_drink`, `challenge`, etc.) produce `extraRoll: false`.
   - **Oca Chaining:** A multi-hop oca chain ($5 \to 9 \to 14$) executed sequentially through a simulated pawn turn loop, verifying that chained hops propagate destination transitions while preserving the extra roll privilege.
   - **Cárcel (Jail) 2-Turn Lockout:** Evaluated through `handleJailTurn(player)`:
     - Turn 1: `canRoll: false`, `updatedJailTurns: 1`.
     - Turn 2: `canRoll: false`, `updatedJailTurns: 0` (message confirms sentence served).
     - Turn 3: `canRoll: true`, `updatedJailTurns: 0`.
     - Unjailed players are permitted to roll immediately.
   - **La Muerte (Skull Reset):** Verified that landing on `trap_skull` resets destination to tile 1 (both when `action_jump_to: 1` and when `action_jump_to: null` via fallback).
3. **Inference:** All special tile resolution rules match the Guatoca domain specifications.

### 2.4 Challenge 4: VirusManager Concurrent Lifecycles & Expiration Separation
1. **Hypothesis:** Tracking concurrent active viruses (>5) across multiple round ticks might cause cross-virus pollution, early expiration, delayed expiration, or object mutation.
2. **Empirical Evaluation:**
   - 7 concurrent active viruses with staggered lifetimes (durations 1, 2, 2, 3, 4, 5, 5 rounds) were processed round-by-round through `VirusManager.tickRound()`:
     - Round 1: Exactly V1 (duration 1) expired at `roundsRemaining === 0`. Remaining 6 active viruses updated.
     - Round 2: Exactly V2 and V3 (duration 2) expired together. Remaining 4 active viruses updated.
     - Round 3: Exactly V4 (duration 3) expired. Remaining 3 active viruses updated.
     - Round 4: Exactly V5 (duration 4) expired. Remaining 2 active viruses updated.
     - Round 5: Exactly V6 and V7 (duration 5) expired together, leaving active pool at length 0.
     - Round 6: Ticking empty pool returned empty updated and expired lists with zero errors.
   - **Dynamic Injection:** Successfully injected a new virus mid-game while others were active, verifying synchronous round countdown.
   - **Immutability:** Input virus objects remained unmodified; new instances were returned with updated counters.
   - **Scale Stress:** Tested 1,000 distinct viruses simultaneously; verified 1,000 unique IDs and zero collision.
3. **Inference:** VirusManager handles concurrency, multi-expiration, and state isolation with 100% precision.

---

## 3. Caveats

- **Scope Boundary:** This challenge was scoped strictly to pure domain logic (`BoardEngine`, `VirusManager`, and domain types). Presentation UI (`GameBoardScreen`, `Dice3D`, `VirusHUD`) and state stores (`useGameSessionStore`) are scheduled for Milestones 4 and 5.
- **Randomness Invariance:** Pseudo-random tests rely on standard JavaScript `Math.random()`. While not cryptographically secure (which is neither required nor desirable for casual board games), it passed all uniform distribution and chi-square thresholds at $\alpha = 0.01$.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 implementation of `BoardEngine` and `VirusManager` is thoroughly validated, mathematically sound, and robust against adversarial edge cases:
- Dice RNG passes 6,000-roll Pearson Chi-Square test ($\chi^2 = 3.2660 \ll 15.086$).
- Destination bounce-back accurately calculates all finish approaches on both Clásica (45) and Hot (40).
- Special tile mechanics (oca chaining, extra rolls, 2-turn jail lock, skull reset, finish victory) operate reliably.
- VirusManager maintains strict separation and lifecycle management across concurrent active viruses.
- Full test suite passes 278/278 tests (100%), strict typecheck passes with 0 errors, and production build succeeds.

Milestone 2 domain layer is approved to proceed to Milestone 3 (Infrastructure & Services).

---

## 5. Verification Method

To independently verify this evaluation:

1. **Run Standalone Adversarial Challenge Suite:**
   ```bash
   npx vitest run tests/adversarial/board-virus-challenger.test.ts
   ```
   *Expected Output:* 1 test file passed, 85 tests passed, 0 failures.

2. **Run Full Test Suite:**
   ```bash
   npm run test
   ```
   *Expected Output:* 28 test files passed, 278 tests passed, 0 failures.

3. **Run Strict TypeScript Verification:**
   ```bash
   npm run typecheck
   ```
   *Expected Output:* Exit code 0, 0 TypeScript errors.

4. **Run Production Build:**
   ```bash
   npm run build
   ```
   *Expected Output:* Exit code 0, bundle generated in `dist/` with Service Worker.
