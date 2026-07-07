# Generate Multi-Runtime Manifests

You are a multi-runtime plugin packaging expert. Generate the Codex, Antigravity, and Cursor
manifests for the marketplace's local plugins from the Claude Code source of truth, keeping every
runtime in sync.

## Background

This repository ships the **same plugin set across four runtimes**. The Claude Code manifest is the
**single source of truth**; the others are **generated** and must never be hand-edited.

| Runtime      | Manifest path                          | Companion files                       |
|--------------|----------------------------------------|---------------------------------------|
| Claude Code  | `.claude-plugin/plugin.json` (or root `plugin.json`) | `hooks/hooks.json`, inline `mcpServers` |
| Codex        | `.codex-plugin/plugin.json`            | `.mcp.json` (when MCP present)        |
| Antigravity  | `plugin.json` (root)                   | `mcp_config.json`, root `hooks.json`  |
| Cursor       | `.cursor-plugin/plugin.json`           | none — components auto-discovered     |

Shared assets (`commands/`, `agents/`, `skills/`, `hooks/`) live once at the plugin root and are
referenced by every manifest. Only manifest-level fields differ per runtime.

## Your Task

### 1. Run the generator

> **New plugin? Wire its `.claude-plugin/marketplace.json` entry first.** The generator resolves
> each plugin's metadata (notably `category`) from the marketplace entry. A plugin dir not yet
> listed there is generated with no entry — its Codex manifest falls back to the default category
> and it is omitted from the emitted Codex/Cursor marketplace files. Add the entry, then run:

```bash
bun scripts/cli.ts multi-format
```

For every local plugin (`source: "./plugins/..."` in `.claude-plugin/marketplace.json`) this emits:

- `plugins/<name>/.codex-plugin/plugin.json` (+ `.mcp.json` when the plugin defines `mcpServers`)
- `plugins/<name>/plugin.json` + `mcp_config.json` + root `hooks.json` (Antigravity)
- `plugins/<name>/.cursor-plugin/plugin.json`
- `.agents/plugins/marketplace.json` (Codex marketplace, local plugins only)
- `.cursor-plugin/marketplace.json` (Cursor marketplace, local plugins only)

The generator only writes files whose content actually changed, and prints per-plugin status
(`wrote N file(s)` / `up to date` / `skipped`).

### 2. Scope the diff to your change

⚠️ **`multi-format` rewrites all local plugins, not just the one you touched.** If the committed
artifacts had pre-existing drift, the command produces a large unrelated diff. Keep the change
atomic:

```bash
git status --short
# Revert churn from plugins you did NOT intend to change:
git restore plugins/<other-plugin>/...
```

Commit only the files for the plugin(s) you actually changed.

### 3. Claude-only fields do not propagate

Fields that exist only in the Claude runtime — notably `relevance` (plugin suggestion signals) — are
intentionally **not** copied to the Codex/Cursor marketplaces. Author them only in
`.claude-plugin/marketplace.json`.

### 4. Verify

```bash
claude plugin validate .claude-plugin/marketplace.json
claude plugin validate plugins/<name>
```

## When to Run

- After scaffolding a new plugin (`/plugin-dev:scaffold`)
- After editing any plugin's Claude manifest (name, version, description, `mcpServers`, hooks)
- After adding, removing, or reordering a plugin entry in `.claude-plugin/marketplace.json`

Do **not** hand-edit `.codex-plugin/`, `.cursor-plugin/`, root Antigravity `plugin.json`, or the
generated marketplaces — re-run this command instead.

Now, run the generator, scope the diff to the intended plugin(s), and report what changed.
