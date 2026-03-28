# Add `if` Field to Hooks

> Track: hooks-if-field-20260328

## Overview

Add the `if` field (permission rule syntax filter) to hooks that would benefit from more granular tool-call filtering. The `if` field narrows when a hook fires beyond the basic `matcher`, reducing unnecessary hook invocations and improving performance.

## Background

Claude Code hooks support an `if` field that uses permission rule syntax (e.g., `"Bash(git *)"`, `"Edit(*.ts)"`) to filter when a hook runs. This field only applies to tool events: PreToolUse, PostToolUse, PostToolUseFailure, and PermissionRequest. Currently, **no hooks in this codebase use the `if` field**.

## Requirements

### Functional Requirements

- [ ] FR-1: Add `if` field to **markitdown** PreToolUse hook to filter `Read` calls to binary document extensions only (e.g., `*.docx`, `*.pptx`, `*.xlsx`, `*.xls`, `*.doc`, `*.ppt`)
- [ ] FR-2: Add `if` field to **project settings** PreToolUse hook (`deny-vendor-write.sh`) to filter edit operations to `vendor/` and `sources/` paths only
- [ ] FR-3: Add `if` field to **worktree** PreToolUse hook (`deny-parent-access.ts`) to narrow file operation scope where beneficial
- [ ] FR-4: Evaluate gatekeeper and fetch hooks — only add `if` if it meaningfully reduces false invocations without conflicting with existing script logic

### Non-functional Requirements

- [ ] NFR-1: All `if` patterns must use valid permission rule syntax as documented by Claude Code
- [ ] NFR-2: No behavioral change — hooks must fire for the same effective cases as before, just with fewer unnecessary invocations
- [ ] NFR-3: Changes must pass `claude plugin validate` for affected plugins

## Acceptance Criteria

- [ ] AC-1: Markitdown hook no longer fires on plain text/code file reads
- [ ] AC-2: deny-vendor-write hook no longer fires on edits outside vendor/sources directories
- [ ] AC-3: All modified hooks pass plugin validation
- [ ] AC-4: No regression in hook behavior for actual target cases

## Out of Scope

- SessionStart hooks (not tool events, `if` field not applicable)
- Adding new hooks or changing existing hook logic/scripts
- Modifying external-plugins (submodule repos maintained separately)

## Assumptions

- Permission rule syntax supports glob patterns with `*` for file path matching in Read/Edit/Write tools
- The `if` field is evaluated before the hook command/script runs, providing a performance benefit
