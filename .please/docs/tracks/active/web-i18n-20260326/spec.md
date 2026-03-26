# Web i18n Support

> Track: web-i18n-20260326

## Overview

Add internationalization (i18n) support to the Claude Code Plugin Marketplace web application (`apps/web/`). The site currently has all UI strings hardcoded in English. This feature will enable multi-language support using `@nuxtjs/i18n` with prefix-based URL routing.

## Requirements

### Functional Requirements

- [ ] FR-1: Integrate `@nuxtjs/i18n` module into the Nuxt 4 web application
- [ ] FR-2: Support 4 locales — English (en, default), Korean (ko), Japanese (ja), Chinese Simplified (zh)
- [ ] FR-3: Use prefix routing strategy (e.g., `/ko`, `/ja`, `/zh`; `/` or `/en` for English)
- [ ] FR-4: Extract all hardcoded UI strings from Vue components into locale message files
- [ ] FR-5: Provide a language switcher component in the site header for users to change locale
- [ ] FR-6: Detect browser language preference and redirect to the appropriate locale on first visit

### Non-functional Requirements

- [ ] NFR-1: Locale message files should use JSON format organized by locale (`locales/en.json`, `locales/ko.json`, etc.)
- [ ] NFR-2: No impact on ISR/SSR performance — locale switching must work with current Vercel ISR configuration
- [ ] NFR-3: Maintain existing SEO quality — `hreflang` tags should be auto-generated for all supported locales

## Acceptance Criteria

- [ ] AC-1: Visiting `/ko` renders the marketplace UI in Korean
- [ ] AC-2: Visiting `/ja` renders the marketplace UI in Japanese
- [ ] AC-3: Visiting `/zh` renders the marketplace UI in Chinese
- [ ] AC-4: Visiting `/` or `/en` renders the marketplace UI in English (same as current behavior)
- [ ] AC-5: Language switcher is visible and functional in the site header
- [ ] AC-6: Browser language auto-detection redirects new visitors to their preferred locale
- [ ] AC-7: All existing UI text (hero section, search, filters, alerts, empty states, footer) is translated

## Out of Scope

- Plugin names and descriptions (sourced from marketplace data) are NOT translated
- SEO meta tag translation per locale
- Right-to-left (RTL) language support
- Content pages managed by Nuxt Content

## Assumptions

- `@nuxtjs/i18n` is compatible with Nuxt 4 and Nuxt UI v4
- Translation strings will be provided by the development team (machine translation acceptable for initial implementation)
- The number of UI strings is small (~30-50 keys) given the single-page marketplace layout
