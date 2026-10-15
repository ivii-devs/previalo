## 2026-10-14T20:34:30Z
Target: worker_m2
Milestone: Milestone 2: Pure Domain Engines & Domain Types (R2)
Input reports:
- c:/.d/previalo-project/.agents/teamwork/ORIGINAL_REQUEST.md
- c:/.d/previalo-project/PROJECT.md
- c:/.d/previalo-project/.agents/teamwork/spec_miner_1/handoff.md
- c:/.d/previalo-project/.agents/teamwork/explorer_catalog_1/handoff.md
Working Directory: c:/.d/previalo-project/.agents/teamwork/worker_m2/
## 2026-10-14T20:34:47Z
You are worker_m2, a teamwork_preview_worker subagent.
Your working directory is: c:/.d/previalo-project/.agents/teamwork/worker_m2/
You must write your logs, progress, and reports ONLY inside your working directory.

MANDATORY FIRST STEP:
Read the verbatim user request at:
c:/.d/previalo-project/.agents/teamwork/ORIGINAL_REQUEST.md

Read the project blueprint and specifications:
c:/.d/previalo-project/PROJECT.md
c:/.d/previalo-project/.agents/teamwork/spec_miner_1/handoff.md
c:/.d/previalo-project/.agents/teamwork/explorer_catalog_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own:
- src/domain/** (types, engines, and __tests__)
- package.json (update typecheck script to "tsc -b --noEmit")
- tests/e2e/harness/e2e-game-driver.ts (fix line 216 consecutiveCategoryCount logic)

YOUR MISSION (Milestone 2: Pure Domain Engines & Domain Types - R2):
1. Create `src/domain/types/`:
   - `card.ts`: Card (id: string | number, text: string, type: string, intensity: IntensityLevel, drinks_penalty?: number, target?: string, chain?: VirusChain, etc.), IntensityLevel (1 | 2 | 3 | 4), VirusChain.
   - `board.ts`: BoardTile, BoardId ('guatoca_clasica' | 'guatoca_hot'), TileType, TileActionResult.
   - `player.ts`: Player (id, name, color, avatar, sips, timesTargeted, jailTurns).
   - `virus.ts`: ActiveVirus (id, cardId, ruleText, targetPlayerId, targetPlayerName, roundsRemaining, totalRounds).
   - `session.ts`: GameSession, HistorySnapshot, GameModeId.
   - `index.ts`: Export all domain types.
2. Implement `src/domain/engines/CardEngine.ts`:
   - Strict Fisher-Yates ($O(N)$) shuffler.
   - Mode deck builders: pure category (with intensity/pack filters), curated presets (modo_caliente, modo_parejas), chaos mix (with category interleaving: <=3 consecutive cards of same category).
   - Undo/history stack management: push and pop snapshots restoring previous card, assigned players, awarded sips, and virus round counts.
3. Implement `src/domain/engines/VariableReplacer.ts`:
   - Token whitelist: `{player1}`, `{player2}`, `{player3}`, `{player4}`, `{team}`, `{drinks}`.
   - Fairness algorithm: weighted selection based on inverse frequency $1/(C_p + 1)$ and cooldown boost $(1 + 0.2 \cdot \min(T_p, 5))$, guaranteeing <=15% deviation in 100 draws with 4 players.
   - Strict distinctness: `{player1} !== {player2}`, `{player3} !== {player1, player2}`, `{player4}` uniqueness.
   - Dynamic `{drinks}` intensity scaling: Chill (1), Fiesta (1-2), Hot (2-3), Extremo (3-5).
   - Player count guards (exclude/handle cards needing more players than active).
4. Implement `src/domain/engines/VirusManager.ts`:
   - `createVirus(card: Card, targetPlayer?: Player): ActiveVirus` (duration from card or default 2-4 rounds).
   - `tickRound(viruses: ActiveVirus[]): { updatedViruses: ActiveVirus[], expiredViruses: ActiveVirus[] }`.
5. Implement `src/domain/engines/BoardEngine.ts`:
   - Uniform 1-6 dice RNG (`Math.floor(Math.random() * 6) + 1`).
   - `calculateDestination(currentPosition: number, roll: number, totalTiles: number): number`: destination bounce-back overshoot math `maxTiles - (pos + roll - maxTiles)`.
   - `resolveTile(tile: BoardTile): TileActionResult`: handles jump/oca (grants extra roll, jumps forward), puente, cárcel (2 turns locked), muerte (resets to tile 1), finish (meta victory).
6. Implement comprehensive Vitest unit tests in `src/domain/engines/__tests__/`:
   - `CardEngine.test.ts` (Fisher-Yates distribution, mode builders, interleaving <=3, undo stack).
   - `VariableReplacer.test.ts` (fairness distribution <=15% dev, distinctness, drink scaling).
   - `VirusManager.test.ts` (registration, countdown, expiration detection).
   - `BoardEngine.test.ts` (dice 1-6 distribution, oca jumps, bounce-back, special tiles, victory).
7. Update `package.json` `"typecheck"` to `"tsc -b --noEmit"` and fix line 216 in `tests/e2e/harness/e2e-game-driver.ts`.
8. Execute verification:
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
   Ensure 100% of tests pass, typecheck passes with 0 errors, and build succeeds!

DELIVERABLE:
Write your full handoff report to:
c:/.d/previalo-project/.agents/teamwork/worker_m2/handoff.md
When complete, send a message back to me (the caller/parent).
