# Plan: Add `if` Field to Hooks

> Track: hooks-if-field-20260328
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: /please:plan
- **Track**: hooks-if-field-20260328
- **Created**: 2026-03-28
- **Approach**: Targeted application — add `if` field to 2 hooks with clear performance benefit; skip 4 hooks where benefit is minimal or inapplicable.

## Purpose

Reduce unnecessary hook process invocations by adding the `if` field (permission rule syntax filter) to hooks where it meaningfully narrows scope. The `if` field prevents the hook process from spawning when the tool call doesn't match the pattern, providing a performance benefit for frequently-fired hooks.

## Context

Claude Code hooks support an `if` field that uses permission rule syntax with alternation (`|`) and glob patterns. It acts as a fine-grained filter within a matched group:
1. `matcher` (coarse) — filters by tool name
2. `if` (fine) — filters by tool name + arguments, avoids process spawn if no match

Currently, **no hooks in this codebase use the `if` field**.

## Architecture Decision

**Apply `if` to 2 hooks with clear benefit:**
- **Markitdown** PreToolUse (matcher: `Read`) — fires on every file read, but only handles 6 binary doc extensions
- **Project settings** deny-vendor-write (matcher: `Write|Edit|MultiEdit|NotebookEdit`) — fires on every edit, but only blocks vendor/ and sources/ paths

**Skip 4 hooks:**
- **Worktree** deny-parent-access — parent path is dynamic/runtime, can't pre-filter with static `if`
- **Gatekeeper** PreToolUse — script has complex DENY/ALLOW rules, `if` would duplicate logic
- **Gatekeeper** PermissionRequest — already rare (only fires on unhandled PermissionRequest events)
- **Fetch** PostToolUseFailure — already rare (only fires on WebFetch failures)

## Tasks

### Phase 1: Apply `if` field to hooks

- T-1: Add `if` field to markitdown PreToolUse hook
  - File: `plugins/markitdown/hooks/hooks.json`
  - Pattern: `Read(*.pptx)|Read(*.docx)|Read(*.xlsx)|Read(*.xls)|Read(*.ppt)|Read(*.doc)`
  - Test: Validate with `claude plugin validate plugins/markitdown`

- T-2: Add `if` field to project settings deny-vendor-write hook
  - File: `.claude/settings.json`
  - Pattern: `Write(*vendor*)|Edit(*vendor*)|MultiEdit(*vendor*)|NotebookEdit(*vendor*)|Write(*sources*)|Edit(*sources*)|MultiEdit(*sources*)|NotebookEdit(*sources*)`

- T-3: Document evaluation of skipped hooks in spec as decisions

## Key Files

| File | Role |
|------|------|
| `plugins/markitdown/hooks/hooks.json` | Markitdown hook config (modify) |
| `.claude/settings.json` | Project settings with hooks (modify) |
| `plugins/markitdown/hooks/check-binary-doc.sh` | Script that handles binary docs (read-only reference) |
| `hooks/deny-vendor-write.sh` | Script that blocks vendor writes (read-only reference) |

## Verification

- [ ] Markitdown hook no longer fires on plain text/code file reads
- [ ] deny-vendor-write hook no longer fires on edits outside vendor/sources directories
- [ ] All modified hooks pass plugin validation
- [ ] No regression in hook behavior for target cases

## Progress

| Task | Status |
|------|--------|
| T-1: markitdown `if` field | pending |
| T-2: settings `if` field | pending |
| T-3: document skipped hooks | pending |

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Skip worktree hook | Parent path is dynamic — static `if` pattern can't pre-filter |
| Skip gatekeeper hooks | Script-level pattern matching is more flexible; `if` would duplicate logic |
| Skip fetch hook | PostToolUseFailure on WebFetch is already very rare |
| Use alternation syntax | `if` supports `\|` for OR — confirmed from Claude Code docs |

## Surprises & Discoveries

- Permission rule syntax supports alternation with `|` operator (e.g., `Edit(*.py)|Write(*.py)`)
- `if` is evaluated before process spawn, providing genuine performance benefit
- Multi-tool matchers work with `if` by including each tool type in the pattern
