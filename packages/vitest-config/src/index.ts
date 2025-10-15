export const sharedConfig = {
  test: {
    globals: true,
    coverage: {
      provider: 'v8' as const,
      reporter: [
        'text',
        'html',
        'lcovonly',
        [
          'json',
          {
            file: `../coverage.json`,
          },
        ],
      ] as const,
      enabled: true,
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/src/generated/**', '**/tests/**', '**/*.d.ts', '**/*.config.ts', '**/*.config.js', '**/vite.config.ts', '**/vite.config.js', '**/eslint.config.mjs'],
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'tests/**/*.test.ts', 'tests/**/*.spec.ts'],
  },
}

// Re-export specific configs for backwards compatibility
export { baseConfig } from './configs/base-config.js'
export { uiConfig } from './configs/ui-config.js'
