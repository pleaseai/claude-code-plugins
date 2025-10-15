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
          v-if="plugin.version"
          variant="soft"
          color="primary"
          size="sm"
          class="shrink-0"
        >
          v{{ plugin.version }}
        </UBadge>
      </div>
    </template>

    <div class="flex-1">
      <p class="text-sm text-muted line-clamp-3">
        {{ plugin.description }}
      </p>
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

const props = defineProps<{
  plugin: Plugin
}>()

const copied = ref(false)

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
