---
description: Keep all marketplace manifests in sync — editing one requires updating the others
globs:
  - ".claude-plugin/marketplace.json"
  - ".agents/plugins/marketplace.json"
  - ".cursor-plugin/marketplace.json"
  - "plugins/*/.claude-plugin/plugin.json"
alwaysApply: false
---

# Marketplace Sync Rule

This repository ships the **same plugin set across multiple runtimes**, each with its
own marketplace manifest. The Claude Code manifest is the **source of truth**; the
others are **generated** and must never be hand-edited in isolation.

| Runtime     | Marketplace manifest                  | Status                  |
|-------------|---------------------------------------|-------------------------|
| Claude Code | `.claude-plugin/marketplace.json`     | **source of truth** (edit here) |
| Codex       | `.agents/plugins/marketplace.json`    | generated — do not hand-edit |
| Cursor      | `.cursor-plugin/marketplace.json`     | generated — do not hand-edit |

Claude-only fields such as `relevance` (plugin suggestion signals, see
[plugin-relevance](https://code.claude.com/docs/en/plugin-relevance)) live only in the
Claude manifest — `multi-format` intentionally does not propagate them to Codex/Cursor.
Guidance for authoring `relevance` blocks is in `CLAUDE.md` (step 9 of "Adding a New
Plugin to the Marketplace").

## Principle: edit one → sync all

When you add, remove, or modify a plugin entry in `.claude-plugin/marketplace.json`,
you **must** regenerate the Codex marketplace and per-plugin runtime manifests in the
same change so they never drift:

```bash
bun scripts/cli.ts multi-format
```

This regenerates, for every local plugin (`source: "./plugins/..."`):

- `.agents/plugins/marketplace.json` (Codex marketplace, filtered to local plugins)
- `.cursor-plugin/marketplace.json` (Cursor marketplace, filtered to local plugins)
- `plugins/<name>/.codex-plugin/plugin.json` (Codex manifest)
- `plugins/<name>/plugin.json` (Antigravity manifest)
- `plugins/<name>/mcp_config.json` (Antigravity, when MCP present)
- `plugins/<name>/.cursor-plugin/plugin.json` (Cursor manifest)

## Companion files that must move together

- **`release-please-config.json`** — add a `plugins/<name>` package entry whose
  `extra-files` cover **every** version-bearing manifest the plugin ships
  (`.claude-plugin/plugin.json`, and `.codex-plugin/plugin.json` + root `plugin.json`
  + `.cursor-plugin/plugin.json` when multi-format generates them).
- **`.release-please-manifest.json`** — add the matching `plugins/<name>` version.
- **`README.md`** — add/remove the plugin entry under **Built-in Plugins**.

## Caveat: scope your commit

`bun scripts/cli.ts multi-format` rewrites **all** local plugins, not just the one you
touched. If the committed artifacts have drifted repo-wide, the command will produce a
large unrelated diff. **Revert the unrelated churn** (`git restore`) and commit only the
files for the plugin you changed, so the change stays atomic.
