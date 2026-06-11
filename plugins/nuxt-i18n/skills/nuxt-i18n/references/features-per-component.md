---
name: per-component
description: Per-component translations using i18n custom blocks in Vue SFCs
---

# Per-Component Translations

Use `<i18n>` custom blocks in Vue SFCs with `useScope: 'local'` for component-scoped translations.

## JSON Syntax

```vue [page.vue]
<script setup>
const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <p>{{ t('hello') }}</p>
</template>

<i18n lang="json">
{
  "en": { "hello": "hello world!" },
  "ja": { "hello": "こんにちは、世界!" }
}
</i18n>
```

## YAML Syntax

```vue [page.vue]
<script setup>
const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <p>{{ t('hello') }}</p>
</template>

<i18n lang="yaml">
en:
  hello: 'hello world!'
ja:
  hello: 'こんにちは、世界!'
</i18n>
```

## Important

**Must use `t()` from `useI18n()`, NOT `$t()`** — the `$t()` global function does not access local scope translations.

<!--
Source references:
- https://i18n.nuxtjs.org/docs/guide/per-component-translations
-->
