import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts (rather than adding a `test` block
// there) to avoid touching the build config at all. All current tests are
// pure TypeScript logic (parser, units, store reducer, calc-helpers) with
// zero DOM dependency, so the default 'node' environment is enough — no
// jsdom dependency needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
