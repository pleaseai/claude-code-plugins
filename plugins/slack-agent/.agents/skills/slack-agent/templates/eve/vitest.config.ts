import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use globals (describe, it, expect) without imports
    globals: true,

    // Node environment for server-side code
    environment: 'node',

    // Test file patterns — tests are co-located with agent code
    include: [
      'agent/**/*.test.ts',
    ],

    // Exclude patterns (.eve/ holds build artifacts)
    exclude: [
      'node_modules',
      '.eve',
      '.vercel',
      'dist',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['agent/**/*.ts'],
      exclude: [
        'agent/**/*.test.ts',
        'agent/**/*.d.ts',
        'agent/__tests__/**',
      ],
      // Coverage thresholds (adjust as needed)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },

    // Setup files run before each test file
    setupFiles: ['./agent/__tests__/setup.ts'],

    // Timeout for async operations (ms)
    testTimeout: 10000,

    // Retry failed tests (useful for flaky network tests)
    retry: 0,

    // Reporter configuration
    reporters: ['verbose'],
  },
});
