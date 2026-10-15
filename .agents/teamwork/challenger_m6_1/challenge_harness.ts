/**
 * White-Box Adversarial Stress Testing Harness
 * Subagent: challenger_m6_1 (Teamwork Empirical Challenger)
 * 
 * Challenges:
 * 1. VariableReplacer fairness: 1,000 draws with 4 players (<= 15% deviation, 100% token distinctness)
 * 2. BoardEngine dice RNG: 10,000 rolls with chi-square test for uniform distribution
 * 3. Deep undo stack resilience: 50 consecutive card draws followed by 50 undos (exact equality, 0 stat drift)
 * 4. Concurrency stress: rapid interleaved card and board session switching
 */

import { VariableReplacer } from '../../../src/domain/engines/VariableReplacer';
import { BoardEngine } from '../../../src/domain/engines/BoardEngine';
import { VirusManager } from '../../../src/domain/engines/VirusManager';
import { useGameSessionStore } from '../../../src/application/useGameSessionStore';
import { usePlayerStore } from '../../../src/application/usePlayerStore';
import type { Player } from '../../../src/domain/types/player';
import type { Card } from '../../../src/domain/types/card';
import type { BoardTile } from '../../../src/domain/types/board';

// In-memory mock localStorage for Node.js environment
const memoryStorage: Record<string, string> = {};
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {};
}
(globalThis as any).window.localStorage = {
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, val: string) => { memoryStorage[key] = val; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
  clear: () => {
    for (const k of Object.keys(memoryStorage)) delete memoryStorage[k];
  },
};

