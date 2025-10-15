import { resolve } from 'node:path'
import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    marketplace: defineCollection({
      type: 'data',
      source: {
        include: 'marketplace.json',
        cwd: resolve(__dirname, '../../.claude-plugin'),
      },
      schema: z.object({
        $schema: z.string().optional(),
        name: z.string(),
        version: z.string(),
        description: z.string(),
        owner: z.object({
          name: z.string(),
          email: z.string(),
        }),
        plugins: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            version: z.string().optional(),
            author: z.string().optional(),
            source: z.object({
              source: z.literal('github'),
              repo: z.string(),
            }),
          }),
        ),
      }),
    }),
  },
})
