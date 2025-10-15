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
  author?: string | { name?: string, email?: string }
  source: PluginSource | string
  marketplaceRepo?: string
  marketplaceJsonName?: string
}

interface PluginMetadata {
  version?: string
  description?: string
  author?: string
  license?: string
  mcpServers?: Record<string, any>
  contextFileName?: string
  [key: string]: any
}

const props = withDefaults(defineProps<{
  plugin: Plugin
  autoOpenModal?: boolean
}>(), {
  autoOpenModal: false,
})

const isModalOpen = ref(false)
const pluginMetadata = ref<PluginMetadata | null>(null)
const loading = ref(false)

// Fetch plugin metadata from GitHub (only for plugins without version in marketplace.json)
async function fetchPluginMetadata() {
  // If version already exists in marketplace.json, don't fetch
  if (props.plugin.version) {
    return
  }

  // Local plugins should have metadata in marketplace.json - skip fetch
  if (typeof props.plugin.source === 'string') {
    return
  }

  // GitHub plugin - fetch from GitHub
  loading.value = true
  try {
    const url = `https://raw.githubusercontent.com/${props.plugin.source.repo}/main/.claude-plugin/plugin.json`
    const response = await fetch(url)

    if (!response.ok) {
      // Log specific HTTP error
      console.error(`Failed to fetch plugin metadata: HTTP ${response.status}`, {
        plugin: props.plugin.name,
        repo: props.plugin.source.repo,
        status: response.status,
        statusText: response.statusText,
      })

      // Handle specific error cases
      if (response.status === 404) {
        console.warn(`Plugin metadata not found for ${props.plugin.name}`)
        // 404 is common for plugins without metadata - don't show toast
      }
      else if (response.status === 403) {
        console.error(`Access denied to plugin metadata for ${props.plugin.name}`)
      }
      return
    }

    // Parse JSON with error handling
    try {
      pluginMetadata.value = await response.json()
    }
    catch (parseErr) {
      console.error('Failed to parse plugin metadata JSON:', {
        plugin: props.plugin.name,
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      })
      // Don't show toast - this is a plugin configuration issue
    }
  }
  catch (err) {
    // Network-level errors (connection failed, CORS, etc.)
    console.error('Network error fetching plugin metadata:', {
      plugin: props.plugin.name,
      repo: props.plugin.source.repo,
      error: err instanceof Error ? err.message : String(err),
    })
  }
  finally {
    loading.value = false
  }
}

// Computed version - from marketplace.json or fetched metadata
const displayVersion = computed(() => {
  return props.plugin.version || pluginMetadata.value?.version
})

// Computed description - prefer marketplace.json, fallback to metadata
const displayDescription = computed(() => {
  return props.plugin.description || pluginMetadata.value?.description || 'No description available'
})

// Extract author name from either marketplace.json or fetched metadata
// Handles both string and object formats
// If author email is @anthropic.com, display "Anthropic" instead of individual name
function getAuthorName(author: string | { name?: string, email?: string } | undefined): string | undefined {
  if (!author)
    return undefined

  // Handle string format
  if (typeof author === 'string') {
    return author
  }

  // Handle object format - check email domain
  if (author.email?.endsWith('@anthropic.com')) {
    return 'Anthropic'
  }

  return author.name
}

// Computed author - prefer marketplace.json, fallback to metadata
const displayAuthor = computed(() => {
  const author = props.plugin.author || pluginMetadata.value?.author
  return getAuthorName(author)
})

// Computed license - from fetched metadata
const displayLicense = computed(() => {
  return pluginMetadata.value?.license
})

// Computed MCP server availability - check if plugin has MCP server configured
const hasMcpServer = computed(() => {
  return pluginMetadata.value?.mcpServers && Object.keys(pluginMetadata.value.mcpServers).length > 0
})

// Computed context file availability - check if plugin has context file configured
const hasContext = computed(() => {
  return !!pluginMetadata.value?.contextFileName
})

