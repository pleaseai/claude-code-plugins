---
name: server-hooks
description: Server-side translations, runtime hooks, module integration, layers, and extending messages in Nuxt i18n
---

# Server-Side, Hooks & Module Integration

## Runtime Hooks

### `i18n:beforeLocaleSwitch`

Called before locale switch. Can override the new locale by modifying `options.newLocale`:

```ts [plugins/i18n.ts]
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('i18n:beforeLocaleSwitch', (options) => {
    console.log('switching from', options.oldLocale, 'to', options.newLocale)
    // Override: force redirect to 'en' instead of 'fr'
    if (options.newLocale === 'fr') {
      options.newLocale = 'en'
    }
  })
})
```

Parameters: `oldLocale`, `newLocale` (mutable), `initialSetup` (true on app load).

### `i18n:localeSwitched`

Called after locale switch completes:

```ts [plugins/i18n.ts]
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('i18n:localeSwitched', ({ oldLocale, newLocale }) => {
    console.log('switched from', oldLocale, 'to', newLocale)
  })
})
```

## Server-Side Translations (Experimental)

### Locale Detector

```ts [i18n/localeDetector.ts]
export default defineI18nLocaleDetector((event, config) => {
  const query = tryQueryLocale(event, { lang: '' })
  if (query) return query.toString()

  const cookie = tryCookieLocale(event, { lang: '', name: 'i18n_locale' })
  if (cookie) return cookie.toString()

  const header = tryHeaderLocale(event, { lang: '' })
  if (header) return header.toString()

  return config.defaultLocale
})
```

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    experimental: { localeDetector: 'localeDetector.ts' }
  }
})
```

### `useTranslation()` in Event Handlers

```ts [server/api/hello.ts]
export default defineEventHandler(async (event) => {
  const t = await useTranslation(event)
  return { hello: t('hello') }
})
```

## Extending Messages (Module Authors)

Use `i18n:registerModule` hook to provide translations from a Nuxt module:

```ts [my-module/module.ts]
import { createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    nuxt.hook('i18n:registerModule', (register) => {
      register({
        langDir: resolve('./lang'),
        locales: [
          { code: 'en', file: 'en.json' },
          { code: 'fr', file: 'fr.json' }
        ]
      })
    })
  }
})
```

**Prefix module messages** — main project messages always override module-provided ones.

## Module Integration

Declare dependency on Nuxt i18n with `moduleDependencies`:

```ts [my-module/module.ts]
import { createResolver, defineNuxtModule } from '@nuxt/kit'
const resolver = createResolver(import.meta.url)

export default defineNuxtModule({
  moduleDependencies: {
    '@nuxtjs/i18n': {
      defaults: {
        vueI18n: resolver.resolve('./i18n.config.ts'),
        langDir: resolver.resolve('./lang'),
        locales: [
          { code: 'en', file: resolver.resolve('./lang/en.json') },
          { code: 'fr', file: resolver.resolve('./lang/fr.json') }
        ]
      }
    }
  }
})
```

## Layers

Nuxt i18n merges i18n configuration from all extended layers. Earlier items in `_layers` have higher priority (user project is always first).

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['my-layer'],
  i18n: {
    locales: [{ code: 'en', file: 'en.json' }] // overrides layer's 'en' translations
  }
})
```

Pages from extended layers automatically get i18n support. Route configs from each layer merge according to priority.

<!--
Source references:
- https://i18n.nuxtjs.org/docs/guide/runtime-hooks
- https://i18n.nuxtjs.org/docs/guide/server-side-translations
- https://i18n.nuxtjs.org/docs/guide/extending-messages
- https://i18n.nuxtjs.org/docs/guide/module-integration
- https://i18n.nuxtjs.org/docs/guide/layers
-->
