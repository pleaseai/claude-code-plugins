import type { AggregatedMarketplace, AggregatedPlugin, MarketplaceAPIResponse, MarketplaceSource } from '~/types/marketplace'
import marketplaceSourcesConfig from '../marketplace-sources.json'
import { marketplaceSchema, marketplaceSourcesConfigSchema } from '../utils/marketplace-schema'
import { fetchPluginStars } from '../utils/github'

/**
 * Fetch and aggregate multiple marketplaces
 * Uses Nuxt's built-in caching with 5-minute TTL
 * Exported for direct use in server-side rendering
 */
export const fetchMarketplaces = defineCachedFunction(
  async (): Promise<MarketplaceAPIResponse> => {
    // Validate configuration with Zod
    const validatedConfig = marketplaceSourcesConfigSchema.parse(marketplaceSourcesConfig)
    const enabledSources = validatedConfig.sources
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority)

    // Fetch all marketplaces in parallel
    const results = await Promise.allSettled(
      enabledSources.map(async (source: MarketplaceSource) => {
        try {
          // Fetch as text first, then parse manually
          // This handles GitHub raw URLs more reliably
          const rawResponse = await $fetch<string>(source.url, {
            responseType: 'text',
          })

          // Parse JSON manually
          const response = JSON.parse(rawResponse)

          // Validate marketplace data with Zod
          const validatedMarketplace = marketplaceSchema.parse(response)

          // Cache marketplace repo stars to avoid duplicate API calls
          let marketplaceRepoStars: number | null | undefined

          // Fetch GitHub stars for all plugins in parallel
          const pluginsWithStars = await Promise.all(
            validatedMarketplace.plugins.map(async (plugin) => {
              let stars = plugin.stars

              // Fetch stars if not already provided
              if (stars === undefined || stars === null) {
                // For local plugins (e.g., "./plugins/xxx"), use marketplace repo
                if (typeof plugin.source === 'string' && plugin.source.startsWith('./')) {
                  // Fetch marketplace repo stars only once and cache it
                  if (marketplaceRepoStars === undefined) {
                    marketplaceRepoStars = await fetchPluginStars(source.repo)
                  }
                  stars = marketplaceRepoStars
                }
                else {
                  // For GitHub plugins, use plugin's own repo
                  stars = await fetchPluginStars(plugin.source)
                }
              }

              return {
                ...plugin,
                stars,
                marketplaceRepo: source.repo,
                marketplaceJsonName: validatedMarketplace.name,
              }
            }),
          )

          return {
            name: source.name,
            description: source.description,
            repo: source.repo,
            marketplaceJsonName: validatedMarketplace.name,
            pluginCount: pluginsWithStars.length,
            plugins: pluginsWithStars,
          }
        }
        catch (error) {
          console.error(`Failed to fetch marketplace ${source.name}:`, error)
          throw error
        }
      }),
    )

    // Filter successful results
    const marketplaces: AggregatedMarketplace[] = results
      .filter((r): r is PromiseFulfilledResult<AggregatedMarketplace> =>
        r.status === 'fulfilled',
      )
      .map(r => r.value)

    // Log failed marketplaces with details
    const failedResults = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failedResults.length > 0) {
      console.warn(`Failed to load ${failedResults.length} marketplace(s)`)
      failedResults.forEach((result, index) => {
        const source = enabledSources[index]
        if (source) {
          console.error(`Failed marketplace: ${source.name} (${source.url})`, result.reason)
        }
      })
    }

    // If all marketplaces failed, throw a more informative error
    if (marketplaces.length === 0) {
      console.error('All marketplace fetches failed')
      throw new Error('All marketplace sources are currently unavailable')
    }

    // Calculate total plugins
    const totalPlugins = marketplaces.reduce((sum, m) => sum + m.pluginCount, 0)

    return {
      marketplaces,
      totalPlugins,
    }
  },
  {
    maxAge: 60 * 5, // 5 minutes cache
    name: 'marketplaces',
    getKey: () => 'all',
  },
)

export default defineEventHandler(async () => {
  try {
    return await fetchMarketplaces()
  }
  catch (error) {
    console.error('Error fetching marketplaces:', error)

    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch marketplaces'
    const isAllFailed = errorMessage.includes('All marketplace sources')

    throw createError({
      statusCode: isAllFailed ? 503 : 500,
      message: errorMessage,
      data: {
        timestamp: new Date().toISOString(),
      },
    })
  }
})
