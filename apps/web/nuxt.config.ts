// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  nitro: {
    preset: 'vercel',
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
