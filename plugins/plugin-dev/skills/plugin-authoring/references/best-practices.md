# Plugin development best practices

Standards for reviewing a plugin or answering plugin-development questions. When reviewing, list
specific issues with `file:line` references, prioritise by severity, and include fix examples.

## Manifest (`.claude-plugin/plugin.json`)

- Required `name` (kebab-case, no spaces); canonical short package name (`next`, not `nextjs`).
- Quality metadata: `version` (semver), `description`, `author`, `repository`, relevant `keywords`.
- Optional `$schema`: `https://json.schemastore.org/claude-code-plugin-manifest.json`.
- Component paths start with `./` and are relative; `${CLAUDE_PLUGIN_ROOT}` for all plugin paths.

## Directory structure

- Manifest at `.claude-plugin/plugin.json`; components (`commands/`, `agents/`, `skills/`, `hooks/`)
  at the plugin **root** — never nested inside `.claude-plugin/`.
- Helper scripts in `scripts/` or `hooks/`; include `README.md`, `LICENSE`, `CHANGELOG.md`.

## Skills (preferred over SessionStart hooks)

- `skills/<name>/SKILL.md` with frontmatter: `name` in gerund form, `description` with specific
  activation triggers; keep the body under ~500 lines. Push deep material into a `references/`
  subfolder and point to it (progressive disclosure).
- Skills load only when relevant → lower token cost and intelligent activation. Prefer them to
  SessionStart hooks, which load every session regardless of need.
- Set `allowed-tools` when the skill drives specific MCP tools.

## Commands

- Markdown files, kebab-case names, auto-namespaced `/plugin-name:command`.
- Clear, focused prompts; include usage examples and parameter descriptions.

## Hooks

- Configure in `hooks/hooks.json` (auto-loaded) or inline in `plugin.json`.
- Make scripts executable (`chmod +x`); reference with `${CLAUDE_PLUGIN_ROOT}`.
- Return proper JSON (`hookSpecificOutput`); handle failures gracefully; keep fast (<1s).

## MCP servers

- `npx -y` for npm-published servers; `${VAR:-}` for optional env vars; `${CLAUDE_PLUGIN_ROOT}` for
  local servers. Verify the server starts and its tools are reachable.

## Documentation & distribution

- README: installation (marketplace commands), usage, features, examples. Maintain a changelog.
- Semantic versioning (MAJOR.MINOR.PATCH); tag releases; submit to the marketplace.

## Common pitfalls

- ❌ Absolute or hardcoded paths (missing `${CLAUDE_PLUGIN_ROOT}`).
- ❌ Commands/agents/skills/hooks inside `.claude-plugin/`.
- ❌ Non-executable hook scripts; invalid JSON; missing required manifest fields.
- ❌ Hand-editing generated Codex/Cursor/Antigravity manifests.

## Testing & validation

- Local: `claude --debug` to watch plugin loading; test every slash command and hook; confirm MCP
  tools are reachable. Run `claude plugin validate plugins/<name>` (see the `validating-plugins`
  skill for the full checklist).

## Key resources

- [Claude Code Plugins](https://docs.claude.com/en/docs/claude-code/plugins)
- [Plugin Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
- [Plugin Marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Plugin relevance / suggestions](https://code.claude.com/docs/en/plugin-relevance)
- [MCP Documentation](https://modelcontextprotocol.io/)
