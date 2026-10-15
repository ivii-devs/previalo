## 2026-10-14T21:39:15Z
You are worker_m5, a teamwork_preview_worker subagent.
Your working directory is: c:/.d/previalo-project/.agents/teamwork/worker_m5/
You must write your logs, progress, and reports ONLY inside your working directory.

MANDATORY FIRST STEP:
Read the verbatim user request at:
c:/.d/previalo-project/.agents/teamwork/ORIGINAL_REQUEST.md

Read the project blueprint and specifications:
c:/.d/previalo-project/PROJECT.md
c:/.d/previalo-project/.agents/teamwork/spec_miner_1/handoff.md
c:/.d/previalo-project/.agents/teamwork/worker_m1/handoff.md
c:/.d/previalo-project/.agents/teamwork/worker_m2/handoff.md
c:/.d/previalo-project/.agents/teamwork/worker_m3/handoff.md
c:/.d/previalo-project/.agents/teamwork/worker_m4/handoff.md
c:/.d/previalo-project/.agents/teamwork/reviewer_m4_2/handoff.md
c:/.d/previalo-project/.agents/teamwork/challenger_m4_2/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own:
- src/presentation/** (components, screens, styles, and tests)
- src/App.tsx
- src/application/useGameSessionStore.ts (for the two minor edge-case hardening fixes: penultimate jump to Meta victory, fresh activePlayers in snapshot persistence)

YOUR MISSION (Milestone 5: UI Presentation & Mobile Screens - R5):
1. Apply the two minor hardening fixes to `src/application/useGameSessionStore.ts` identified by reviewer_m4_2 & challenger_m4_2:
   - Penultimate tile jump to Meta: When pawn lands on tile 44 (Clásica) or 39 (Hot) and jumps to tile 45/40 (totalTiles), verify victory condition (`destination === totalTiles || actionResult.destination === totalTiles`) and trigger victory instead of granting extra roll.
   - Snapshot fresh activePlayers: In `persistActiveSession()`, read `usePlayerStore.getState().players` after `addSips` so the snapshot in localStorage has up-to-date sips.
   - Prune expired viruses on undo: When `previousCard()` is called, remove restored active viruses from `expiredVirusesQueue`.

2. Implement `src/presentation/components/`:
   - `TopHeader.tsx`
   - `BottomNav.tsx`
   - `SwipeableCard.tsx`
   - `CardDeck.tsx`
   - `VirusHUD.tsx`
   - `VirusExpiredModal.tsx`
   - `BoardGrid.tsx`
   - `Dice3D.tsx`
   - `TileModal.tsx`
   - `SettingsModal.tsx`

3. Implement `src/presentation/screens/`:
   - `HomeScreen.tsx`
   - `SetupScreen.tsx`
   - `GameCardsScreen.tsx`
   - `GameBoardScreen.tsx`
   - `PodiumScreen.tsx`

4. Implement `src/App.tsx`:
   - Main screen router state: `'home' | 'setup' | 'game-cards' | 'game-board' | 'podium'`.
   - Mobile viewport container: fixed 100dvh height, `overscroll-behavior-y: none`, `touch-action: manipulation`.
   - Mounts `TopHeader` and `BottomNav` on appropriate screens.
   - Mounts `SettingsModal` globally.

5. Implement automated unit & component tests in `src/presentation/__tests__/`:
   - `HomeScreen.test.tsx`
   - `SetupScreen.test.tsx`
   - `GameCardsScreen.test.tsx`
   - `GameBoardScreen.test.tsx`
   - `PodiumScreen.test.tsx`
   - `TopHeader.test.tsx`
   - `SettingsModal.test.tsx`

6. Execute verification commands:
   - `npm run typecheck` (`tsc -b --noEmit`)
   - `npm run test` (`vitest run`)
   - `npm run build` (`tsc -b && vite build`)
   All must pass with 0 errors!