interface TestResult {
  name: string;
  passed: boolean;
  metrics: Record<string, any>;
  error?: string;
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, metrics: Record<string, any>, error?: string) {
  results.push({ name, passed, metrics, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n[${status}] ${name}`);
  for (const [k, v] of Object.entries(metrics)) {
    console.log(`   ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

// =========================================================================
// CHALLENGE 1: VariableReplacer Fairness & Token Distinctness
// =========================================================================
console.log('='.repeat(80));
console.log('CHALLENGE 1: VariableReplacer Fairness & Strict Token Distinctness');
console.log('='.repeat(80));

const testPlayers: Player[] = [
  { id: 'p1', name: 'Ana', sips: 0, timesTargeted: 0, targetCount: 0 },
  { id: 'p2', name: 'Bernat', sips: 0, timesTargeted: 0, targetCount: 0 },
  { id: 'p3', name: 'Clara', sips: 0, timesTargeted: 0, targetCount: 0 },
  { id: 'p4', name: 'David', sips: 0, timesTargeted: 0, targetCount: 0 },
];

// Test 1.1: 1,000 draws with 4 players - Single trial verification
{
  const DRAWS = 1000;
  const EXPECTED = DRAWS / testPlayers.length; // 250
  const pickCounts = new Map<string, number>();
  const lastPicked = new Map<string, number>();
  testPlayers.forEach((p) => {
    pickCounts.set(p.id, 0);
    lastPicked.set(p.id, -1);
  });

  for (let turn = 0; turn < DRAWS; turn++) {
    const res = VariableReplacer.replaceTokens('{player1} bebe {drinks}', testPlayers, {
      intensity: 2,
      turnHistory: pickCounts,
      lastPickedTurn: lastPicked,
      currentTurnIndex: turn,
    });
    const picked = res.assignedPlayers[0];
    pickCounts.set(picked.id, (pickCounts.get(picked.id) ?? 0) + 1);
    lastPicked.set(picked.id, turn);
  }

  let maxDeviation = 0;
  const distribution: Record<string, { picks: number; pctDeviation: string }> = {};

  for (const p of testPlayers) {
    const picks = pickCounts.get(p.id) ?? 0;
    const dev = (Math.abs(picks - EXPECTED) / EXPECTED) * 100;
    if (dev > maxDeviation) maxDeviation = dev;
    distribution[p.name] = { picks, pctDeviation: `${dev.toFixed(2)}%` };
  }

  const passed = maxDeviation <= 15.0;
  recordResult(
    'VariableReplacer: 1,000 draws with 4 players (<= 15% deviation)',
    passed,
    {
      totalDraws: DRAWS,
      expectedPerPlayer: EXPECTED,
      distribution,
      maxDeviationObserved: `${maxDeviation.toFixed(2)}%`,
      threshold: '<= 15.0%',
    },
    passed ? undefined : `Max deviation ${maxDeviation.toFixed(2)}% exceeded 15.0% threshold`
  );
}

// Test 1.2: Multi-trial Monte Carlo Fairness (30 independent trials of 1,000 draws)
{
  const TRIALS = 30;
  const DRAWS = 1000;
  const EXPECTED = DRAWS / testPlayers.length;
  let peakDeviationAcrossTrials = 0;
  let trialsFailing = 0;
  const trialDeviations: number[] = [];

  for (let t = 0; t < TRIALS; t++) {
    const pickCounts = new Map<string, number>();
    const lastPicked = new Map<string, number>();
    testPlayers.forEach((p) => {
      pickCounts.set(p.id, 0);
      lastPicked.set(p.id, -1);
    });

    for (let turn = 0; turn < DRAWS; turn++) {
      const res = VariableReplacer.replaceTokens('{player1} realiza la prueba', testPlayers, {
        intensity: 2,
        turnHistory: pickCounts,
        lastPickedTurn: lastPicked,
        currentTurnIndex: turn,
      });
      const picked = res.assignedPlayers[0];
      pickCounts.set(picked.id, (pickCounts.get(picked.id) ?? 0) + 1);
      lastPicked.set(picked.id, turn);
    }

    let trialMaxDev = 0;
    for (const p of testPlayers) {
      const picks = pickCounts.get(p.id) ?? 0;
      const dev = (Math.abs(picks - EXPECTED) / EXPECTED) * 100;
      if (dev > trialMaxDev) trialMaxDev = dev;
    }
    trialDeviations.push(trialMaxDev);
    if (trialMaxDev > peakDeviationAcrossTrials) peakDeviationAcrossTrials = trialMaxDev;
    if (trialMaxDev > 15.0) trialsFailing++;
  }

  const avgMaxDev = trialDeviations.reduce((a, b) => a + b, 0) / TRIALS;
  const passed = peakDeviationAcrossTrials <= 15.0;
  recordResult(
    `VariableReplacer: ${TRIALS} Monte Carlo trials of 1,000 draws each (30,000 total draws)`,
    passed,
    {
      trials: TRIALS,
      drawsPerTrial: DRAWS,
      peakDeviationObserved: `${peakDeviationAcrossTrials.toFixed(2)}%`,
      averageTrialMaxDeviation: `${avgMaxDev.toFixed(2)}%`,
      trialsExceedingThreshold: `${trialsFailing}/${TRIALS}`,
      threshold: '<= 15.0%',
    },
    passed ? undefined : `${trialsFailing} trials exceeded 15.0% threshold (Peak: ${peakDeviationAcrossTrials.toFixed(2)}%)`
  );
}

// Test 1.3: 100% Token Distinctness across 1,000 draws for 2, 3, and 4 players
{
  const DRAWS = 1000;
  let duplicatesFound2 = 0;
  let duplicatesFound3 = 0;
  let duplicatesFound4 = 0;

  // 2-player card
  for (let turn = 0; turn < DRAWS; turn++) {
    const res = VariableReplacer.replaceTokens('{player1} y {player2} beben {drinks}', testPlayers, {
      intensity: 2,
      currentTurnIndex: turn,
    });
    if (res.assignedPlayers.length !== 2 || res.assignedPlayers[0].id === res.assignedPlayers[1].id) {
      duplicatesFound2++;
    }
  }

  // 3-player card
  for (let turn = 0; turn < DRAWS; turn++) {
    const res = VariableReplacer.replaceTokens('{player1}, {player2} y {player3} compiten', testPlayers, {
      intensity: 3,
      currentTurnIndex: turn,
    });
    const ids = new Set(res.assignedPlayers.map((p) => p.id));
    if (ids.size !== 3) {
      duplicatesFound3++;
    }
  }

  // 4-player card
  for (let turn = 0; turn < DRAWS; turn++) {
    const res = VariableReplacer.replaceTokens(
      '{player1} acusa a {player2}, mientras {player3} y {player4} deciden',
      testPlayers,
      {
        intensity: 4,
        currentTurnIndex: turn,
      }
    );
    const ids = new Set(res.assignedPlayers.map((p) => p.id));
    if (ids.size !== 4) {
      duplicatesFound4++;
    }
  }

  const totalDuplicates = duplicatesFound2 + duplicatesFound3 + duplicatesFound4;
  const passed = totalDuplicates === 0;
  recordResult(
    'VariableReplacer: Strict Token Distinctness (3,000 multi-token draws)',
    passed,
    {
      twoPlayerDraws: DRAWS,
      twoPlayerDuplicates: duplicatesFound2,
      threePlayerDraws: DRAWS,
      threePlayerDuplicates: duplicatesFound3,
      fourPlayerDraws: DRAWS,
      fourPlayerDuplicates: duplicatesFound4,
      distinctnessRate: `${(((3 * DRAWS - totalDuplicates) / (3 * DRAWS)) * 100).toFixed(2)}%`,
    },
    passed ? undefined : `Found ${totalDuplicates} distinctness violations`
  );
}

// =========================================================================
// CHALLENGE 2: BoardEngine Dice RNG Uniformity & Chi-Square Test
// =========================================================================
console.log('\n' + '='.repeat(80));
console.log('CHALLENGE 2: BoardEngine Dice RNG Uniformity & Chi-Square Test (10,000 Rolls)');
console.log('='.repeat(80));

{
  const ROLLS = 10000;
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const rolls: number[] = [];
  let outOfBoundsCount = 0;

  for (let i = 0; i < ROLLS; i++) {
    const roll = BoardEngine.rollDice();
    rolls.push(roll);
    if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
      outOfBoundsCount++;
    } else {
      counts[roll]++;
    }
  }

  const expected = ROLLS / 6; // 1666.6667
  let chiSquare = 0;
  for (let face = 1; face <= 6; face++) {
    const diff = counts[face] - expected;
    chiSquare += (diff * diff) / expected;
  }

  const mean = rolls.reduce((a, b) => a + b, 0) / ROLLS;
  const variance = rolls.reduce((a, b) => a + (b - mean) ** 2, 0) / (ROLLS - 1);

  // Markov Lag-1 Serial Transition Independence
  const transitions: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
  for (let i = 0; i < ROLLS - 1; i++) {
    const from = rolls[i] - 1;
    const to = rolls[i + 1] - 1;
    transitions[from][to]++;
  }
  const expectedTransition = (ROLLS - 1) / 36;
  let transitionChiSquare = 0;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const diff = transitions[r][c] - expectedTransition;
      transitionChiSquare += (diff * diff) / expectedTransition;
    }
  }

  // Critical values: df=5, alpha=0.001 is 20.515; df=25, alpha=0.001 is 52.62
  const chiSquarePassed = chiSquare < 20.515;
  const transitionPassed = transitionChiSquare < 52.62;
  const boundsPassed = outOfBoundsCount === 0;
  const meanPassed = Math.abs(mean - 3.5) < 0.1;
  const variancePassed = Math.abs(variance - 2.9167) < 0.15;
  const passed = chiSquarePassed && transitionPassed && boundsPassed && meanPassed && variancePassed;

  recordResult(
    'BoardEngine: 10,000 Rolls Chi-Square & Serial Independence',
    passed,
    {
      totalRolls: ROLLS,
      counts,
      expectedPerFace: expected.toFixed(2),
      chiSquareStatistic: chiSquare.toFixed(4),
      chiSquareCritical_df5_alpha001: '20.515',
      chiSquareVerdict: chiSquare < 20.515 ? 'ACCEPT_NULL_HYPOTHESIS (Uniform)' : 'REJECT (Biased)',
      empiricalMean: mean.toFixed(4),
      expectedMean: '3.5000',
      empiricalVariance: variance.toFixed(4),
      expectedVariance: '2.9167',
      transitionChiSquare_df25: transitionChiSquare.toFixed(4),
      transitionCritical_df25_alpha001: '52.62',
      outOfBoundsCount,
    },
    passed ? undefined : `RNG statistical failure (Chi-Square: ${chiSquare.toFixed(4)})`
  );
}

