---
name: Validating Plugins
description: Thoroughly validate a Claude Code plugin's manifest, directory structure, commands, agents, skills, hooks, and MCP config, then report issues by severity. Use when the user asks to validate, check, audit, or lint a plugin, verify a plugin.json or plugin structure, debug why a plugin won't load, or mentions "plugin validate", "invalid manifest", or "plugin not loading".
---

# Validating a Plugin

Perform a comprehensive validation of the plugin and report findings grouped by severity. Start with
the CLI validator, then check what it does not cover.

```bash
claude plugin validate plugins/<name>
claude plugin validate .claude-plugin/marketplace.json
```

## 1. Manifest (`.claude-plugin/plugin.json`)

- ✅ Exists at the correct path (`.claude-plugin/plugin.json`, **not** root only).
- ✅ Valid JSON syntax.
- ✅ Required: `name` (string, kebab-case).
- ✅ Recommended: `version` (valid semver), `description`, `author`, `repository`, `keywords`.
- ✅ Optional `$schema` set to `https://json.schemastore.org/claude-code-plugin-manifest.json`.
- ✅ Custom component paths start with `./` and are relative.
- ✅ Env/command paths use `${CLAUDE_PLUGIN_ROOT}`.

## 2. Directory structure

- ✅ `.claude-plugin/` holds `plugin.json` only.
- ✅ `commands/`, `agents/`, `skills/`, `hooks/` are at the plugin **root**.
- ✅ `README.md` and `LICENSE` present.
- ❌ No commands/agents/skills/hooks nested inside `.claude-plugin/`.

## 3. Commands

For each `.md` in `commands/`: valid Markdown, kebab-case filename, clear actionable content,
frontmatter where useful, descriptive summary.

## 4. Skills

For each `skills/<name>/SKILL.md`: YAML frontmatter present with `name` (gerund form) and a
`description` that carries specific activation triggers; body under ~500 lines.

## 5. Hooks

- ✅ `hooks/hooks.json` is valid JSON.
- ✅ Hook scripts are executable (`chmod +x`).
- ✅ Scripts use `${CLAUDE_PLUGIN_ROOT}`.
- ✅ Output shape matches the hook spec (`hookSpecificOutput`).
- ⚠️ Hook event names are valid.

## 6. MCP servers

- ✅ Valid config in inline `mcpServers` or `.mcp.json`.
- ✅ Command paths exist; `npx -y` pattern where applicable.
- ✅ Optional env vars use the `${VAR:-}` pattern.

## 7. Agents & documentation

- ✅ Each agent has a clear description, capabilities, when-to-use guidance, and examples.
- ✅ README has installation instructions, usage examples, features, and a license; `CHANGELOG.md`
  recommended.

## Process

1. Scan the plugin directory (Glob/Read) and confirm required files exist.
2. Parse and validate the manifest fields, paths, and env vars.
3. Check component integrity and script permissions.
4. Report findings with specific `file:line` references and actionable fixes.

## Output format

```
# Plugin Validation Report: <plugin-name>

## Critical Issues ❌
- [FILE:LINE] Issue — Fix: specific solution

## Warnings ⚠️
- [FILE:LINE] Issue — Recommendation: suggested improvement

## Suggestions 💡
- [FILE:LINE] Enhancement — Suggestion: how to improve

## Summary
- Total: X · Critical: X · Warnings: X · Suggestions: X

## Next Steps
1. Fix critical issues first
2. Address warnings for quality
3. Consider suggestions
```
