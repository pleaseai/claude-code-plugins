<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import type { AggregatedPlugin, MarketplaceAPIResponse, Plugin } from '~/types/marketplace'

interface MarketplaceData {
  name: string
  version: string
  description: string
  repository?: string
  owner: {
    name: string
    email: string
  }
  plugins: Plugin[]
}

const searchQuery = ref('')
const selectedMarketplace = ref<string | null>(null) // Filter by marketplace.json name
const route = useRoute()
const router = useRouter()
const toast = useToast()
const pluginCardRefs = ref<Record<string, any>>({})
const pendingScrollTimer = ref<{ stop: () => void } | null>(null)

// Get target plugin name from URL query parameter with validation
const targetPluginName = computed(() => {
  const pluginParam = route.query.plugin || route.query.install

  // Handle array case (e.g., ?plugin=foo&plugin=bar)
  if (Array.isArray(pluginParam)) {
    console.warn('[Plugin URL Navigation] Multiple plugin parameters detected, using first value')
    return pluginParam[0] || undefined
  }

  // Handle empty string
  if (pluginParam === '') {
    console.warn('[Plugin URL Navigation] Empty plugin parameter detected')
    return undefined
  }

  // Normalize and validate
  if (typeof pluginParam === 'string') {
    const normalized = pluginParam.trim()
    return normalized || undefined
  }

  return undefined
})

// Fetch marketplace data from API
const { data: apiData, pending, error } = await useFetch<MarketplaceAPIResponse>('/api/marketplaces')

// Aggregate all plugins from all marketplaces
const allPlugins = computed(() => {
  if (!apiData.value) return []

  return apiData.value.marketplaces.flatMap(m =>
    m.plugins.map(plugin => ({
      ...plugin,
      marketplaceRepo: m.repo,
    })),
  )
})

// Marketplace filter options
const marketplaceOptions = computed(() => {
  if (!apiData.value) return []

  return [
    { label: 'All Marketplaces', value: null },
    ...apiData.value.marketplaces.map(m => ({
      label: `${m.marketplaceJsonName} (${m.pluginCount})`, // Use name from marketplace.json
      value: m.marketplaceJsonName,
    })),
  ]
})

// Check if plugin matches search query
function pluginMatchesSearch(plugin: Plugin, query: string): boolean {
  const searchFields = [
    plugin.name,
    plugin.description,
    typeof plugin.source === 'string' ? plugin.source : plugin.source.repo,
  ]

  return searchFields.some(field =>
    field.toLowerCase().includes(query),
  )
}

// Filter plugins based on search query and marketplace selection
const filteredPlugins = computed(() => {
  let plugins = allPlugins.value

  // Filter by marketplace
  if (selectedMarketplace.value) {
    plugins = plugins.filter(plugin =>
      (plugin as AggregatedPlugin).marketplaceJsonName === selectedMarketplace.value,
    )
  }

  // Filter by search query
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    plugins = plugins.filter(plugin =>
      pluginMatchesSearch(plugin, query),
    )
  }

  return plugins
})

// Store plugin card refs for scrolling
function setPluginCardRef(pluginName: string, el: any) {
  if (el) {
    pluginCardRefs.value[pluginName] = el
  }
}

// Scroll to a specific plugin card with error handling
function scrollToPlugin(pluginName: string): boolean {
  const targetCard = pluginCardRefs.value[pluginName]

  if (!targetCard) {
    // Use debug level for initial attempts - this is expected during loading
    return false
  }

  try {
    const element = targetCard.$el

    if (!element || !(element instanceof HTMLElement)) {
      throw new Error(`Invalid DOM element for plugin "${pluginName}"`)
    }

    if (typeof element.scrollIntoView !== 'function') {
      throw new TypeError('scrollIntoView not supported')
    }

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })

    return true
  }
  catch (error) {
    console.error(`[Plugin URL Navigation] Failed to scroll to plugin "${pluginName}":`, error)
    return false
  }
}

