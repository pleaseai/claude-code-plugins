---
name: use-tessl
description: 'Use the Tessl CLI to build, validate, and publish agent-native plugins and skills, and to manage Tessl projects, workspaces, and the registry. Use when developers: (1) run tessl CLI commands — `tessl init`, `tessl login`, `tessl plugin new|lint|pack|publish|info`, `tessl skill new|import|lint|review|publish`, `tessl install|search|uninstall|list|outdated|update`, `tessl workspace`, `tessl org`, `tessl eval`, `tessl scenario`, `tessl mcp start`, `tessl doctor`; (2) author Tessl content — `.tessl-plugin/plugin.json` manifests, `skills/<name>/SKILL.md`, `rules/*.md`; (3) develop a plugin locally with `tessl install file:./my-plugin` and iterate; (4) publish to the Tessl registry, bump versions (`--bump patch|minor|major`), or set up CI publishing with `tesslio/setup-tessl` and the `tesslio/skill-review` GitHub Actions; (5) migrate a legacy `tile.json` with `tessl tile migrate`. Triggers on: "tessl", "tessl plugin", "tessl skill", "tessl publish", "tessl install", "tessl init", ".tessl-plugin", "SKILL.md", "tessl registry", "tessl workspace", "setup-tessl", "skill-review", "tessl eval", "tile migrate".'
---

# Using the Tessl CLI

Tessl is an agent-native, spec-driven development platform. Its CLI (`tessl`) creates, validates, and
publishes **plugins** — reusable packages that codify team standards and procedural knowledge for coding
agents. A plugin can contain **skills** (step-by-step agent workflows), **rules** (always-loaded coding
standards), and — coming soon — **hooks** and **MCP tools**.

This skill helps you drive that CLI correctly: scaffolding plugins/skills, developing them locally,
linting and packing, and publishing to the Tessl registry (manually or from CI).

## Prerequisites

Verify the CLI is installed and you are authenticated before running anything that touches the registry:

```bash
which tessl                 # confirm the CLI is on PATH
tessl --version             # check installed version
tessl doctor                # run diagnostics (auth, project link, environment)
tessl whoami                # confirm the authenticated user (alias: tessl auth whoami)
```

If `tessl` is not installed, point the user at the official install instructions at
<https://docs.tessl.io> — do not guess an install command. In CI, install via the
[`tesslio/setup-tessl`](https://github.com/tesslio/setup-tessl) GitHub Action (see
[`references/ci-publishing.md`](references/ci-publishing.md)).

Authenticate interactively with `tessl login` (alias `tessl auth login`). For non-interactive/CI use,
create an API key with `tessl api-key create` and pass it through `setup-tessl`'s `token` input.

## Critical: Verify Commands Against the Live CLI

Tessl is evolving quickly — command names, flags, and the plugin manifest schema change between releases
(the CLI still ships a `tessl tile migrate` shim for the legacy `tile.json` → `.tessl-plugin/plugin.json`
rename). **Do not invent flags or assume a command exists.** Before generating any command:

1. Check the live help: `tessl --help`, `tessl <command> --help`, `tessl <command> <subcommand> --help`.
2. Cross-reference the official docs at <https://docs.tessl.io/reference/cli-commands> for the current
   surface. The reference files in this skill ([`references/`](references/)) summarise the commands but the
   live `--help` output is authoritative when they disagree.
3. Prefer non-destructive dry runs first: `tessl plugin publish --dry-run` before a real publish.
4. If you cannot confirm a command or flag from `--help` or the docs, say so instead of guessing.

## Topic Map

Load the focused reference for what you're doing — do not read them all upfront.

