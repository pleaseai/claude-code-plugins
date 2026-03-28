---
name: routing
description: Nuxt i18n routing strategies, custom route paths, dynamic route params, and ignoring localized routes
---

# Routing

## Strategies

Four routing strategies control how locale prefixes appear in URLs:

| Strategy | Description | Example (default: en) |
|----------|-------------|----------------------|
| `no_prefix` | No locale prefix. Detection via browser/cookie only | `/about` |
| `prefix_except_default` | All prefixed except default locale | `/about`, `/fr/about` |
| `prefix` | All locales prefixed | `/en/about`, `/fr/about` |
| `prefix_and_default` | All prefixed + unprefixed default | `/about`, `/en/about`, `/fr/about` |

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'en'
  }
})
```

**`no_prefix` limitations:** Does not support Custom paths or Ignore routes (unless using `differentDomains`).

Generated route naming convention: `{routeName}___{locale}` (e.g., `about___fr`).

## Custom Route Paths

Two methods — not supported with `no_prefix` unless using `differentDomains`.

### Module config (`customRoutes: 'config'`)

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    customRoutes: 'config',
    pages: {
      about: {
        en: '/about-us',
        fr: '/a-propos',
        es: '/sobre'
      },
      'services-development': {
        fr: '/offres/developement'
      },
      'blog-date-slug': {
        ja: '/blog/tech/[date]/[slug]'
      }
    }
  }
})
```

### Page component (`customRoutes: 'meta'`)

```vue [pages/about.vue]
<script setup>
definePageMeta({
  i18n: {
    paths: {
      en: '/about-us',
      fr: '/a-propos'
    }
  }
})
</script>
```

Always use **named routes** with `localePath()` when custom paths are configured:

```vue
<template>
  <NuxtLinkLocale to="about">{{ t('about') }}</NuxtLinkLocale>
</template>
```

## Dynamic Route Parameters

Use `useSetI18nParams` to set translated params per locale:

```vue
<script setup>
const setI18nParams = useSetI18nParams()
setI18nParams({
  en: { slug: data.slugs.en }, // 'red-mug'
  nl: { slug: data.slugs.nl }  // 'rode-mok'
})

const switchLocalePath = useSwitchLocalePath()
switchLocalePath('en') // /products/red-mug
switchLocalePath('nl') // /nl/products/rode-mok
</script>
```

Catch-all routes use arrays:

```vue
<script setup>
setI18nParams({
  en: { pathMatch: ['not-found-my-post'] },
  fr: { pathMatch: ['not-found-mon-article'] }
})
</script>
```

## Ignoring Localized Routes

### Restrict to specific locales

```vue [pages/about.vue]
<script setup>
definePageMeta({
  i18n: { locales: ['fr', 'es'] }
})
</script>
```

Or via config:

```ts [nuxt.config.ts]
i18n: {
  pages: {
    about: { en: false } // disable English for this route
  }
}
```

### Disable localization entirely

```vue [pages/admin.vue]
<script setup>
definePageMeta({ i18n: false })
</script>
```

Or via config:

```ts [nuxt.config.ts]
i18n: {
  customRoutes: 'config',
  pages: { about: false }
}
```

<!--
Source references:
- https://i18n.nuxtjs.org/docs/guide/routing-strategies
- https://i18n.nuxtjs.org/docs/guide/custom-route-paths
- https://i18n.nuxtjs.org/docs/guide/ignoring-localized-routes
-->
