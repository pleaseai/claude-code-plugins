---
name: Authoring Plugins (Multi-Runtime)
description: Author, scaffold, or edit a plugin once in Claude Code format, then generate the Codex, Antigravity, and Cursor manifests so one directory loads in all four runtimes. Use when creating/scaffolding a new plugin, editing a plugin or its manifest, wiring a marketplace entry, running the multi-format generator, or when the user mentions "plugin.json", ".claude-plugin", ".codex-plugin", ".cursor-plugin", "multi-format", "marketplace.json", "scaffold a plugin", or "Codex/Cursor/Antigravity plugin".
---

# Plugin Authoring — Multi-Runtime

This marketplace ships the **same plugin directory across four runtimes**. You author **once** in
Claude Code format (the source of truth) and **generate** the rest. Never hand-write the Codex,
Antigravity, or Cursor manifests.

```
.claude-plugin/plugin.json                          ← author here, source of truth
        │  bun scripts/cli.ts multi-format
        ▼
.codex-plugin/plugin.json + .mcp.json               ← generated
plugin.json (root) + mcp_config.json + hooks.json   ← generated (Antigravity)
.cursor-plugin/plugin.json                           ← generated
.agents/plugins/marketplace.json                     ← generated (Codex marketplace)
.cursor-plugin/marketplace.json                      ← generated (Cursor marketplace)
```

## Workflow

1. **Scaffold / edit** the plugin in Claude Code format. Components go at the plugin **root**, never
   inside `.claude-plugin/`:
   ```
   plugins/<name>/
   ├── .claude-plugin/plugin.json   # manifest only (source of truth)
   ├── commands/  agents/  skills/  # at root, auto-discovered
   └── hooks/hooks.json             # at root
   ```
   Author the manifest from `references/plugin-json-spec.md` — start with valid defaults, no
   `[TODO: ...]` placeholders. Prefer **skills** over SessionStart hooks (they load only when
   relevant). Full quality checklist: `references/best-practices.md`.
2. **Register** in `.claude-plugin/marketplace.json` (`source: "./plugins/<name>"`). Claude-only
   fields like `relevance` live **only** here. For a new plugin, wire the companion files
   (release-please, README) too — see `references/multi-runtime-manifests.md`.
3. **Generate** the other runtimes:
   ```bash
   bun scripts/cli.ts multi-format
   ```
   The generator is bundled in this plugin (`scripts/run.ts` + `scripts/multi-format.ts`). Details,
   the per-runtime mapping table, and the `$schema` each manifest carries:
   `references/multi-runtime-manifests.md`.
4. **Scope the diff** — the generator rewrites *all* local plugins; `git restore` any unrelated
   churn so the commit stays atomic.
5. **Validate** — `claude plugin validate plugins/<name>`; deeper audit via the `validating-plugins`
   skill.

## Manifest location

Every local plugin's Claude source is `.claude-plugin/plugin.json`; the root `plugin.json` is the
**generated** Antigravity manifest. Edit the `.claude-plugin/` file — never the root one — then
re-run `multi-format`.

## References (load on demand)

- `references/plugin-json-spec.md` — manifest + marketplace field guide with canonical samples.
- `references/multi-runtime-manifests.md` — per-runtime mapping, the generator, diff scoping.
- `references/best-practices.md` — quality checklist, pitfalls, testing.

## Related

- `validating-plugins` — audit a plugin's manifest and structure before release.
- `migrating-gemini-extensions` — port a Gemini CLI extension to Claude Code.
- Cross-runtime creation skills: `claude-code-plugin-builder` (Claude Code component deep-dive),
  `plugin-creator` (Codex-native), `create-plugin-scaffold` (Cursor-native).

## What NOT to do

- ❌ Hand-edit `.codex-plugin/`, `.cursor-plugin/`, the generated root Antigravity `plugin.json`, or
  the Codex/Cursor `marketplace.json` — re-run `multi-format`.
- ❌ Put `relevance` (or other Claude-only fields) in the Codex/Cursor marketplaces.
- ❌ Nest `commands/` / `agents/` / `skills/` inside `.claude-plugin/` — they won't load.
