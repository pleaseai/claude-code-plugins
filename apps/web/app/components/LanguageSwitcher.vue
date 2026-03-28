<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => {
  return locales.value.map(l => ({
    label: typeof l === 'string' ? l : l.name || l.code,
    value: typeof l === 'string' ? l : l.code,
  }))
})

function onLocaleChange(code: string) {
  const path = switchLocalePath(code)
  if (path) {
    navigateTo(path)
  }
}
</script>

<template>
  <USelectMenu
    :model-value="locale"
    :items="availableLocales"
    value-key="value"
    icon="i-heroicons-language"
    variant="ghost"
    color="neutral"
    class="w-28"
    @update:model-value="onLocaleChange"
  />
</template>
