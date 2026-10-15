# Milestone 3 Independent Quality & Adversarial Review Report

**Author:** `reviewer_m3_2` (Teamwork Reviewer & Critic)  
**Date:** 2026-10-14T21:05:00Z  
**Project:** Previalo Mobile-First PWA (`c:/.d/previalo-project`)  
**Scope:** Milestone 3 (SoundService, Procedural Web Audio Synthesis, Safari Autoplay Bypass, registerSW PWA Lifecycle, and Test Suites)  
**Parent Agent:** `1c307a0d-3e51-47ca-87fa-d03b41540886`

---

## 1. Observation

Direct observations of source files, line numbers, and tool command execution results:

### 1.1 Source Code Inspection

1. **`src/infrastructure/soundService.ts`**:
   - **Zero External Audio Dependencies**: Line 1–430 contains no references to `.mp3`, `.wav`, `.ogg`, or base64 audio strings. All audio is procedurally synthesized using the Web Audio API.
   - **Lazy AudioContext & Cross-Browser Instantiation** (Lines 56–78):
     ```typescript
     const AudioContextClass =
       window.AudioContext ||
       (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
     ```
     `this.audioCtx` is initialized lazily only upon request. If `audioCtx.state === 'suspended'`, `this.audioCtx.resume().catch(() => {})` is called.
   - **Automatic Safari Autoplay Bypass** (Lines 37–51):
     ```typescript
     private registerUnlockListeners(): void {
       if (typeof window === 'undefined' || this.hasRegisteredUnlock) return;
       this.hasRegisteredUnlock = true;
       const unlock = () => {
         this.resume().catch(() => {});
         window.removeEventListener('pointerdown', unlock);
         window.removeEventListener('touchstart', unlock);
         window.removeEventListener('keydown', unlock);
       };
       window.addEventListener('pointerdown', unlock, { once: true, passive: true });
       window.addEventListener('touchstart', unlock, { once: true, passive: true });
       window.addEventListener('keydown', unlock, { once: true, passive: true });
     }
     ```
     Registers one-time passive gesture listeners on `pointerdown`, `touchstart`, and `keydown` to automatically resume the AudioContext upon the user's first physical interaction.
   - **Procedural Synthesizers**:
     * `playSwipe()` (Lines 140–184): Generates 120 ms of white noise in an `AudioBuffer`, passed through a `BiquadFilterNode` (`lowpass`) whose frequency exponentially sweeps from 800 Hz down to 150 Hz with an attack/decay gain envelope (`0.001 -> 0.18 -> 0.001`), paired with `vibrate(12)`.
     * `playDice()` (Lines 189–251): Generates 4 short noise bursts (15 ms each with bandpass filter `1200 + rand * 600` Hz) followed by a 90 Hz sine wave thud decaying to 45 Hz over 80 ms, paired with a tactile pattern `vibrate([15, 25, 15, 25, 40])`.
     * `playVirusAlert()` (Lines 256–292): Generates a 3-cycle alternating square wave siren (520 Hz / 780 Hz, 80 ms per step, ~480 ms total), paired with `vibrate([40, 30, 40])`.
     * `playVirusExpired()` (Lines 297–331): Synthesizes a 4-tone triad chime arpeggio (C5=523.25 Hz, E5=659.25 Hz, G5=783.99 Hz, C6=1046.5 Hz) at 90 ms intervals using sine wave oscillators and gentle release envelopes, paired with `vibrate([30, 50, 30])`.
     * `playVictory()` (Lines 336–382): Synthesizes a brass triad chord progression (F major: [349.23, 440, 523.25] -> G major: [392, 493.88, 587.33] -> C major: [261.63, 329.63, 392, 523.25]) using sawtooth oscillators routed through a 1400 Hz lowpass filter over 1.35 seconds, paired with `vibrate([50, 50, 50, 50, 120])`.
     * `playTap()` (Lines 387–414): Synthesizes a subtle 1200 Hz sine micro-click over 12 ms, paired with `vibrate(8)`.
   - **Toggles & Haptic Error Handling**:
     * `soundEnabled` (Lines 26, 106–112): When disabled, synthesizers immediately return without touching Web Audio nodes.
     * `hapticsEnabled` (Lines 27, 114–120): When disabled, `vibrate()` returns `false` without invoking `navigator.vibrate`.
     * `vibrate(pattern)` (Lines 125–135): Wrapped in `try / catch` with `typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'` guards to gracefully handle non-supporting mobile browsers (such as iOS Safari).
     * Standalone function exports (Lines 421–427): `playSwipe`, `playDice`, `playVirusAlert`, `playVirusExpired`, `playVictory`, `playTap`, `vibrate`.

