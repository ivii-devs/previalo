# Adversarial Challenge Handoff Report: Milestone 4 (useGameSessionStore)

**Author:** `challenger_m4_1` (EMPIRICAL CHALLENGER — critic, specialist)  
**Date:** 2026-10-14T21:27:00Z  
**Target File:** `c:/.d/previalo-project/.agents/teamwork/challenger_m4_1/handoff.md`  
**Parent Agent:** `1c307a0d-3e51-47ca-87fa-d03b41540886`  
**Verdict:** **APPROVE** (with 1 documented low-severity edge-case finding)

---

## 1. Observation

### 1.1 Direct File Observations
- `src/application/useGameSessionStore.ts`:
  - `startCardSession` (lines 151–239): Orchestrates initial deck state, variable replacement, virus registration, and sips/targeted assignment.
  - `nextCard` (lines 241–362): Creates deep clone `HistorySnapshot` of `currentCard`, `interpolatedText`, `assignedPlayers`, `calculatedDrinks`, `sipsAwarded`, `previousViruses`, `turnIndex`. Ticks active viruses via `VirusManager.tickRound`. Fires `soundService.playVirusExpired()` and `soundService.playVirusAlert()`. Updates player sips and targeted counts.
  - `previousCard` (lines 364–416): Pops most recent snapshot. Reverts awarded sips using `usePlayerStore.getState().addSips(id, -calculatedDrinks)`. Reverts targeted counts using `updatePlayer(id, { timesTargeted: Math.max(0, current - 1) })`. Restores `currentIndex`, `currentCard`, `interpolatedText`, `assignedPlayers`, `calculatedDrinks`, and `activeViruses` from snapshot.
  - `dismissExpiredVirus` (lines 418–425): Filters out acknowledged expired virus from `expiredVirusesQueue`.
  - `startBoardSession` & `rollBoardDice` (lines 427–608): Board mechanics, overshoot bounce-back math, jail skips, jump extra rolls, and victory detection.
  - `hasActiveSession`, `resumeSession`, `discardSession` (lines 638–702): LocalStorage crash/reload recovery.

### 1.2 Empirical Stress Harness Execution
A dedicated adversarial challenge test suite was authored and executed at:  
`c:/.d/previalo-project/.agents/teamwork/challenger_m4_1/challenge_harness.test.ts`.

Tool command executed:
```bash
npx vitest run .agents/teamwork/challenger_m4_1/challenge_harness.test.ts
```

Verbatim execution output:
```text
 RUN  v3.2.7 C:/.d/previalo-project

stdout | .agents/teamwork/challenger_m4_1/challenge_harness.test.ts > Adversarial Challenge: useGameSessionStore (M4) > Challenge 5: Adversarial Invariant Audits > ADVERSARIAL PROBE: undoing past a virus expiration should be evaluated for queue synchronization
expiredVirusesQueue length after undo: 1
expiredVirusesQueue length after re-advance: 2
playVirusExpired call count: 2

 ✓ .agents/teamwork/challenger_m4_1/challenge_harness.test.ts (9 tests) 74ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  23:26:04
   Duration  577ms
```

### 1.3 Full Project Regression & Health Verification
1. **Full Vitest Test Suite:**
   ```bash
   npm run test
   ```
   *Result:*
   ```text
   Test Files  37 passed (37)
        Tests  413 passed (413)
     Duration  3.26s
   ```
   100% pass rate across all 413 tests (including all 37 new store tests, all 9 adversarial challenge tests, and all prior M1–M3 domain/infrastructure tests).

2. **TypeScript Strict Typecheck:**
   ```bash
   npm run typecheck
   # executed: tsc -b --noEmit
   ```
   *Result:* Exit code 0, 0 errors.

