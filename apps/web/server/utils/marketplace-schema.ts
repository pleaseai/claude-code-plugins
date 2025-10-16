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
  // Official schema: version/description should be in metadata object
  // Root-level fields are deprecated but still supported for backwards compatibility
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
  // Check for deprecated root-level fields and warn
  if (data.version !== undefined || data.description !== undefined) {
    console.warn(
      `[DEPRECATED] Marketplace "${data.name}": version and description at root level are deprecated. ` +
      `Please move them to metadata object: { metadata: { version: "...", description: "..." } }`
    )
  }

  // Normalize version/description with priority: metadata > root-level > defaults
  // Prefer metadata values (official schema) over root-level (deprecated)
  const version = data.metadata?.version ?? data.version ?? '0.0.0'
  const description = data.metadata?.description ?? data.description ?? 'No description available'

  // Remove redundant fields after extraction
  const { metadata, version: _, description: __, ...rest } = data

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
