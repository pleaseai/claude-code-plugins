# bun

[![tessl](https://img.shields.io/endpoint?url=https%3A%2F%2Fapi.tessl.io%2Fv1%2Fbadges%2Fpleaseai%2Fbun)](https://tessl.io/registry/pleaseai/bun)

Version-aware skill for the Bun JavaScript/TypeScript toolkit — runtime, package manager, test runner, and bundler. Ships a single `use-bun` skill that uses the [`ask`](https://github.com/pleaseai/ask) CLI to pin docs and source to the exact Bun version installed in the project.

## Compatibility

The `SKILL.md` format is shared by Claude Code, Cursor, Codex CLI, Gemini CLI, Google Antigravity, and Windsurf. The same skill content works in all of them — only the install path / manifest format differs per tool.

| Tool | Manifest | Skills path |
|------|----------|-------------|
| Claude Code | `.claude-plugin/plugin.json` | `./skills/` |
| Codex | `.codex-plugin/plugin.json` | `./skills/` |
| Antigravity | `plugin.json` (at plugin root) | `./skills/` |
| Tessl | `.tessl-plugin/plugin.json` | `skills/use-bun` |

All tools read the same `skills/use-bun/SKILL.md`. Antigravity additionally accepts `mcp_config.json`, `hooks.json`, and `rules/` at plugin root if needed (this plugin uses none of them). Tessl publishes the skill to its registry as `pleaseai/bun` (see [Tessl](#tessl) below).

## Install

### Claude Code

```bash
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install bun@pleaseai
```

### Codex CLI

Install via the Codex marketplace using this repository, or manually copy the plugin contents into your Codex plugins directory. See the [Codex plugin docs](https://developers.openai.com/codex/plugins/build) for the local install layout.

### Antigravity

Antigravity recognises this directory as a plugin via the root `plugin.json` marker file. Copy the entire plugin directory into Antigravity's plugin location, or copy only the skill if you prefer skill-level install:

**Plugin install** (recommended — preserves the `plugin.json` namespace):

```bash
# Workspace scope (project-only)
mkdir -p .agents/plugins
cp -R <path-to-this-plugin> .agents/plugins/bun

# Global scope (all projects)
mkdir -p ~/.gemini/antigravity/plugins
cp -R <path-to-this-plugin> ~/.gemini/antigravity/plugins/bun
```

**Skill-only install** (skip the plugin namespace, drop the skill directly):

```bash
mkdir -p ~/.gemini/antigravity/skills
cp -R <path-to-this-plugin>/skills/use-bun ~/.gemini/antigravity/skills/
```

See the [Antigravity plugins docs](https://antigravity.google/docs/plugins) and the [Authoring Skills](https://codelabs.developers.google.com/getting-started-with-antigravity-skills) codelab for background.

### Tessl

This plugin ships a [Tessl](https://tessl.io) manifest (`.tessl-plugin/plugin.json`) so the `use-bun` skill can be published to and installed from the Tessl registry as `pleaseai/bun`.

```bash
# Install from the registry
tessl install pleaseai/bun

# Validate / publish from this directory (maintainers)
tessl plugin lint plugins/bun
tessl plugin publish            # requires `tessl login` or a TESSL_TOKEN
```

The manifest `version` is kept in sync with the other manifests by release-please (it is a `$.version` extra-file alongside `.claude-plugin`, `.codex-plugin`, and root `plugin.json`). Tessl caps a skill's `description` at 1024 characters, so `skills/use-bun/SKILL.md` keeps its description within that limit.

CI automates this (requires a `TESSL_TOKEN` repo secret; both jobs no-op without it):

- **`.github/workflows/tessl-publish.yml`** — publishes to the registry when release-please tags a release (`bun-v*`).
- **`.github/workflows/tessl-skill-review.yml`** — runs the [`tesslio/skill-review`](https://github.com/tesslio/skill-review) action on PRs that touch `plugins/bun/skills/**`, posting the skill's quality score as a PR comment.

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- [`ask`](https://github.com/pleaseai/ask) CLI for version-pinned docs/source reads (recommended)

## What's inside

```
plugins/bun/
├── .claude-plugin/plugin.json     # Claude Code manifest
├── .codex-plugin/plugin.json      # Codex manifest
├── plugin.json                     # Antigravity marker file
├── .tessl-plugin/plugin.json      # Tessl plugin manifest (pleaseai/bun)
├── README.md                       # this file
└── skills/use-bun/
    ├── SKILL.md                    # entry point — universal across all tools
    ├── scripts/
    │   └── resolve-bun-version.sh  # bundled helper, called via ${CLAUDE_SKILL_DIR}
    └── references/
        ├── versions.md             # ask CLI version pinning + bun-vX.Y.Z tag recipe
        ├── runtime-apis.md         # Bun.serve, Bun.file, Bun.spawn, bun:sqlite, Bun.SQL, …
        ├── package-manager.md      # install, workspaces, catalogs, isolated installs
        ├── test-runner.md          # bun:test, mocks, snapshots, coverage
        ├── bundler.md              # Bun.build, --compile executables, plugins, macros
        └── node-compat.md          # node:* module status, JSC vs V8
```

## Notes on Antigravity portability

Antigravity skills use the same `SKILL.md` schema as Claude Code: YAML frontmatter with `name` (optional, defaults to directory name) and `description` (required). The skill body is Markdown. This skill follows that schema, so it works in Antigravity without modification.

The plugin marker file (`plugin.json` at plugin root) is minimal — `{"name": "bun"}` — since Antigravity only requires the file to exist to recognise the directory as a plugin namespace.

The `${CLAUDE_SKILL_DIR}` env var referenced in `SKILL.md` is a Claude Code convention. Antigravity uses similar conventions (notably it sets `${CLAUDE_SKILL_DIR}` in many runners for cross-compat). If your Antigravity install does not set it, the helper script can also be invoked by relative path from the skill directory: `./scripts/resolve-bun-version.sh`.
