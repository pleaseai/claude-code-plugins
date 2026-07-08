# plugin-dev

Best practices, guidelines, and validation tools for Claude Code plugin development.

## Overview

`plugin-dev` is a comprehensive toolkit for Claude Code plugin developers. It provides skills, validation hooks, and expert guidance to help you create high-quality plugins that follow best practices. The skills activate automatically when you describe a plugin-development task — no slash commands to remember.

## Features

- 🎯 **Best Practices Guidance** - Expert advice on plugin development
- ✅ **Plugin Validation** - Automated manifest and structure validation
- 🏗️ **Plugin Scaffolding** - Quick-start templates for new plugins
- 🌐 **Multi-Runtime Manifests** - Author once in Claude Code format, generate Codex, Antigravity, and Cursor manifests
- 🔄 **Gemini Migration** - Tools to migrate Gemini CLI extensions
- 🔍 **Real-time Validation** - Automatic validation when editing plugin files

## Installation

```bash
# Start Claude Code
claude

# Add marketplace (if not already added)
/plugin marketplace add pleaseai/claude-code-plugins

# Install plugin-dev
/plugin install plugin-dev@pleaseai
```

## Skills

These skills activate automatically when your request matches — just describe what you want to do.
Three focused skills, with deep material factored into `references/` (loaded on demand).

### `plugin-authoring`

The umbrella workflow: author, scaffold, or edit a plugin **once** in Claude Code format, then
generate the Codex, Antigravity, and Cursor manifests from it (`bun scripts/cli.ts multi-format`,
bundled in this plugin at `scripts/run.ts` + `scripts/multi-format.ts`). Covers scaffolding,
multi-format generation, and best practices inline, and points to its references:

- `references/plugin-json-spec.md` — manifest + marketplace field guide with canonical samples.
- `references/multi-runtime-manifests.md` — per-runtime mapping, the generator, diff scoping.
- `references/best-practices.md` — quality checklist, pitfalls, testing.

> "I need a new plugin called *api-tools* for API testing." · "Regenerate *plugins/api-tools*' Codex and Cursor manifests."

### `validating-plugins`

Audit a plugin's manifest, directory structure, commands, skills, hooks, and MCP config, with
findings grouped by severity.

> "Validate my plugin at ./plugins/my-plugin."

### `migrating-gemini-extensions`

Convert a Gemini CLI extension to a Claude Code plugin, preserving functionality and backwards
compatibility.

> "Help me migrate my Gemini extension at ./extensions/my-extension."

## Automatic Validation

The plugin includes a PostToolUse hook that automatically validates plugin manifests when they're modified. This helps catch issues early during development.

**Validates automatically:**
- JSON syntax correctness
- Required fields presence
- Semantic versioning format
- Kebab-case naming conventions
- Relative path usage

**Example output:**
```
❌ Plugin Manifest Validation Errors in ./plugins/my-plugin/.claude-plugin/plugin.json:
  - Missing required field: name

⚠️  Plugin Manifest Warnings:
  - Missing recommended field: version
  - Missing recommended field: description
```

## Best Practices Summary

### Plugin Manifest (plugin.json)
- ✅ Required: `name` field (kebab-case)
- ✅ Recommended: `version`, `description`, `author`
- ✅ Use semantic versioning (MAJOR.MINOR.PATCH)
- ✅ Include relevant keywords for discoverability

### Directory Structure
```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Must be at this exact path
├── commands/                # Slash commands (at root!)
├── agents/                  # Subagents (at root!)
├── hooks/                   # Hook configurations (at root!)
│   ├── hooks.json
│   └── scripts/
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### Component Paths
- ✅ Use relative paths starting with `./`
- ✅ Use `${CLAUDE_PLUGIN_ROOT}` for plugin paths
- ✅ Never use absolute paths
- ❌ Don't nest commands/agents/hooks in `.claude-plugin/`

### Hooks
- ✅ Make scripts executable (`chmod +x`)
- ✅ Return proper JSON with `hookSpecificOutput`
- ✅ Keep execution time under 1 second when possible
- ✅ Handle errors gracefully

### MCP Servers
- ✅ Prefer `npx -y` for npm packages
- ✅ Use `${VAR:-}` pattern for optional env vars
- ✅ Test server startup and tool availability

### Documentation
- ✅ Include installation instructions
- ✅ Document all commands with examples
- ✅ Provide usage scenarios
- ✅ Maintain CHANGELOG.md
- ✅ Specify license clearly

## Development Workflow

1. **Create plugin structure** — describe the plugin; the `plugin-authoring` skill activates.

2. **Develop components**
   - Add commands in `commands/`
   - Create agents in `agents/`
   - Add skills in `skills/`
   - Configure hooks in `hooks/`

3. **Generate multi-runtime manifests** (the `plugin-authoring` skill)
   ```bash
   bun scripts/cli.ts multi-format
   ```

4. **Validate continuously** — ask to validate the plugin (the `validating-plugins` skill), and run
   ```bash
   claude plugin validate plugins/<name>
   ```

5. **Test locally**
   ```bash
   claude --debug
   /plugin list
   /your-plugin:command
   ```

6. **Version and document**
   - Update version in plugin.json
   - Document changes in CHANGELOG.md
   - Update README with new features

7. **Publish**
   - Add to marketplace
   - Tag release in git
   - Share with community

## Common Issues

### Commands not appearing
**Problem**: Commands in `.claude-plugin/commands/` instead of root
**Solution**: Move `commands/` directory to plugin root

### Hook not executing
**Problem**: Script not executable or wrong output format
**Solution**:
```bash
chmod +x hooks/script.sh
# Ensure JSON output with hookSpecificOutput
```

### MCP server fails
**Problem**: Absolute paths or missing `${CLAUDE_PLUGIN_ROOT}`
**Solution**: Update paths to use environment variable

### Validation errors
**Problem**: Invalid JSON or missing required fields
**Solution**: Ask to validate the plugin (the `validating-plugins` skill) to see specific issues

## Resources

- [Claude Code Plugins Documentation](https://docs.claude.com/en/docs/claude-code/plugins)
- [Plugin Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
- [Plugin Marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [MCP Documentation](https://modelcontextprotocol.io/)

## Examples

See these plugins for real-world examples:

- **context7** - SessionStart hooks for automatic context loading
- **nanobanana** - Image generation with MCP server
- **spec-kit** - Complex workflow orchestration
- **flutter** - Language-specific development tools

## Contributing

Contributions welcome! Please:

1. Follow the best practices outlined in this plugin
2. Validate your changes (the `validating-plugins` skill)
3. Update documentation
4. Add examples for new features

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: https://github.com/pleaseai/claude-code-plugins/issues
- Documentation: https://docs.claude.com/en/docs/claude-code/plugins
- Community: Join the Claude Code community discussions

---

**Built with ❤️ by Passion Factory**
