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
              <span class="truncate">{{ plugin.source.repo }}</span>
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
        <div v-if="hasContext || hasMcpServer || authorName" class="flex items-center gap-2">
          <UBadge
            v-if="authorName === 'Google'"
            variant="soft"
            color="warning"
            size="sm"
            title="Developed by Google"
          >
            <UIcon name="i-simple-icons-google" class="mr-1" />
            Google
          </UBadge>
          <UBadge
            v-if="authorName === 'Anthropic'"
            variant="soft"
            color="error"
            size="sm"
            title="Developed by Anthropic"
          >
            <UIcon name="i-simple-icons-anthropic" class="mr-1" />
            Anthropic
          </UBadge>
          <UBadge
            v-if="hasContext"
            variant="soft"
            color="info"
            size="sm"
            title="Includes Context File"
          >
            <UIcon name="i-heroicons-document-text" class="mr-1" />
            Context
          </UBadge>
          <UBadge
            v-if="hasMcpServer"
            variant="soft"
            color="primary"
            size="sm"
            title="Includes MCP Server"
          >
            <UIcon name="i-heroicons-server" class="mr-1" />
            MCP
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
        <div v-if="displayAuthor" class="flex items-center gap-1 text-muted">
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
          :to="`https://github.com/${plugin.source.repo}`"
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
          @click="openInstallModal"
          variant="solid"
          color="primary"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          class="flex-1 justify-center"
          title="View installation instructions"
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
  />
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

interface PluginMetadata {
  version?: string
  description?: string
  author?: string
  license?: string
  mcpServers?: Record<string, any>
  contextFileName?: string
  [key: string]: any
}

const props = defineProps<{
  plugin: Plugin
}>()

const isModalOpen = ref(false)
const pluginMetadata = ref<PluginMetadata | null>(null)
const loading = ref(false)

// Fetch plugin metadata from GitHub
const fetchPluginMetadata = async () => {
  if (props.plugin.version) {
    // If version already exists in marketplace.json, don't fetch
    return
  }

  loading.value = true
  try {
    const url = `https://raw.githubusercontent.com/${props.plugin.source.repo}/main/.claude-plugin/plugin.json`
    const response = await fetch(url)

    if (response.ok) {
      pluginMetadata.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch plugin metadata:', err)
  } finally {
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

// Computed author - prefer marketplace.json, fallback to metadata
const displayAuthor = computed(() => {
  const author = props.plugin.author || pluginMetadata.value?.author
  // Handle both string and object formats
  return typeof author === 'string' ? author : author?.name
})

// Get author name for badge display
const authorName = computed(() => {
  const author = props.plugin.author || pluginMetadata.value?.author
  return typeof author === 'string' ? author : author?.name
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

// Fetch metadata on mount
onMounted(() => {
  fetchPluginMetadata()
})

const openInstallModal = () => {
  isModalOpen.value = true
}
</script>
