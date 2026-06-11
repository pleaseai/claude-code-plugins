# Monorepo Workspace Dependency Scanning for Setup Command

> Track: setup-monorepo-scan-20260329

## Overview

Enhance the `please-plugins` dependency scanner (`check-dependencies.ts`) to discover and aggregate dependencies from all workspace packages in monorepo projects. Currently, only the root `package.json` is read, which misses dependencies declared in workspace packages (e.g., `apps/web/package.json`, `packages/shared/package.json`).

## Requirements

### Functional Requirements

- [ ] FR-1: Resolve workspace package paths from the root `package.json` `workspaces` field (npm/yarn/Bun format — array of glob patterns)
- [ ] FR-2: Resolve workspace package paths from `pnpm-workspace.yaml` (`packages` field — array of glob patterns)
- [ ] FR-3: Read `package.json` from each resolved workspace directory and merge all `dependencies` + `devDependencies` into a single aggregated set
- [ ] FR-4: Use the aggregated dependency set for plugin detection in both `scanForSetup()` and `detectForEvent()` (SessionStart hook)
- [ ] FR-5: When a plugin is detected from a workspace package (not root), include the workspace path in the `source` field (e.g., `apps/web: @nuxt/ui`)

### Non-functional Requirements

- [ ] NFR-1: Workspace resolution must not significantly increase hook latency — use synchronous `fs` and `glob` only, no external processes
- [ ] NFR-2: Gracefully handle missing or malformed workspace package.json files (skip with no error)

## Acceptance Criteria

- [ ] AC-1: In a monorepo with `workspaces: ["apps/*", "packages/*"]`, dependencies from `apps/web/package.json` are detected by the scanner
- [ ] AC-2: In a monorepo with `pnpm-workspace.yaml`, workspace packages are resolved and scanned
- [ ] AC-3: The SessionStart hook detects workspace dependencies, not just root dependencies
- [ ] AC-4: The `--setup` mode aggregates all workspace dependencies for plugin detection
- [ ] AC-5: Non-monorepo projects (no `workspaces` field, no `pnpm-workspace.yaml`) continue to work unchanged

## Out of Scope

- Nested workspace resolution (monorepo within a monorepo)
- Per-package detection reporting (we merge all deps, not per-package)
- Yarn PnP resolution or Yarn Berry-specific behaviors
- Workspace dependency graph analysis

## Assumptions

- Glob resolution for workspace patterns uses `Bun.glob` or Node.js `glob` with synchronous API
- The root `package.json` is always the entry point; workspace files are additive
- Duplicate dependencies across workspaces are deduplicated naturally (merged into a single key set)
