# Claude Code Plugins Marketplace

A curated marketplace of plugins for [Claude Code](https://www.anthropic.com/news/claude-code-plugins), providing custom collections of slash commands, agents, MCP servers, and hooks to enhance your development workflow.

## Overview

This marketplace is maintained by Passion Factory and provides bundled plugins that extend Claude Code's capabilities with specialized tools and automation.

## Available Plugins

### Nano Banana

Generate and manipulate images using the Gemini 2.5 Flash Image model directly from Claude Code.

**Features:**
- Image generation from text prompts
- Image manipulation and editing
- Powered by Gemini 2.5 Flash

**Repository:** [pleaseai/nanobanana](https://github.com/pleaseai/nanobanana)

## Installation

### Add This Marketplace

```bash
/plugin marketplace add pleaseai/claude-code-plugins
```

### Install a Plugin

Once the marketplace is added, install any plugin with:

```bash
/plugin install nanobanana@pleaseai
```

## What Are Claude Code Plugins?

Claude Code plugins are customizable extensions that can include:

- **Slash Commands**: Create shortcuts for frequent operations
- **Subagents**: Purpose-built agents for specialized tasks
- **MCP Servers**: Connect to external tools and data sources
- **Hooks**: Customize Claude Code's workflow behavior

Plugins can be easily toggled on and off as needed, making them perfect for:
- Enforcing team coding standards
- Supporting open source package usage
- Sharing productivity workflows
- Connecting internal tools
- Bundling related customizations

## Creating Your Own Plugin

To create and distribute your own plugins:

1. Create a GitHub repository
2. Add a `.claude-plugin/marketplace.json` file with your plugin configuration
3. Users can add your marketplace with `/plugin marketplace add <username>/<repo-name>`

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

