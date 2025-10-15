import { z } from 'zod'

/**
 * Zod schemas for marketplace data validation
 * Reused from content.config.ts for consistency
 */

export const pluginSourceSchema = z.union([
  z.object({
    source: z.literal('github'),
    repo: z.string(),
  }),
  z.string(),
])

export const pluginSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string().optional(),
  author: z.union([
    z.string(),
    z.object({
      name: z.string().optional(),
      email: z.string().optional(),
    }),
  ]).optional(),
  category: z.string().optional(),
  source: pluginSourceSchema,
})

export const marketplaceSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  owner: z.object({
    name: z.string(),
    email: z.string(),
  }),
  plugins: z.array(pluginSchema),
})

export const marketplaceSourceSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().url(),
  repo: z.string(),
  enabled: z.boolean(),
  priority: z.number(),
})

export const marketplaceSourcesConfigSchema = z.object({
  sources: z.array(marketplaceSourceSchema),
})
