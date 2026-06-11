# Nuxt UI Hook Guidance

> Track: nuxt-ui-hook-guidance-20260328

## Overview

Add a PreToolUse hook to the nuxt-ui plugin that intercepts Write/Edit operations on `.vue` files containing Nuxt UI components (`U*` prefix). The hook injects guidance messages reminding the LLM to use Nuxt UI MCP tools (`list_components`, `get_component`) for correct component API usage, warns about common mistakes (e.g., deprecated v3 patterns, incorrect prop names), and provides targeted advice based on detected components.

### Problem

LLMs frequently misuse Nuxt UI v4 components due to stale training data (e.g., using Nuxt UI v3 API patterns, incorrect prop names, missing required wrappers like `UApp`). The existing skill-based approach provides documentation but doesn't actively intervene at the point of code generation.

### Solution

A PreToolUse hook on Write/Edit that:
1. Detects `.vue` file targets from tool arguments
2. Parses the content for Nuxt UI components (`U*` prefix)
3. Returns a guidance message with MCP tool reminders and component-specific warnings

## Requirements

### Functional Requirements

- [ ] FR-1: Hook triggers on PreToolUse for Write and Edit tools when the target file has a `.vue` extension
- [ ] FR-2: Hook parses the tool arguments (file content or edit strings) to detect Nuxt UI components by `U` prefix pattern (e.g., `UButton`, `UInput`, `UModal`)
- [ ] FR-3: If no Nuxt UI components are detected, hook returns no guidance (silent pass-through)
- [ ] FR-4: When Nuxt UI components are detected, hook returns a message reminding the LLM to use `mcp__nuxt-ui-remote__get_component` and `mcp__nuxt-ui-remote__list_components` MCP tools to verify correct API usage before proceeding
- [ ] FR-5: Hook message includes warnings about common Nuxt UI v3→v4 migration mistakes (e.g., deprecated props, renamed components, changed slot names)
- [ ] FR-6: Hook message is component-specific — lists the detected components and suggests checking each one via MCP

### Non-functional Requirements

- [ ] NFR-1: Hook execution completes within 5 seconds (timeout limit)
- [ ] NFR-2: Hook has zero impact when no Nuxt UI components are detected (fast path)
- [ ] NFR-3: Hook script is lightweight — no external dependencies beyond Node.js built-ins

## Acceptance Criteria

- [ ] AC-1: Writing a `.vue` file containing `<UButton>` triggers hook and returns MCP guidance message
- [ ] AC-2: Writing a `.vue` file with no `U*` components produces no hook output
- [ ] AC-3: Editing a `.vue` file where the edit string contains `UModal` triggers component-specific guidance
- [ ] AC-4: Hook message includes actionable MCP tool call suggestions (tool name + component name)
- [ ] AC-5: Hook is registered in `plugins/nuxt-ui/hooks/hooks.json` with correct matcher pattern

## Out of Scope

- Auto-fixing incorrect component usage (hook only provides guidance)
- Blocking or rejecting Write/Edit operations
- Validating component props at the hook level (MCP tools handle this)
- Supporting non-Vue files (e.g., `.tsx`, `.jsx`)

## Assumptions

- The Nuxt UI MCP server at `https://ui.nuxt.com/mcp` remains available and returns up-to-date component documentation
- Nuxt UI components consistently use the `U` prefix naming convention
- The hook reads tool arguments from `$TOOL_INPUT` environment variable (standard Claude Code hook protocol)