2. **`src/infrastructure/registerSW.ts`**:
   - **`beforeinstallprompt` Interception** (Lines 41–46):
     ```typescript
     window.addEventListener('beforeinstallprompt', (e: Event) => {
       e.preventDefault();
       this.deferredPrompt = e as BeforeInstallPromptEvent;
       this.notifyInstallableChange(true);
     });
     ```
   - **PWA Lifecycle & Status API**:
     * `promptInstall()` (Lines 98–116): Invokes `prompt()`, awaits `userChoice`, resets `deferredPrompt` to `null`, notifies listeners, and returns outcome (`'accepted' | 'dismissed' | 'unsupported'`).
     * `isInstallable()` (Lines 74–77): Returns boolean status.
     * `isOffline()` / `isOnline()` (Lines 82–93): Checks `navigator.onLine`.
     * Subscriptions: `onInstallableChange`, `onNetworkChange`, `onAppInstalled`, each returning clean unsubscribe functions.
     * `registerServiceWorker(options)` (Lines 166–207): Registers `/sw.js` with hooks for `updatefound` and `statechange` to trigger `onUpdate` or `onSuccess`.

3. **`src/infrastructure/catalogLoader.ts` & `src/infrastructure/index.ts`**:
   - `catalogLoader.ts`: Implements IDB key-value caching (`previalo_catalog_manifest`, `cat_${id}`, `preset_${id}`, `board_${id}`), manifests, category event normalization (5 pools in `07_el_tablero.json`), presets, and board tiles (`guatoca_clasica` 45 tiles, `guatoca_hot` 40 tiles).
   - `index.ts`: Re-exports all public APIs cleanly from `catalogLoader`, `soundService`, and `registerSW`.

### 1.2 Tool Execution Verification

- **Command `npm run typecheck` (`tsc -b --noEmit`)**:
  * Output: Exited with code 0. Zero TypeScript errors in strict mode.
- **Command `npm run test` (`vitest run`)**:
  * Output: `31 passed (31) - 319 passed (319)` tests passed with 0 failures in 2.66s.
  * `src/infrastructure/__tests__/soundService.test.ts`: 13 tests passed.
  * `src/infrastructure/__tests__/registerSW.test.ts`: 11 tests passed.
  * `src/infrastructure/__tests__/catalogLoader.test.ts`: 17 tests passed.
- **Command `npm run build` (`tsc -b && vite build`)**:
  * Output: Exited with code 0.
  * Generated artifacts: `dist/registerSW.js` (0.13 kB), `dist/manifest.webmanifest` (0.61 kB), `dist/index.html` (1.35 kB), `dist/assets/index-BGLmGIj4.css` (26.42 kB), `dist/assets/index-DW5r7Ae9.js` (241.17 kB), `dist/sw.js`, `dist/workbox-835c8c05.js`. Precache: 35 entries (5507.23 KiB).

---

## 2. Logic Chain

1. **Procedural Web Audio Integrity:**
   - Observations 1.1 show that `soundService.ts` implements 100% genuine Web Audio API synthesis without external audio files or facades.
   - The audio graphs constructed (filtered noise sweep, multi-pulse bandpass dice rattles with sine thud, square wave sirens, chime arpeggios, and brass chords) are mathematically sound, have explicit finite start and stop times, and connect properly to `ctx.destination`.
   - Every audio synthesis method is encapsulated in a `try / catch` block to ensure audio failures never crash UI threads.

