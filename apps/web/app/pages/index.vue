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
          <p class="text-muted">Loading plugins...</p>
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
          :plugin="plugin"
        />
      </UPageGrid>

      <!-- Empty State -->
      <div v-else class="text-center py-24">
        <UIcon name="i-heroicons-magnifying-glass" class="mx-auto text-5xl text-muted mb-4" />
        <h3 class="text-xl font-semibold mb-2">No plugins found</h3>
        <p class="text-muted mb-6">
          No plugins match your search query: '{{ searchQuery }}'
        </p>
        <UButton
          @click="searchQuery = ''"
          label="Clear search"
          color="neutral"
          variant="outline"
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

<script setup lang="ts">
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

// Fetch marketplace data
const { data: marketplaceData, pending, error } = await useAsyncData<MarketplaceData>(
  'marketplace',
  () => queryCollection('marketplace').first()
)

// Filter plugins based on search query
const filteredPlugins = computed(() => {
  if (!marketplaceData.value?.plugins) return []

  const query = searchQuery.value.toLowerCase().trim()

  if (!query) {
    return marketplaceData.value.plugins
  }

  return marketplaceData.value.plugins.filter(plugin => {
    return (
      plugin.name.toLowerCase().includes(query) ||
      plugin.description.toLowerCase().includes(query) ||
      plugin.source.repo.toLowerCase().includes(query)
    )
  })
})

// SEO Meta
useHead({
  title: 'Claude Code Plugin Marketplace',
  meta: [
    {
      name: 'description',
      content: 'Discover and install plugins to extend Claude Code capabilities'
    }
  ]
})
</script>