// Computed GitHub source URL
const githubSourceUrl = computed(() => {
  if (typeof props.plugin.source === 'string') {
    // Local plugin - construct GitHub URL from marketplace repository
    if (!props.plugin.marketplaceRepo) {
      console.warn(`[PluginCard] No marketplace repository for local plugin: ${props.plugin.name}`)
      return undefined
    }

    // marketplaceRepo is already in "org/repo" format
    const repoPath = props.plugin.marketplaceRepo
    // Convert local path to GitHub tree path (e.g., "./plugins/agent-sdk-dev" -> "tree/main/plugins/agent-sdk-dev")
    const treePath = props.plugin.source.replace(/^\.\//, 'tree/main/')
    const url = `https://github.com/${repoPath}/${treePath}`

    return url
  }
  // GitHub plugin
  return `https://github.com/${props.plugin.source.repo}`
})

// Consolidated badges configuration
interface Badge {
  key: string
  icon: string
  label: string
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  title: string
}

const badges = computed<Badge[]>(() => {
  const badgeList: Badge[] = []

  // Marketplace badge (shown first)
  if (props.plugin.marketplaceJsonName) {
    const isOfficial = props.plugin.marketplaceJsonName === 'anthropic'
    badgeList.push({
      key: 'marketplace',
      icon: isOfficial ? 'i-heroicons-shield-check' : 'i-heroicons-building-storefront',
      label: props.plugin.marketplaceJsonName,
      color: isOfficial ? 'primary' : 'success',
      title: `From ${props.plugin.marketplaceJsonName} marketplace`,
    })
  }

  // Author badges
  if (displayAuthor.value === 'Google') {
    badgeList.push({
      key: 'google',
      icon: 'i-simple-icons-google',
      label: 'Google',
      color: 'warning',
      title: 'Developed by Google',
    })
  }
  else if (displayAuthor.value === 'Anthropic') {
    badgeList.push({
      key: 'anthropic',
      icon: 'i-simple-icons-anthropic',
      label: 'Anthropic',
      color: 'error',
      title: 'Developed by Anthropic',
    })
  }

  // Feature badges
  if (hasContext.value) {
    badgeList.push({
      key: 'context',
      icon: 'i-heroicons-document-text',
      label: 'Context',
      color: 'info',
      title: 'Includes Context File',
    })
  }

  if (hasMcpServer.value) {
    badgeList.push({
      key: 'mcp',
      icon: 'i-heroicons-server',
      label: 'MCP',
      color: 'primary',
      title: 'Includes MCP Server',
    })
  }

  return badgeList
})

// Fetch metadata on mount
onMounted(() => {
  fetchPluginMetadata()
})

function openInstallModal() {
  isModalOpen.value = true
}

// Auto-open modal when autoOpenModal prop is true with automatic cleanup
const { start: startModalTimer, stop: stopModalTimer } = useTimeoutFn(() => {
  isModalOpen.value = true
}, 500)

watch(() => props.autoOpenModal, (shouldOpen) => {
  // Stop any existing timer
  stopModalTimer()

  if (shouldOpen) {
    // Start timer to open modal after scroll completes
    startModalTimer()
  }
}, { immediate: true })

// VueUse automatically cleans up on unmount, no need for manual cleanup!
</script>

<template>
  <UCard
    variant="outline"
    class="group hover:ring-2 hover:ring-primary transition-all duration-200 h-full flex flex-col"
  >
    <template #header>
      <div class="flex flex-col gap-2">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <UIcon
                name="i-heroicons-cube"
                class="text-primary shrink-0"
              />
              <h3 class="text-lg font-semibold truncate">
                {{ plugin.name }}
              </h3>
            </div>
            <div class="flex items-center gap-2 text-xs text-muted">
              <UIcon name="i-heroicons-code-bracket" class="shrink-0" />
              <span class="truncate">{{ typeof plugin.source === 'string' ? plugin.source : plugin.source.repo }}</span>
            </div>
          </div>
          <div class="shrink-0">
            <UBadge
              v-if="displayVersion"
              variant="soft"
              color="primary"
              size="sm"
            >
              v{{ displayVersion }}
            </UBadge>
            <UBadge
              v-else-if="loading"
              variant="soft"
              color="neutral"
              size="sm"
            >
              Loading...
            </UBadge>
          </div>
        </div>
        <div v-if="badges.length > 0" class="flex items-center gap-2">
          <UBadge
            v-for="badge in badges"
            :key="badge.key"
            variant="soft"
            :color="badge.color"
            size="sm"
            :title="badge.title"
          >
            <UIcon :name="badge.icon" class="mr-1" />
            {{ badge.label }}
          </UBadge>
        </div>
      </div>
    </template>

    <div class="flex-1">
      <p class="text-sm text-muted line-clamp-3 mb-3">
        {{ displayDescription }}
      </p>

      <!-- Metadata -->
      <div v-if="displayAuthor || displayLicense" class="flex flex-wrap gap-2 text-xs">
        <div v-if="displayAuthor && displayAuthor !== 'Anthropic' && displayAuthor !== 'Google'" class="flex items-center gap-1 text-muted">
          <UIcon name="i-heroicons-user-circle" class="shrink-0" />
          <span>{{ displayAuthor }}</span>
        </div>
        <div v-if="displayLicense" class="flex items-center gap-1 text-muted">
          <UIcon name="i-heroicons-scale" class="shrink-0" />
          <span>{{ displayLicense }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <UButton
          v-if="githubSourceUrl"
          :to="githubSourceUrl"
          target="_blank"
          external
          variant="outline"
          size="sm"
          icon="i-simple-icons-github"
          class="flex-1 justify-center"
        >
          View Source
        </UButton>

        <UButton
          variant="solid"
          color="primary"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          :class="githubSourceUrl ? 'flex-1 justify-center' : 'w-full justify-center'"
          title="View installation instructions"
          @click="openInstallModal"
        >
          Install
        </UButton>
      </div>
    </template>
  </UCard>

  <!-- Install Modal -->
  <InstallModal
    v-model:open="isModalOpen"
    :plugin-name="plugin.name"
    :marketplace-json-name="plugin.marketplaceJsonName"
    :marketplace-repo="plugin.marketplaceRepo"
  />
</template>
