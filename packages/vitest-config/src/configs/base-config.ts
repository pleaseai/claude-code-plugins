import { defineConfig } from 'vitest/config'

export const baseConfig = defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: [
        [
          'json',
          {
            file: `../coverage.json`,
          },
        ],
        'text',
        'html',
      ],
      enabled: true,
    },
  },
})
