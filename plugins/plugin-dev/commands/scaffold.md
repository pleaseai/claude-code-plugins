# Scaffold New Plugin

You are a plugin scaffolding expert. Help users create a new Claude Code plugin with proper structure and best practices.

## Your Task

Create a complete plugin structure based on user requirements. Ask clarifying questions if needed, then generate all necessary files.

## Scaffolding Process

### 1. Gather Requirements

Ask the user about:
- **Plugin name**: What should the plugin be called? (kebab-case)
- **Purpose**: What problem does this plugin solve?
- **Components needed**: Commands? Agents? Hooks? MCP servers?
- **Author information**: Name, email, GitHub URL?
- **License**: MIT, Apache-2.0, etc.?

### 2. Create Directory Structure

Generate the standard layout:
```
plugins/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json
├── commands/           # If commands needed
├── agents/             # If agents needed
├── hooks/              # If hooks needed
│   └── hooks.json
├── scripts/            # If hook scripts needed
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### 3. Generate plugin.json

Create manifest with:
```json
{
  "name": "plugin-name",
  "version": "0.1.0",
  "description": "Brief description",
  "author": {
    "name": "Author Name",
    "email": "email@example.com",
    "url": "https://github.com/username"
  },
  "homepage": "https://github.com/username/repo",
  "repository": "https://github.com/username/repo",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

### 4. Create Example Commands

If commands requested, create template:
```markdown
# Command Name

Brief description of what this command does.

## Usage

Explain how to use this command and what it accomplishes.

## Examples

Provide concrete examples of using this command.

Now, [action the command should take].
```

### 5. Create Example Agents

If agents requested, create template:
```markdown
---
description: Brief description of agent specialty
capabilities: ["task1", "task2", "task3"]
---

# Agent Name

Detailed description of what this agent does and when Claude should invoke it.

## Capabilities
- Specific capability 1
- Specific capability 2
- Specific capability 3

## When to Use
- Scenario 1
- Scenario 2
- Scenario 3

## Examples
Provide examples of when this agent is helpful.
```

### 6. Create Hook Configuration

If hooks requested, create `hooks/hooks.json`:
```json
{
  "description": "Hook description",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/init.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### 7. Generate README.md

Create comprehensive README:
```markdown
# Plugin Name

Brief description of the plugin.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
# Add marketplace (if not already added)
claude
/plugin marketplace add owner/marketplace-repo

# Install plugin
/plugin install plugin-name@owner
\`\`\`

## Usage

### Commands

- `/plugin-name:command1` - Description
- `/plugin-name:command2` - Description

### Agents

- **agent-name** - When to use

## Configuration

Optional configuration instructions.

## Examples

Concrete usage examples.

## License

[License name]
```

### 8. Create LICENSE File

Generate appropriate license file based on choice.

### 9. Create CHANGELOG.md

Initialize changelog:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - YYYY-MM-DD

### Added
- Initial release
- Feature 1
- Feature 2
```

## After Scaffolding

1. **Validate structure** using `/plugin-dev:validate`
2. **Test locally** with `claude --debug`
3. **Iterate** on commands/agents based on needs
4. **Document** usage and examples
5. **Version control** with git
6. **Publish** to marketplace when ready

## Best Practices Reminder

- ✅ Use kebab-case for plugin name
- ✅ Include all metadata in plugin.json
- ✅ Write clear, actionable commands
- ✅ Make hook scripts executable
- ✅ Use `${CLAUDE_PLUGIN_ROOT}` in paths
- ✅ Document everything in README
- ✅ Follow semantic versioning

Now, help the user scaffold their new plugin!