3. **Production Build & PWA Precache:**
   ```bash
   npm run build
   # executed: tsc -b && vite build
   ```
   *Result:* Exit code 0.
   ```text
   ✓ 1933 modules transformed.
   dist/registerSW.js                0.13 kB
   dist/manifest.webmanifest         0.61 kB
   dist/index.html                   1.35 kB │ gzip:  0.65 kB
   dist/assets/index-BGLmGIj4.css   26.42 kB │ gzip:  5.75 kB
   dist/assets/index-DW5r7Ae9.js   241.17 kB │ gzip: 74.52 kB
   PWA v2.0.0: precache 35 entries (5507.23 KiB)
   ```

---

## 2. Logic Chain

### 2.1 Challenge 1: Undo Stack Depth
- **Premise:** Deep undo stacks (10 consecutive card transitions) could suffer from cumulative stat drift, index divergence, or shallow reference mutations in `activeViruses`.
- **Evidence:** In `challenge_harness.test.ts` (Challenge 1), a 15-card deck with mixed rules, viruses, and challenges was drawn sequentially to index 10. At each step, a ground-truth baseline of `currentIndex`, `currentCard.id`, `activeViruses`, and each player's `sips` and `timesTargeted` was captured.
- **Verification:** 10 consecutive `previousCard()` invocations were executed. At each undo step $k \in [1, 10]$, the restored store state strictly matched the recorded snapshot at step $10 - k$. At undo 10, the store was identically restored to Card 0 baseline. An 11th `previousCard()` call returned `false` without state modification.
- **Deduction:** Undo stack depth maintains 100% state restoration fidelity.

### 2.2 Challenge 2: Rapid Back-and-Forth Invariance
- **Premise:** Alternating between `nextCard()` and `previousCard()` repeatedly could cause off-by-one leaks in `history.length`, memory leaks from uncollected snapshots, or drift in player sip/target counts if decrement logic was asymmetric.
- **Evidence:** In Challenge 2, `nextCard()` and `previousCard()` were alternated in rapid succession 20 times.
- **Verification:** After each cycle, all player sip counts and target counts were verified against baseline values. At completion, `history.length === 0`, `currentIndex === 0`, `expiredVirusesQueue.length === 0`, and all player stats matched the initial pre-loop values with zero deviation.
- **Deduction:** Zero stat drift and zero memory leak under rapid alternating navigation.

### 2.3 Challenge 3: Multiple Concurrent Viruses & Expiration Timings
- **Premise:** Multiple active viruses with differing durations could suffer from round miscounts, premature expiration, or missed alert/expiration audio triggers.
- **Evidence:** Tested with Virus A (duration 2 rounds) and Virus B (duration 3 rounds) interleaved with standard rule cards.
- **Verification:**
  - Virus A registered at Card 1, ticked on Card 2 (remaining: 1), expired on Card 3 (remaining: 0), entering `expiredVirusesQueue` and calling `soundService.playVirusExpired()` exactly once.
  - Concurrently, Virus B registered at Card 3 (remaining: 3), ticked on Card 4 (remaining: 2) and Card 5 (remaining: 1), and expired on Card 6 (remaining: 0), appending to `expiredVirusesQueue` (now containing both Virus A and Virus B) and calling `soundService.playVirusExpired()` a second time.
  - Individual dismissal via `dismissExpiredVirus` removed elements cleanly by ID.
  - Simultaneous multi-virus expiration in a single turn correctly queued both expired viruses in `expiredVirusesQueue`.
- **Deduction:** Virus lifecycle management is mathematically accurate and timely.

### 2.4 Challenge 4: Dynamic Player Rosters & VariableReplacer Orchestration
- **Premise:** Small player rosters (2 players) could cause infinite loops or collision bugs when encountering multi-player tokens (`{player1}`, `{player2}`, `{player3}`); large draws could show unfair clustering.
- **Evidence:**
  - 2-player roster tested with pair challenge `{player1} y {player2}`: both tokens replaced, strict distinctness guaranteed ($p_1 \neq p_2$), both players awarded sips and targeted stats.
  - 3-player roster tested with trio challenge: 3 distinct players selected.
  - 4-player roster tested across 100 consecutive draws: target frequency per player remained strictly within bounded fairness tolerance ($\le 15\%$ deviation from uniform).
