---
name: api-reference
description: Nuxt i18n composables, components, helper functions, and instance properties API reference
---

# API Reference

## Components

### `<NuxtLinkLocale>`

Built on `<NuxtLink>`, internally uses `localePath()`:

```vue
<template>
  <NuxtLinkLocale to="/">{{ $t('home') }}</NuxtLinkLocale>
  <NuxtLinkLocale to="/" locale="nl">{{ $t('home') }}</NuxtLinkLocale>
</template>
```

Prop `locale` (optional) — forces localization to specified locale.

### `<SwitchLocalePathLink>`

Internally uses `switchLocalePath()`. Recommended for language switchers — correctly handles dynamic route params during SSR. Does **not** accept `to` or `href` props.

```vue
<template>
  <SwitchLocalePathLink locale="nl">Dutch</SwitchLocalePathLink>
  <SwitchLocalePathLink locale="en">English</SwitchLocalePathLink>
</template>
```

## Composables

### `useLocalePath()`

Resolve a path for the current locale:

```ts
const localePath = useLocalePath()
localePath('index')           // '/' or '/en'
localePath('about', 'fr')     // '/fr/about'
localePath({ name: 'slug', params: { slug: 'hello' } })
```

### `useLocaleRoute()`

Like `useLocalePath` but returns a full `Route` object:

```ts
const localeRoute = useLocaleRoute()
const route = localeRoute('blog', 'fr')
if (route) navigateTo(route.fullPath)
```

### `useSwitchLocalePath()`

Get path of current page in another locale:

```ts
const switchLocalePath = useSwitchLocalePath()
switchLocalePath('en') // '/en/current-page'
switchLocalePath('fr') // '/fr/current-page'
```

### `useLocaleHead(options?)`

Returns localized head properties (`lang`, `dir`, `hreflang`, `og:locale`, canonical):

```ts
const head = useLocaleHead({
  seo: { canonicalQueries: ['foo'] }
})
// head.value: { htmlAttrs, link, meta }
```

Options: `dir` (boolean), `lang` (boolean), `seo` (boolean | `{ canonicalQueries }`)

### `useSetI18nParams()`

Set translated dynamic route params per locale:

```ts
const setI18nParams = useSetI18nParams()
setI18nParams({
  en: { slug: 'red-mug' },
  nl: { slug: 'rode-mok' }
})
```

### `useRouteBaseName()`

Get route's base name without locale suffix:

```ts
const routeBaseName = useRouteBaseName()
routeBaseName(route) // 'index' instead of 'index___en'
```

### `useBrowserLocale()`

Returns browser locale (`navigator.languages` client-side, `accept-language` server-side):

```ts
const browserLocale = useBrowserLocale() // 'en-US' | null
```

### `useCookieLocale()`

Returns stored cookie locale:

```ts
const cookieLocale = useCookieLocale() // Ref<string>
```

### `useTranslation(event)` (experimental, server-only)

Translation function for server event handlers:

```ts
const t = await useTranslation(event)
t('hello')
```

## Helper Functions

### `defineI18nConfig()`

Define Vue I18n configuration:

```ts [i18n/i18n.config.ts]
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: { en: { welcome: 'Welcome' } }
}))
```

### `defineI18nLocale()`

Dynamic locale message loader for lazy loading:

```ts [i18n/locales/en.ts]
export default defineI18nLocale((locale) => {
  return $fetch(`/api/${locale}`)
})
```

### `defineI18nLocaleDetector()` (experimental)

Server-side locale detector:

```ts [i18n/localeDetector.ts]
export default defineI18nLocaleDetector((event, config) => {
  return tryCookieLocale(event, { lang: '', name: 'i18n_locale' })?.toString()
    || config.defaultLocale
})
```

## Instance Properties (`$i18n`)

| Method/Property | Description |
|----------------|-------------|
| `setLocale(locale)` | Switch locale (loads translations, navigates, updates cookie) |
| `loadLocaleMessages(locale)` | Load messages for a locale without switching |
| `getLocaleCookie()` | Get stored locale cookie value |
| `setLocaleCookie(locale)` | Update locale cookie |
| `getBrowserLocale()` | Get browser locale |
| `finalizePendingLocaleChange()` | Complete pending locale switch (for transitions) |
| `waitForPendingLocaleChange()` | Wait for pending locale switch |
| `strategy` | Current routing strategy |
| `defaultLocale` | Default locale |
| `localeCodes` | All locale codes |
| `locales` | All locale objects |

## Global Functions (`NuxtApp`)

| Function | Description |
|----------|-------------|
| `$localePath(route, locale?)` | Localized path |
| `$switchLocalePath(locale)` | Current page in another locale |
| `$localeRoute(route, locale?)` | Localized route object |
| `$routeBaseName(route)` | Base route name |
| `$localeHead(options)` | i18n head meta |

<!--
Source references:
- https://i18n.nuxtjs.org/docs/api/components
- https://i18n.nuxtjs.org/docs/api/composables
- https://i18n.nuxtjs.org/docs/api/vue-i18n
- https://i18n.nuxtjs.org/docs/api/nuxt
-->
