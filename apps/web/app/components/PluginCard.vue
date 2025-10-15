<template>
  <UCard
    variant="outline"
    class="group hover:ring-2 hover:ring-primary transition-all duration-200 h-full flex flex-col"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1">
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
        <UBadge
          v-if="displayVersion"
          variant="soft"
          color="primary"
          size="sm"
          class="shrink-0"
        >
          v{{ displayVersion }}
        </UBadge>
        <UBadge
          v-else-if="loading"
          variant="soft"
          color="neutral"
          size="sm"
          class="shrink-0"
        >
          Loading...
        </UBadge>
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
          @click="copyInstallCommand"
          :variant="copied ? 'soft' : 'solid'"
          :color="copied ? 'green' : 'primary'"
          size="sm"
          :icon="copied ? 'i-heroicons-check-circle' : 'i-heroicons-clipboard-document'"
          class="flex-1 justify-center"
          :title="copied ? 'Copied to clipboard!' : 'Copy install command'"
        >
          {{ copied ? 'Copied!' : 'Install' }}
        </UButton>
      </div>
    </template>
  </UCard>
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
  source: PluginSource
}

interface PluginMetadata {
  version?: string
  description?: string
  author?: string
  license?: string
  [key: string]: any
}

const props = defineProps<{
  plugin: Plugin
}>()

const copied = ref(false)
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

// Computed author - from fetched metadata
const displayAuthor = computed(() => {
  return pluginMetadata.value?.author
})

// Computed license - from fetched metadata
const displayLicense = computed(() => {
  return pluginMetadata.value?.license
})

// Fetch metadata on mount
onMounted(() => {
  fetchPluginMetadata()
})

const copyInstallCommand = async () => {
  const command = `claude-code plugins install https://github.com/${props.plugin.source.repo}`

  try {
    await navigator.clipboard.writeText(command)
    copied.value = true

    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>