2. **iOS Safari Autoplay Handling:**
   - Observation 1.1 demonstrates lazy instantiation of `AudioContext` combined with automatic unlock listeners on `pointerdown`, `touchstart`, and `keydown`.
   - Both standard `AudioContext` and legacy `webkitAudioContext` are supported.
   - Checking `if (this.audioCtx.state === 'suspended') { this.audioCtx.resume().catch(() => {}); }` satisfies iOS Safari's strict user gesture requirement.

3. **PWA Install & Offline Lifecycle:**
   - Observation 1.2 demonstrates that `PWAHelper` cleanly intercepts `beforeinstallprompt`, prevents the default browser banner, preserves the deferred event until user CTA trigger, and manages the full prompt lifecycle.
   - Event listeners for `online`, `offline`, and `appinstalled` update internal state and broadcast to reactive subscribers with unsubscription closures, preventing memory leaks.

4. **Clean Architecture Separation:**
   - Neither `soundService.ts` nor `registerSW.ts` imports from React or presentation components. They act as pure infrastructure adapters, conforming to the interface contracts defined in `PROJECT.md`.

5. **Test Rigor & Build Verification:**
   - Observation 1.2 confirms that all 41 infrastructure tests run against real logic and complete successfully alongside the 278 domain and E2E tests, totaling 319 passing tests.
   - Strict TypeScript typechecking and production Vite compilation succeed with exit code 0.

---

## 3. Caveats

- **Tactile Feedback on Muted Sound:** When `soundEnabled` is set to `false`, `vibrate()` is still invoked because `hapticsEnabled` is a separate independent toggle. This aligns with standard mobile party game behavior where players may desire silent tactile feedback in loud environments.
- **Physical Device Vibrations:** `navigator.vibrate` is not supported on iOS Safari (by Apple OS design); `soundService.vibrate()` safely returns `false` on iOS without throwing.

---

## 4. Conclusion

Milestone 3 (Infrastructure & Services - R3) is **APPROVED**.
The implementation satisfies all architectural contracts, implements genuine procedural Web Audio synthesis with zero external audio assets, provides robust iOS Safari autoplay unlocking, gracefully handles haptics and mute states, provides complete PWA lifecycle handling, and passes all verification gates with 0 errors.

---

## 5. Verification Method

To independently verify this review:
1. Run strict TypeScript check:
   ```bash
   npm run typecheck
   ```
   *Expected:* Exit code 0, 0 errors.
2. Run automated test suite:
   ```bash
   npm run test
   ```
   *Expected:* 31 test files passed, 319 tests passed, 0 failures.
3. Run production build:
   ```bash
   npm run build
   ```
   *Expected:* Exit code 0, service worker generated, 35 precached entries.
4. Inspect `src/infrastructure/soundService.ts` and `src/infrastructure/registerSW.ts` to confirm zero external audio assets and complete procedural Web Audio graphs.

---

# Quality Review Report

## Review Summary

**Verdict**: APPROVE

## Findings

### Minor Note 1: Independent Sound and Haptic Toggles
- **What**: When sound is toggled off (`setSoundEnabled(false)`), haptics still vibrate unless explicitly disabled via `setHapticsEnabled(false)`.
- **Where**: `src/infrastructure/soundService.ts:141, 190, 257, 298, 337, 388`
- **Why**: `this.vibrate(...)` is called prior to `if (!this.soundEnabled) return;`.
- **Assessment**: Appropriate design for party games where users want tactile click feedback while device sound is muted. No change requested.

## Verified Claims

- Procedural Web Audio API synthesizers (zero external audio files) → verified via code inspection and `soundService.test.ts` → PASS
- Lazy AudioContext and automatic gesture-based resume (`pointerdown`, `touchstart`, `keydown`) → verified via code inspection and `soundService.test.ts` → PASS
- Sound and haptic mute toggles with `navigator.vibrate` error guard → verified via `soundService.test.ts` (test: "should handle navigator.vibrate throwing gracefully") → PASS
- Capture and handling of `beforeinstallprompt` event → verified via `registerSW.test.ts` → PASS
- `promptInstall()`, `isInstallable()`, `isOffline()`, `isOnline()` and event listeners → verified via `registerSW.test.ts` → PASS
- Typecheck (`tsc -b --noEmit`) → exit code 0 → PASS
- Vitest suite (`vitest run`) → 31 test files passed, 319 tests passed, 0 failures → PASS
- Production build (`tsc -b && vite build`) → exit code 0, Service Worker generated → PASS

