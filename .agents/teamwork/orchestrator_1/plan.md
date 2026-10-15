# Orchestration Plan: Previalo Mobile-First PWA

## Overview
Coordinate the complete, modular, production-ready implementation of "Previalo" (party & drinking game PWA) based on ORIGINAL_REQUEST.md and the canonical documentation/data.

## Phases

### Phase 0: Survey & Scoping
- Dispatch 3 parallel survey agents:
  1. Spec Miner (`spec_miner_1`): Extract precise specifications and requirements from `docs/SRS_REQUIREMENTS.md`, `docs/ARCHITECTURE_AND_DIAGRAMS.md`, and the Master Plan.
  2. Architecture/Infra Explorer (`explorer_arch_1`): Inspect current repo state, dependencies, configuration files, and PWA/Vite/Tailwind setup requirements.
  3. Catalog & Domain Explorer (`explorer_catalog_1`): Inspect `data/03_production/` (6,937 cards, 9 categories, 2 presets, catalog manifest) and domain engine contracts.
- Aggregate survey reports and synthesize into `PROJECT.md` with full Architecture, Feature Inventory, Code Layout, Interface Contracts, and Milestone Decomposition.

### Phase 1: Dual Track Execution
- **Track A: Implementation Track**
  - Milestone 1: Project Scaffold, Build System & PWA Offline Configuration (R1)
  - Milestone 2: Pure Domain Engines - CardEngine, VariableReplacer, VirusManager, BoardEngine (R2)
  - Milestone 3: Infrastructure & Services - CatalogLoader, IndexedDB, SoundService, SW Registration (R3)
  - Milestone 4: State Management - Zustand stores (session, player, settings) with crash recovery (R4)
  - Milestone 5: UI Presentation & Screens - Full mobile-first screens, neon multi-themes, animations, touch interactions (R5)
- **Track B: E2E Testing Track**
  - E2E Test Infra & Test Suites across Tiers 1-4 (Card mechanics, variable fairness, board movements, offline readiness).
  - Produces `TEST_READY.md`.

### Phase 2: Final Verification & Adversarial Hardening
- Run full automated test suite (R6), Vitest unit tests, typecheck (`tsc --noEmit`), and production build (`npm run build`).
- Verify offline PWA cache-first and crash/reload recovery.
- Phase 2 coverage hardening (Tier 5) with Challenger stress testing.
- Forensic Auditor integrity review.
- Final completion handoff to Sentinel.
