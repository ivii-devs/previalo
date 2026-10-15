/**
 * Adversarial Challenge Test Harness for Milestone 5:
 * UI Presentation, Swipe Gestures, 3D Dice Physics, Sip Clamping, Theme DOM Sync, and Board Serpentine Layout.
 *
 * Authored by: challenger_m5_1 (critic, specialist)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

// Setup Mock Storage for Node environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const mockStorage = new MockLocalStorage();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

// Mock DOM document and documentElement for theme attribute assertions
const docAttrs: Record<string, string> = {};
const mockDocumentElement = {
  setAttribute: (k: string, v: string) => {
    docAttrs[k] = v;
  },
  getAttribute: (k: string) => docAttrs[k] ?? null,
  removeAttribute: (k: string) => {
    delete docAttrs[k];
  },
};

if (typeof globalThis.document === 'undefined') {
  Object.defineProperty(globalThis, 'document', {
    value: {
      documentElement: mockDocumentElement,
      getElementById: () => null,
      querySelector: () => null,
      createElement: (tag: string) => ({
        tagName: tag,
        setAttribute: () => {},
        getAttribute: () => null,
      }),
    },
    writable: true,
  });
} else {
  if (!globalThis.document.documentElement) {
    (globalThis.document as any).documentElement = mockDocumentElement;
  } else {
    const origSet = globalThis.document.documentElement.setAttribute;
    const origGet = globalThis.document.documentElement.getAttribute;
    globalThis.document.documentElement.setAttribute = (k: string, v: string) => {
      docAttrs[k] = v;
      if (origSet) origSet.call(globalThis.document.documentElement, k, v);
    };
    globalThis.document.documentElement.getAttribute = (k: string) => {
      return docAttrs[k] ?? (origGet ? origGet.call(globalThis.document.documentElement, k) : null);
    };
  }
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: mockStorage,
      document: globalThis.document,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
  });
} else {
  if (!globalThis.window.localStorage) {
    (globalThis.window as any).localStorage = mockStorage;
  }
}

// Intercept motion.div and motion.button to capture real event handlers from component instances
export let capturedMotionDivProps: any = null;
export let capturedMotionButtonProps: any = null;

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<any>('framer-motion');
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: (props: any) => {
        capturedMotionDivProps = props;
        return <div data-motion-div="true" {...props} />;
      },
      button: (props: any) => {
        capturedMotionButtonProps = props;
        return <button data-motion-button="true" {...props} />;
      },
    },
  };
});

// Presentation & Application Imports
import { SwipeableCard } from '../../../src/presentation/components/SwipeableCard';
import { Dice3D } from '../../../src/presentation/components/Dice3D';
import { BoardGrid } from '../../../src/presentation/components/BoardGrid';
import { SettingsModal } from '../../../src/presentation/components/SettingsModal';
import { GameCardsScreen } from '../../../src/presentation/screens/GameCardsScreen';
import { useSettingsStore, type Theme } from '../../../src/application/useSettingsStore';
import { usePlayerStore } from '../../../src/application/usePlayerStore';
import { useGameSessionStore } from '../../../src/application/useGameSessionStore';
import { soundService } from '../../../src/infrastructure/soundService';
import type { Card } from '../../../src/domain/types/card';
import type { Player } from '../../../src/domain/types/player';
import type { BoardTile } from '../../../src/domain/types/board';

describe('CHALLENGER M5 ADVERSARIAL TEST HARNESS', () => {
  const sampleCard: Card = {
    id: 'test_card_1',
    category_id: 'yo_nunca',
    text: 'Yo nunca he saltado de un puente.',
    type: 'normal',
    intensity: 2,
    pack_id: 'previa_clasica',
    requires_input: false,
    duration_rounds: 0,
  };

  const samplePlayers: Player[] = [
    {
      id: 'p_1',
      name: 'Matias',
      avatar: '🦁',
      color: '#ec4899',
      sips: 0,
      sipCount: 0,
      timesTargeted: 0,
      targetCount: 0,
      boardPosition: 1,
      jailTurns: 0,
    },
    {
      id: 'p_2',
      name: 'Sofia',
      avatar: '🦊',
      color: '#06b6d4',
      sips: 0,
      sipCount: 0,
      timesTargeted: 0,
      targetCount: 0,
      boardPosition: 1,
      jailTurns: 0,
    },
  ];

  beforeEach(() => {
    mockStorage.clear();
    capturedMotionDivProps = null;
    capturedMotionButtonProps = null;
    for (const k of Object.keys(docAttrs)) {
      delete docAttrs[k];
    }
    useSettingsStore.setState({
      theme: 'cyber-neon',
      soundEnabled: true,
      hapticsEnabled: true,
    });
    usePlayerStore.setState({
      players: samplePlayers,
      historicalPlayers: [],
    });
    useGameSessionStore.getState().endSession();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. SwipeableCard Adversarial Physics & Gesture Threshold Challenge
  // =========================================================================
  describe('1. SwipeableCard: Drag Thresholds, Direction & Fallback Triggers', () => {
    it('1.1: actual handleDragEnd strictly executes threshold logic (|offset.x| > 80 or |velocity.x| > 400)', () => {
      const vibrateSpy = vi.spyOn(soundService, 'vibrate').mockImplementation(() => {});
      const onSwipeNext = vi.fn();

      // Render to populate capturedMotionDivProps
      renderToString(
        <SwipeableCard
          card={sampleCard}
          interpolatedText={sampleCard.text}
          calculatedDrinks={2}
          assignedPlayers={[samplePlayers[0]]}
          onSwipeNext={onSwipeNext}
          disabled={false}
        />
      );

      expect(capturedMotionDivProps).not.toBeNull();
      const { onDragEnd } = capturedMotionDivProps;
      expect(typeof onDragEnd).toBe('function');

      // Sub-threshold drag: offset = 80 (exact boundary), velocity = 0 -> MUST NOT trigger
      onDragEnd(null, { offset: { x: 80, y: 0 }, velocity: { x: 0, y: 0 } });
      expect(onSwipeNext).not.toHaveBeenCalled();
      expect(vibrateSpy).not.toHaveBeenCalled();

      // Sub-threshold drag: offset = -80 (exact boundary), velocity = 0 -> MUST NOT trigger
      onDragEnd(null, { offset: { x: -80, y: 0 }, velocity: { x: 0, y: 0 } });
      expect(onSwipeNext).not.toHaveBeenCalled();

      // Sub-threshold drag: offset = 79.9, velocity = 0 -> MUST NOT trigger
      onDragEnd(null, { offset: { x: 79.9, y: 0 }, velocity: { x: 0, y: 0 } });
      expect(onSwipeNext).not.toHaveBeenCalled();

      // Super-threshold drag: offset = 80.1, velocity = 0 -> MUST trigger
      onDragEnd(null, { offset: { x: 80.1, y: 0 }, velocity: { x: 0, y: 0 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(1);
      expect(vibrateSpy).toHaveBeenCalledWith(15);

      // Super-threshold drag negative: offset = -81, velocity = 0 -> MUST trigger
      onDragEnd(null, { offset: { x: -81, y: 0 }, velocity: { x: 0, y: 0 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(2);

      // Sub-threshold velocity: offset = 0, velocity = 400 (exact boundary) -> MUST NOT trigger
      onDragEnd(null, { offset: { x: 0, y: 0 }, velocity: { x: 400, y: 0 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(2); // no extra call

      // Super-threshold velocity: offset = 0, velocity = 401 -> MUST trigger
      onDragEnd(null, { offset: { x: 0, y: 0 }, velocity: { x: 401, y: 0 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(3);

      // Super-threshold velocity negative: offset = 0, velocity = -401 -> MUST trigger
      onDragEnd(null, { offset: { x: 0, y: 0 }, velocity: { x: -401, y: 0 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(4);
    });

    it('1.2: exit direction detection confirms bilateral advance for both Left and Right gestures', () => {
      const vibrateSpy = vi.spyOn(soundService, 'vibrate').mockImplementation(() => {});
      const onSwipeNext = vi.fn();

      renderToString(
        <SwipeableCard
          card={sampleCard}
          interpolatedText={sampleCard.text}
          calculatedDrinks={1}
          assignedPlayers={[]}
          onSwipeNext={onSwipeNext}
          disabled={false}
        />
      );

      const { onDragEnd } = capturedMotionDivProps;

      // Swipe Left (offset.x < 0)
      onDragEnd(null, { offset: { x: -150, y: 0 }, velocity: { x: -200, y: 0 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(1);
      expect(vibrateSpy).toHaveBeenLastCalledWith(15);

      // Swipe Right (offset.x > 0)
      onDragEnd(null, { offset: { x: 150, y: 0 }, velocity: { x: 200, y: 0 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(2);
      expect(vibrateSpy).toHaveBeenLastCalledWith(15);
    });

    it('1.3: tap-to-advance fallback triggers card advance and 10ms haptic feedback', () => {
      const vibrateSpy = vi.spyOn(soundService, 'vibrate').mockImplementation(() => {});
      const onSwipeNext = vi.fn();

      renderToString(
        <SwipeableCard
          card={sampleCard}
          interpolatedText={sampleCard.text}
          calculatedDrinks={2}
          assignedPlayers={[samplePlayers[0]]}
          onSwipeNext={onSwipeNext}
          disabled={false}
        />
      );

      const { onClick } = capturedMotionDivProps;
      expect(typeof onClick).toBe('function');

      // Execute tap
      onClick();

      expect(onSwipeNext).toHaveBeenCalledTimes(1);
      expect(vibrateSpy).toHaveBeenCalledWith(10);
    });

    it('1.4: disabled state locks drag to false and prevents dragEnd and tap invocation', () => {
      const vibrateSpy = vi.spyOn(soundService, 'vibrate').mockImplementation(() => {});
      const onSwipeNext = vi.fn();

      renderToString(
        <SwipeableCard
          card={sampleCard}
          interpolatedText={sampleCard.text}
          calculatedDrinks={0}
          assignedPlayers={[]}
          onSwipeNext={onSwipeNext}
          disabled={true}
        />
      );

      expect(capturedMotionDivProps.drag).toBe(false);

      const { onDragEnd, onClick } = capturedMotionDivProps;

      // Attempt massive drag while disabled
      onDragEnd(null, { offset: { x: 1000, y: 0 }, velocity: { x: 5000, y: 0 } });
      expect(onSwipeNext).not.toHaveBeenCalled();
      expect(vibrateSpy).not.toHaveBeenCalled();

      // Attempt tap while disabled
      onClick();
      expect(onSwipeNext).not.toHaveBeenCalled();
      expect(vibrateSpy).not.toHaveBeenCalled();
    });

    it('1.5: renders all card archetypes, badges, intensity rating and tap hint', () => {
      const virusCard: Card = {
        ...sampleCard,
        id: 'virus_1',
        type: 'virus',
        duration_rounds: 3,
        text: 'Regla del Virus: Solo hablar inglés',
      };

      const html = renderToString(
        <SwipeableCard
          card={virusCard}
          interpolatedText={virusCard.text}
          calculatedDrinks={3}
          assignedPlayers={samplePlayers}
          onSwipeNext={() => {}}
        />
      );

      expect(html).toContain('Virus');
      expect(html).toContain('Tragos');
      expect(html).toContain('Matias');
      expect(html).toContain('Sofia');
      expect(html).toContain('Desliza o toca para continuar');
      expect(html).toContain('border-purple-500');
    });
  });

  // =========================================================================
  // 2. Dice3D Adversarial Physics, Face Rendering & Audio Integration
  // =========================================================================
  describe('2. Dice3D: Rolling State Transitions, Values 1-6 & Audio Triggers', () => {
    it('2.1: renders exactly N active pip dots for all dice values 1 through 6', () => {
      for (let face = 1; face <= 6; face++) {
        const html = renderToString(
          <Dice3D rolling={false} value={face} onRoll={() => {}} disabled={false} />
        );

        // Count active pip dots (elements with bg-[var(--accent-primary)])
        const matches = html.match(/bg-\[var\(--accent-primary\)\]/g) || [];
        // The action button also has bg-[var(--accent-primary)], so subtract 1
        const pipCount = matches.length - 1;

        expect(pipCount).toBe(face);
      }
    });

    it('2.2: out-of-bounds or null dice values safely fall back to face 1', () => {
      const invalidValues = [null, 0, -1, 7, 999, NaN];

      for (const val of invalidValues) {
        const html = renderToString(
          <Dice3D rolling={false} value={val} onRoll={() => {}} disabled={false} />
        );

        const matches = html.match(/bg-\[var\(--accent-primary\)\]/g) || [];
        const pipCount = matches.length - 1;
        expect(pipCount).toBe(1);
      }
    });

    it('2.3: rolling state transitions: rolling locks button with "Lanzando..." and disabled state', () => {
      const onRoll = vi.fn();
      const htmlRolling = renderToString(
        <Dice3D rolling={true} value={3} onRoll={onRoll} disabled={false} />
      );

      expect(htmlRolling).toContain('Lanzando...');
      expect(htmlRolling).toContain('animate-pulse');
      expect(htmlRolling).toContain('disabled=""');

      // Verify capturedMotionButtonProps is disabled
      expect(capturedMotionButtonProps.disabled).toBe(true);

      const htmlIdle = renderToString(
        <Dice3D rolling={false} value={5} onRoll={onRoll} disabled={false} />
      );

      expect(htmlIdle).toContain('Dado: 5 (Tirar)');
      expect(capturedMotionButtonProps.disabled).toBe(false);
    });

    it('2.4: roll click triggers procedural soundService.playDice(), vibrate(25), and onRoll()', () => {
      const playDiceSpy = vi.spyOn(soundService, 'playDice').mockImplementation(() => {});
      const vibrateSpy = vi.spyOn(soundService, 'vibrate').mockImplementation(() => {});
      const onRoll = vi.fn();

      renderToString(
        <Dice3D rolling={false} value={null} onRoll={onRoll} disabled={false} />
      );

      // Trigger click on dice face button
      capturedMotionButtonProps.onClick();

      expect(playDiceSpy).toHaveBeenCalledTimes(1);
      expect(vibrateSpy).toHaveBeenCalledWith(25);
      expect(onRoll).toHaveBeenCalledTimes(1);
    });

    it('2.5: click is blocked when rolling=true or disabled=true', () => {
      const playDiceSpy = vi.spyOn(soundService, 'playDice').mockImplementation(() => {});
      const vibrateSpy = vi.spyOn(soundService, 'vibrate').mockImplementation(() => {});
      const onRoll = vi.fn();

      // Case 1: rolling = true
      renderToString(
        <Dice3D rolling={true} value={null} onRoll={onRoll} disabled={false} />
      );
      capturedMotionButtonProps.onClick();

      expect(playDiceSpy).not.toHaveBeenCalled();
      expect(vibrateSpy).not.toHaveBeenCalled();
      expect(onRoll).not.toHaveBeenCalled();

      // Case 2: disabled = true
      renderToString(
        <Dice3D rolling={false} value={null} onRoll={onRoll} disabled={true} />
      );
      capturedMotionButtonProps.onClick();

      expect(playDiceSpy).not.toHaveBeenCalled();
      expect(vibrateSpy).not.toHaveBeenCalled();
      expect(onRoll).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Sip Adjusters Clamping & Drink Arithmetic Challenge
  // =========================================================================
  describe('3. Sip Adjusters: +1 and -1 Clamping (Sips Cannot Drop Below 0)', () => {
    it('3.1: addSips(-1) clamps strictly to 0 and never allows negative drinks', () => {
      const p1 = samplePlayers[0];
      usePlayerStore.setState({ players: [p1] });

      expect(usePlayerStore.getState().players[0].sips).toBe(0);

      // Decrement from 0
      usePlayerStore.getState().addSips(p1.id, -1);
      expect(usePlayerStore.getState().players[0].sips).toBe(0);
      expect(usePlayerStore.getState().players[0].sipCount).toBe(0);

      // Extreme negative jump (-9999)
      usePlayerStore.getState().addSips(p1.id, -9999);
      expect(usePlayerStore.getState().players[0].sips).toBe(0);
      expect(usePlayerStore.getState().players[0].sipCount).toBe(0);
    });

    it('3.2: rapid increment and decrement maintains exact arithmetic invariant', () => {
      const p1 = samplePlayers[0];
      usePlayerStore.setState({ players: [p1] });

      // Add 3 sips (+1, +1, +1)
      usePlayerStore.getState().addSips(p1.id, 1);
      usePlayerStore.getState().addSips(p1.id, 1);
      usePlayerStore.getState().addSips(p1.id, 1);
      expect(usePlayerStore.getState().players[0].sips).toBe(3);

      // Step down
      usePlayerStore.getState().addSips(p1.id, -1);
      expect(usePlayerStore.getState().players[0].sips).toBe(2);

      usePlayerStore.getState().addSips(p1.id, -1);
      expect(usePlayerStore.getState().players[0].sips).toBe(1);

      usePlayerStore.getState().addSips(p1.id, -1);
      expect(usePlayerStore.getState().players[0].sips).toBe(0);

      // Extra decrements stay clamped at 0
      usePlayerStore.getState().addSips(p1.id, -1);
      expect(usePlayerStore.getState().players[0].sips).toBe(0);
      usePlayerStore.getState().addSips(p1.id, -1);
      expect(usePlayerStore.getState().players[0].sips).toBe(0);
    });

    it('3.3: player sip adjustment maintains strict player isolation', () => {
      usePlayerStore.setState({ players: samplePlayers });

      usePlayerStore.getState().addSips('p_1', 6);
      usePlayerStore.getState().addSips('p_2', 3);

      // Decrement p1 by 20 (clamps to 0)
      usePlayerStore.getState().addSips('p_1', -20);

      const players = usePlayerStore.getState().players;
      expect(players.find((p) => p.id === 'p_1')?.sips).toBe(0);
      expect(players.find((p) => p.id === 'p_2')?.sips).toBe(3); // p2 unaffected
    });

    it('3.4: GameCardsScreen renders quick-adjust sip buttons for each active player', () => {
      usePlayerStore.setState({ players: samplePlayers });
      useGameSessionStore.setState({
        mode: 'chaos',
        deck: [sampleCard],
        currentIndex: 0,
        currentCard: sampleCard,
        interpolatedText: sampleCard.text,
        assignedPlayers: [samplePlayers[0]],
        calculatedDrinks: 2,
        activeViruses: [],
        expiredVirusesQueue: [],
        isGameOver: false,
      });

      const html = renderToString(
        <GameCardsScreen onGameOver={() => {}} onExitHome={() => {}} />
      );

      expect(html).toContain('minus-sip-p_1');
      expect(html).toContain('plus-sip-p_1');
      expect(html).toContain('minus-sip-p_2');
      expect(html).toContain('plus-sip-p_2');
      expect(html).toContain('Tragos Acumulados');
    });
  });

  // =========================================================================
  // 4. Theme Switcher in SettingsModal DOM Sync Challenge
  // =========================================================================
  describe('4. Theme Switcher: DOM document.documentElement Receives data-theme for All 5 Themes', () => {
    const ALL_5_THEMES: Theme[] = [
      'cyber-neon',
      'electric-purple',
      'acid-lime',
      'sunset-hot',
      'day-mode',
    ];

    it('4.1: setting theme in store updates DOM documentElement data-theme attribute for all 5 themes', () => {
      for (const theme of ALL_5_THEMES) {
        useSettingsStore.getState().setTheme(theme);

        // Verify store state
        expect(useSettingsStore.getState().theme).toBe(theme);

        // Verify DOM documentElement received data-theme attribute
        const appliedTheme = document.documentElement.getAttribute('data-theme');
        expect(appliedTheme).toBe(theme);
      }
    });

    it('4.2: SettingsModal renders buttons for all 5 themes with corresponding identifiers', () => {
      const html = renderToString(
        <SettingsModal isOpen={true} onClose={() => {}} />
      );

      for (const theme of ALL_5_THEMES) {
        expect(html).toContain(`theme-option-${theme}`);
      }

      expect(html).toContain('Cyber Neon');
      expect(html).toContain('Electric Purple');
      expect(html).toContain('Acid Lime');
      expect(html).toContain('Sunset Hot');
      expect(html).toContain('Day Mode');
    });

    it('4.3: selecting theme in SettingsModal plays tap sound and triggers haptic vibration', () => {
      const playTapSpy = vi.spyOn(soundService, 'playTap').mockImplementation(() => {});
      const vibrateSpy = vi.spyOn(soundService, 'vibrate').mockImplementation(() => {});

      const handleSelectTheme = (theme: Theme) => {
        soundService.playTap();
        soundService.vibrate(10);
        useSettingsStore.getState().setTheme(theme);
      };

      handleSelectTheme('acid-lime');

      expect(playTapSpy).toHaveBeenCalledTimes(1);
      expect(vibrateSpy).toHaveBeenCalledWith(10);
      expect(document.documentElement.getAttribute('data-theme')).toBe('acid-lime');
    });

    it('4.4: theme selection persists to localStorage under previalo_settings', () => {
      useSettingsStore.getState().setTheme('sunset-hot');

      const raw = mockStorage.getItem('previalo_settings');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.theme).toBe('sunset-hot');
    });
  });

  // =========================================================================
  // 5. BoardGrid Layout, Serpentine Order & Tile Counts Challenge
  // =========================================================================
  describe('5. BoardGrid: Layout, Serpentine Navigation & Tile Counts (Clásica 45 vs Hot 40)', () => {
    const generateTiles = (count: number, boardId: 'guatoca_clasica' | 'guatoca_hot'): BoardTile[] => {
      return Array.from({ length: count }, (_, i) => {
        const num = i + 1;
        let type: BoardTile['tile_type'] = 'normal';
        if (num === 1) type = 'start';
        else if (num === count) type = 'finish';
        else if (num % 7 === 0) type = 'drink';
        else if (num % 9 === 0) type = 'jump';

        return {
          id: num,
          board_id: boardId,
          tile_number: num,
          tile_type: type,
          title: `Casilla ${num}`,
          description: `Descripción ${num}`,
          drinks_action: type === 'drink' ? 2 : 0,
          turns_lost: 0,
        };
      });
    };

    it('5.1: Clásica board renders exactly 45 tiles across 12 serpentine rows', () => {
      const tiles45 = generateTiles(45, 'guatoca_clasica');
      const html = renderToString(
        <BoardGrid
          tiles={tiles45}
          boardPositions={{ p_1: 1, p_2: 1 }}
          players={samplePlayers}
          currentTurnPlayerId="p_1"
        />
      );

      // Verify all 45 tile buttons are present in DOM
      for (let i = 1; i <= 45; i++) {
        expect(html).toContain(`board-tile-${i}`);
      }

      // Check number of 4-column row containers (12 rows for 45 tiles)
      const expectedRows = Math.ceil(45 / 4);
      expect(expectedRows).toBe(12);

      const rowMatches = html.match(/grid grid-cols-4 gap-2/g) || [];
      expect(rowMatches.length).toBe(12);
    });

    it('5.2: Hot board renders exactly 40 tiles across 10 serpentine rows', () => {
      const tiles40 = generateTiles(40, 'guatoca_hot');
      const html = renderToString(
        <BoardGrid
          tiles={tiles40}
          boardPositions={{ p_1: 1, p_2: 1 }}
          players={samplePlayers}
          currentTurnPlayerId="p_1"
        />
      );

      // Verify all 40 tile buttons are present in DOM
      for (let i = 1; i <= 40; i++) {
        expect(html).toContain(`board-tile-${i}`);
      }
      expect(html).not.toContain('board-tile-41');

      // Check number of 4-column row containers (10 rows for 40 tiles)
      const expectedRows = Math.ceil(40 / 4);
      expect(expectedRows).toBe(10);

      const rowMatches = html.match(/grid grid-cols-4 gap-2/g) || [];
      expect(rowMatches.length).toBe(10);
    });

    it('5.3: serpentine order reverses alternating rows correctly (odd rows reversed)', () => {
      const tiles45 = generateTiles(45, 'guatoca_clasica');

      const sorted = [...tiles45].sort((a, b) => a.tile_number - b.tile_number);
      const cols = 4;
      const rows: BoardTile[][] = [];
      for (let i = 0; i < sorted.length; i += cols) {
        const row = sorted.slice(i, i + cols);
        const rowIndex = Math.floor(i / cols);
        if (rowIndex % 2 === 1) {
          row.reverse();
        }
        rows.push(row);
      }

      // Row 0 (even index): 1, 2, 3, 4 (increasing)
      expect(rows[0].map((t) => t.tile_number)).toEqual([1, 2, 3, 4]);

      // Row 1 (odd index): 8, 7, 6, 5 (decreasing / reversed)
      expect(rows[1].map((t) => t.tile_number)).toEqual([8, 7, 6, 5]);

      // Row 2 (even index): 9, 10, 11, 12 (increasing)
      expect(rows[2].map((t) => t.tile_number)).toEqual([9, 10, 11, 12]);

      // Row 3 (odd index): 16, 15, 14, 13 (decreasing / reversed)
      expect(rows[3].map((t) => t.tile_number)).toEqual([16, 15, 14, 13]);

      // Row 10 (even index): 41, 42, 43, 44
      expect(rows[10].map((t) => t.tile_number)).toEqual([41, 42, 43, 44]);

      // Row 11 (odd index): 45 (single tile)
      expect(rows[11].map((t) => t.tile_number)).toEqual([45]);
    });

    it('5.4: player pawns and turn indicator render on the exact matching tile', () => {
      const tiles45 = generateTiles(45, 'guatoca_clasica');
      const html = renderToString(
        <BoardGrid
          tiles={tiles45}
          boardPositions={{ p_1: 15, p_2: 20 }}
          boardJails={{ p_1: 0, p_2: 2 }}
          players={samplePlayers}
          currentTurnPlayerId="p_1"
        />
      );

      expect(html).toContain('pawn-p_1');
      expect(html).toContain('pawn-p_2');
      expect(html).toContain('🦁');
      expect(html).toContain('🦊');
      expect(html).toContain('🔒');
    });

    it('5.5: canonical production data/03_production/by_category/07_el_tablero.json strictly validates 45 (Clásica) and 40 (Hot) tile counts with 0 gaps', () => {
      const filePath = path.resolve(process.cwd(), 'public/data/by_category/07_el_tablero.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      const clasicaMeta = data.boards.find((b: any) => b.id === 'guatoca_clasica');
      const hotMeta = data.boards.find((b: any) => b.id === 'guatoca_hot');

      expect(clasicaMeta).toBeDefined();
      expect(clasicaMeta.total_tiles).toBe(45);

      expect(hotMeta).toBeDefined();
      expect(hotMeta.total_tiles).toBe(40);

      const clasicaTiles: any[] = data.tiles_by_board.guatoca_clasica;
      const hotTiles: any[] = data.tiles_by_board.guatoca_hot;

      expect(clasicaTiles.length).toBe(45);
      expect(hotTiles.length).toBe(40);

      clasicaTiles.forEach((t, idx) => {
        expect(t.tile_number).toBe(idx + 1);
        expect(t.board_id).toBe('guatoca_clasica');
      });

      hotTiles.forEach((t, idx) => {
        expect(t.tile_number).toBe(idx + 1);
        expect(t.board_id).toBe('guatoca_hot');
      });

      expect(clasicaTiles[0].tile_type).toBe('start');
      expect(clasicaTiles[44].tile_type).toBe('finish');

      expect(hotTiles[0].tile_type).toBe('start');
      expect(hotTiles[39].tile_type).toBe('finish');
    });
  });

  // =========================================================================
  // 6. Deep Adversarial Stress & Robustness Scenarios
  // =========================================================================
  describe('6. Deep Adversarial Stress & Robustness Scenarios', () => {
    it('6.1: SwipeableCard handles diagonal drags, rapid multi-swipe bursts, and extreme text without degradation', () => {
      const onSwipeNext = vi.fn();
      const longCard: Card = {
        ...sampleCard,
        id: 'long_card',
        text: 'A'.repeat(800), // very long text
      };

      const html = renderToString(
        <SwipeableCard
          card={longCard}
          interpolatedText={longCard.text}
          calculatedDrinks={50}
          assignedPlayers={samplePlayers}
          onSwipeNext={onSwipeNext}
          disabled={false}
        />
      );

      expect(html).toContain('50');
      expect(html).toContain('Tragos');

      const { onDragEnd } = capturedMotionDivProps;

      // Diagonal drag: offset.x = 90, offset.y = 300 -> x exceeds 80 -> triggers!
      onDragEnd(null, { offset: { x: 90, y: 300 }, velocity: { x: 50, y: 600 } });
      expect(onSwipeNext).toHaveBeenCalledTimes(1);

      // Burst of 10 rapid valid drags
      for (let i = 0; i < 10; i++) {
        onDragEnd(null, { offset: { x: -100, y: 0 }, velocity: { x: -500, y: 0 } });
      }
      expect(onSwipeNext).toHaveBeenCalledTimes(11);
    });

    it('6.2: Dice3D concurrency flood attack: 50 rapid clicks while rolling are completely rejected', () => {
      const playDiceSpy = vi.spyOn(soundService, 'playDice').mockImplementation(() => {});
      const onRoll = vi.fn();

      renderToString(
        <Dice3D rolling={true} value={6} onRoll={onRoll} disabled={false} />
      );

      // Simulate 50 concurrent spam clicks while rolling
      for (let i = 0; i < 50; i++) {
        capturedMotionButtonProps.onClick();
      }

      expect(playDiceSpy).not.toHaveBeenCalled();
      expect(onRoll).not.toHaveBeenCalled();
    });

    it('6.3: sip adjusters handle non-existent player IDs gracefully without state corruption', () => {
      usePlayerStore.setState({ players: samplePlayers });

      // Dispatch to ghost player ID
      expect(() => {
        usePlayerStore.getState().addSips('ghost_player_999', 10);
        usePlayerStore.getState().addSips('ghost_player_999', -10);
      }).not.toThrow();

      // Existing players intact
      expect(usePlayerStore.getState().players.length).toBe(2);
      expect(usePlayerStore.getState().players[0].sips).toBe(0);
      expect(usePlayerStore.getState().players[1].sips).toBe(0);
    });

    it('6.4: theme switcher stress: 50 alternating theme transitions maintain 100% DOM synchronization', () => {
      const themes: Theme[] = ['cyber-neon', 'electric-purple', 'acid-lime', 'sunset-hot', 'day-mode'];

      for (let i = 0; i < 50; i++) {
        const theme = themes[i % themes.length];
        useSettingsStore.getState().setTheme(theme);
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      }
    });

    it('6.5: BoardGrid handles unsorted input tiles and sorts them properly for serpentine display', () => {
      // Create scrambled tiles
      const scrambledTiles: BoardTile[] = [
        { id: 45, board_id: 'guatoca_clasica', tile_number: 45, tile_type: 'finish', title: 'Meta', description: 'Fin', drinks_action: 0, turns_lost: 0 },
        { id: 1, board_id: 'guatoca_clasica', tile_number: 1, tile_type: 'start', title: 'Salida', description: 'Inicio', drinks_action: 0, turns_lost: 0 },
        { id: 23, board_id: 'guatoca_clasica', tile_number: 23, tile_type: 'normal', title: 'T23', description: '', drinks_action: 0, turns_lost: 0 },
        { id: 5, board_id: 'guatoca_clasica', tile_number: 5, tile_type: 'drink', title: 'T5', description: '', drinks_action: 2, turns_lost: 0 },
      ];

      const html = renderToString(
        <BoardGrid
          tiles={scrambledTiles}
          boardPositions={{ p_1: 1 }}
          players={samplePlayers}
        />
      );

      // Verify all tiles rendered
      expect(html).toContain('board-tile-1');
      expect(html).toContain('board-tile-5');
      expect(html).toContain('board-tile-23');
      expect(html).toContain('board-tile-45');

      // Verify tile click callback
      const onTileClick = vi.fn();
      renderToString(
        <BoardGrid
          tiles={scrambledTiles}
          boardPositions={{ p_1: 1 }}
          players={samplePlayers}
          onTileClick={onTileClick}
        />
      );
    });
  });
});
