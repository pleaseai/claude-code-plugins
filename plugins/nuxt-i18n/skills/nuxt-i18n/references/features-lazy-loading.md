---
name: lazy-loading
description: Lazy-loaded translations, multiple file merging, dynamic API loading, and caching in Nuxt i18n
---

# Lazy Loading Translations

Configure `locales` with `file` or `files` keys. Files go in `i18n/locales/` by default.

## Basic Usage

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'es', file: 'es.js' },
      { code: 'fr', file: 'fr.ts' }
    ],
    defaultLocale: 'en'
  }
})
```

TypeScript/JavaScript files can export directly or use `defineI18nLocale`:

```ts [i18n/locales/fr.ts]
export default defineI18nLocale(async (locale) => {
  return { welcome: 'Bienvenue' }
})
```

## Dynamic Loading from API

```ts [i18n/locales/dynamic.ts]
export default defineI18nLocale((locale) => {
  return $fetch(`/api/${locale}`)
})
```

## Multiple Files (Dialect/Regional Variants)

Files are loaded in order and merged — later files override earlier ones:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    locales: [
      {
        code: 'es-AR',
        name: 'Español (Argentina)',
        files: ['es.json', 'es-AR.json'] // es.json loaded first, es-AR.json merges on top
      },
      {
        code: 'es-UY',
        name: 'Español (Uruguay)',
        files: ['es.json', 'es-UY.json']
      }
    ]
  }
})
```

## Per-File Cache Control

```ts [nuxt.config.ts]
i18n: {
  locales: [
    {
      code: 'es-AR',
      files: [
        { path: 'es.js', cache: false },
        { path: 'es-AR.js', cache: false }
      ]
    }
  ]
}
```

## Loading Non-Current Locale Messages

```vue
<script setup>
const { loadLocaleMessages, t } = useI18n()
await loadLocaleMessages('nl')

const welcome = computed(() => t('welcome'))
const welcomeDutch = computed(() => t('welcome', 1, { locale: 'nl' }))
</script>
```

<!--
Source references:
- https://i18n.nuxtjs.org/docs/guide/lazy-load-translations
-->
