# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code plugin marketplace repository providing bundled plugins that extend Claude Code with specialized tools and automation. The repository contains:

- **Marketplace Configuration**: Managed via `.claude-plugin/marketplace.json`
- **External Plugins**: All plugins are maintained as git submodules in `external-plugins/` directory
- **Web Application**: Nuxt-based marketplace frontend in `apps/web/`
- **Hooks System**: Session initialization hooks in `hooks/`

### Directory Structure

```
claude-code-plugins/
├── external-plugins/           # All plugins (git submodules)
│   ├── nanobanana/            # Image generation plugin
│   ├── flutter/               # Flutter development tools
│   ├── security/              # Security analysis
│   ├── spec-kit/              # Spec-driven development
│   ├── code-review/           # Code review automation
│   ├── firebase/              # Firebase integration
│   ├── postgres/              # PostgreSQL MCP server
│   ├── grafana/               # Grafana integration
│   ├── mcp-neo4j/             # Neo4j MCP server
│   └── chrome-devtools-mcp/   # Chrome DevTools automation
├── apps/web/                  # Marketplace website
├── .claude-plugin/            # Marketplace configuration
└── hooks/                     # Session hooks
```

## Architecture

### Plugin Structure

Each plugin follows this standard structure:
```
external-plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json          # Claude Code plugin manifest
├── gemini-extension.json    # Gemini CLI extension manifest (legacy)
├── README.md                # Plugin documentation
├── commands/                # Slash commands (markdown files)
├── hooks/                   # Hook configurations
└── mcp-server/             # MCP server implementation
    ├── package.json
    ├── src/
    │   ├── index.ts        # Main server entry
    │   └── *.ts            # Implementation modules
    └── dist/               # Compiled output
```

### Key Components

**1. plugin.json (Claude Code)**
- Located in `.claude-plugin/plugin.json`
- Required for Claude Code plugins
- Defines plugin metadata (name, version, description)
- Configures MCP servers with command and args
- Specifies `contextFileName` for AI context loading
- Defines hooks for lifecycle events

**2. gemini-extension.json (Gemini CLI - Legacy)**
- Original Gemini CLI extension manifest
- Kept for backwards compatibility with Gemini CLI
- Not used by Claude Code

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
bun install

# Development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Generate static site
bun run generate
```

### Plugin Development

All plugins are maintained in separate repositories and included as git submodules:

- `external-plugins/nanobanana/` → https://github.com/pleaseai/nanobanana-plugin
- `external-plugins/security/` → https://github.com/pleaseai/security-plugin
- `external-plugins/flutter/` → https://github.com/pleaseai/flutter-plugin
- `external-plugins/code-review/` → https://github.com/pleaseai/code-review-plugin
- `external-plugins/spec-kit/` → https://github.com/pleaseai/spec-kit-plugin
- `external-plugins/firebase/` → https://github.com/pleaseai/firebase-plugin
- `external-plugins/postgres/` → https://github.com/pleaseai/postgres-plugin
- `external-plugins/grafana/` → https://github.com/amondnet/mcp-grafana
- `external-plugins/mcp-neo4j/` → https://github.com/amondnet/mcp-neo4j
- `external-plugins/chrome-devtools-mcp/` → https://github.com/pleaseai/chrome-devtools-mcp

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
cd external-plugins/<plugin-name>
bun run test

# Type checking across plugins
bun run typecheck
```

## Key Files

- `.claude-plugin/marketplace.json` - Marketplace configuration and plugin registry
- `apps/web/nuxt.config.ts` - Nuxt application configuration
- `external-plugins/*/gemini-extension.json` - Plugin manifests (legacy)
- `external-plugins/*/.claude-plugin/plugin.json` - Plugin manifests (Claude Code)
- `hooks/hooks.json` - Session start hooks
- `docs/commit-convention.md` - Commit message guidelines
- `docs/TDD.md` - Test-driven development methodology
- `.nvmrc` - Node.js version specification (v22)

## Notes

- This repository serves as both a plugin marketplace and a collection of plugin implementations
- Each plugin can be independently versioned and released
- MCP servers provide the runtime interface between Claude Code and plugin functionality
- Plugins are designed to be easily toggled on/off by users