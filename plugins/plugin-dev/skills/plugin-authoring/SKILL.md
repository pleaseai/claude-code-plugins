---
name: Plugin Authoring (Multi-Runtime)
description: Author a plugin once in Claude Code format, then generate Codex, Antigravity, and Cursor manifests from it so one directory loads in all four runtimes. Use when creating, scaffolding, or editing a plugin in this marketplace, wiring a marketplace entry, running the multi-format generator, or when the user mentions "plugin.json", ".claude-plugin", ".codex-plugin", ".cursor-plugin", "multi-format", "marketplace.json", or "Codex/Cursor/Antigravity plugin".
---

# Plugin Authoring — Multi-Runtime

This marketplace ships the **same plugin directory across four runtimes**. You author **once** in
Claude Code format (the source of truth) and **generate** the rest. Never hand-write the Codex,
Antigravity, or Cursor manifests.

## The one rule: edit Claude → generate the rest

```
.claude-plugin/plugin.json  (or root plugin.json)   ← author here, source of truth
        │
        │  bun scripts/cli.ts multi-format
        ▼
.codex-plugin/plugin.json + .mcp.json               ← generated
plugin.json (root) + mcp_config.json + hooks.json   ← generated (Antigravity)
.cursor-plugin/plugin.json                           ← generated
.agents/plugins/marketplace.json                     ← generated (Codex marketplace)
.cursor-plugin/marketplace.json                      ← generated (Cursor marketplace)
```

Shared assets (`commands/`, `agents/`, `skills/`, `hooks/`) live **once** at the plugin root and are
referenced by every manifest. Only manifest-level fields differ per runtime.

## Workflow

1. **Scaffold / edit** the plugin in Claude Code format — run `/plugin-dev:scaffold` for a new one.
   Components go at the plugin **root**, never inside `.claude-plugin/`:
   ```
   plugins/<name>/
   ├── .claude-plugin/plugin.json   # manifest only (or root plugin.json — see below)
   ├── commands/                     # at root
   ├── agents/                       # at root
   ├── skills/                       # at root
   └── hooks/hooks.json              # at root
   ```
2. **Register** in the source-of-truth marketplace `.claude-plugin/marketplace.json`
   (`source: "./plugins/<name>"`). Claude-only fields like `relevance` live **only** here.
3. **Generate** the other runtimes: `/plugin-dev:multi-format` (or `bun scripts/cli.ts multi-format`).
4. **Scope the diff** — the generator rewrites *all* local plugins; `git restore` any unrelated
   churn so the commit stays atomic.
5. **Validate**: `/plugin-dev:validate`, then `claude plugin validate plugins/<name>`.

## Root-level `plugin.json` plugins

A few plugins (e.g. `plugin-dev`, `bun`) use a **root** `plugin.json` that serves as *both* the
Claude Code manifest *and* the Antigravity manifest. Edit that root file as the source of truth;
`multi-format` still regenerates `.codex-plugin/` and `.cursor-plugin/` from it.

## Companion files for a NEW plugin

Wire these in the same change (see `.claude/rules/marketplace-sync.md`):

- `.claude-plugin/marketplace.json` — add the plugin entry (source of truth).
- `release-please-config.json` + `.release-please-manifest.json` — add a `plugins/<name>` entry
  covering **every** version-bearing manifest the plugin ships (`.claude-plugin/plugin.json` and,
  when multi-format generates them, `.codex-plugin/plugin.json` + root `plugin.json` +
  `.cursor-plugin/plugin.json`). *Only if the plugin is release-managed.*
- `README.md` — add the plugin under **Built-in Plugins**.

## What NOT to do

- ❌ Hand-edit `.codex-plugin/`, `.cursor-plugin/`, generated root Antigravity `plugin.json`, or the
  Codex/Cursor `marketplace.json` — re-run `multi-format`.
- ❌ Put `relevance` (or other Claude-only fields) in the Codex/Cursor marketplaces — the generator
  intentionally drops them.
- ❌ Nest `commands/` / `agents/` / `skills/` inside `.claude-plugin/` — they won't load.

## Related

- Deep Claude Code component reference (commands, agents, skills, hooks, MCP, Gemini migration):
  the `claude-code-plugin-builder` skill.
- Codex-native creation (inside Codex): the `plugin-creator` skill.
- Cursor-native creation (inside Cursor): the `create-plugin-scaffold` skill.
- Commands: `/plugin-dev:scaffold`, `/plugin-dev:multi-format`, `/plugin-dev:validate`,
  `/plugin-dev:migrate-gemini`, `/plugin-dev:best-practices`.
