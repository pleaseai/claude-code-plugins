---
name: domains
description: Different domains and multi-domain locale setups with runtime env overrides in Nuxt i18n
---

# Domain-Based Locales

## Different Domains

Map each locale to its own domain:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    differentDomains: true,
    locales: [
      { code: 'en', domain: 'mydomain.com' },
      { code: 'es', domain: 'es.mydomain.com' },
      { code: 'fr', domain: 'fr.mydomain.com' }
    ]
  }
})
```

Use `<a>` tags (not `<NuxtLink>`) for cross-domain switching:

```vue
<template>
  <a v-for="loc in availableLocales" :href="switchLocalePath(loc.code)" :key="loc.code">
    {{ loc.code }}
  </a>
</template>
```

**Shared domains** — multiple languages on one domain with `domainDefault: true`:

```ts
locales: [
  { code: 'en', domain: 'mydomain.com', domainDefault: true },
  { code: 'pl', domain: 'mydomain.com' },
  { code: 'fr', domain: 'fr.mydomain.com', domainDefault: true }
]
```

**Runtime env overrides** (no rebuild needed):

```shell
NUXT_PUBLIC_I18N_DOMAIN_LOCALES_UK_DOMAIN=uk.example.test
NUXT_PUBLIC_I18N_DOMAIN_LOCALES_FR_DOMAIN=fr.example.test
```

**Caching** — use `cache.varies: ['host']` in route rules to prevent cross-domain cache pollution:

```ts [nuxt.config.ts]
routeRules: {
  '/': { swr: 60, cache: { varies: ['host'] } }
}
```

## Multi-Domain Locales

All locales available on all domains, with per-domain defaults:

```ts [nuxt.config.ts]
const i18nDomains = ['mydomain.com', 'es.mydomain.com', 'fr.mydomain.com']

export default defineNuxtConfig({
  i18n: {
    multiDomainLocales: true,
    locales: [
      { code: 'en', domains: i18nDomains, defaultForDomains: ['mydomain.com'] },
      { code: 'es', domains: i18nDomains, defaultForDomains: ['es.mydomain.com'] },
      { code: 'fr', domains: i18nDomains, defaultForDomains: ['fr.mydomain.com'] },
      { code: 'nl', domains: i18nDomains },
      { code: 'de', domains: i18nDomains }
    ]
  }
})
```

One locale can be default on multiple domains:

```ts
{ code: 'en', domains: i18nDomains, defaultForDomains: ['mydomain.com', 'en.mydomain.com'] }
```

<!--
Source references:
- https://i18n.nuxtjs.org/docs/guide/different-domains
- https://i18n.nuxtjs.org/docs/guide/multi-domain-locales
-->
