---
name: configuration
description: Nuxt i18n module setup, locale configuration, Vue I18n config file, and key module options
---

# Configuration

## Basic Setup

Configure `locales` and `defaultLocale` in `nuxt.config.ts`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' }
    ]
  }
})
```

Translation files go in `<rootDir>/i18n/locales/` by default:

```json [i18n/locales/en.json]
{ "welcome": "Welcome" }
```

## Vue I18n Config File

Vue I18n-specific options (`fallbackWarn`, `missingWarn`, `numberFormats`, `datetimeFormats`, etc.) cannot go in `nuxt.config` — use a dedicated config file:

```ts [i18n/i18n.config.ts]
export default defineI18nConfig(() => ({
  fallbackLocale: 'en',
  numberFormats: {
    en: { currency: { style: 'currency', currency: 'USD' } },
    fr: { currency: { style: 'currency', currency: 'EUR' } }
  }
}))
```

Auto-resolved from `<rootDir>/i18n/i18n.config.{ts,js,mjs}`. Configurable via `vueI18n` option.

**Keep config in `nuxt.config` when possible** — Nuxt i18n uses it at build time for optimization. The Vue I18n config file loads at runtime on each request, increasing server response times.

## Key Module Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locales` | `string[] \| LocaleObject[]` | `[]` | Supported locales |
| `defaultLocale` | `string` | `null` | Default locale |
| `strategy` | `string` | `'prefix_except_default'` | Routing strategy |
| `baseUrl` | `string` | `''` | Base URL for SEO hreflang |
| `langDir` | `string` | `'locales'` | Translation files directory (relative to `i18n/`) |
| `detectBrowserLanguage` | `object \| false` | see docs | Browser language detection config |
| `customRoutes` | `'page' \| 'meta' \| 'config'` | `'page'` | Route customization method |
| `pages` | `object` | `{}` | Custom route paths (when `customRoutes: 'config'`) |
| `skipSettingLocaleOnNavigate` | `boolean` | `false` | Delay locale switch for transitions |
| `differentDomains` | `boolean` | `false` | Per-locale domain mapping |
| `multiDomainLocales` | `boolean` | `false` | All locales on all domains |

## LocaleObject Properties

| Property | Required | Description |
|----------|----------|-------------|
| `code` | yes | Locale identifier |
| `name` | no | Display name |
| `language` | no | BCP 47 language tag (for SEO) |
| `file` / `files` | no | Translation file(s) for lazy loading |
| `dir` | no | Text direction (`'ltr'` or `'rtl'`) |
| `domain` | no | Domain for `differentDomains` |
| `domains` | no | Domains array for `multiDomainLocales` |
| `isCatchallLocale` | no | Catchall for hreflang `x-default` |

## Auto Imports

`useI18n` is auto-imported. If `autoImports` is disabled:

```vue
<script setup>
import { useI18n, useLocalePath } from '#imports'
</script>
```

`autoDeclare` (default `true`) auto-imports `$t()`, `$rt()`, `$d()`, `$n()`, `$tm()`, `$te()` in `<script setup>`.

## Runtime Config

Override at runtime without rebuilding:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      i18n: {
        baseUrl: 'https://example.com' // env: NUXT_PUBLIC_I18N_BASE_URL
      }
    }
  }
})
```

<!--
Source references:
- https://i18n.nuxtjs.org/docs/getting-started/usage
- https://i18n.nuxtjs.org/docs/getting-started/vue-i18n-config
- https://i18n.nuxtjs.org/docs/api/options
-->
