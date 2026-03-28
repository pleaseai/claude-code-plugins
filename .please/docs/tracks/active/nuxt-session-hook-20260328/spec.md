# Plugin Recommender

> Track: nuxt-session-hook-20260328

## Overview

Create a standalone `plugin-recommender` plugin that detects npm packages in the user's `package.json` and recommends installing corresponding marketplace plugins from `pleaseai`. Two hooks work together:

1. **SessionStart hook** (`async: true`): Scans `package.json` at session start in the background
2. **PostToolUse hook**: Triggers after `bun add`, `npm install/add`, `pnpm add/install` commands to recommend plugins for newly installed packages

Both hooks output `systemMessage` (user-facing install recommendations) and `additionalContext` (Claude-facing context about available plugins).

## Requirements

### Functional Requirements

- [ ] FR-1: Create a standalone plugin at `plugins/plugin-recommender/` with `.claude-plugin/plugin.json`
- [ ] FR-2: Create a TypeScript hook (`hooks/check-dependencies.ts`) with shared detection logic for both SessionStart and PostToolUse events
- [ ] FR-3: Detect npm packages and map them to marketplace plugins:
  | npm package(s) | Marketplace plugin |
  |---|---|
  | `nuxt` | `nuxt` |
  | `@nuxt/ui` | `nuxt-ui` |
  | `@nuxtjs/seo`, `nuxt-seo-utils` | `nuxt-seo` |
  | `vue` | `vue` |
  | `pinia`, `@pinia/nuxt` | `pinia` |
  | `@vueuse/nuxt`, `@vueuse/core` | `vueuse` |
  | `vitest` | `vitest` |
  | `unocss`, `@unocss/nuxt` | `unocss` |
  | `vitepress` | `vitepress` |
  | `vite` | `vite` |
  | `firebase`, `firebase-admin` | `firebase` |
  | `@prisma/client`, `prisma` | `prisma` |
  | `@supabase/supabase-js` | `supabase` |
  | `better-auth` | `better-auth` |
  | `ai`, `@ai-sdk/openai` | `ai-sdk` |
  | `mastra`, `@mastra/core` | `mastra` |
  | `stripe`, `@stripe/stripe-js` | `stripe` |
  | `@slidev/cli` | `slidev` |
  | `tsdown` | `tsdown` |
  | `docus` | `docus` |
- [ ] FR-4: Only recommend plugins that are **not already installed** by the user
- [ ] FR-5: Output `systemMessage` (user-facing) with install commands (`/plugin install <name>@pleaseai`) for each detected-but-not-installed plugin
- [ ] FR-6: Output `additionalContext` (Claude-facing) with guidance to leverage the recommended plugins for better assistance
- [ ] FR-7: If no matching packages are found or all matching plugins are already installed, exit silently (no output)
- [ ] FR-8: Create `hooks/hooks.json` to register both hooks:
  - SessionStart with `async: true` (non-blocking background execution)
  - PostToolUse with `matcher: "Bash"` and `if` conditions for package install commands
- [ ] FR-9: Hook must handle missing `package.json` gracefully (exit silently)
- [ ] FR-10: PostToolUse hook must detect `bun add`, `npm install`, `npm add`, `pnpm add`, `pnpm install` commands
- [ ] FR-11: The package-to-plugin mapping must be easily extensible (simple data structure, not scattered logic)
- [ ] FR-12: Add `plugin-recommender` to `marketplace.json`

### Non-functional Requirements

- [ ] NFR-1: Hook must complete within 10 seconds (timeout)
- [ ] NFR-2: Hook must not fail if `package.json` is malformed (graceful error handling)
- [ ] NFR-3: TypeScript implementation must be testable with Vitest

## Acceptance Criteria

- [ ] AC-1: When a project has `@nuxt/ui` in dependencies and `nuxt-ui` plugin is not installed, the hook recommends installing `nuxt-ui@pleaseai`
- [ ] AC-2: When multiple matching packages are found, all corresponding plugins are recommended in a single output
- [ ] AC-3: When all matching plugins are already installed, no output is produced
- [ ] AC-4: When `package.json` does not exist, no output is produced and no error occurs
- [ ] AC-5: The hook output contains valid JSON with both `systemMessage` and `additionalContext` fields
- [ ] AC-6: After running `bun add @nuxt/ui`, the PostToolUse hook recommends installing `nuxt-ui@pleaseai`
- [ ] AC-7: The SessionStart hook runs asynchronously (does not block session initialization)
- [ ] AC-8: Adding a new package-to-plugin mapping requires only a data change, not logic changes

## Out of Scope

- Auto-installing plugins without user action
- Checking plugin version compatibility
- Detecting packages in monorepo workspaces (only checks root `package.json`)
- Non-npm package detection (e.g., Flutter/Dart, Python, Go)

## Assumptions

- The hook can determine installed plugins by checking `.claude/settings.json` for `enabledPlugins`
- `bun` is available in the user's environment
- The `package.json` is at the working directory root
