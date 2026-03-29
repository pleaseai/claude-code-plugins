# Plan: Fix setup command package.json discovery

> Track: fix-setup-glob-pattern-20260329
> Spec: [spec.md](./spec.md)

## Overview
- **Source**: /please:plan
- **Track**: fix-setup-glob-pattern-20260329
- **Created**: 2026-03-29
- **Approach**: Script delegation — add `--setup` CLI mode to `check-dependencies.ts`

## Purpose

Fix `/please-plugins:setup` command that fails to find root `package.json` due to Glob result truncation by `node_modules/` entries.

## Context

`check-dependencies.ts` already implements all detection logic correctly (with direct path construction), but is only invocable via stdin-based hook protocol. The setup command reimplements the same logic as ambiguous LLM prose instructions.

## Architecture Decision

**Script delegation** over explicit tool instructions. Rationale:
- Eliminates the problem class entirely (no LLM interpretation of file paths)
- DRY — reuses tested logic in `check-dependencies.ts`
- Precedent: `cubic:review` command uses same pattern (invoke CLI, parse JSON)

## Tasks

### Phase 1: Add `--setup` CLI mode to check-dependencies.ts

- [x] T-1: Add `SetupOutput` interface with `detected` and `installed` arrays, tracking source package/file per match
- [x] T-2: Add `scanForSetup(cwd: string)` function that calls `loadPackageJson`, `detectPackages`, `detectTooling`, `loadEnabledPlugins`, and returns `SetupOutput`
- [x] T-3: Update `main()` to check `process.argv` for `--setup` flag and branch to `scanForSetup()` with JSON stdout
- [x] T-4: Write tests for `scanForSetup()` — success, no package.json, no matches, with installed plugins

### Phase 2: Rewrite setup.md to use script delegation

- [ ] T-5: Replace Steps 1-2 in `setup.md` with single `bun run` invocation of `check-dependencies.ts --setup`
- [ ] T-6: Update Step 3 to parse JSON output and present results using `AskUserQuestion`
- [ ] T-7: Ensure Step 4 (install) and Step 5 (summary) remain unchanged

### Phase 3: Verification

- [ ] T-8: Run existing `check-dependencies.test.ts` — all must pass (regression)
- [ ] T-9: Manual verification in a project with `node_modules/`

## Key Files

| File | Action |
|------|--------|
| `plugins/please-plugins/hooks/check-dependencies.ts` | Add `--setup` mode, `scanForSetup()`, `SetupOutput` |
| `plugins/please-plugins/hooks/check-dependencies.test.ts` | Add tests for `scanForSetup()` |
| `plugins/please-plugins/commands/setup.md` | Rewrite Steps 1-2 to delegate to script |

## Verification

1. Run `bun test plugins/please-plugins/hooks/check-dependencies.test.ts`
2. Run `bun run plugins/please-plugins/hooks/check-dependencies.ts --setup` in a project with `node_modules/`
3. Invoke `/please-plugins:setup` and verify it finds root `package.json`

## Progress

_(Updated by /please:implement)_

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Script delegation over explicit tool instructions | Eliminates problem class, DRY, tested |
| 2026-03-29 | Monorepo workspace scanning out of scope | Separate feature, not part of this bugfix |

## Surprises & Discoveries

- `check-dependencies.ts` has no CLI entry point — only stdin-based hook protocol
- No existing command in the repo delegates to a TypeScript script; `cubic:review` (external CLI) is closest precedent
