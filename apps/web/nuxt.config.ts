// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  nitro: {
    preset: 'vercel',
  },

  // ISR configuration for marketplace data
  // Page uses server-side data fetching (useAsyncData), so only page ISR is needed
  // Data is fetched on the server and included in the cached HTML
  routeRules: {
    '/': { isr: 3600 }, // Main page (English default): revalidate every 1 hour
    '/ko': { isr: 3600 }, // Korean locale
    '/ja': { isr: 3600 }, // Japanese locale
    '/zh': { isr: 3600 }, // Chinese locale
    '/api/marketplaces': { isr: 3600 }, // Keep API endpoint cached for direct API access if needed
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxtjs/i18n',
  ],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'ko', name: '한국어', file: 'ko.json' },
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'zh', name: '中文', file: 'zh.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    lazy: true,
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },
  css: ['~/assets/css/main.css'],
  eslint: {
    config: {
      standalone: false, // <---
    },
  },
  tailwindcss: {
    config: {
      safelist: [
        // Author badge colors
        'bg-amber-50',
        'bg-amber-100',
        'text-amber-600',
        'text-amber-700',
        'bg-orange-50',
        'bg-orange-100',
        'text-orange-600',
        'text-orange-700',
        'bg-purple-50',
        'bg-purple-100',
        'text-purple-600',
        'text-purple-700',
        'bg-blue-50',
        'bg-blue-100',
        'text-blue-600',
        'text-blue-700',
      ],
    },
  },
})
