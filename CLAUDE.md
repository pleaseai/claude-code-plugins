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
│   ├── chrome-devtools-mcp/   # Chrome DevTools automation
│   └── context7/              # Up-to-date library documentation
├── plugins/                    # Built-in plugins (maintained in this repo)
│   ├── gatekeeper/            # Auto-approve safe commands
│   ├── plugin-dev/            # Plugin development tools
│   └── ...                    # Framework-specific plugins (antfu, nuxt, vue, etc.)
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
- `external-plugins/context7/` → https://github.com/pleaseai/context7

## Claude Code Plugin Development Guide

### Adding a New Plugin to the Marketplace

When integrating an existing MCP server or tool as a Claude Code plugin:

1. **Add as Git Submodule:**
   ```bash
   git submodule add git@github.com:org/tool-repo.git external-plugins/plugin-name
   cd external-plugins/plugin-name
   ```

2. **Create Plugin Structure:**
   ```bash
   mkdir -p .claude-plugin hooks
   ```

3. **Create plugin.json:**
   ```json
   {
     "name": "plugin-name",
     "version": "1.0.0",
     "description": "Brief description of the plugin",
     "author": {
       "name": "Author Name",
       "url": "https://github.com/author"
     },
     "homepage": "https://tool-website.com",
     "repository": "https://github.com/org/tool-repo",
     "license": "MIT",
     "keywords": ["keyword1", "keyword2"],
     "mcpServers": {
       "server-name": {
         "command": "npx",
         "args": ["-y", "@org/package-name"],
         "env": {
           "API_KEY": "${PLUGIN_API_KEY:-}"
         }
       }
     }
   }
   ```

4. **Create Skill for Intelligent Activation (Recommended):**

   Create `skills/[plugin-name]/SKILL.md`:
   ```markdown
   ---
   name: Plugin Name Feature
   description: Brief description of what this plugin does. Use when [specific scenarios]. Triggers on mentions of [keywords, features, use cases].
   allowed-tools: mcp__plugin_name__tool-1, mcp__plugin_name__tool-2
   ---

   # Plugin Name - Feature Description

   Always use [plugin-name] MCP tools automatically when [specific scenarios].

   ## When to Use
   - Scenario 1: Specific use case
   - Scenario 2: Another use case
   - Scenario 3: Framework/library specific

   ## How to Use
   1. Use `tool-1` to perform action
   2. Use `tool-2` to complete workflow
   3. Apply results as needed

   ## Important Notes
   - Note about API keys or configuration
   - Performance considerations
   - Best practices
   ```

   **Why Skills over SessionStart Hooks:**
   - ✅ Claude loads skill only when relevant to the task
   - ✅ Significantly reduces token usage
   - ✅ Simpler maintenance (single markdown file)
   - ✅ Intelligent activation based on context
   - ✅ Clear trigger patterns in description

   **Legacy Approach (SessionStart Hook - Not Recommended):**

   <details>
   <summary>Click to see SessionStart hook approach (deprecated)</summary>

   Create `hooks/hooks.json`:
   ```json
   {
     "description": "Load plugin usage instructions at session start",
     "hooks": {
       "SessionStart": [
         {
           "matcher": "startup",
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

   **Limitations:**
   - ❌ Loads on every session start regardless of need
   - ❌ Wastes tokens even when plugin is not relevant
   - ❌ Requires shell script + JSON output complexity
   </details>

   Make script executable:
   ```bash
   chmod +x hooks/context.sh
   ```

5. **Update Plugin README:**
   Add Claude Code installation instructions:
   ```markdown
   #### Claude Code Plugin

   Install as a Claude Code plugin:

   \`\`\`sh
   claude
   /plugin marketplace add pleaseai/claude-code-plugins
   /plugin install plugin-name@pleaseai
   \`\`\`

   This automatically loads usage instructions on session start.

   Optionally set API key (if required):
   \`\`\`sh
   export PLUGIN_API_KEY="your-api-key"
   \`\`\`
   ```

6. **Commit Plugin Changes:**
   ```bash
   git add .claude-plugin/ hooks/ README.md
   git commit -m "feat: add Claude Code plugin configuration"
   git push origin main
   ```

7. **Create Upstream PR (if forked):**
   ```bash
   gh pr create --repo original-org/tool-repo \
     --title "feat: add Claude Code plugin configuration" \
     --body "Add Claude Code plugin support with automatic integration..."
   ```

8. **Update Marketplace Configuration:**
   In the main repository root:
   ```bash
   # Update marketplace.json
   # Add entry to plugins array
   git add .claude-plugin/marketplace.json external-plugins/plugin-name
   git commit -m "feat: add plugin-name to marketplace"
   ```

### Best Practices

**MCP Server Integration:**
- Use `npx` for MCP servers published to npm
- Use `${PLUGIN_VAR:-}` pattern for optional environment variables
- Always specify `-y` flag with npx to avoid interactive prompts

**Skills (Recommended):**
- Use gerund form for skill name ("Processing PDFs", "Analyzing Code")
- Include specific triggers in description for intelligent activation
- Specify `allowed-tools` for automatic MCP tool permissions
- Keep SKILL.md under 500 lines for token efficiency

**SessionStart Hooks (Legacy - Not Recommended):**
- Use Skills instead for better token efficiency and intelligent activation
- Only use hooks for non-MCP tool automation (validation, formatting, etc.)

**Directory Structure:**
- `.claude-plugin/plugin.json` must be at this exact path
- `hooks/`, `commands/`, `agents/` directories at plugin root
- Use `${CLAUDE_PLUGIN_ROOT}` for all path references

**Hooks Auto-Loading:**
- `hooks/hooks.json` is auto-loaded by Claude Code — do NOT reference it in `plugin.json`'s `hooks` field
- `plugin.json`'s `hooks` field should only reference ADDITIONAL hook files beyond the standard path

**Documentation:**
- Include Claude Code installation in plugin README
- Explain automatic features (SessionStart hooks)
- Document optional environment variables clearly

**Testing:**
- Test the full installation flow
- Verify SessionStart hook loads correctly
- Test with and without environment variables

### Example: Context7 Plugin

See `external-plugins/context7/` for a complete example of:
- NPX-based MCP server integration
- **Skill-based intelligent activation** (recommended approach)
- Optional API key configuration
- Upstream PR contribution

Reference documentation: @docs/lessons-learned/context7.md

**Note**: Context7 was migrated from SessionStart hooks to Skills for better token efficiency. See the lessons learned doc for the evolution and comparison.

## Development Standards

This project follows strict development standards documented in:
- @docs/commit-convention.md
- @docs/STANDARDS.md
- @docs/TDD.md
- @docs/TESTING.md
- @docs/plugins.md - Complete Claude Code plugin reference (manifest schema, components, development tools)
- @docs/lessons-learned/ - Practical guides from plugin development experiences

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