// =========================================================================
// CHALLENGE 3: Deep Undo Stack Resilience (50 Consecutive Draws + 50 Undos)
// =========================================================================
console.log('\n' + '='.repeat(80));
console.log('CHALLENGE 3: Deep Undo Stack Resilience (50 Consecutive Draws + 50 Undos)');
console.log('='.repeat(80));

{
  const TRIALS = 5;
  let allTrialsPassed = true;
  const trialMetrics: any[] = [];

  for (let trial = 1; trial <= TRIALS; trial++) {
    // Reset stores
    usePlayerStore.setState({
      players: [
        { id: 'u1', name: 'Alicia', sips: 0, timesTargeted: 0, targetCount: 0, color: '#ff007f' },
        { id: 'u2', name: 'Berto', sips: 0, timesTargeted: 0, targetCount: 0, color: '#00f0ff' },
        { id: 'u3', name: 'Carla', sips: 0, timesTargeted: 0, targetCount: 0, color: '#39ff14' },
        { id: 'u4', name: 'Dani', sips: 0, timesTargeted: 0, targetCount: 0, color: '#ffe600' },
      ],
      quickAddHistory: [],
    });

    useGameSessionStore.getState().endSession();

    // Generate 60 test cards
    const testDeck: Card[] = [];
    for (let i = 0; i < 60; i++) {
      const isVirus = i % 8 === 3;
      const target = i % 4 === 0 ? 'pair' : 'active_player';
      testDeck.push({
        id: `card_${i}`,
        type: isVirus ? 'virus' : 'reto',
        text: isVirus
          ? `{player1} adquiere un virus durante 3 rondas. {drinks}`
          : target === 'pair'
          ? `{player1} y {player2} beben {drinks} juntos.`
          : `{player1} debe confesar o beber {drinks}.`,
        target,
        intensity: ((i % 4) + 1) as any,
        drinks_penalty: (i % 4) + 1,
        virus_duration: isVirus ? 3 : undefined,
        category: 'calientes',
      });
    }

    const playersBefore = usePlayerStore.getState().players;
    useGameSessionStore.getState().startCardSession(testDeck, 'chaos', { intensity: 3 }, playersBefore);

    // Snapshot state at Index 0
    const initialIndex = useGameSessionStore.getState().currentIndex;
    const initialCardId = useGameSessionStore.getState().currentCard?.id;
    const initialSipsSnapshot: Record<string, number> = {};
    const initialTargetsSnapshot: Record<string, number> = {};
    for (const p of usePlayerStore.getState().players) {
      initialSipsSnapshot[p.id] = p.sips;
      initialTargetsSnapshot[p.id] = p.timesTargeted ?? p.targetCount ?? 0;
    }
    const initialVirusCount = useGameSessionStore.getState().activeViruses.length;

    // Advance 50 consecutive draws
    for (let d = 0; d < 50; d++) {
      useGameSessionStore.getState().nextCard();
    }

    const peakIndex = useGameSessionStore.getState().currentIndex;
    const peakHistoryLength = useGameSessionStore.getState().history.length;
    let totalSipsAccumulated = 0;
    for (const p of usePlayerStore.getState().players) {
      totalSipsAccumulated += p.sips;
    }

    // Now perform 50 consecutive UNDOS
    let successfulUndos = 0;
    for (let u = 0; u < 50; u++) {
      const ok = useGameSessionStore.getState().previousCard();
      if (ok) successfulUndos++;
    }

    // Test underflow guard (51st undo should return false)
    const extraUndoAllowed = useGameSessionStore.getState().previousCard();

    // Verify exact equality and 0 stat drift
    const finalIndex = useGameSessionStore.getState().currentIndex;
    const finalCardId = useGameSessionStore.getState().currentCard?.id;
    const finalHistoryLength = useGameSessionStore.getState().history.length;
    const finalVirusCount = useGameSessionStore.getState().activeViruses.length;
    const finalExpiredQueue = useGameSessionStore.getState().expiredVirusesQueue.length;

    let sipsDrift = 0;
    let targetsDrift = 0;
    for (const p of usePlayerStore.getState().players) {
      const sDiff = Math.abs(p.sips - initialSipsSnapshot[p.id]);
      const tDiff = Math.abs((p.timesTargeted ?? p.targetCount ?? 0) - initialTargetsSnapshot[p.id]);
      sipsDrift += sDiff;
      targetsDrift += tDiff;
    }

    const trialPassed =
      initialIndex === 0 &&
      peakIndex === 50 &&
      peakHistoryLength === 50 &&
      successfulUndos === 50 &&
      finalIndex === 0 &&
      finalCardId === initialCardId &&
      finalHistoryLength === 0 &&
      finalVirusCount === initialVirusCount &&
      finalExpiredQueue === 0 &&
      sipsDrift === 0 &&
      targetsDrift === 0 &&
      extraUndoAllowed === false;

    if (!trialPassed) allTrialsPassed = false;

    trialMetrics.push({
      trial,
      peakIndex,
      peakHistoryLength,
      successfulUndos,
      finalIndex,
      finalHistoryLength,
      sipsDrift,
      targetsDrift,
      underflowProtected: !extraUndoAllowed,
      passed: trialPassed,
    });
  }

  recordResult(
    'Deep Undo Stack Resilience: 50 consecutive draws + 50 undos (5 independent trials)',
    allTrialsPassed,
    {
      trialsExecuted: TRIALS,
      successfulTrials: trialMetrics.filter((t) => t.passed).length,
      sampleTrialMetrics: trialMetrics[0],
      totalSipsDriftAcrossTrials: trialMetrics.reduce((a, b) => a + b.sipsDrift, 0),
      totalTargetsDriftAcrossTrials: trialMetrics.reduce((a, b) => a + b.targetsDrift, 0),
      underflowGuardConsistent: trialMetrics.every((t) => t.underflowProtected),
    },
    allTrialsPassed ? undefined : 'Detected state inequality or non-zero stat drift after 50 undos'
  );
}

