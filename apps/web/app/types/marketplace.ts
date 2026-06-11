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

export interface PluginSourceGitHub {
  source: 'github'
  repo: string
  ref?: string
  sha?: string
}

export interface PluginSourceUrl {
  source: 'url'
  url: string
  ref?: string
  sha?: string
}

export interface PluginSourceGitSubdir {
  source: 'git-subdir'
  url: string
  path: string
  ref?: string
  sha?: string
}

export interface PluginSourceNpm {
  source: 'npm'
  package: string
  version?: string
  registry?: string
}

export type PluginSource = PluginSourceGitHub | PluginSourceUrl | PluginSourceGitSubdir | PluginSourceNpm

export interface Plugin {
  name: string
  description?: string
  version?: string
  author?: string | { name?: string, email?: string }
  category?: string
  keywords?: string[]
  tags?: string[]
  source: PluginSource | string
  stars?: number
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
