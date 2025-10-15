# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code plugin marketplace repository providing bundled plugins that extend Claude Code with specialized tools and automation. The repository contains:

- **Marketplace Configuration**: Managed via `.claude-plugin/marketplace.json`
- **Plugin Collection**: Multiple plugins in `plugins/` directory (nanobanana, security, flutter, code-review)
- **Web Application**: Nuxt-based marketplace frontend in `apps/web/`
- **Hooks System**: Session initialization hooks in `hooks/`

## Architecture

### Plugin Structure

Each plugin follows this standard structure:
```
plugins/<plugin-name>/
├── gemini-extension.json    # Plugin manifest
├── README.md                 # Plugin documentation
├── commands/                 # Slash commands (markdown files)
├── hooks/                    # Hook configurations
└── mcp-server/              # MCP server implementation
    ├── package.json
    ├── src/
    │   ├── index.ts         # Main server entry
    │   └── *.ts             # Implementation modules
    └── dist/                # Compiled output
```

### Key Components

**1. plugin.json (Claude Code format)**
- Located in `.claude-plugin/plugin.json`
- Defines plugin metadata (name, version, description)
- Configures MCP servers with command and args
- Specifies `contextFileName` for AI context loading
- Defines hooks for lifecycle events

**2. gemini-extension.json (Gemini CLI format)**
- Original Gemini CLI extension metadata
- Used for backwards compatibility
- Context file fallback if not specified in plugin.json

**3. MCP Servers**
- Node.js-based servers using `@modelcontextprotocol/sdk`
- Compiled TypeScript from `mcp-server/src/` to `mcp-server/dist/`
- Run via `node mcp-server/dist/index.js`

**4. Commands**
- Markdown files in `commands/` directory
- Define slash commands accessible in Claude Code
- Command names derived from file structure (e.g., `commands/security/analyze.md` → `/security:analyze`)

**5. Hooks**
- Defined in `plugin.json` under `hooks` key
- Common hooks: `SessionStart`, `PostToolUse`
- Can execute shell commands or load context
- Example: `hooks/context.sh` loads context files automatically

**6. Context Files**
- Plugins can specify a `contextFileName` in their `plugin.json`
- Context files (e.g., `GEMINI.md`, `flutter.md`) provide AI-specific instructions
- Automatically loaded via SessionStart hooks
- Enables seamless migration from Gemini CLI extensions to Claude Code plugins

### Web Application

The marketplace website is built with:
- **Framework**: Nuxt 4 (Vue 3)
- **UI**: Nuxt UI v4
- **Content**: Nuxt Content for markdown pages
- **Database**: better-sqlite3
- **Node**: Version 22.x (specified in `.nvmrc`)

## Common Commands

### Web Application
```bash
# Navigate to web app
cd apps/web

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```

### Plugin Development

Each plugin is maintained in its own repository. For plugin-specific development commands and setup, refer to each plugin's repository:
- `plugins/nanobanana/` → https://github.com/pleaseai/nanobanana
- `plugins/security/` → https://github.com/pleaseai/security-plugin
- `plugins/flutter/` → https://github.com/pleaseai/flutter
- `plugins/code-review/` → https://github.com/pleaseai/code-review-plugin
- `plugins/spec-kit/` → https://github.com/pleaseai/spec-kit-plugin

## Development Standards

This project follows strict development standards documented in:
- @docs/commit-convention.md
- @docs/STANDARDS.md
- @docs/TDD.md
- @docs/TESTING.md
- @docs/plugins.md - Complete Claude Code plugin reference (manifest schema, components, development tools)

## Plugin Installation

Users can add this marketplace and install plugins:

```bash
# Add marketplace
/plugin marketplace add pleaseai/claude-code-plugins

# Install a plugin
/plugin install nanobanana@pleaseai
/plugin install gemini-cli-security@pleaseai
```

## Testing Commands

```bash
# For plugins with tests
cd plugins/<plugin-name>
npm run test

# Type checking across plugins
npm run typecheck
```

## Key Files

- `.claude-plugin/marketplace.json` - Marketplace configuration and plugin registry
- `apps/web/nuxt.config.ts` - Nuxt application configuration
- `plugins/*/gemini-extension.json` - Plugin manifests
- `hooks/hooks.json` - Session start hooks
- `docs/commit-convention.md` - Commit message guidelines
- `docs/TDD.md` - Test-driven development methodology
- `.nvmrc` - Node.js version specification (v22)

## Notes

- This repository serves as both a plugin marketplace and a collection of plugin implementations
- Each plugin can be independently versioned and released
- MCP servers provide the runtime interface between Claude Code and plugin functionality
- Plugins are designed to be easily toggled on/off by users