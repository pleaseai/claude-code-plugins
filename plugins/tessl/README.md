# tessl

Skill for the [Tessl](https://tessl.io) CLI — the agent-native, spec-driven development platform. Ships a
single `use-tessl` skill that teaches agents to create, develop, lint, pack, and publish Tessl **plugins**
and **skills** to the Tessl registry, and to wire up CI publishing with the `setup-tessl` and `skill-review`
GitHub Actions.

## Compatibility

The `SKILL.md` format is shared by Claude Code, Cursor, Codex CLI, Gemini CLI, Google Antigravity, and
Windsurf. The same skill content works in all of them — only the install path / manifest format differs.

| Tool | Manifest | Skills path |
|------|----------|-------------|
| Claude Code | `.claude-plugin/plugin.json` | `./skills/` |
| Codex | `.codex-plugin/plugin.json` | `./skills/` |
| Antigravity | `plugin.json` (at plugin root) | `./skills/` |

All three tools read the same `skills/use-tessl/SKILL.md`.

## Install

### Claude Code

```bash
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install tessl@pleaseai
```

### Codex CLI

Install via the Codex marketplace using this repository, or manually copy the plugin contents into your
Codex plugins directory. See the [Codex plugin docs](https://developers.openai.com/codex/plugins/build)
for the local install layout.

### Antigravity

Antigravity recognises this directory as a plugin via the root `plugin.json` marker file.

```bash
# Workspace scope (project-only)
mkdir -p .agents/plugins
cp -R <path-to-this-plugin> .agents/plugins/tessl

# Global scope (all projects)
mkdir -p ~/.gemini/antigravity/plugins
cp -R <path-to-this-plugin> ~/.gemini/antigravity/plugins/tessl
```

**Skill-only install:**

```bash
mkdir -p ~/.gemini/antigravity/skills
cp -R <path-to-this-plugin>/skills/use-tessl ~/.gemini/antigravity/skills/
```

## Prerequisites

- The `tessl` CLI installed and on `PATH` (`tessl --version`, `tessl doctor`). See <https://docs.tessl.io>.
- Authentication: `tessl login` interactively, or a `tessl api-key create` token for CI.

## What's inside

```
plugins/tessl/
├── .claude-plugin/plugin.json      # Claude Code manifest (source of truth)
├── .codex-plugin/plugin.json       # Codex manifest (generated)
├── plugin.json                      # Antigravity marker file (generated)
├── README.md                        # this file
└── skills/use-tessl/
    ├── SKILL.md                     # entry point — universal across all tools
    └── references/
        ├── cli-commands.md          # full CLI command surface (auth, plugin, skill, eval, …)
        ├── plugins.md               # authoring/publishing plugins, .tessl-plugin/plugin.json, local loop
        ├── skills.md                # SKILL.md format, skill new/import/lint/review/publish, rules
        └── ci-publishing.md         # setup-tessl + skill-review GitHub Actions, publish-on-push
```

The Codex (`.codex-plugin/plugin.json`) and Antigravity (`plugin.json`) manifests are generated from the
Claude manifest by `bun scripts/cli.ts multi-format` — do not hand-edit them.

## What it covers

- **Project setup** — `tessl init`, `tessl project link`, authentication, `tessl doctor`.
- **Plugin development** — `tessl plugin new/lint/pack/publish/info`, the local `file:` install loop, and
  the `.tessl-plugin/plugin.json` manifest schema.
- **Skill authoring** — `SKILL.md` format, `tessl skill new/import/lint/review/publish`, and rules.
- **Publishing** — registry publish with `--dry-run` and `--bump`, unpublish/archive, and CI publishing
  with [`tesslio/setup-tessl`](https://github.com/tesslio/setup-tessl) +
  [`tesslio/skill-review`](https://github.com/tesslio/skill-review).
