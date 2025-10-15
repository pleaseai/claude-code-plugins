<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'

interface PluginSource {
  source: 'github'
  repo: string
}

interface Plugin {
  name: string
  description: string
  version?: string
  author?: string
  source: PluginSource
}

interface MarketplaceData {
  name: string
  version: string
  description: string
  owner: {
    name: string
    email: string
  }
  plugins: Plugin[]
}

const searchQuery = ref('')
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

// Fetch marketplace data
const { data: marketplaceData, pending, error } = await useAsyncData<MarketplaceData>(
  'marketplace',
  () => queryCollection('marketplace').first(),
)

// Check if plugin matches search query
function pluginMatchesSearch(plugin: Plugin, query: string): boolean {
  const searchFields = [
    plugin.name,
    plugin.description,
    plugin.source.repo,
  ]

  return searchFields.some(field =>
    field.toLowerCase().includes(query),
  )
}

// Filter plugins based on search query
const filteredPlugins = computed(() => {
  if (!marketplaceData.value?.plugins)
    return []

  const query = searchQuery.value.toLowerCase().trim()

  if (!query) {
    return marketplaceData.value.plugins
  }

  return marketplaceData.value.plugins.filter(plugin =>
    pluginMatchesSearch(plugin, query),
  )
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
  const pluginExists = marketplaceData.value?.plugins?.some(p => p.name === pluginName)

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
      <!-- Search Bar -->
      <div class="mb-8 max-w-2xl mx-auto">
        <PluginSearch v-model="searchQuery" :filtered-count="filteredPlugins.length" />
      </div>

      <!-- Disclaimer Alert -->
      <UAlert
        v-if="marketplaceData"
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
    <UContainer v-if="marketplaceData" class="py-12 border-t border-default">
      <div class="text-center">
        <p class="text-sm text-muted mb-2">
          Marketplace maintained by <span class="font-semibold">{{ marketplaceData.owner.name }}</span>
        </p>
        <UButton
          :to="`mailto:${marketplaceData.owner.email}`"
          variant="ghost"
          size="sm"
          icon="i-heroicons-envelope"
        >
          {{ marketplaceData.owner.email }}
        </UButton>
      </div>
    </UContainer>
  </div>
</template>
