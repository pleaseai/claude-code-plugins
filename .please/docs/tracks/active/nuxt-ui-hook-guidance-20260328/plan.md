# Plan: Nuxt UI Hook Guidance

> Track: nuxt-ui-hook-guidance-20260328
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: [spec.md](./spec.md)
- **Issue**: TBD
- **Created**: 2026-03-28
- **Approach**: Minimal Change

## Purpose

After this change, LLMs using Claude Code with the nuxt-ui plugin will receive automatic guidance to verify Nuxt UI component APIs via MCP tools before writing `.vue` files. They can verify it works by writing a `.vue` file containing `<UButton>` and observing the MCP guidance message injected by the hook.

## Context

LLMs frequently misuse Nuxt UI v4 components due to stale training data — using v3 API patterns, incorrect prop names, or missing required wrappers like `UApp`. The nuxt-ui plugin already provides a skill with comprehensive documentation and an MCP server at `https://ui.nuxt.com/mcp`, but the skill is passive — it only loads when relevant. There is no active intervention at the point of code generation.

The solution is a PreToolUse hook on Write/Edit tools that detects Nuxt UI components (`U*` prefix) in `.vue` file content and injects a guidance message reminding the LLM to use MCP tools (`get_component`, `list_components`) for correct API reference before proceeding.

The hook follows the same pattern as `plugins/fetch/hooks/webfetch-fallback.sh` — a lightweight shell script using `jq` to parse stdin JSON and emit `hookSpecificOutput` with `additionalContext`. No build step required.

### Non-Goals

- Auto-fixing incorrect component usage
- Blocking or rejecting Write/Edit operations
- Validating component props at the hook level
- Supporting non-Vue files (`.tsx`, `.jsx`)

## Architecture Decision

Shell script approach chosen over TypeScript for several reasons: the logic is simple (regex match + message generation), it avoids a build step, follows the established fetch plugin pattern, and has zero dependencies beyond `jq` (universally available). The hook reads `tool_input` from stdin JSON, checks `file_path` for `.vue` extension, extracts content (Write: `content` field; Edit: `new_string` field), matches `<U[A-Z][a-zA-Z]+` pattern to detect Nuxt UI components, and returns a guidance message listing detected components with MCP tool call suggestions.

## Tasks

- [ ] T001 Create PreToolUse hook script for Nuxt UI component detection (file: plugins/nuxt-ui/hooks/check-vue-components.sh)
- [ ] T002 Create hooks.json configuration for nuxt-ui plugin (file: plugins/nuxt-ui/hooks/hooks.json) (depends on T001)
- [ ] T003 Add hook integration test (file: plugins/nuxt-ui/hooks/check-vue-components.test.sh) (depends on T001)

## Key Files

### Create

- `plugins/nuxt-ui/hooks/hooks.json` — Hook configuration registering PreToolUse matcher for Write and Edit
- `plugins/nuxt-ui/hooks/check-vue-components.sh` — Shell script that parses tool input, detects U* components in .vue files, returns MCP guidance message

### Reuse

- `plugins/nuxt-ui/.claude-plugin/plugin.json` — Existing plugin manifest (no changes needed; hooks.json auto-loaded)
- `plugins/fetch/hooks/webfetch-fallback.sh` — Reference implementation for hookSpecificOutput pattern

## Verification

### Automated Tests

- [ ] Pipe Write tool input with `.vue` file containing `<UButton>` → hook returns guidance message
- [ ] Pipe Write tool input with `.vue` file containing no U* components → hook returns empty (passthrough)
- [ ] Pipe Edit tool input with `new_string` containing `<UModal>` in `.vue` file → hook returns component-specific guidance
- [ ] Pipe Write tool input with `.ts` file → hook returns empty (non-vue passthrough)
- [ ] Guidance message includes detected component names and MCP tool suggestions

### Observable Outcomes

- After installing the nuxt-ui plugin and writing a `.vue` file with `<UButton>`, the LLM receives a message suggesting to call `mcp__nuxt-ui__get_component` with `component: "Button"` before proceeding
- Running `echo '{"tool_name":"Write","tool_input":{"file_path":"app.vue","content":"<template><UButton /></template>"}}' | bash plugins/nuxt-ui/hooks/check-vue-components.sh` shows JSON output with guidance message

### Manual Testing

- [ ] Install nuxt-ui plugin, write a .vue file with UButton — verify guidance appears
- [ ] Write a .vue file without U* components — verify no guidance appears

### Acceptance Criteria Check

- [ ] AC-1: Writing `.vue` with `<UButton>` triggers MCP guidance
- [ ] AC-2: Writing `.vue` without U* components produces no output
- [ ] AC-3: Editing `.vue` with `UModal` in new_string triggers guidance
- [ ] AC-4: Message includes MCP tool call suggestions with component names
- [ ] AC-5: Hook registered in `plugins/nuxt-ui/hooks/hooks.json`

## Decision Log

- Decision: Use shell script (bash + jq) instead of TypeScript
  Rationale: Simple regex logic, no build step needed, follows fetch plugin pattern, zero additional dependencies
  Date/Author: 2026-03-28 / Claude

- Decision: Match on Write and Edit tools with single matcher pattern
  Rationale: Both tools modify .vue file content; Edit uses new_string which may contain new U* components
  Date/Author: 2026-03-28 / Claude

- Decision: Use `additionalContext` (non-blocking) instead of `decision: deny`
  Rationale: Hook should guide, not block — the LLM may already have correct knowledge from the skill
  Date/Author: 2026-03-28 / Claude
