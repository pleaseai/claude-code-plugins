---
name: migrating-gemini-extensions
description: Convert a Gemini CLI extension into a Claude Code plugin, preserving functionality and backwards compatibility. Use when the user wants to migrate/port a Gemini extension to Claude Code, convert gemini-extension.json to plugin.json, adapt GEMINI.md context or Gemini tools/hooks, or mentions "gemini-extension.json", "GEMINI.md", or "migrate Gemini".
---

# Migrating a Gemini Extension to a Claude Code Plugin

Preserve functionality while adopting Claude Code best practices. Keep `gemini-extension.json` for
backwards compatibility.

## Phase 1 — Analysis

1. Read the existing structure: `gemini-extension.json`, any context file (e.g. `GEMINI.md`),
   commands, MCP servers/tools, custom scripts.
2. Map components: Gemini context → Claude skill (preferred) or commands/agents; Gemini tools → MCP
   servers; Gemini scripts → hook scripts.

## Phase 2 — Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json        # NEW: Claude manifest (source of truth)
├── gemini-extension.json  # KEEP: backwards compatibility
├── skills/                # NEW (preferred): convert context → a skill
├── commands/              # optional: convert context → commands
├── hooks/
│   ├── hooks.json         # if you keep SessionStart context loading
│   └── scripts/           # ADAPT: update paths to ${CLAUDE_PLUGIN_ROOT}
└── README.md              # UPDATE: add Claude install instructions
```

## Phase 3 — Convert the manifest

`gemini-extension.json` → `.claude-plugin/plugin.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Description",
  "author": { "name": "...", "url": "https://github.com/..." },
  "homepage": "...",
  "repository": "...",
  "license": "MIT",
  "keywords": ["..."]
}
```

## Phase 4 — Migrate the context file (prefer a skill)

**Preferred:** turn `GEMINI.md` into a `skills/<name>/SKILL.md` with frontmatter describing when it
should activate. This loads only when relevant instead of every session. See
`../plugin-authoring/references/best-practices.md` for why skills beat SessionStart hooks.

**Legacy alternative — SessionStart hook** (only if you must load context every session):

```json
{
  "description": "Load usage instructions at session start",
  "hooks": {
    "SessionStart": [
      { "matcher": "startup",
        "hooks": [ { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/context.sh", "timeout": 10 } ] }
    ]
  }
}
```

```bash
#!/usr/bin/env bash
set -euo pipefail
CONTEXT_FILE="${CLAUDE_PLUGIN_ROOT}/hooks/CONTEXT.md"
if [ -f "$CONTEXT_FILE" ]; then
  jq -n --arg context "$(cat "$CONTEXT_FILE")" \
    '{ "hookSpecificOutput": { "hookEventName": "SessionStart", "additionalContext": $context } }'
fi
```

Then `chmod +x hooks/context.sh`.

## Phase 5 — Migrate MCP servers

Gemini tools → inline `mcpServers` (or `.mcp.json`):

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@package/name"],
      "env": { "API_KEY": "${PLUGIN_API_KEY:-}" }
    }
  }
}
```

Key changes: `${CLAUDE_PLUGIN_ROOT}` for local paths, `${VAR:-}` for optional env vars, `npx -y` for
npm packages.

## Phase 6 — Update docs

Add a Claude Code install section to the README (marketplace add + `/plugin install ...`) and keep
the Gemini CLI section for backwards compatibility.

## Phase 7 — Test

- Claude Code: `claude --debug`, `/plugin list`, run the plugin's components.
- Gemini CLI still works: `gemini ext list`.
- Confirm commands, hooks, and MCP servers behave.

## Checklist

- [ ] Create `.claude-plugin/plugin.json`; keep `gemini-extension.json`.
- [ ] Convert context to a skill (or SessionStart hook); make hook scripts executable.
- [ ] Update paths to `${CLAUDE_PLUGIN_ROOT}`; migrate MCP config.
- [ ] Update README (both install methods); update CHANGELOG.
- [ ] Test with Claude Code and Gemini CLI. Submit an upstream PR for third-party extensions.

## Common issues

- **Context not loading** → hook script not executable or bad JSON output.
- **MCP server won't start** → paths not using `${CLAUDE_PLUGIN_ROOT}`, or command missing.
- **Commands not appearing** → `commands/` nested in `.claude-plugin/` instead of at root.

## Reference

- `docs/lessons-learned/context7.md` — a complete migration example.
- [Claude Code Plugin Documentation](https://docs.claude.com/en/docs/claude-code/plugins)
- [MCP Documentation](https://modelcontextprotocol.io/)
