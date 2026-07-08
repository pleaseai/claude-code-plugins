# Plugin manifest & marketplace spec (Claude Code)

The Claude Code manifest at `.claude-plugin/plugin.json` is the **single source of truth**. The
Codex, Antigravity, and Cursor manifests are generated from it — never hand-write them (see
`multi-runtime-manifests.md`).

## `.claude-plugin/plugin.json` — full sample

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "plugin-name",
  "version": "1.2.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@org/package"],
      "env": { "API_KEY": "${PLUGIN_API_KEY:-}" }
    }
  }
}
```

## Field guide

- `$schema` (`string`, optional) — `https://json.schemastore.org/claude-code-plugin-manifest.json`.
  For editor autocomplete/validation only; Claude Code ignores it at load time.
- `name` (`string`, **required**) — kebab-case, no spaces; the canonical short package name
  (`next`, not `nextjs`). Used as the component namespace (`/<name>:<command>`).
- `version` (`string`) — semver `MAJOR.MINOR.PATCH`.
- `description` (`string`) — one-line purpose summary.
- `author` (`object`) — `name`, `email`, `url`. Note: the multi-format generator strips `email`
  from downstream Codex/Antigravity/Cursor manifests, keeping only `name` + a validated https `url`.
- `homepage`, `repository`, `license` (`string`).
- `keywords` (`string[]`) — for discoverability.
- `mcpServers` (`object | string`) — inline server map, or a path string to an external file.
  Use `npx -y` for npm packages and `${VAR:-}` for optional env vars.

### Component fields — usually omit them

`commands/`, `agents/`, `skills/`, `hooks/hooks.json` are **auto-discovered** from default folders at
the plugin root. Only set an explicit `commands` / `agents` / `skills` / `hooks` path when using a
non-default location. When set, paths must start with `./`, be relative, and use
`${CLAUDE_PLUGIN_ROOT}` inside command/hook scripts.

## Marketplace entry (`.claude-plugin/marketplace.json`)

Each local plugin has an entry in the `plugins[]` array. Order = render order — append new entries.

```json
{
  "name": "plugin-name",
  "description": "Brief description",
  "category": "tooling",
  "keywords": ["plugin", "development"],
  "tags": ["tooling"],
  "source": "./plugins/plugin-name",
  "relevance": {
    "topic": "Stripe",
    "signals": {
      "cli": ["stripe"],
      "hosts": ["api.stripe.com"],
      "filesRead": ["**/stripe.config.*"],
      "manifestDeps": [{ "file": "[/\\\\]package\\.json$", "pattern": "\"stripe\"\\s*:" }]
    }
  }
}
```

- `source` — `"./plugins/<name>"` for a local plugin.
- `category` — stored lower-case here; surfaced capitalised in the generated Codex/Cursor manifests.
- `relevance` (optional, **Claude-only**) — [plugin suggestion signals](https://code.claude.com/docs/en/plugin-relevance).
  Only add **high-signal** triggers; a plugin with no reliable trigger should have no `relevance`
  block. The generator intentionally does **not** propagate `relevance` to Codex/Cursor. Signal
  types: `cwd`, `cli`, `hosts`, `filesRead`, `manifestDeps` (`file` + `pattern` RegExp source; escape
  backslashes twice in JSON).

## Validation

```bash
claude plugin validate plugins/<name>
claude plugin validate .claude-plugin/marketplace.json
```
