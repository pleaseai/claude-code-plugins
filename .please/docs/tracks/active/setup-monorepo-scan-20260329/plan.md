# Plan: Monorepo Workspace Dependency Scanning

> Track: setup-monorepo-scan-20260329
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: [spec.md](./spec.md)
- **Issue**: #132
- **Created**: 2026-03-29
- **Approach**: Pragmatic

## Purpose

After this change, users running `/please-plugins:setup` in a monorepo project will see plugin recommendations based on dependencies from all workspace packages, not just the root. They can verify it works by running the setup command in a monorepo and confirming that dependencies from sub-packages (e.g., `apps/web/package.json`) trigger the correct plugin recommendations.

## Context

The `check-dependencies.ts` hook currently reads only the root `package.json` to detect dependencies that match plugin mappings. In monorepo projects using npm/yarn/Bun workspaces or pnpm workspaces, the root `package.json` often contains only shared dev dependencies (e.g., `vitest`, `eslint`), while framework-specific packages (e.g., `@nuxt/ui`, `vue`, `prisma`) live in workspace packages like `apps/web/package.json` or `packages/api/package.json`.

This means the plugin recommender misses most relevant plugins in monorepo setups. The fix requires resolving workspace package paths from the root configuration, reading each workspace `package.json`, and merging all dependencies before running detection.

Key constraints:
- Must support npm/yarn/Bun `workspaces` field (array of glob patterns) and `pnpm-workspace.yaml`
- Must use synchronous fs + glob only (no child processes) to keep hook latency low
- Must gracefully skip missing or malformed workspace `package.json` files
- Must not break non-monorepo projects (backward compatible)

Non-goals: nested workspace resolution, per-package detection reporting, Yarn PnP.

## Architecture Decision

The approach adds workspace resolution as a layer between `loadPackageJson()` and the existing detection functions. A new `resolveWorkspacePackages(cwd, rootPkg)` function resolves glob patterns from the `workspaces` field or `pnpm-workspace.yaml` into concrete directory paths. A new `collectAllDependencies(cwd)` function calls `loadPackageJson()` for each workspace package and merges all `dependencies` + `devDependencies` into a single record, tagging each entry with its source path for later source attribution.

This is minimally invasive: `detectPackages()` continues to receive a flat deps record, `scanForSetup()` and `detectForEvent()` simply call `collectAllDependencies()` instead of `loadPackageJson()`. Source tracking is enhanced to show `apps/web: @nuxt/ui` when a dependency was found in a workspace package.

Bun's built-in `Bun.Glob` provides synchronous, fast glob resolution without adding dependencies.

## Tasks

- [x] T001 Add workspace resolution function `resolveWorkspacePackages` (file: plugins/please-plugins/hooks/check-dependencies.ts)
- [x] T002 Add dependency aggregation function `collectAllDependencies` (file: plugins/please-plugins/hooks/check-dependencies.ts) (depends on T001)
- [x] T003 Integrate workspace scanning into `scanForSetup` and `detectForEvent` (file: plugins/please-plugins/hooks/check-dependencies.ts) (depends on T002)
- [x] T004 Enhance source tracking for workspace-origin dependencies (file: plugins/please-plugins/hooks/check-dependencies.ts) (depends on T003)

## Key Files

### Modify

- `plugins/please-plugins/hooks/check-dependencies.ts` — Main scanner; add `resolveWorkspacePackages()`, `collectAllDependencies()`, update `scanForSetup()`, `detectForEvent()`, `resolvePackageSource()`
- `plugins/please-plugins/hooks/check-dependencies.test.ts` — Add tests for workspace resolution, aggregation, and integration

### Reuse

- `plugins/please-plugins/hooks/plugin-mappings.json` — Existing package-to-plugin mappings (unchanged)
- `plugins/please-plugins/hooks/tooling-mappings.json` — Existing tooling mappings (unchanged)

## Verification

### Automated Tests

- [ ] `resolveWorkspacePackages` resolves npm/yarn/Bun `workspaces` glob patterns to directory paths
- [ ] `resolveWorkspacePackages` resolves `pnpm-workspace.yaml` patterns to directory paths
- [ ] `resolveWorkspacePackages` returns empty array when no workspaces configured
- [ ] `collectAllDependencies` merges deps from root + workspace packages
- [ ] `collectAllDependencies` skips missing/malformed workspace package.json
- [ ] `scanForSetup` detects plugins from workspace dependencies
- [ ] `detectForEvent` (SessionStart) detects workspace dependencies
- [ ] Source field shows workspace path prefix for workspace-origin deps
- [ ] Non-monorepo projects continue to work unchanged

### Observable Outcomes

- Running `bun run plugins/please-plugins/hooks/check-dependencies.ts --setup` in this repo detects dependencies from `apps/web/package.json` (e.g., `@nuxt/ui`, `@nuxt/content`)
- Running the same in a non-monorepo project produces identical output as before

### Acceptance Criteria Check

- [ ] AC-1: Dependencies from `apps/web/package.json` detected in a monorepo with `workspaces`
- [ ] AC-2: Dependencies detected from `pnpm-workspace.yaml` projects
- [ ] AC-3: SessionStart hook scans workspace packages
- [ ] AC-4: `--setup` mode aggregates all workspace dependencies
- [ ] AC-5: Non-monorepo projects unchanged

## Decision Log

- Decision: Use `Bun.Glob` for workspace pattern resolution
  Rationale: Built-in, synchronous, no additional dependencies, fast
  Date/Author: 2026-03-29 / Claude

- Decision: Merge all workspace deps into a single flat record rather than per-package detection
  Rationale: Simpler implementation, aligns with user preference from spec, `detectPackages()` API unchanged
  Date/Author: 2026-03-29 / Claude
