# Plan: Web i18n Support

> Track: web-i18n-20260326
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: .please/docs/tracks/active/web-i18n-20260326/spec.md
- **Issue**: TBD
- **Created**: 2026-03-26
- **Approach**: Pragmatic

## Purpose

After this change, marketplace visitors will see the UI in their preferred language (English, Korean, Japanese, or Chinese). They can verify it works by visiting `/ko`, `/ja`, or `/zh` and seeing the full UI translated, or by using the language switcher in the header.

## Context

The Claude Code Plugin Marketplace (`apps/web/`) is a Nuxt 4 application with all UI strings hardcoded in English across 5 Vue files (~35 translatable strings). The site serves an international audience including Korean, Japanese, and Chinese developers. Adding i18n support using `@nuxtjs/i18n` — the standard Nuxt i18n module — enables locale-aware routing, browser language detection, and SEO-friendly hreflang tags. The site uses Vercel ISR with route rules that must be extended to cover locale-prefixed paths. Plugin names and descriptions come from marketplace API data and remain untranslated.

**Non-goals**: Translating plugin data from the API, translating Nuxt Content pages, RTL support.

## Architecture Decision

Using `@nuxtjs/i18n` with `prefix_except_default` routing strategy. English remains at `/` (no prefix) for backward compatibility, while `/ko`, `/ja`, `/zh` serve localized versions. Locale messages are stored as lazy-loaded JSON files under `apps/web/app/locales/`. Browser language detection uses the built-in `detectBrowserLanguage` feature with cookie persistence. A new `LanguageSwitcher.vue` component is placed in the hero section alongside the existing GitHub and color-mode buttons.

## Tasks

### Phase 1: Foundation

- [ ] T001 Install and configure @nuxtjs/i18n module (file: apps/web/nuxt.config.ts)
- [ ] T002 Create English locale file with all extracted UI strings (file: apps/web/app/locales/en.json)
- [ ] T003 [P] Create Korean locale file (file: apps/web/app/locales/ko.json) (depends on T002)
- [ ] T004 [P] Create Japanese locale file (file: apps/web/app/locales/ja.json) (depends on T002)
- [ ] T005 [P] Create Chinese locale file (file: apps/web/app/locales/zh.json) (depends on T002)

### Phase 2: Component Integration

- [ ] T006 Replace hardcoded strings in index.vue with $t() calls (file: apps/web/app/pages/index.vue) (depends on T001, T002)
- [ ] T007 [P] Replace hardcoded strings in PluginCard.vue (file: apps/web/app/components/PluginCard.vue) (depends on T001, T002)
- [ ] T008 [P] Replace hardcoded strings in PluginSearch.vue (file: apps/web/app/components/PluginSearch.vue) (depends on T001, T002)
- [ ] T009 [P] Replace hardcoded strings in InstallModal.vue (file: apps/web/app/components/InstallModal.vue) (depends on T001, T002)

### Phase 3: UX & SEO

- [ ] T010 Build LanguageSwitcher component (file: apps/web/app/components/LanguageSwitcher.vue) (depends on T001)
- [ ] T011 Integrate LanguageSwitcher into page layout (file: apps/web/app/pages/index.vue) (depends on T010, T006)
- [ ] T012 Update ISR route rules for locale-prefixed paths (file: apps/web/nuxt.config.ts) (depends on T001)
- [ ] T013 Add CJK font stack entries for Japanese and Chinese (file: apps/web/app/assets/css/main.css) (depends on T001)

## Key Files

### Create

- `apps/web/app/locales/en.json` — English locale messages
- `apps/web/app/locales/ko.json` — Korean locale messages
- `apps/web/app/locales/ja.json` — Japanese locale messages
- `apps/web/app/locales/zh.json` — Chinese locale messages
- `apps/web/app/components/LanguageSwitcher.vue` — Language switcher component

### Modify

- `apps/web/nuxt.config.ts` — Add i18n module config and ISR route rules
- `apps/web/package.json` — Add @nuxtjs/i18n dependency
- `apps/web/app/pages/index.vue` — Replace hardcoded strings, integrate switcher
- `apps/web/app/components/PluginCard.vue` — Replace hardcoded strings
- `apps/web/app/components/PluginSearch.vue` — Replace hardcoded strings
- `apps/web/app/components/InstallModal.vue` — Replace hardcoded strings
- `apps/web/app/assets/css/main.css` — Add CJK font families

### Reuse

- `apps/web/app/app.vue` — No changes needed (NuxtPage handles i18n routing)
- `apps/web/app/types/marketplace.ts` — No changes needed

## Verification

### Automated Tests

- [ ] i18n module loads without errors in Nuxt config
- [ ] All locale JSON files parse correctly and contain the same keys
- [ ] $t() calls return correct translations for each locale
- [ ] LanguageSwitcher renders locale options and triggers navigation

### Observable Outcomes

- After visiting `/ko`, all UI text appears in Korean
- After visiting `/ja`, all UI text appears in Japanese
- After visiting `/zh`, all UI text appears in Chinese
- After visiting `/` or `/en`, UI remains in English
- Running `bun run build` in `apps/web/` completes without errors

### Manual Testing

- [ ] Language switcher in header changes locale and URL
- [ ] Browser language detection redirects first-time visitors
- [ ] ISR cached pages serve correct locale content
- [ ] Plugin names/descriptions remain in original language across all locales

### Acceptance Criteria Check

- [ ] AC-1: `/ko` renders Korean UI
- [ ] AC-2: `/ja` renders Japanese UI
- [ ] AC-3: `/zh` renders Chinese UI
- [ ] AC-4: `/` renders English UI
- [ ] AC-5: Language switcher visible and functional
- [ ] AC-6: Browser language auto-detection works
- [ ] AC-7: All UI text translated (hero, search, filters, alerts, empty states, footer)

## Decision Log

- Decision: Use `prefix_except_default` strategy over `prefix`
  Rationale: Maintains backward compatibility — existing `/` URLs continue working as English without redirects
  Date/Author: 2026-03-26 / Claude
