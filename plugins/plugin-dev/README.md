# plugin-dev

Best practices, guidelines, and validation tools for Claude Code plugin development.

## Overview

`plugin-dev` is a comprehensive toolkit for Claude Code plugin developers. It provides commands, validation hooks, and expert guidance to help you create high-quality plugins that follow best practices.

## Features

- 🎯 **Best Practices Guidance** - Expert advice on plugin development
- ✅ **Plugin Validation** - Automated manifest and structure validation
- 🏗️ **Plugin Scaffolding** - Quick-start templates for new plugins
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

## Commands

### `/plugin-dev:best-practices`

Get comprehensive guidance on Claude Code plugin development best practices.

**Use cases:**
- Learning plugin development standards
- Reviewing plugin architecture decisions
- Understanding component best practices
- Getting answers to specific development questions

**Example:**
```
/plugin-dev:best-practices

How should I structure my plugin's hooks for optimal performance?
```

### `/plugin-dev:validate`

Perform comprehensive validation of your plugin structure and configuration.

**Validates:**
- ✅ Plugin manifest (plugin.json) correctness
- ✅ Directory structure compliance
- ✅ Command file formats
- ✅ Hook configurations
- ✅ MCP server definitions
- ✅ Documentation completeness

**Example:**
```
/plugin-dev:validate

Please validate my plugin at ./plugins/my-plugin
```

### `/plugin-dev:scaffold`

Generate a new plugin with proper structure and best practices baked in.

**Creates:**
- Complete directory structure
- plugin.json manifest
- Example commands
- Hook templates
- README and documentation
- License and changelog

**Example:**
```
/plugin-dev:scaffold

I need a new plugin called "api-tools" that provides commands for API testing
```

### `/plugin-dev:migrate-gemini`

Migrate existing Gemini CLI extensions to Claude Code plugins.

**Handles:**
- Converting gemini-extension.json → plugin.json
- Migrating context files to SessionStart hooks
- Updating MCP server configurations
- Maintaining backwards compatibility
- Updating documentation

**Example:**
```
/plugin-dev:migrate-gemini

Help me migrate my Gemini extension at ./extensions/my-extension
```

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

1. **Create plugin structure**
   ```bash
   /plugin-dev:scaffold
   ```

2. **Develop components**
   - Add commands in `commands/`
   - Create agents in `agents/`
   - Configure hooks in `hooks/`

3. **Validate continuously**
   ```bash
   /plugin-dev:validate
   ```

4. **Test locally**
   ```bash
   claude --debug
   /plugin list
   /your-plugin:command
   ```

5. **Version and document**
   - Update version in plugin.json
   - Document changes in CHANGELOG.md
   - Update README with new features

6. **Publish**
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
**Solution**: Run `/plugin-dev:validate` to see specific issues

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
2. Validate your changes with `/plugin-dev:validate`
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
