<script setup lang="ts">
interface Props {
  pluginName: string
  open?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

const marketplaceCommand = '/plugin marketplace add pleaseai/claude-code-plugins'
const installCommand = computed(() => `/plugin install ${props.pluginName}@pleaseai`)

const copiedStates = reactive({
  marketplace: false,
  install: false,
  all: false,
})

// Check if clipboard API is supported
const isClipboardSupported = computed(() => {
  return typeof navigator !== 'undefined'
    && 'clipboard' in navigator
    && typeof navigator.clipboard?.writeText === 'function'
})

async function copyCommand(command: string, type: keyof typeof copiedStates) {
  try {
    // Check if clipboard API is available
    if (!isClipboardSupported.value) {
      throw new Error('Clipboard API not available')
    }

    await navigator.clipboard.writeText(command)
    copiedStates[type] = true

    setTimeout(() => {
      copiedStates[type] = false
    }, 2000)
  }
  catch (err) {
    // Log error with full context for debugging
    console.error('Failed to copy command to clipboard:', {
      command,
      type,
      error: err instanceof Error ? err.message : String(err),
      clipboardAvailable: isClipboardSupported.value,
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    })

    // Show user-facing error notification
    const toast = useToast()
    toast.add({
      title: 'Copy Failed',
      description: 'Could not copy to clipboard. Please copy the command manually.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    })

    // DO NOT set success state on failure
    copiedStates[type] = false
  }
}

async function copyAllCommands() {
  const allCommands = `${marketplaceCommand}\n${installCommand.value}`

  try {
    // Check if clipboard API is available
    if (!isClipboardSupported.value) {
      throw new Error('Clipboard API not available')
    }

    await navigator.clipboard.writeText(allCommands)
    copiedStates.all = true

    setTimeout(() => {
      copiedStates.all = false
    }, 2000)
  }
  catch (err) {
    // Log error with full context for debugging
    console.error('Failed to copy all commands to clipboard:', {
      marketplaceCommand,
      installCommand: installCommand.value,
      error: err instanceof Error ? err.message : String(err),
      clipboardAvailable: isClipboardSupported.value,
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    })

    // Show user-facing error notification
    const toast = useToast()
    toast.add({
      title: 'Copy Failed',
      description: 'Could not copy commands to clipboard. Please copy them manually from above.',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
    })

    // DO NOT set success state on failure
    copiedStates.all = false
  }
}

// Reset copied states when modal is closed
watch(isOpen, (newValue) => {
  if (!newValue) {
    copiedStates.marketplace = false
    copiedStates.install = false
    copiedStates.all = false
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Installation Instructions"
    description="Run these two commands in order"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Clipboard Not Supported Warning -->
        <UAlert
          v-if="!isClipboardSupported"
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          title="Clipboard Not Available"
          description="Your browser doesn't support automatic copying. Please copy the commands manually using Ctrl+C (Cmd+C on Mac)."
        />

        <!-- Step 1: Add Marketplace -->
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm font-medium">
            <UBadge color="primary" variant="soft" size="sm">
              1
            </UBadge>
            <span>Add Marketplace</span>
          </div>
          <div class="relative">
            <pre class="bg-default border border-default rounded-lg p-3 text-sm overflow-x-auto"><code>{{ marketplaceCommand }}</code></pre>
            <UButton
              :variant="copiedStates.marketplace ? 'soft' : 'ghost'"
              :color="copiedStates.marketplace ? 'success' : 'neutral'"
              size="xs"
              :icon="copiedStates.marketplace ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
              class="absolute top-2 right-2"
              :title="copiedStates.marketplace ? 'Copied!' : 'Copy command'"
              @click="copyCommand(marketplaceCommand, 'marketplace')"
            />
          </div>
        </div>

        <!-- Step 2: Install Plugin -->
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm font-medium">
            <UBadge color="primary" variant="soft" size="sm">
              2
            </UBadge>
            <span>Install Plugin</span>
          </div>
          <div class="relative">
            <pre class="bg-default border border-default rounded-lg p-3 text-sm overflow-x-auto"><code>{{ installCommand }}</code></pre>
            <UButton
              :variant="copiedStates.install ? 'soft' : 'ghost'"
              :color="copiedStates.install ? 'success' : 'neutral'"
              size="xs"
              :icon="copiedStates.install ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
              class="absolute top-2 right-2"
              :title="copiedStates.install ? 'Copied!' : 'Copy command'"
              @click="copyCommand(installCommand, 'install')"
            />
          </div>
        </div>

        <!-- Copy All Button -->
        <div class="pt-2 border-t border-default">
          <UButton
            :variant="copiedStates.all ? 'soft' : 'outline'"
            :color="copiedStates.all ? 'success' : 'primary'"
            block
            :icon="copiedStates.all ? 'i-heroicons-check-circle' : 'i-heroicons-clipboard-document-list'"
            @click="copyAllCommands"
          >
            {{ copiedStates.all ? 'All Commands Copied!' : 'Copy All Commands' }}
          </UButton>
        </div>

        <!-- Manual Copy Tip -->
        <div class="text-sm text-muted flex items-start gap-2">
          <UIcon name="i-heroicons-information-circle" class="shrink-0 mt-0.5" />
          <span>Tip: You can also select and copy the commands manually (Ctrl+C / Cmd+C)</span>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end">
        <UButton
          label="Close"
          color="neutral"
          variant="outline"
          @click="close"
        />
      </div>
    </template>
  </UModal>
</template>