// =========================================================================
// CHALLENGE 4: Concurrency Stress: Rapid Interleaved Card & Board Switching
// =========================================================================
console.log('\n' + '='.repeat(80));
console.log('CHALLENGE 4: Concurrency Stress: Rapid Interleaved Card & Board Session Switching');
console.log('='.repeat(80));

{
  const ITERATIONS = 300;
  let exceptionsCount = 0;
  let corruptedStatesCount = 0;
  let cardSessionStarts = 0;
  let boardSessionStarts = 0;
  let totalDiceRolls = 0;
  let totalCardDraws = 0;
  let totalUndos = 0;

  const mockBoardTiles: BoardTile[] = Array.from({ length: 45 }, (_, i) => ({
    tile_number: i + 1,
    title: `Casilla ${i + 1}`,
    description: `Descripción ${i + 1}`,
    tile_type: i === 44 ? 'finish' : i % 9 === 0 ? 'jump' : i === 18 ? 'trap_jail' : 'drink',
    action_jump_to: i % 9 === 0 ? Math.min(45, i + 1 + 5) : undefined,
    turns_lost: i === 18 ? 2 : 0,
    drinks_action: 1,
  }));

  const mockCards: Card[] = Array.from({ length: 30 }, (_, i) => ({
    id: `stress_card_${i}`,
    type: i % 5 === 0 ? 'virus' : 'reto',
    text: `{player1} realiza reto ${i} y bebe {drinks}`,
    target: 'active_player',
    intensity: 2,
    drinks_penalty: 2,
    category: 'picante',
    virus_duration: i % 5 === 0 ? 3 : undefined,
  }));

  const sessionStore = useGameSessionStore.getState();

  for (let step = 0; step < ITERATIONS; step++) {
    try {
      const modeToSwitch = step % 2 === 0 ? 'card' : 'board';

      if (modeToSwitch === 'card') {
        sessionStore.startCardSession(mockCards, 'chaos', { intensity: 2 }, testPlayers);
        cardSessionStarts++;

        // Rapid interleaved operations
        const ops = (step % 5) + 1;
        for (let op = 0; op < ops; op++) {
          if (op % 3 === 2) {
            sessionStore.previousCard();
            totalUndos++;
          } else {
            sessionStore.nextCard();
            totalCardDraws++;
          }
        }
      } else {
        sessionStore.startBoardSession('guatoca_clasica', mockBoardTiles, testPlayers);
        boardSessionStarts++;

        // Rapid board rolls
        const rolls = (step % 4) + 1;
        for (let r = 0; r < rolls; r++) {
          sessionStore.rollBoardDice();
          totalDiceRolls++;
        }
      }

      // Check state integrity
      const curr = useGameSessionStore.getState();
      if (curr.mode === 'board') {
        if (!curr.boardPositions || typeof curr.currentTurnPlayerIndex !== 'number' || Number.isNaN(curr.currentTurnPlayerIndex)) {
          corruptedStatesCount++;
        }
        for (const [pid, pos] of Object.entries(curr.boardPositions)) {
          if (typeof pos !== 'number' || Number.isNaN(pos) || pos < 1 || pos > 45) {
            corruptedStatesCount++;
          }
        }
      } else if (curr.mode === 'chaos') {
        if (typeof curr.currentIndex !== 'number' || Number.isNaN(curr.currentIndex) || !Array.isArray(curr.deck)) {
          corruptedStatesCount++;
        }
      }

      // Check storage persistence serialization
      const stored = memoryStorage['previalo_active_session'];
      if (stored) {
        JSON.parse(stored);
      }
    } catch (err: any) {
      exceptionsCount++;
      console.error(`Exception during stress step ${step}:`, err);
    }
  }

  const passed = exceptionsCount === 0 && corruptedStatesCount === 0;
  recordResult(
    `Concurrency Stress: Rapid Interleaved Switching (${ITERATIONS} rapid mode switches)`,
    passed,
    {
      totalIterations: ITERATIONS,
      cardSessionStarts,
      boardSessionStarts,
      totalCardDraws,
      totalUndos,
      totalDiceRolls,
      exceptionsEncountered: exceptionsCount,
      corruptedStatesEncountered: corruptedStatesCount,
      finalMode: useGameSessionStore.getState().mode,
    },
    passed ? undefined : `Concurrency stress failure (${exceptionsCount} exceptions, ${corruptedStatesCount} corrupted states)`
  );
}

// =========================================================================
// SUMMARY & VERDICT FORMULATION
// =========================================================================
console.log('\n' + '='.repeat(80));
console.log('CHALLENGER STRESS HARNESS FINAL VERDICT');
console.log('='.repeat(80));

const totalTests = results.length;
const passedTests = results.filter((r) => r.passed).length;
const failedTests = results.filter((r) => !r.passed).length;

console.log(`Total Challenge Harness Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests === 0) {
  console.log('\n>>> HARNESS RESULT: ALL 4 CHALLENGES PASSED EMPIRICALLY <<<');
} else {
  console.log(`\n>>> HARNESS RESULT: ${failedTests} CHALLENGE(S) FAILED EMPIRICALLY <<<`);
}
