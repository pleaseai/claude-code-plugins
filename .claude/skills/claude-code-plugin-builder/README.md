# Plugin Builder Skill

Comprehensive skill for developing professional Claude Code plugins.

## Overview

This skill provides expert guidance for creating, developing, testing, and distributing Claude Code plugins. It covers all aspects of plugin development including manifest structure, component development, testing workflows, and distribution strategies.

## Files

- **SKILL.md**: Main skill file with complete plugin development guide
- **examples.md**: Real-world examples and patterns for all plugin types
- **templates.md**: Ready-to-use shell scripts and templates for quick plugin creation
- **README.md**: This file

## When Claude Uses This Skill

Claude will automatically invoke this skill when:

- Creating new Claude Code plugins
- Adding plugin components (commands, agents, skills, hooks, MCP servers)
- Structuring plugin directories
- Writing or updating plugin.json manifests
- Setting up plugin marketplaces
- Debugging plugin loading issues
- Migrating from Gemini CLI to Claude Code
- Troubleshooting plugin development problems

## Skill Contents

### SKILL.md

Complete plugin development guide covering:

- Plugin architecture and components
- Directory structure rules
- Creating new plugins step-by-step
- Component development guides:
  - Commands (user-invoked actions)
  - Agents (specialized subagents)
  - Skills (model-invoked expertise)
  - Hooks (event handlers)
  - MCP Servers (external integrations)
- Testing and debugging workflows
- Plugin marketplace creation
- Distribution strategies
- Migration from Gemini CLI
- Troubleshooting common issues
- Best practices and patterns

### examples.md

Real-world plugin examples:

1. **Simple Command Plugin**: Basic plugin with just commands
2. **Hook-Based Plugin**: Automatic code formatting
3. **MCP Server Plugin**: External API integration
4. **Comprehensive Plugin**: Full-featured plugin with all components
5. **Migration Example**: Converting Gemini extension to Claude Code
6. **NPX-Based MCP Plugin**: Simple wrapper for npm packages
7. **Development Marketplace**: Local testing setup

### templates.md

Ready-to-use templates and scripts:

1. **Minimal Plugin**: Bare minimum structure
2. **Command-Only Plugin**: Just slash commands
3. **Hook Plugin**: Event-driven automation
4. **MCP Plugin**: External service integration
5. **Complete Plugin**: All components included
6. **Development Marketplace**: Local testing environment
7. **Gemini Migration Script**: Automated migration tool

## Quick Start

### Creating a New Plugin

Ask Claude:
```
Create a new Claude Code plugin called "my-tools" with commands for linting and testing
```

### Adding Components

Ask Claude:
```
Add a security scanner agent to my plugin
Add a SessionStart hook that loads context
Add an MCP server for GitHub API
```

### Testing Plugin

Ask Claude:
```
Help me set up a local marketplace to test my plugin
```

### Debugging

Ask Claude:
```
My plugin isn't loading, help me debug it
The hooks aren't firing, what's wrong?
```

## Example Usage

### Example 1: Create Simple Plugin

**User**: "Create a new plugin called 'code-quality' with commands for linting and formatting"

**Claude** (using this skill):
1. Creates plugin directory structure
2. Generates plugin.json with metadata
3. Creates lint.md and format.md commands
4. Adds README with installation instructions
5. Provides testing instructions

### Example 2: Add MCP Integration

**User**: "Add PostgreSQL database integration via MCP to my plugin"

**Claude** (using this skill):
1. Updates plugin.json with mcpServers config
2. Adds commands for database operations
3. Documents environment variables
4. Provides usage examples
5. Explains testing approach

### Example 3: Migrate from Gemini

**User**: "I have a Gemini CLI extension, help me convert it to Claude Code"

**Claude** (using this skill):
1. Analyzes gemini-extension.json
2. Creates .claude-plugin/plugin.json
3. Migrates GEMINI.md to SessionStart hook
4. Updates README with new instructions
5. Provides testing checklist

## Development Workflow

The skill guides users through this workflow:

1. **Plan**: Decide what components the plugin needs
2. **Structure**: Create proper directory layout
3. **Manifest**: Write plugin.json with metadata
4. **Components**: Develop commands, agents, skills, hooks, MCP servers
5. **Test**: Set up local marketplace and test thoroughly
6. **Document**: Write comprehensive README
7. **Distribute**: Publish to marketplace or repository

## Testing

The skill provides guidance for:

- Setting up local development marketplaces
- Testing individual components
- Using debug mode (`claude --debug`)
- Iterative development workflow
- Component-specific testing checklists

## Best Practices

The skill enforces:

- Proper directory structure (components at root, not in .claude-plugin/)
- Using ${CLAUDE_PLUGIN_ROOT} for portability
- Writing specific skill descriptions with triggers
- Making hook scripts executable
- Using environment variable patterns for optional config
- Following semantic versioning
- Comprehensive documentation

## Integration with Project

This skill is part of the claude-code-plugins project and:

- Follows project standards (STANDARDS.md, TDD.md)
- Uses patterns from existing plugins in external-plugins/
- References docs/plugins.md for detailed specifications
- Incorporates lessons from docs/lessons-learned/

## Resources Referenced

- [Claude Code Plugins](https://docs.claude.com/en/docs/claude-code/plugins)
- [Plugin Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
- [Plugin Marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- [Skills Guide](https://docs.claude.com/en/docs/claude-code/skills)
- [Slash Commands](https://docs.claude.com/en/docs/claude-code/slash-commands)
- [Hooks Reference](https://docs.claude.com/en/docs/claude-code/hooks)
- [MCP Documentation](https://modelcontextprotocol.io/)

## Version History

- **v1.1.0 (2025-10-17)**: Optimized following Agent Skills best practices
  - Reduced SKILL.md from 1,018 to 402 lines (60% reduction)
  - Enhanced description with concrete triggers
  - Implemented progressive disclosure pattern
  - Added concise workflows with checklists
  - Emphasized MCP tool name format: `ServerName:tool_name`
- v1.0.0 (2025-10-17): Initial plugin builder skill with comprehensive guides, examples, and templates

## Contributing

To improve this skill:

1. Add new examples to examples.md
2. Create new templates in templates.md
3. Update best practices in SKILL.md
4. Document common issues and solutions

## License

This skill is part of the claude-code-plugins project and follows the project license.