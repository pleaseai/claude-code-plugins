# Plan: Plugin Recommender

> Track: nuxt-session-hook-20260328
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: [spec.md](./spec.md)
- **Issue**: TBD
- **Created**: 2026-03-28
- **Approach**: Minimal Change

## Purpose

After this change, developers will automatically see recommendations to install relevant Claude Code plugins based on npm packages detected in their `package.json`. Recommendations appear at session start (async, non-blocking) and after running package install commands. They can verify it works by starting a Claude Code session in a project with `@nuxt/ui` and seeing the recommendation to install `nuxt-ui@pleaseai`.

## Context

The `pleaseai` marketplace offers many plugins that correspond to npm packages (nuxt, vue, pinia, vueuse, vitest, prisma, supabase, etc.), but users may not know these plugins exist. Currently there is no automatic discovery mechanism.

This feature creates a standalone `plugin-recommender` plugin with two complementary hooks:

1. **SessionStart hook** (`async: true`): Scans `package.json` at session start in the background, without blocking session initialization. Outputs `systemMessage` (user-facing) and `additionalContext` (Claude-facing).

2. **PostToolUse hook** (`matcher: "Bash"`): Fires after `bun add`, `npm install/add`, `pnpm add/install` commands. When a user installs a matching package during the session, immediately recommends the corresponding plugin.

Both hooks share detection logic in a single TypeScript file. The package-to-plugin mapping is a simple data array, making it trivial to add new mappings as plugins are added to the marketplace.

The existing `worktree-context.ts` hook provides the reference TypeScript pattern: stdin-based JSON input, pure functions for testability, and `import.meta.main` guard.

Non-goals: No auto-installation, no monorepo workspace scanning, no non-npm ecosystems.

## Architecture Decision

Standalone plugin at `plugins/plugin-recommender/` rather than embedding hooks in individual framework plugins. This centralizes the recommendation logic and avoids duplication across plugins.

The hook uses `hooks/hooks.json` (auto-loaded by Claude Code) rather than `plugin.json`'s `hooks` field. Pure functions are exported for unit testing, and `import.meta.main` guard separates entry point from testable logic.

For installed plugin detection, the hook checks `.claude/settings.json` (project-level) and `~/.claude/settings.json` (user-level) for `enabledPlugins` entries matching `pluginName@pleaseai`.

A single script handles both events via `hook_event_name` field from stdin JSON.

## Tasks

- [ ] T001 Create plugin manifest (file: plugins/plugin-recommender/.claude-plugin/plugin.json)
- [ ] T002 Create dependency detection hook (file: plugins/plugin-recommender/hooks/check-dependencies.ts) (depends on T001)
- [ ] T003 Create hooks.json registration (file: plugins/plugin-recommender/hooks/hooks.json) (depends on T002)
- [ ] T004 [P] Create unit tests for hook (file: plugins/plugin-recommender/hooks/check-dependencies.test.ts) (depends on T002)
- [ ] T005 Add plugin-recommender to marketplace.json (file: .claude-plugin/marketplace.json) (depends on T001)

## Key Files

### Create

- `plugins/plugin-recommender/.claude-plugin/plugin.json` — Plugin manifest with name, version, description
- `plugins/plugin-recommender/hooks/check-dependencies.ts` — Main hook with package detection, plugin status checking, and JSON output
- `plugins/plugin-recommender/hooks/hooks.json` — Hook registration: SessionStart (async) + PostToolUse (matcher: Bash)
- `plugins/plugin-recommender/hooks/check-dependencies.test.ts` — Unit tests for detection/filtering functions

### Modify

- `.claude-plugin/marketplace.json` — Add `plugin-recommender` entry

### Reuse (Reference)

- `plugins/worktree/hooks/worktree-context.ts` — TypeScript hook pattern (stdin parsing, JSON output, `import.meta.main`)
- `plugins/worktree/hooks/worktree-context.test.ts` — Test pattern for TypeScript hooks

## Verification

### Automated Tests

- [ ] Detects `@nuxt/ui` in dependencies and returns `nuxt-ui` recommendation
- [ ] Detects `pinia` or `@pinia/nuxt` and returns `pinia` recommendation
- [ ] Detects `vitest` in devDependencies and returns `vitest` recommendation
- [ ] Detects `@prisma/client` and returns `prisma` recommendation
- [ ] Detects multiple packages and returns all recommendations
- [ ] Returns empty result when no matching packages found
- [ ] Returns empty result when all matching plugins are already installed
- [ ] Handles missing `package.json` gracefully (no error, no output)
- [ ] Handles malformed `package.json` gracefully
- [ ] Output JSON has valid `hookSpecificOutput` with `systemMessage` and `additionalContext`
- [ ] PostToolUse: extracts package name from `bun add @nuxt/ui` command
- [ ] PostToolUse: extracts package name from `npm install prisma` command
- [ ] PostToolUse: extracts package name from `pnpm add @vueuse/nuxt` command
- [ ] Adding a new mapping requires only a data change

### Observable Outcomes

- After starting Claude Code in a project with `@nuxt/ui` installed, the session shows a recommendation to install `nuxt-ui@pleaseai`
- After running `bun add @prisma/client`, the PostToolUse hook shows the prisma recommendation

## Decision Log

- Decision: Standalone `plugin-recommender` plugin instead of per-framework hooks
  Rationale: Centralizes recommendation logic, avoids duplication, covers all npm-based plugins in one place
  Date/Author: 2026-03-28 / user + Claude
- Decision: Use `hooks/hooks.json` over `plugin.json` hooks field
  Rationale: CLAUDE.md convention — `hooks/hooks.json` is auto-loaded
  Date/Author: 2026-03-28 / Claude
- Decision: Check both project-level and user-level `.claude/settings.json` for installed plugins
  Rationale: Users may have plugins enabled at project or global scope
  Date/Author: 2026-03-28 / Claude
- Decision: Use `async: true` for SessionStart hook
  Rationale: Package detection is informational and should not block session initialization
  Date/Author: 2026-03-28 / user + Claude
- Decision: Add PostToolUse hook for package install commands
  Rationale: Recommend plugins immediately when a matching package is installed
  Date/Author: 2026-03-28 / user + Claude
- Decision: Single script handles both events via `hook_event_name` field
  Rationale: Shared detection logic avoids code duplication
  Date/Author: 2026-03-28 / Claude
