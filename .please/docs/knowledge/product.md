# Product Guide: Claude Code Plugins Marketplace

## Vision

A curated, community-driven marketplace of plugins for Claude Code that extends AI-assisted development with specialized tools, slash commands, agents, MCP servers, and hooks.

## Target Users

- **Plugin consumers**: Developers using Claude Code who want to enhance their workflow with specialized tools (security analysis, code review, Firebase, Flutter, etc.)
- **Plugin authors**: Developers creating and distributing Claude Code plugins through the marketplace
- **Marketplace maintainers**: The Passion Factory team managing plugin curation, quality, and distribution

## Core Value Proposition

1. **One-command install**: Users add the marketplace and install plugins with simple `/plugin` commands
2. **Curated quality**: All plugins are reviewed and maintained to ensure compatibility and reliability
3. **Broad ecosystem**: From framework-specific tools (Flutter, Firebase) to general-purpose utilities (security, code review, image generation)
4. **Multi-source architecture**: Supports external plugins (git submodules), built-in plugins, vendor-synced skills, and auto-synced Gemini CLI extensions

## Key Features

- **Plugin Registry**: Central `marketplace.json` managing all available plugins
- **Web Marketplace**: Nuxt-based frontend for browsing and discovering plugins
- **Sync Pipeline**: Automated conversion of Gemini CLI extensions to Claude Code plugins
- **Plugin Development Tools**: Built-in tooling for creating, validating, and testing plugins

## Success Metrics

- Number of available plugins in the marketplace
- Plugin installation count and active usage
- Community contributions (PRs, new plugins)
- Plugin compatibility and stability across Claude Code versions
