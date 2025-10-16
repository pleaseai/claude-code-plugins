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
  stars: z.number().optional(),
})

export const marketplaceSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  // Support marketplaces that nest version/description in metadata object
  // (e.g., claude-code-workflows, claude-code-templates)
  metadata: z.object({
    version: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  owner: z.object({
    name: z.string(),
    email: z.string().optional(),
    url: z.string().optional(),
  }),
  plugins: z.array(pluginSchema),
}).transform((data) => {
  // Normalize version/description to always be defined strings
  // Supports both root-level (Anthropic style) and metadata-nested (community style) formats
  const version = data.version ?? data.metadata?.version ?? '0.0.0'
  const description = data.description ?? data.metadata?.description ?? 'No description available'

  // Remove redundant metadata field after extraction
  const { metadata, ...rest } = data

  return {
    ...rest,
    version,
    description,
  }
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
