# Plan: Web App Dependency Update

> Track: web-nuxt-update-20260328
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: spec.md
- **Issue**: #126
- **Created**: 2026-03-28
- **Approach**: Incremental — minor/patch updates first, then major bumps with migration

## Purpose

After this change, the marketplace web app will run on the latest Nuxt 4.4, Nuxt UI 4.6, and TypeScript 6.0 with all dependencies current. Developers can verify it works by running `bun run build` and `bun run dev` successfully.

## Context

The `apps/web/` marketplace frontend has 10 outdated packages spanning core framework (Nuxt, Nuxt UI, Nuxt Content), Vue ecosystem (vue, vue-router), dev tools (eslint, better-sqlite3), and two major version bumps (@nuxt/test-utils 3→4, TypeScript 5.9→6.0). The app consists of 4 Vue components, 1 API route, and server utilities — relatively small surface area. No test files currently exist, so @nuxt/test-utils migration is low-risk. TypeScript 6.0 changes default values for `strict`, `types`, and `module` which may require tsconfig adjustments.

### Non-goals
- Adding new features or pages
- Refactoring beyond what breaking changes require
- Updating monorepo root dependencies

## Architecture Decision

- Decision: Incremental update — safe minor/patch updates first, then major bumps separately
- Rationale: Isolates breakage. Minor updates (Nuxt, Nuxt UI, Content, Vue) are low-risk and can be batched. Major bumps (TypeScript 6.0, test-utils 4.0) have significant breaking changes and need individual attention.
- Date/Author: 2026-03-28 / Claude

## Tasks

- [ ] T001 Update minor/patch dependencies — nuxt, @nuxt/ui, @nuxt/content, vue, vue-router, eslint, better-sqlite3 (file: apps/web/package.json)
- [ ] T002 Apply Nuxt UI 4.x migration fixes — check for UTable @select arg order, CommandPalette trailing-icon rename, exposed ref changes (depends on T001)
- [ ] T003 Apply Nuxt 4.4 migration fixes — update createError calls (statusCode→status), update compatibilityDate in nuxt.config.ts (depends on T001)
- [ ] T004 [P] Upgrade TypeScript to 6.0 — update tsconfig.json for new defaults (types, strict, moduleResolution), run ts5to6 migration tool (file: apps/web/tsconfig.json, depends on T001)
- [ ] T005 [P] Upgrade @nuxt/test-utils to 4.0 (file: apps/web/package.json, depends on T001)
- [ ] T006 Verify build and dev server — run bun run build and bun run dev, fix any remaining issues (depends on T002, T003, T004, T005)

## Key Files

### Modify
- `apps/web/package.json` — dependency versions
- `apps/web/nuxt.config.ts` — compatibilityDate update
- `apps/web/tsconfig.json` — TypeScript 6.0 adjustments

### Reuse (check for breaking changes)
- `apps/web/app/pages/index.vue` — main page
- `apps/web/app/components/PluginCard.vue` — Nuxt UI components
- `apps/web/app/components/PluginSearch.vue` — USelectMenu, UInput usage
- `apps/web/app/components/InstallModal.vue` — UModal usage
- `apps/web/server/api/marketplaces.get.ts` — createError usage check
- `apps/web/server/utils/github.ts` — createError usage check

## Verification

### Automated Tests
- [ ] `bun run build` completes without errors
- [ ] TypeScript compilation has no type errors

### Observable Outcomes
- Running `bun run dev` starts the dev server and pages render correctly
- Running `bun outdated` in apps/web/ shows no outdated packages

### Manual Testing
- [ ] Homepage loads and displays plugin cards
- [ ] Plugin search and filtering works
- [ ] Install modal opens and displays correctly
- [ ] Dark/light mode toggle works

## Decision Log

- Decision: Incremental update approach
  Rationale: Isolates breakage sources; minor updates are safe to batch
  Date/Author: 2026-03-28 / Claude
