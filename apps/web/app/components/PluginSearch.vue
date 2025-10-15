<script setup lang="ts">
defineProps<{
  filteredCount: number
}>()

const searchQuery = defineModel<string>({ default: '' })
</script>

<template>
  <div class="w-full">
    <div class="relative">
      <UInput
        v-model="searchQuery"
        placeholder="Search by name, description, or repository..."
        icon="i-heroicons-magnifying-glass"
        size="xl"
        class="w-full"
        :ui="{ icon: { trailing: { pointer: '' } } }"
      >
        <template #trailing>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="filteredCount !== undefined"
              :color="searchQuery ? 'primary' : 'neutral'"
              variant="soft"
              size="sm"
            >
              {{ filteredCount }} {{ filteredCount === 1 ? 'result' : 'results' }}
            </UBadge>
            <UButton
              v-if="searchQuery"
              variant="ghost"
              size="xs"
              icon="i-heroicons-x-mark"
              aria-label="Clear search"
              @click="searchQuery = ''"
            />
          </div>
        </template>
      </UInput>
    </div>

    <div v-if="searchQuery" class="mt-2 text-xs text-muted flex items-center gap-1">
      <UIcon name="i-heroicons-funnel" />
      <span>Filtering by: <span class="font-semibold">{{ searchQuery }}</span></span>
    </div>
  </div>
</template>
