# Nuxt Plugin Dependency Detection Hooks

> Track: nuxt-session-hook-20260328

## Overview

Add hooks to the `plugins/nuxt/` plugin that detect Nuxt ecosystem packages and recommend installing corresponding marketplace plugins. Two hook types work together:

1. **SessionStart hook** (async): Scans `package.json` at session start, runs in the background without blocking
2. **PostToolUse hook**: Triggers after `bun add`, `npm add`, `pnpm add` commands to recommend plugins for newly installed packages

Both hooks output `systemMessage` (user-facing install recommendations) and `additionalContext` (Claude-facing context about available plugins).

## Requirements

### Functional Requirements

- [ ] FR-1: Create a TypeScript hook (`hooks/check-dependencies.ts`) with shared detection logic for both SessionStart and PostToolUse events
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
- [ ] FR-7: Create `hooks/hooks.json` to register both hooks:
  - SessionStart with `async: true` (non-blocking background execution)
  - PostToolUse with `matcher: "Bash"` and `if` conditions for package install commands
- [ ] FR-8: Hook must handle missing `package.json` gracefully (exit silently)
- [ ] FR-9: PostToolUse hook must detect `bun add`, `npm install`, `npm add`, `pnpm add`, `pnpm install` commands (with package arguments)

### Non-functional Requirements

- [ ] NFR-1: Hook must complete within 10 seconds (timeout)
- [ ] NFR-2: Hook must not fail if `package.json` is malformed (graceful error handling)
- [ ] NFR-3: TypeScript implementation must be testable with Vitest

## Acceptance Criteria

- [ ] AC-1: When a Nuxt project has `@nuxt/ui` in dependencies and `nuxt-ui` plugin is not installed, the SessionStart hook recommends installing `nuxt-ui@pleaseai`
- [ ] AC-2: When multiple matching packages are found, all corresponding plugins are recommended in a single output
- [ ] AC-3: When all matching plugins are already installed, no output is produced
- [ ] AC-4: When `package.json` does not exist, no output is produced and no error occurs
- [ ] AC-5: The hook output contains valid JSON with both `systemMessage` and `additionalContext` fields
- [ ] AC-6: After running `bun add @nuxt/ui`, the PostToolUse hook recommends installing `nuxt-ui@pleaseai`
- [ ] AC-7: The SessionStart hook runs asynchronously (does not block session initialization)

## Out of Scope

- Detecting non-Nuxt ecosystem packages (Vue-only, Vite-only)
- Auto-installing plugins without user action
- Checking plugin version compatibility
- Detecting packages in monorepo workspaces (only checks root `package.json`)

## Assumptions

- The hook can determine installed plugins by checking if the plugin directory exists under the Claude Code plugins path
- `bun` is available in the user's environment (required by the nuxt plugin already)
- The `package.json` is at the working directory root
