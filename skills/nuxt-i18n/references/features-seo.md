---
name: seo
description: Nuxt i18n SEO metadata, hreflang alternate links, canonical URLs, and OpenGraph locale tags
---

# SEO

Nuxt i18n provides `useLocaleHead()` for generating SEO metadata: `lang` attribute, `hreflang` alternates, OpenGraph locale tags, and canonical links.

## Prerequisites

Configure `locales` with `language` (BCP 47) and set `baseUrl`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    baseUrl: 'https://my-nuxt-app.com',
    locales: [
      { code: 'en', language: 'en-US' },
      { code: 'es', language: 'es-ES' },
      { code: 'fr', language: 'fr-FR' }
    ]
  }
})
```

## Setup with Meta Components

```vue [layouts/default.vue]
<script setup>
const route = useRoute()
const { t } = useI18n()
const head = useLocaleHead()
const title = computed(() => t(route.meta.title ?? 'TBD', t('layouts.title')))
</script>

<template>
  <Html :lang="head.htmlAttrs.lang" :dir="head.htmlAttrs.dir">
    <Head>
      <Title>{{ title }}</Title>
      <template v-for="link in head.link" :key="link.key">
        <Link :id="link.key" :rel="link.rel" :href="link.href" :hreflang="link.hreflang" />
      </template>
      <template v-for="meta in head.meta" :key="meta.key">
        <Meta :id="meta.key" :property="meta.property" :content="meta.content" />
      </template>
    </Head>
    <Body>
      <slot />
    </Body>
  </Html>
</template>
```

## Setup with useHead

```vue [layouts/default.vue]
<script setup>
const i18nHead = useLocaleHead({ seo: { canonicalQueries: ['foo'] } })
useHead(() => ({
  htmlAttrs: { lang: i18nHead.value.htmlAttrs!.lang },
  link: [...(i18nHead.value.link || [])],
  meta: [...(i18nHead.value.meta || [])]
}))
</script>
```

## Key Behaviors

- **hreflang**: Set `isCatchallLocale: true` on a locale to use it as `x-default` for a language group
- **Canonical with query params**: `useLocaleHead({ seo: { canonicalQueries: ['foo'] } })` preserves specified query params in canonical
- **`prefix_and_default`**: Generates canonical pointing to unprefixed version to avoid duplicate indexation
- **Strict SEO mode** (`experimental.strictSeo`): Manages i18n head tags automatically — `useLocaleHead()` becomes unnecessary and will throw if used

<!--
Source references:
- https://i18n.nuxtjs.org/docs/guide/seo
-->
