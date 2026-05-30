# Tessl CLI — Command Reference

Authoritative source: <https://docs.tessl.io/reference/cli-commands>. The live `tessl <command> --help`
output wins when it disagrees with this summary — Tessl ships frequently.

## Authentication

| Command | Description |
|---------|-------------|
| `tessl login` / `tessl auth login` | Authenticate with Tessl (interactive) |
| `tessl logout` / `tessl auth logout` | Sign out and clear credentials |
| `tessl whoami` / `tessl auth whoami` | Show the current authenticated user |
| `tessl api-key create\|list\|delete` | Manage API keys (use the key for CI / non-interactive auth) |

## Setup & Initialization

| Command | Description |
|---------|-------------|
| `tessl init [--agent <name>]... [--name <name>]` | Set up the repository and configure a coding agent (repeat `--agent` for multiple) |
| `tessl project create\|link\|repair` | Create, link, or repair the Tessl project association for the repo |

## Plugin development & management

| Command | Description |
|---------|-------------|
| `tessl plugin new` | Create a new plugin with an interactive wizard (accepts `--name <workspace/plugin>`, `--path`) |
| `tessl plugin lint [<source>]` | Validate plugin structure and contents |
| `tessl plugin pack [--output <path>]` | Package the plugin into a `.tgz` |
| `tessl plugin info [<name-or-path>]` | Show plugin details from the registry |
| `tessl plugin publish [--dry-run] [--bump patch\|minor\|major]` | Publish to the Tessl registry |
| `tessl plugin unpublish [--plugin <workspace/plugin@version>]` | Unpublish (allowed within 2 days) |
| `tessl plugin archive [--plugin <name>] --reason <text>` | Archive a plugin while preserving existing installs |
| `tessl tile migrate [--force]` | Legacy migration: `tile.json` → `.tessl-plugin/plugin.json` |

## Skill management

| Command | Description |
|---------|-------------|
| `tessl skill new [--name NAME] [--description DESC]...` | Create a new skill with a wizard (also `--workspace`, `--path`) |
| `tessl skill import [--workspace WS] [--public]` | Create `.tessl-plugin/plugin.json` from a local `SKILL.md` |
| `tessl skill lint [<path>]` | Validate skill structure against the spec |
| `tessl skill publish [--workspace WS] [--bump patch\|minor\|major]` | Import and publish a skill |
| `tessl skill review [--optimize] [--max-iterations <count>]` | AI review of skill quality and compliance (optional auto-optimise) |

## Plugin dependencies (consuming)

| Command | Description |
|---------|-------------|
| `tessl install [--global] <source>...` | Install plugins into the repo. `<source>` can be `workspace/plugin` or `file:./path` |
| `tessl search [--type skills\|docs\|rules] <query>` | Search the registry by name or URL |
| `tessl uninstall [--global] <workspace/plugin>` | Remove an installed plugin |
| `tessl list [--global] [--json]` | Show installed plugins |
| `tessl outdated [--json]` | Check for available updates |
| `tessl update [--yes] [--force] [--global]` | Update installed plugins to newer versions |

## Workspaces & organizations

| Command | Description |
|---------|-------------|
| `tessl workspace create [--org-id <uuid>]` | Create a private plugin collection |
| `tessl workspace list` | List workspaces you belong to |
| `tessl workspace add-member\|remove-member\|list-members` | Manage workspace access |
| `tessl workspace archive\|unarchive` | Archive or restore a workspace |
| `tessl org list` | List organizations you are a member of |

## Evaluation & scenarios

| Command | Description |
|---------|-------------|
| `tessl eval run [--agent <agent:model>]... <source>` | Run evaluations for a plugin/codebase (repeat `--agent`) |
| `tessl eval list\|view\|retry` | Manage evaluation runs |
| `tessl scenario generate\|list\|view\|download` | Generate and manage eval scenarios |

## Configuration & utilities

| Command | Description |
|---------|-------------|
| `tessl config get\|set\|list\|add\|remove` | Manage CLI settings |
| `tessl doctor [--json]` | Run diagnostics for troubleshooting |
| `tessl feedback [<message>]` | Send feedback to the Tessl team |
| `tessl cli update [--target <version>] [--channel <name>]` | Update the CLI itself |
| `tessl mcp start` | Launch the Model Context Protocol server |

## Common flags

- `--dry-run` — preview a publish/operation without writing to the registry. Use it before every publish.
- `--bump patch|minor|major` — version bump applied at publish time.
- `--global` — operate on the global (all-projects) scope rather than the current repo.
- `--json` — machine-readable output (available on `list`, `outdated`, `doctor`, and others).
- `--workspace <ws>` — target a specific workspace when publishing/importing.
