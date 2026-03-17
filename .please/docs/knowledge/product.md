# Product Guide: Claude Code Plugins Marketplace

## Vision
A curated marketplace of plugins for Claude Code, providing custom collections of slash commands, agents, MCP servers, and hooks to enhance developer workflows.

## Target Users
- **Claude Code users** who want to extend their AI-assisted development with specialized tools
- **Plugin developers** who build and distribute Claude Code extensions
- **Teams** adopting Claude Code across projects needing standardized tooling

## Core Features
1. **Plugin Marketplace**: Centralized registry for discovering and installing Claude Code plugins
2. **Plugin Types**: Support for external (git submodule), built-in, vendor-synced, and Gemini CLI extension plugins
3. **Sync System**: Automated artifact generation from Gemini CLI extensions and vendor skill sources
4. **Web Frontend**: Nuxt-based marketplace website for browsing and discovering plugins
5. **Plugin Development Tools**: CLI tooling (`scripts/cli.ts`) for init, sync, check, and cleanup workflows

## Product Goals
- Lower the barrier to extending Claude Code with community and first-party plugins
- Provide a reliable, automated pipeline for syncing plugin artifacts from upstream sources
- Maintain high-quality plugin standards through validation and review
