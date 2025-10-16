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
    '/': { isr: 3600 }, // Main page with embedded data: revalidate every 1 hour
    '/api/marketplaces': { isr: 3600 }, // Keep API endpoint cached for direct API access if needed
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/eslint',

  ],
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
