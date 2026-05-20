# bun

Version-aware skill for the Bun JavaScript/TypeScript toolkit — runtime, package manager, test runner, and bundler. Ships a single `use-bun` skill that uses the [`ask`](https://github.com/pleaseai/ask) CLI to pin docs and source to the exact Bun version installed in the project.

## Compatibility

The `SKILL.md` format is shared by Claude Code, Cursor, Codex CLI, Gemini CLI, Google Antigravity, and Windsurf. The same skill content works in all of them — only the install path / manifest format differs per tool.

| Tool | Manifest | Skills path |
|------|----------|-------------|
| Claude Code | `.claude-plugin/plugin.json` | `./skills/` |
| Codex | `.codex-plugin/plugin.json` | `./skills/` |
| Antigravity | _(none — discovers by file location)_ | copy `./skills/use-bun/` into `.agents/skills/` or `~/.gemini/antigravity/skills/` |

## Install

### Claude Code

```bash
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install bun@pleaseai
```

### Codex CLI

Install via the Codex marketplace using this repository, or manually copy the plugin contents into your Codex plugins directory. See the [Codex plugin docs](https://developers.openai.com/codex/plugins/build) for the local install layout.

### Antigravity

Antigravity discovers skills by directory location — there is no per-plugin manifest. Copy `skills/use-bun/` into one of:

- **Workspace scope** (project-only): `<workspace-root>/.agents/skills/use-bun/`
- **Global scope** (all projects): `~/.gemini/antigravity/skills/use-bun/`

```bash
# Workspace install (run from your project root)
mkdir -p .agents/skills
cp -R <path-to-this-plugin>/skills/use-bun .agents/skills/

# Global install
mkdir -p ~/.gemini/antigravity/skills
cp -R <path-to-this-plugin>/skills/use-bun ~/.gemini/antigravity/skills/
```

See the [Authoring Google Antigravity Skills](https://codelabs.developers.google.com/getting-started-with-antigravity-skills) codelab for background.

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- [`ask`](https://github.com/pleaseai/ask) CLI for version-pinned docs/source reads (recommended)

## What's inside

```
plugins/bun/
├── .claude-plugin/plugin.json     # Claude Code manifest
├── .codex-plugin/plugin.json      # Codex manifest
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

The `${CLAUDE_SKILL_DIR}` env var referenced in `SKILL.md` is a Claude Code convention. Antigravity uses similar conventions (notably it sets `${CLAUDE_SKILL_DIR}` in many runners for cross-compat). If your Antigravity install does not set it, the helper script can also be invoked by relative path from the skill directory: `./scripts/resolve-bun-version.sh`.
