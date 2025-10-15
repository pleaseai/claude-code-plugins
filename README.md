# Claude Code Plugins Marketplace

[![GitHub stars](https://img.shields.io/github/stars/pleaseai/claude-code-plugins?style=social)](https://github.com/pleaseai/claude-code-plugins)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/pleaseai/claude-code-plugins)](https://github.com/pleaseai/claude-code-plugins/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/pleaseai/claude-code-plugins)](https://github.com/pleaseai/claude-code-plugins/pulls)

A curated marketplace of plugins for [Claude Code](https://www.anthropic.com/news/claude-code-plugins), providing custom collections of slash commands, agents, MCP servers, and hooks to enhance your development workflow.

**Repository:** [https://github.com/pleaseai/claude-code-plugins](https://github.com/pleaseai/claude-code-plugins)

## Overview

This marketplace is maintained by Passion Factory and provides bundled plugins that extend Claude Code's capabilities with specialized tools and automation.

## Available Plugins

### Nano Banana
Generate and manipulate images using the Gemini 2.5 Flash Image model directly from Claude Code.

**Repository:** [pleaseai/nanobanana](https://github.com/pleaseai/nanobanana)

### Security Analysis
AI-powered security analysis for code changes and pull requests, identifying vulnerabilities and security risks.

**Repository:** [pleaseai/security-plugin](https://github.com/pleaseai/security-plugin)

### Flutter Development
Flutter and Dart-related commands and context for enhanced mobile development workflow.

**Repository:** [pleaseai/flutter](https://github.com/pleaseai/flutter)

### Code Review
Comprehensive code review plugin for Claude Code with specialized review agents.

**Repository:** [pleaseai/code-review-plugin](https://github.com/pleaseai/code-review-plugin)

### Spec Kit
Toolkit to help you get started with Spec-Driven Development.

**Repository:** [pleaseai/spec-kit-plugin](https://github.com/pleaseai/spec-kit-plugin)

## Installation

### Add This Marketplace

```bash
/plugin marketplace add pleaseai/claude-code-plugins
```

### Install a Plugin

Once the marketplace is added, install any plugin with:

```bash
/plugin install nanobanana@pleaseai
/plugin install gemini-cli-security@pleaseai
/plugin install flutter@pleaseai
/plugin install code-review@pleaseai
/plugin install speckit@pleaseai
```

## What Are Claude Code Plugins?

Claude Code plugins are customizable extensions that can include:

- **Slash Commands**: Create shortcuts for frequent operations
- **Subagents**: Purpose-built agents for specialized tasks
- **MCP Servers**: Connect to external tools and data sources
- **Hooks**: Customize Claude Code's workflow behavior
- **Context Files**: AI-specific instructions loaded automatically on session start

Plugins can be easily toggled on and off as needed, making them perfect for:
- Enforcing team coding standards
- Supporting open source package usage
- Sharing productivity workflows
- Connecting internal tools
- Bundling related customizations

### Context File Support

Many plugins in this marketplace include context files that provide AI-specific instructions:

- **Automatic Loading**: Context files are loaded via SessionStart hooks
- **Gemini CLI Compatibility**: Supports plugins converted from Gemini CLI extensions
- **Visual Indication**: Plugins with context files show a "Context" badge in the marketplace
- **Examples**: `GEMINI.md`, `flutter.md` with specialized AI instructions

## Creating Your Own Plugin

To create and distribute your own plugins:

1. Create a GitHub repository
2. Add a `.claude-plugin/plugin.json` file with your plugin configuration
3. (Optional) Add `contextFileName` field to enable automatic context loading
4. Users can add your marketplace with `/plugin marketplace add <username>/<repo-name>`

### Example plugin.json with Context File

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "contextFileName": "CONTEXT.md",
  "mcpServers": { ... },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/context.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

For detailed documentation on creating plugins, visit:
- [Plugin Marketplace Documentation](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces#github-repositories)
- [Claude Code Plugins Announcement](https://www.anthropic.com/news/claude-code-plugins)

## Marketplace Configuration

This marketplace is configured via `.claude-plugin/marketplace.json`:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "pleaseai",
  "version": "0.1.0",
  "description": "Bundled plugins for Claude Code",
  "owner": {
    "name": "Passion Factory",
    "email": "support@passionfactory.ai"
  },
  "plugins": [...]
}
```

## Support

For questions or issues:
- Email: support@passionfactory.ai
- Repository Issues: [Create an issue](https://github.com/pleaseai/claude-code-plugins/issues)

## License

This marketplace is licensed under the [MIT License](LICENSE).

Please refer to individual plugin repositories for their respective licenses.

---

