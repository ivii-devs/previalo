import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from '../../../vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['.agents/teamwork/challenger_m5_1/**/*.test.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  })
);