| Topic | Reference | When |
|-------|-----------|------|
| Full CLI command surface | [`references/cli-commands.md`](references/cli-commands.md) | Looking up any command, subcommand, or flag |
| Authoring & publishing plugins | [`references/plugins.md`](references/plugins.md) | `plugin new/lint/pack/publish`, `.tessl-plugin/plugin.json`, local dev loop |
| Authoring & reviewing skills | [`references/skills.md`](references/skills.md) | `skill new/import/lint/review/publish`, `SKILL.md` format, rules |
| CI publishing | [`references/ci-publishing.md`](references/ci-publishing.md) | `setup-tessl` + `skill-review` GitHub Actions, publish-on-push |

## Core Workflows

### Set up a repository for an agent

```bash
tessl init --agent claude --name my-project   # configure repo + coding agent
tessl project link                            # link the repo to a Tessl project (or `create`/`repair`)
```

### Create and develop a plugin locally

The local loop is: **create → install from filesystem → test → lint/pack → iterate**.

```bash
# Scaffold a plugin (interactive wizard, or pass --name/--path)
tessl plugin new --name myworkspace/my-plugin --path ./my-plugin

# Add a skill to it
tessl skill new --name my-skill --path ./my-plugin/skills/my-skill

# Install it from the local filesystem to test in your repo
tessl install file:./my-plugin

# Validate structure and package before publishing
tessl plugin lint ./my-plugin
tessl plugin pack --output ./dist ./my-plugin
```

Expected layout (see [`references/plugins.md`](references/plugins.md) for the manifest fields):

```
my-plugin/
├── .tessl-plugin/
│   └── plugin.json          # manifest: name (workspace/plugin), version, description, skills[]
├── rules/
│   └── standards.md         # always-loaded coding standards (optional)
└── skills/
    └── my-skill/
        └── SKILL.md          # YAML frontmatter (name, description) + Markdown body
```

### Review a skill before shipping

```bash
tessl skill lint ./skills/my-skill                 # validate against the skill spec
tessl skill review --optimize --max-iterations 3   # AI quality review + optional auto-optimisation
```

### Publish to the registry

```bash
tessl plugin publish --dry-run                 # preview without publishing
tessl plugin publish --bump minor              # publish + bump version (patch|minor|major)

# Or publish a single skill (imports it into a plugin manifest, then publishes)
tessl skill publish --workspace myworkspace --bump patch
```

Use `tessl plugin unpublish` (within 2 days) to retract, or `tessl plugin archive --reason "<text>"` to
retire a plugin while preserving existing installs. See [`references/plugins.md`](references/plugins.md).

### Consume plugins

```bash
tessl search --type skills <query>             # discover plugins in the registry
tessl install <workspace/plugin>               # add to the repo (or --global)
tessl list                                     # show installed plugins
tessl outdated && tessl update --yes           # check for and apply updates
```

## Decision Points

- **Plugin vs. single skill** — a plugin bundles many skills/rules under one `workspace/plugin` namespace;
  publish the whole plugin with `tessl plugin publish`. For a one-off skill, `tessl skill publish` imports
  it into a manifest and publishes in one step. Prefer a plugin when you have more than one related skill.
- **Local `file:` install vs. registry install** — use `tessl install file:./my-plugin` while iterating;
  switch to `tessl install <workspace/plugin>` once published. Re-run `tessl plugin lint` after each change.
- **Manual publish vs. CI publish** — for a shared repo, wire `tesslio/setup-tessl` + `tessl plugin publish`
  into a publish-on-push workflow so the registry stays in sync with `main`. Add `tesslio/skill-review` to
  gate PRs on skill quality. See [`references/ci-publishing.md`](references/ci-publishing.md).
- **Version bump** — `--bump patch` for fixes, `minor` for additive changes, `major` for breaking changes
  to a skill's contract. Always `--dry-run` first to confirm what will be published.

## Notes

- Workspaces (`tessl workspace create|list|add-member`) scope private plugin collections to an org; a
  plugin's `name` is `workspace/plugin`.
- `tessl eval` and `tessl scenario` evaluate plugins/skills against generated scenarios — useful before a
  major version bump. See [`references/cli-commands.md`](references/cli-commands.md).
- `tessl mcp start` launches Tessl's MCP server so agents can call registry/search tools directly.
