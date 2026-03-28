---
name: detection-switching
description: Browser language detection, locale switching, cookie-based persistence, and locale fallback in Nuxt i18n
---

# Browser Detection & Locale Switching

## Browser Language Detection

Detects locale from `navigator` (client) or `accept-language` header (server). Matches configured `locales` codes; falls back to language prefix match.

**Recommended config:**

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: {
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root' // only detect on '/' — recommended for SEO
    }
  }
})
```

**Common configurations:**

```ts
// Disable cookie (redirect every visit)
detectBrowserLanguage: { useCookie: false }

// Disable entirely
detectBrowserLanguage: false

// Always redirect + persist in cookie
detectBrowserLanguage: { useCookie: true, alwaysRedirect: true }

// Cross-origin cookie (e.g., iFrame) — SameSite=None; Secure
detectBrowserLanguage: { useCookie: true, cookieCrossOrigin: true }
```

## Language Switcher

### Using `useSwitchLocalePath()` (navigation-based)

```vue
<script setup>
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const availableLocales = computed(() =>
  locales.value.filter(i => i.code !== locale.value)
)
</script>

<template>
  <NuxtLink
    v-for="loc in availableLocales"
    :key="loc.code"
    :to="switchLocalePath(loc.code)"
  >
    {{ loc.name }}
  </NuxtLink>
</template>
```

### Using `setLocale()` (programmatic)

```vue
<script setup>
const { locale, locales, setLocale } = useI18n()
</script>

<template>
  <button
    v-for="loc in locales"
    :key="loc.code"
    @click="setLocale(loc.code)"
  >
    {{ loc.name }}
  </button>
</template>
```

**Do not set `locale` directly** — use `setLocale()` or navigate via `switchLocalePath()` to properly load translations, trigger hooks, and update cookies.

## Page Transitions on Locale Switch

Set `skipSettingLocaleOnNavigate: true` and finalize in transition hook:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  i18n: { skipSettingLocaleOnNavigate: true }
})
```

```vue [app.vue]
<script setup>
const { finalizePendingLocaleChange } = useI18n()
const onBeforeEnter = async () => {
  await finalizePendingLocaleChange()
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage :transition="{ name: 'my', mode: 'out-in', onBeforeEnter }" />
  </NuxtLayout>
</template>
```

Smooth scroll with router options:

```ts [app/router.options.ts]
import type { RouterConfig } from '@nuxt/schema'
export default <RouterConfig>{
  async scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp()
    if (nuxtApp.$i18n && to.name !== from.name) {
      await nuxtApp.$i18n.waitForPendingLocaleChange()
    }
    return savedPosition || { top: 0 }
  }
}
```

## Locale Fallback

Configure in `i18n/i18n.config.ts` using Vue I18n's fallback system:

```ts [i18n/i18n.config.ts]
export default defineI18nConfig(() => ({
  fallbackLocale: {
    'de-CH': ['fr', 'it'],
    'zh-Hant': ['zh-Hans'],
    default: ['en']
  }
}))
```

<!--
Source references:
- https://i18n.nuxtjs.org/docs/guide/browser-language-detection
- https://i18n.nuxtjs.org/docs/guide/lang-switcher
- https://i18n.nuxtjs.org/docs/guide/locale-fallback
-->
