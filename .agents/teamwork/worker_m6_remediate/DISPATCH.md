# Task Assignment — worker_m6_remediate

## Objective
Remediate the two test stability issues identified by `reviewer_m6_1` in Milestone 6:
1. Vitest timeout in `tests/adversarial/tier5-adversarial-hardening.test.ts` for test `TC-T5-EXH-05`.
2. Intermittent flakiness in `tests/e2e/tier3-combinations/chaos-mode-intensity.e2e.test.ts` (`TC-T3-CHS-05`) caused by unweighted category selection in `tests/e2e/harness/e2e-game-driver.ts` `E2EGameDriver.buildChaosDeck`.
3. (Optional hardening) Test assertion tolerance in `tests/e2e/tier2-boundary-corner/two-players-distinctness.e2e.test.ts` (`TC-T2-2PL-05`) to prevent binomial variance tripping bounds on unseeded runs.

## Exclusive Write Ownership
- `tests/adversarial/tier5-adversarial-hardening.test.ts`
- `tests/e2e/harness/e2e-game-driver.ts`
- `tests/e2e/tier2-boundary-corner/two-players-distinctness.e2e.test.ts`

## Instructions
1. In `tests/adversarial/tier5-adversarial-hardening.test.ts`:
   - For `TC-T5-EXH-05`, add an explicit timeout of 20000ms:
     ```typescript
     it('TC-T5-EXH-05: should handle ultra-large deck exhaustion (1,500 cards) under sustained iteration', () => {
       ...
     }, 20000);
     ```
   - Optionally adjust the iteration count (e.g. 500 cards instead of 999) to keep test fast and light while thoroughly testing large exhaustion.
2. In `tests/e2e/harness/e2e-game-driver.ts`:
   - In `buildChaosDeck`, match the pool-weighted category selection algorithm from `src/domain/engines/CardEngine.ts`:
     ```typescript
     const totalRem = available.reduce((acc, k) => acc + (pools[k].length - poolIndices[k]), 0);
     let r = Math.random() * totalRem;
     pickedCat = available[0];
     for (const k of available) {
       r -= (pools[k].length - poolIndices[k]);
       if (r <= 0) {
         pickedCat = k;
         break;
       }
     }
     ```
3. In `tests/e2e/tier2-boundary-corner/two-players-distinctness.e2e.test.ts`:
   - In `TC-T2-2PL-05`, ensure the assertion tolerance accommodates standard binomial variance for 60 draws (e.g. `expect(counts[0]).toBeGreaterThanOrEqual(21); expect(counts[0]).toBeLessThanOrEqual(39);` matching the <=15% requirement, or seed if appropriate).
4. Run verification:
   - `npm run test` (confirming all 43 suites pass with 0 failures and 0 timeouts).
   - `npm run test:e2e` (confirming all 121 E2E tests pass 100%).
   - `npm run typecheck` (`tsc -b --noEmit`).
   - `npm run build` (`tsc -b && vite build`).
5. Write your handoff report to `.agents/teamwork/worker_m6_remediate/handoff.md`.


## 2026-10-14T22:41:25Z
You are worker_m6_remediate, a teamwork_preview_worker subagent.
Your working directory is: c:/.d/previalo-project/.agents/teamwork/worker_m6_remediate/
You must write your logs, progress, and reports ONLY inside your working directory.

MANDATORY FIRST STEP:
Read the verbatim user request at:
c:/.d/previalo-project/.agents/teamwork/ORIGINAL_REQUEST.md

Read your task assignment and the reviewer's feedback:
c:/.d/previalo-project/.agents/teamwork/worker_m6_remediate/DISPATCH.md
c:/.d/previalo-project/.agents/teamwork/reviewer_m6_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own:
- tests/adversarial/tier5-adversarial-hardening.test.ts
- tests/e2e/harness/e2e-game-driver.ts
- tests/e2e/tier2-boundary-corner/two-players-distinctness.e2e.test.ts

YOUR MISSION:
Remediate the test stability and flakiness issues reported by reviewer_m6_1:
1. In `tests/adversarial/tier5-adversarial-hardening.test.ts`:
   - In `TC-T5-EXH-05`, add an explicit timeout of `20000` ms to the `it(...)` definition (e.g. `it('TC-T5-EXH-05: ...', () => { ... }, 20000);`) and/or reduce iteration count to 500 cards to eliminate parallel CPU serialization timeout.
2. In `tests/e2e/harness/e2e-game-driver.ts`:
   - In `E2EGameDriver.buildChaosDeck`, implement remaining-pool weighted category selection (matching `src/domain/engines/CardEngine.ts` `buildChaosDeck`) so that `TC-T3-CHS-05` achieves 100% deterministic >= 140 cards without premature termination.
3. In `tests/e2e/tier2-boundary-corner/two-players-distinctness.e2e.test.ts`:
   - In `TC-T2-2PL-05`, adjust bounds to `[21, 39]` (corresponding to the <= 15% deviation requirement for 60 draws) or use a seeded/stable PRNG to prevent binomial variance tripping bounds on unseeded runs.
4. Execute verification commands:
   - `npm run test` (all 43 suites must pass with 0 failures and 0 timeouts)
   - `npm run test:e2e` (all 121 E2E tests must pass 100%)
   - `npm run typecheck` (`tsc -b --noEmit`)
   - `npm run build` (`tsc -b && vite build`)
5. Write your complete handoff report to:
   c:/.d/previalo-project/.agents/teamwork/worker_m6_remediate/handoff.md
When complete, send a message back to me (the caller/parent) summarizing your changes and test outcomes.
