# Plan: Nuxt Plugin SessionStart Hook

> Track: nuxt-session-hook-20260328
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: [spec.md](./spec.md)
- **Issue**: TBD
- **Created**: 2026-03-28
- **Approach**: Minimal Change

## Purpose

After this change, developers working in Nuxt projects will automatically see recommendations to install relevant Claude Code plugins (nuxt-ui, nuxt-seo, pinia, vueuse) based on packages detected in their `package.json`. They can verify it works by starting a Claude Code session in a Nuxt project that has `@nuxt/ui` installed and seeing the plugin recommendation message.

## Context

The `plugins/nuxt/` plugin currently provides skills and an MCP server for Nuxt development but has no SessionStart hook. When users work on Nuxt projects that use ecosystem packages like `@nuxt/ui`, `@nuxtjs/seo`, `pinia`, or `@vueuse/nuxt`, they may not know that corresponding Claude Code plugins exist in the `pleaseai` marketplace.

This hook bridges that gap by detecting npm packages in the project's `package.json` and recommending relevant plugin installations. It outputs `systemMessage` (user-facing recommendations) and `additionalContext` (Claude-facing guidance).

The existing `worktree-context.ts` hook provides the reference pattern: TypeScript with `bun`, stdin-based JSON input, pure functions for testability, and `import.meta.main` guard.

Non-goals: No auto-installation, no monorepo workspace scanning, no Vue/Vite-only package detection.

## Architecture Decision

Single straightforward approach following the established TypeScript hook pattern from `plugins/worktree/hooks/worktree-context.ts`.

The hook uses `hooks/hooks.json` (auto-loaded by Claude Code) rather than adding to `plugin.json`'s `hooks` field, following the convention documented in CLAUDE.md. Pure functions are exported for unit testing, and the `import.meta.main` guard separates the entry point from testable logic.

For installed plugin detection, the hook checks `.claude/settings.json` (project-level) and `~/.claude/settings.json` (user-level) for `enabledPlugins` entries matching `pluginName@pleaseai`.

## Tasks

- [ ] T001 Create dependency detection hook (file: plugins/nuxt/hooks/check-dependencies.ts)
- [ ] T002 Create hooks.json registration (file: plugins/nuxt/hooks/hooks.json) (depends on T001)
- [ ] T003 Create unit tests for hook (file: plugins/nuxt/hooks/check-dependencies.test.ts) (depends on T001)

## Key Files

### Create

- `plugins/nuxt/hooks/check-dependencies.ts` — Main SessionStart hook with package detection, plugin status checking, and JSON output
- `plugins/nuxt/hooks/hooks.json` — Hook registration for SessionStart event
- `plugins/nuxt/hooks/check-dependencies.test.ts` — Unit tests for pure detection/filtering functions

### Reuse (Reference)

- `plugins/worktree/hooks/worktree-context.ts` — TypeScript hook pattern (stdin parsing, JSON output, `import.meta.main`)
- `plugins/worktree/hooks/worktree-context.test.ts` — Test pattern for TypeScript hooks
- `.claude-plugin/marketplace.json` — Plugin name reference for the `pleaseai` marketplace

## Verification

### Automated Tests

- [ ] Detects `@nuxt/ui` in dependencies and returns `nuxt-ui` recommendation
- [ ] Detects `@nuxtjs/seo` in dependencies and returns `nuxt-seo` recommendation
- [ ] Detects `pinia` or `@pinia/nuxt` and returns `pinia` recommendation
- [ ] Detects `@vueuse/nuxt` or `@vueuse/core` and returns `vueuse` recommendation
- [ ] Returns empty result when no matching packages found
- [ ] Returns empty result when all matching plugins are already installed
- [ ] Handles missing `package.json` gracefully (no error, no output)
- [ ] Handles malformed `package.json` gracefully
- [ ] Output JSON has valid `hookSpecificOutput` with `systemMessage` and `additionalContext`

### Observable Outcomes

- After starting Claude Code in a Nuxt project with `@nuxt/ui` installed, the session shows a recommendation to install `nuxt-ui@pleaseai`
- Running `echo '{"cwd":"/tmp"}' | bun run plugins/nuxt/hooks/check-dependencies.ts` exits silently (no `package.json`)

## Decision Log

- Decision: Use `hooks/hooks.json` over `plugin.json` hooks field
  Rationale: CLAUDE.md convention — `hooks/hooks.json` is auto-loaded, `plugin.json` hooks are for additional hook files only
  Date/Author: 2026-03-28 / Claude
- Decision: Check both project-level and user-level `.claude/settings.json` for installed plugins
  Rationale: Users may have plugins enabled at project or global scope; checking both avoids false recommendations
  Date/Author: 2026-03-28 / Claude
