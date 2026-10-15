import { describe, it, expect } from 'vitest';
import { E2EGameDriver } from '../harness/e2e-game-driver';
import type { ThemeId } from '../harness/e2e-contracts';

describe('Tier 1: Theme Switching & Neon Color Palettes E2E', () => {
  it('TC-T1-THM-01: should support all 4 agreed neon dark themes and 1 high-contrast day mode', () => {
    const validThemes: ThemeId[] = [
      'cyber-neon',
      'electric-purple',
      'acid-lime',
      'sunset-hot',
      'day-mode',
    ];

    for (const theme of validThemes) {
      expect(E2EGameDriver.THEME_TOKENS[theme]).toBeDefined();
    }
  });

  it('TC-T1-THM-02: should define required CSS variable tokens on all theme profiles', () => {
    const requiredVars = [
      '--bg-primary',
      '--surface-primary',
      '--accent-primary',
      '--accent-glow',
    ];

    const themes: ThemeId[] = [
      'cyber-neon',
      'electric-purple',
      'acid-lime',
      'sunset-hot',
      'day-mode',
    ];

    for (const t of themes) {
      const vars = E2EGameDriver.THEME_TOKENS[t];
      for (const req of requiredVars) {
        expect(vars[req]).toBeDefined();
        expect(typeof vars[req]).toBe('string');
        expect(vars[req].length).toBeGreaterThan(0);
      }
    }
  });

  it('TC-T1-THM-03: should switch active theme and update CSS variable dictionary', () => {
    const driver = new E2EGameDriver();
    expect(driver.getTheme()).toBe('cyber-neon');

    driver.setTheme('electric-purple');
    expect(driver.getTheme()).toBe('electric-purple');
    expect(driver.getThemeCSSVariables()['--accent-primary']).toBe('#a855f7');

    driver.setTheme('acid-lime');
    expect(driver.getTheme()).toBe('acid-lime');
    expect(driver.getThemeCSSVariables()['--accent-primary']).toBe('#84cc16');

    driver.setTheme('sunset-hot');
    expect(driver.getTheme()).toBe('sunset-hot');
    expect(driver.getThemeCSSVariables()['--accent-primary']).toBe('#f97316');

    driver.setTheme('day-mode');
    expect(driver.getTheme()).toBe('day-mode');
    expect(driver.getThemeCSSVariables()['--bg-primary']).toBe('#f8fafc');
  });

  it('TC-T1-THM-04: should reject invalid theme keys with error', () => {
    const driver = new E2EGameDriver();
    // @ts-expect-error invalid theme test
    expect(() => driver.setTheme('matrix-green')).toThrow(/Unknown theme/);
  });

  it('TC-T1-THM-05: should preserve theme selection across game session re-initialization', () => {
    const driver = new E2EGameDriver();
    driver.setTheme('sunset-hot');

    // Start cards session
    driver.initCardsSession({ players: ['Alice'], intensity: 1 });
    expect(driver.getTheme()).toBe('sunset-hot');

    // Start board session
    driver.initBoardSession('guatoca_clasica', ['Bob']);
    expect(driver.getTheme()).toBe('sunset-hot');
    expect(driver.getThemeCSSVariables()['--accent-primary']).toBe('#f97316');
  });

  it('TC-T1-THM-06: should provide light background on day-mode and deep dark on dark neon themes', () => {
    const dayVars = E2EGameDriver.THEME_TOKENS['day-mode'];
    expect(dayVars['--bg-primary']).toBe('#f8fafc');

    const darkThemes: ThemeId[] = ['cyber-neon', 'electric-purple', 'acid-lime', 'sunset-hot'];
    for (const dt of darkThemes) {
      const vars = E2EGameDriver.THEME_TOKENS[dt];
      // Dark backgrounds start with #0 or #1
      expect(vars['--bg-primary']).toMatch(/^#(0|1)/);
    }
  });
});
