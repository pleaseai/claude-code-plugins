# Multi-runtime manifests & the generator

This repository ships the **same plugin directory across four runtimes**. The Claude Code manifest
is the source of truth; the others are generated.

| Runtime      | Manifest path                | Companion files                       | Status |
|--------------|------------------------------|---------------------------------------|--------|
| Claude Code  | `.claude-plugin/plugin.json` | `hooks/hooks.json`, inline `mcpServers` | **source of truth** |
| Codex        | `.codex-plugin/plugin.json`  | `.mcp.json` (when MCP present)        | generated |
| Antigravity  | `plugin.json` (root)         | `mcp_config.json`, root `hooks.json`  | generated |
| Cursor       | `.cursor-plugin/plugin.json` | none — components auto-discovered     | generated |

Shared assets (`commands/`, `agents/`, `skills/`, `hooks/`) live **once** at the plugin root and are
referenced by every manifest. Only manifest-level fields differ per runtime. Each generated manifest
carries its own `$schema`:

- Claude source — `https://json.schemastore.org/claude-code-plugin-manifest.json`
- Antigravity root `plugin.json` — `https://antigravity.google/schemas/v1/plugin.json`

## Where the generator lives

The generator is bundled **inside plugin-dev** so the plugin is self-contained:

- `plugins/plugin-dev/scripts/multi-format.ts` — the per-runtime format-mapping rules.
- `plugins/plugin-dev/scripts/run.ts` — the CLI wrapper / entry point.

Run it either way (same code):

```bash
bun scripts/cli.ts multi-format          # repo-root entry (delegates into the plugin)
bun plugins/plugin-dev/scripts/run.ts    # plugin-local entry
```

For every local plugin (`source: "./plugins/..."`) it emits:

- `plugins/<name>/.codex-plugin/plugin.json` (+ `.mcp.json` when the plugin defines `mcpServers`)
- `plugins/<name>/plugin.json` + `mcp_config.json` + root `hooks.json` (Antigravity)
- `plugins/<name>/.cursor-plugin/plugin.json`
- `.agents/plugins/marketplace.json` (Codex marketplace, local plugins only)
- `.cursor-plugin/marketplace.json` (Cursor marketplace, local plugins only)

It writes only files whose content changed, and prints per-plugin status
(`wrote N file(s)` / `up to date` / `skipped`).

## New plugin? Wire the marketplace entry FIRST

The generator resolves each plugin's metadata (notably `category`) from the marketplace entry. A
plugin dir not yet listed in `.claude-plugin/marketplace.json` is generated with no entry — its
Codex manifest falls back to the default category and it is omitted from the emitted Codex/Cursor
marketplaces. Add the entry, then run the generator.

## Scope the diff to your change

⚠️ **`multi-format` rewrites all local plugins, not just the one you touched.** If the committed
artifacts had pre-existing drift, the command produces a large unrelated diff. Keep it atomic:

```bash
git status --short
git restore plugins/<other-plugin>/...   # revert churn from plugins you did NOT intend to change
```

Commit only the files for the plugin(s) you actually changed.

## Claude-only fields do not propagate

Fields that exist only in the Claude runtime — notably `relevance` — are intentionally **not**
copied to the Codex/Cursor marketplaces. Author them only in `.claude-plugin/marketplace.json`.

## Companion files that move together (new plugin)

See `.claude/rules/marketplace-sync.md`:

- `release-please-config.json` + `.release-please-manifest.json` — a `plugins/<name>` entry whose
  `extra-files` cover every version-bearing manifest the plugin ships (`.claude-plugin/plugin.json`
  and, when multi-format generates them, `.codex-plugin/plugin.json` + root `plugin.json` +
  `.cursor-plugin/plugin.json`). Only if the plugin is release-managed.
- `README.md` — add the plugin under **Built-in Plugins**.

## Do not hand-edit generated files

Never edit `.codex-plugin/`, `.cursor-plugin/`, the root Antigravity `plugin.json`, or the generated
`.agents/plugins/marketplace.json` / `.cursor-plugin/marketplace.json` — re-run the generator.