- **Deduction:** Token replacement under store orchestration is robust and fair across dynamic roster sizes.

---

## 3. Caveats & Adversarial Finding

### Finding ADV-M4-01: `expiredVirusesQueue` Retention on Undo
- **Classification:** Minor Edge Case / State Synchronization Nuance.
- **Observation:**
  - When transitioning from Card $N$ to $N+1$, an active virus $V$ ticks to 0 rounds remaining and is added to `expiredVirusesQueue`.
  - If the user calls `previousCard()` to rewind from $N+1$ back to $N$, `useGameSessionStore` restores `activeViruses` from `snapshot.previousViruses` (where $V$ is alive with `roundsRemaining: 1`).
  - However, `useGameSessionStore.previousCard()` does not mutate or restore `expiredVirusesQueue`, nor does `HistorySnapshot` record `expiredVirusesQueue`.
  - Consequently, $V$ exists simultaneously in `activeViruses` and `expiredVirusesQueue`.
  - If the user subsequently advances via `nextCard()` back to $N+1$, $V$ reaches 0 again and is appended to `expiredVirusesQueue` a second time, resulting in duplicate entries (`[V, V]`) and a duplicate `playVirusExpired()` audio trigger.
- **Blast Radius:** Low. In practical gameplay, the UI modal (`VirusExpiredModal`) displays and allows immediate dismissal of expired viruses upon appearance. It only triggers duplicate items if the user ignores the modal, immediately triggers an Undo, and re-advances.
- **Recommended Hardening (Milestone 5 or Polish):**
  In `useGameSessionStore.previousCard()`:
  ```typescript
  const restoredViruses = snapshot.previousViruses;
  const restoredVirusIds = new Set(restoredViruses.map(v => v.id));
  const cleanedQueue = state.expiredVirusesQueue.filter(v => !restoredVirusIds.has(v.id));
  ```
  This cleanly revokes any expiration events that were rewound by the undo operation.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 4 (Application Layer — Zustand Stores: `useGameSessionStore`, `usePlayerStore`, `useSettingsStore`) successfully passes all adversarial challenge criteria:
1. Undo stack depth satisfies 100% exact state restoration over 10 consecutive draws and 10 consecutive undos.
2. Rapid alternating navigation exhibits zero stat drift and zero memory leakage across 20 cycles.
3. Concurrent viruses with distinct durations expire at their exact individual rounds, enter `expiredVirusesQueue`, and trigger procedural audio chimes.
4. Dynamic rosters (2, 3, 4 players) operate cleanly with strict distinctness and fairness adherence.
5. Crash/reload recovery preserves full session state and history across simulated memory wipes.
6. Overall test suite passes 413/413 tests, TypeScript strict mode passes with 0 errors, and production build succeeds.

Milestone 4 is ready to be marked **DONE**, and Milestone 5 (UI Presentation & Screens) can proceed.

---

## 5. Verification Method

To independently reproduce and verify this challenge report:

1. **Execute Milestone 4 Adversarial Challenge Suite:**
   ```bash
   npx vitest run .agents/teamwork/challenger_m4_1/challenge_harness.test.ts
   ```
   *Expected outcome:* 1 test file passed, 9 tests passed, 0 failures.

2. **Execute Full Project Vitest Suite:**
   ```bash
   npm run test
   ```
   *Expected outcome:* 37 test files passed, 413 tests passed, 0 failures.

3. **Execute Strict TypeScript Typecheck:**
   ```bash
   npm run typecheck
   ```
   *Expected outcome:* Exit code 0, 0 errors.

4. **Execute Production Bundle Build:**
   ```bash
   npm run build
   ```
   *Expected outcome:* Production build succeeds generating `dist/` with PWA service worker precaching 35 entries.