## Coverage Gaps

- None. All requirements in Milestone 3 (R3) have been reviewed, tested, and verified.

## Unverified Items

- None.

---

# Adversarial Challenge Report

## Challenge Summary

**Overall risk assessment**: LOW

## Challenges

### [Low] Challenge 1: Rapid Concurrent Sound Playback
- **Assumption challenged**: Rapid repetitive user touches (e.g. frantic card swiping or dice rolling) could cause audio context collision, buffer exhaustion, or node reuse errors (`InvalidStateError`).
- **Attack scenario**: User taps or swipes 20 times in 1 second.
- **Evaluation**: Each method invocation creates fresh transient buffer sources or oscillators (`ctx.createBufferSource()`, `ctx.createOscillator()`), connects them to destination, and schedules explicit `start(now)` and `stop(now + duration)`. No audio node is started more than once. Web Audio engine handles polyphonic mixing natively. All synthesis code is wrapped in `try / catch` to absorb any audio subsystem exceptions.
- **Blast radius**: Negligible. Audio mixes cleanly without memory or state corruption.
- **Status**: PASSED.

### [Low] Challenge 2: Autoplay Restrictions in Strict Browser Contexts
- **Assumption challenged**: AudioContext resume promise rejection could cause unhandled promise rejection warnings in strict browser consoles if touched in an unauthorized gesture context.
- **Attack scenario**: Touch or click event triggered programmatically or in an iframe where autoplay is blocked.
- **Evaluation**: In both `registerUnlockListeners()` (line 42) and `getAudioContext()` (line 74), resume calls have `.catch(() => {})` handlers attached. Unhandled rejections are completely prevented.
- **Blast radius**: None.
- **Status**: PASSED.

### [Low] Challenge 3: PWA Double-Initialization and Listener Leak
- **Assumption challenged**: Multiple calls to `PWAHelper.init()` or subscribing components could cause duplicated DOM event listeners or memory leaks upon component unmounting.
- **Attack scenario**: Presentation components repeatedly mount and unmount while subscribing to `onNetworkChange` or `onInstallableChange`.
- **Evaluation**: `PWAHelper.init()` checks `this.initialized` and exits immediately if already initialized. All subscriber methods (`onInstallableChange`, `onNetworkChange`, `onAppInstalled`) return an explicit unsubscribe closure that removes the callback from internal sets.
- **Blast radius**: None.
- **Status**: PASSED.

## Stress Test Results

- Lazy AudioContext instantiation & suspended state resume → Expected: context resumed without crash → Actual: verified by test suite → PASS
- Mute toggles disabling AudioContext creation → Expected: zero buffer creation when sound disabled → Actual: verified by test suite → PASS
- Navigator vibrate throwing `NotAllowedError` → Expected: returns false without throwing → Actual: verified by test suite → PASS
- `beforeinstallprompt` prompt outcome ('accepted' / 'dismissed' / 'unsupported') → Expected: handles all user choices and clears prompt → Actual: verified by test suite → PASS

## Unchallenged Areas

- Native iOS Taptic Engine hardware feel (requires physical iOS device testing; API and fallbacks verified via specification and unit testing).

---

# Integrity Verification Audit

- **Hardcoded test results / expected outputs**: NONE. Synthesizers generate real Web Audio graphs with dynamic noise and frequencies; tests assert against actual mocked Web Audio method invocations and parameters.
- **Dummy or facade implementations**: NONE. All 6 synthesizers, gesture resume listeners, and PWA lifecycle methods implement genuine logic.
- **Shortcuts / External audio files**: ZERO external audio files. 100% procedural synthesis.
- **Independent verification**: All commands (`npm run typecheck`, `npm run test`, `npm run build`) independently executed by `reviewer_m3_2`.
- **Integrity Verdict**: FULL INTEGRITY COMPLIANCE. Zero violations found.
