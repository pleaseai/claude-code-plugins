// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-03-28',
  devtools: { enabled: true },

  nitro: {
    preset: 'vercel',
  },

  // CDN caching via Cache-Control headers
  // Uses s-maxage + stale-while-revalidate instead of ISR to avoid nitropack Vercel preset symlink bug
  // See: https://vercel.com/docs/edge-network/caching
  routeRules: {
    '/': { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
    '/api/marketplaces': { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
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
