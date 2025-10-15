import { sharedConfig } from '@pleaseai/vitest-config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  ...sharedConfig,
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcovonly'],
    },
    // Exclude integration tests from default test runs
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts', // Integration tests (slow, require external services)
    ],
    projects: [
      {
        root: './packages',
        test: {
          ...sharedConfig.test,
          // Project-specific configuration for packages
          // ...
        },
      },
      {
        root: './apps',
        test: {
          ...sharedConfig.test,
          // Project-specific configuration for apps
          environment: 'jsdom',
        },
      },
    ],
  },
})
