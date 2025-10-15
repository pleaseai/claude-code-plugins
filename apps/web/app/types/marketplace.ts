/**
 * Multi-marketplace support types
 */

export interface MarketplaceSource {
  name: string
  description: string
  url: string
  repo: string
  enabled: boolean
  priority: number
}

export interface PluginSource {
  source: 'github'
  repo: string
}

export interface Plugin {
  name: string
  description: string
  version?: string
  author?: string | { name?: string; email?: string }
  category?: string
  source: PluginSource | string
}

export interface Marketplace {
  name: string
  version: string
  description: string
  homepage?: string
  repository?: string
  owner: {
    name: string
    email: string
  }
  plugins: Plugin[]
}

export interface AggregatedPlugin extends Plugin {
  marketplaceRepo: string
  marketplaceJsonName: string
}

export interface AggregatedMarketplace {
  name: string
  description: string
  repo: string
  marketplaceJsonName: string
  pluginCount: number
  plugins: AggregatedPlugin[]
}

export interface MarketplaceAPIResponse {
  marketplaces: AggregatedMarketplace[]
  totalPlugins: number
}