// Auto-scroll to target plugin when page loads with user feedback
watch([() => targetPluginName.value, pending], ([pluginName, isLoading]) => {
  if (!pluginName || isLoading)
    return

  // Check if plugin exists in the data first
  const pluginExists = allPlugins.value.some(p => p.name === pluginName)

  if (!pluginExists) {
    // Plugin doesn't exist in marketplace data
    toast.add({
      title: 'Plugin Not Found',
      description: `The plugin "${pluginName}" could not be found. It may have been removed or the link may be incorrect.`,
      color: 'red',
      icon: 'i-heroicons-exclamation-triangle',
    })

    // Clear the query parameter to prevent confusion
    router.replace({ query: {} })
    return
  }

  // Clean up any existing pending timer
  pendingScrollTimer.value?.stop()

  // Plugin exists, try to scroll with retry logic
  let retryCount = 0
  const maxRetries = 5
  const retryDelay = 200 // ms between retries

  const attemptScroll = () => {
    // Wait for next tick to ensure DOM is updated
    nextTick(() => {
      const scrolled = scrollToPlugin(pluginName)

      if (scrolled) {
        // Success! Clear timer reference
        pendingScrollTimer.value = null
        return
      }

      // Not ready yet, retry if we haven't exceeded max retries
      retryCount++
      if (retryCount < maxRetries) {
        const timer = useTimeoutFn(attemptScroll, retryDelay)
        pendingScrollTimer.value = timer
        timer.start()
      }
      else {
        // Max retries reached, show user feedback
        console.error(`[Plugin URL Navigation] Failed to scroll to "${pluginName}" after ${maxRetries} attempts`)
        toast.add({
          title: 'Navigation Issue',
          description: `The plugin "${pluginName}" was found but could not be displayed. Try refreshing the page.`,
          color: 'orange',
          icon: 'i-heroicons-exclamation-circle',
        })
        pendingScrollTimer.value = null
      }
    })
  }

  // Start the scroll attempt cycle
  attemptScroll()
}, { immediate: true })

// Clean up pending timer on unmount
onBeforeUnmount(() => {
  pendingScrollTimer.value?.stop()
})

// SEO Meta
useHead({
  title: 'Claude Code Plugin Marketplace',
  meta: [
    {
      name: 'description',
      content: 'Discover and install plugins to extend Claude Code capabilities',
    },
  ],
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <UPageHero
      title="Claude Code Plugin Marketplace"
      description="Discover and install plugins to extend Claude Code's capabilities. Browse our collection of community-contributed plugins."
      headline="Explore Plugins"
    >
      <template #links>
        <div class="flex items-center gap-4">
          <UButton
            to="https://github.com/pleaseai/claude-code-plugins"
            target="_blank"
            icon="i-simple-icons-github"
            color="neutral"
            variant="ghost"
            aria-label="View on GitHub"
          />
          <UColorModeButton />
        </div>
      </template>
    </UPageHero>

    <!-- Main Content -->
    <UContainer class="py-12">
      <!-- Search Bar and Filters -->
      <div class="mb-8 max-w-2xl mx-auto space-y-4">
        <PluginSearch v-model="searchQuery" :filtered-count="filteredPlugins.length" />

        <!-- Marketplace Filter -->
        <div v-if="marketplaceOptions.length > 0" class="flex items-center gap-2">
          <label class="text-sm font-medium text-muted">Filter by Marketplace:</label>
          <USelectMenu
            v-model="selectedMarketplace"
            :items="marketplaceOptions"
            value-key="value"
            placeholder="All Marketplaces"
            class="w-64"
          />
        </div>
      </div>

      <!-- Disclaimer Alert -->
      <UAlert
        v-if="apiData"
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        class="mb-12"
        title="Community Plugins"
        description="These plugins are community-contributed. Please review the source code and documentation before installation."
      />

      <!-- Loading State -->
      <div v-if="pending" class="flex items-center justify-center py-24">
        <div class="text-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-5xl text-primary mb-4" />
          <p class="text-muted">
            Loading plugins...
          </p>
        </div>
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="error"
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="soft"
        title="Failed to load plugins"
        :description="error.message"
        class="mb-8"
      />

      <!-- Plugins Grid -->
      <UPageGrid v-else-if="filteredPlugins.length > 0">
        <PluginCard
          v-for="plugin in filteredPlugins"
          :key="plugin.name"
          :ref="el => setPluginCardRef(plugin.name, el)"
          :plugin="plugin"
          :auto-open-modal="plugin.name === targetPluginName"
        />
      </UPageGrid>

      <!-- Empty State -->
      <div v-else class="text-center py-24">
        <UIcon name="i-heroicons-magnifying-glass" class="mx-auto text-5xl text-muted mb-4" />
        <h3 class="text-xl font-semibold mb-2">
          No plugins found
        </h3>
        <p class="text-muted mb-6">
          No plugins match your search query: '{{ searchQuery }}'
        </p>
        <UButton
          label="Clear search"
          color="neutral"
          variant="outline"
          @click="searchQuery = ''"
        />
      </div>
    </UContainer>

    <!-- Footer Section -->
    <UContainer v-if="apiData" class="py-12 border-t border-default">
      <div class="text-center">
        <p class="text-sm text-muted mb-2">
          Marketplace maintained by <span class="font-semibold">Passion Factory</span>
        </p>
        <UButton
          to="mailto:support@passionfactory.ai"
          variant="ghost"
          size="sm"
          icon="i-heroicons-envelope"
        >
          support@passionfactory.ai
        </UButton>
      </div>
    </UContainer>
  </div>
</template>
