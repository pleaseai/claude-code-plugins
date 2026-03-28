# Nuxt Plugin SessionStart Hook

> Track: nuxt-session-hook-20260328

## Overview

Add a SessionStart hook to the `plugins/nuxt/` plugin that detects Nuxt ecosystem packages in the user's `package.json` and recommends installing corresponding marketplace plugins. The hook outputs both `systemMessage` (user-facing install recommendations) and `additionalContext` (Claude-facing context about available plugins).

## Requirements

### Functional Requirements

- [ ] FR-1: Create a TypeScript SessionStart hook (`hooks/check-dependencies.ts`) that reads the project's `package.json`
- [ ] FR-2: Detect the following npm packages and map them to marketplace plugins:
  | npm package(s) | Marketplace plugin |
  |---|---|
  | `@nuxt/ui` | `nuxt-ui` |
  | `@nuxtjs/seo`, `nuxt-seo-utils` | `nuxt-seo` |
  | `pinia`, `@pinia/nuxt` | `pinia` |
  | `@vueuse/nuxt`, `@vueuse/core` | `vueuse` |
- [ ] FR-3: Only recommend plugins that are **not already installed** by the user
- [ ] FR-4: Output `systemMessage` (user-facing) with install commands (`/plugin install <name>@pleaseai`) for each detected-but-not-installed plugin
- [ ] FR-5: Output `additionalContext` (Claude-facing) with guidance to leverage the recommended plugins for better assistance
- [ ] FR-6: If no matching packages are found or all matching plugins are already installed, exit silently (no output)
- [ ] FR-7: Create `hooks/hooks.json` to register the SessionStart hook
- [ ] FR-8: Hook must handle missing `package.json` gracefully (exit silently)

### Non-functional Requirements

- [ ] NFR-1: Hook must complete within 10 seconds (timeout)
- [ ] NFR-2: Hook must not fail if `package.json` is malformed (graceful error handling)
- [ ] NFR-3: TypeScript implementation must be testable with Vitest

## Acceptance Criteria

- [ ] AC-1: When a Nuxt project has `@nuxt/ui` in dependencies and `nuxt-ui` plugin is not installed, the hook recommends installing `nuxt-ui@pleaseai`
- [ ] AC-2: When multiple matching packages are found, all corresponding plugins are recommended in a single output
- [ ] AC-3: When all matching plugins are already installed, no output is produced
- [ ] AC-4: When `package.json` does not exist, no output is produced and no error occurs
- [ ] AC-5: The hook output contains valid JSON with both `systemMessage` and `additionalContext` fields

## Out of Scope

- Detecting non-Nuxt ecosystem packages (Vue-only, Vite-only)
- Auto-installing plugins without user action
- Checking plugin version compatibility
- Detecting packages in monorepo workspaces (only checks root `package.json`)

## Assumptions

- The hook can determine installed plugins by checking if the plugin directory exists under the Claude Code plugins path
- `bun` is available in the user's environment (required by the nuxt plugin already)
- The `package.json` is at the working directory root
