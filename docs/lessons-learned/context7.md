# Lessons Learned: Context7 Claude Code Plugin Development

## Overview

This document captures key learnings from developing the Context7 Claude Code plugin, focusing on plugin architecture, MCP server integration, and best practices.

## Key Learnings

### 1. MCP Server Execution Patterns

**NPX vs HTTP Transport**

When integrating MCP servers, there are two primary approaches:

- **NPX (Local Execution)** - Recommended for most plugins
  ```json
  {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp"]
  }
  ```

- **HTTP (Remote Server)**
  ```json
  {
    "command": "claude",
    "args": ["mcp", "add", "--transport", "http", "context7", "https://mcp.context7.com/mcp"]
  }
  ```

**When to use NPX:**
- Standard pattern for Claude Code plugins
- Fewer network hops (direct API calls)
- Works offline with caching
- Consistent with other plugins in the ecosystem

**Important Note:** Even with NPX, the MCP server may still call external APIs (like Context7 does with `https://context7.com/api`). The "local" part refers to where the MCP protocol adapter runs, not data sources.

### 2. SessionStart Hooks for Automatic Context Loading

**Problem:** Users need to remember to ask Claude to use specific MCP tools.

**Solution:** Use SessionStart hooks to automatically load usage instructions.

**Implementation Pattern:**

```json
// hooks/hooks.json
{
  "description": "Load Context7 usage instructions at session start",
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

```bash
# hooks/context.sh
#!/usr/bin/env bash
set -euo pipefail

CONTEXT_FILE="${CLAUDE_PLUGIN_ROOT}/hooks/CONTEXT7.md"

if [ -f "$CONTEXT_FILE" ]; then
    CONTEXT_CONTENT=$(cat "$CONTEXT_FILE")

    jq -n --arg context "$CONTEXT_CONTENT" '{
      "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": $context
      }
    }'
fi
```

**Key Points:**
- Keep the shell script minimal and focused
- Don't rely on `contextFileName` in plugin.json - handle it directly in the hook
- Return proper JSON format with `hookSpecificOutput` structure
- Make scripts executable (`chmod +x`)

### 3. Environment Variable Patterns for API Keys

**Pattern for Optional API Keys:**

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp",
        "--api-key",
        "${CONTEXT7_API_KEY:-}"
      ],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY:-}"
      }
    }
  }
}
```

**Why this works:**
- `${VAR:-}` expands to empty string if unset
- MCP servers can handle empty string as "no API key provided"
- Users can optionally set the environment variable for enhanced features
- No error if variable is missing

### 4. Plugin Directory Structure Best Practices

```
external-plugins/context7/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (required)
├── hooks/
│   ├── hooks.json              # Hook configuration
│   ├── context.sh              # SessionStart hook script
│   └── CONTEXT7.md             # Usage instructions
├── README.md                   # Documentation with installation guide
└── (source code of the tool itself)
```

**Critical Rules:**
- `.claude-plugin/plugin.json` is required and must be in this exact location
- `hooks/`, `commands/`, `agents/` directories must be at plugin root, NOT inside `.claude-plugin/`
- Use `${CLAUDE_PLUGIN_ROOT}` in all path references for portability

### 5. Documentation and Installation Instructions

**Installation Flow for Users:**

```sh
# 1. Start Claude Code
claude

# 2. Add marketplace (one-time setup)
/plugin marketplace add pleaseai/claude-code-plugins

# 3. Install specific plugin
/plugin install context7@pleaseai
```

**Important:** There is no `claude plugin install` command. The `/plugin` commands are used inside Claude Code sessions.

**Alternative (if marketplace already added):**
```sh
claude
/plugin install context7@pleaseai
```

### 6. Git Submodule Workflow for Marketplace Plugins

When adding a plugin to the marketplace that's developed in a separate repository:

1. **Add as submodule:**
   ```bash
   git submodule add git@github.com:org/plugin-repo.git external-plugins/plugin-name
   ```

2. **Make changes in submodule:**
   ```bash
   cd external-plugins/plugin-name
   # make changes
   git add .
   git commit -m "feat: add plugin"
   git push origin main
   ```

3. **Update marketplace.json:**
   ```json
   {
     "plugins": [
       {
         "name": "plugin-name",
         "description": "Description",
         "source": {
           "source": "github",
           "repo": "org/plugin-repo"
         }
       }
     ]
   }
   ```

4. **Commit submodule reference in main repo:**
   ```bash
   git add .claude-plugin/marketplace.json external-plugins/plugin-name
   git commit -m "feat: add plugin to marketplace"
   ```

5. **Create PR to upstream if forked:**
   ```bash
   cd external-plugins/plugin-name
   gh pr create --repo original-org/plugin-repo ...
   ```

### 7. Common Pitfalls and Solutions

#### Pitfall: Copying complex hook scripts from other plugins
**Problem:** Scripts like `context.sh` from other plugins may include legacy code for `contextFileName` fallback logic that's unnecessary for new plugins.

**Solution:** Write minimal, focused hook scripts that do exactly what you need:
```bash
#!/usr/bin/env bash
set -euo pipefail

CONTEXT_FILE="${CLAUDE_PLUGIN_ROOT}/hooks/CONTEXT.md"

if [ -f "$CONTEXT_FILE" ]; then
    CONTEXT_CONTENT=$(cat "$CONTEXT_FILE")
    jq -n --arg context "$CONTEXT_CONTENT" '{
      "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": $context
      }
    }'
fi
```

#### Pitfall: Confusion between NPX and HTTP transport
**Problem:** Thinking NPX means everything runs locally and HTTP means everything is remote.

**Solution:** Understand that both patterns may call external APIs. NPX runs the MCP protocol adapter locally, but the adapter can still make network requests.

#### Pitfall: Assuming `contextFileName` is required
**Problem:** Including `contextFileName` in plugin.json when using custom hooks.

**Solution:** If your hook script directly reads the context file, `contextFileName` is redundant. Only include it if you're using the standard context loading mechanism.

## Best Practices Summary

1. **Use NPX for MCP servers** unless there's a specific reason to use HTTP
2. **Implement SessionStart hooks** for automatic tool usage
3. **Keep hook scripts minimal** and focused on their specific purpose
4. **Use environment variables** with `${VAR:-}` pattern for optional configuration
5. **Follow standard directory structure** with `.claude-plugin/` for manifest only
6. **Document installation clearly** with the correct command patterns
7. **Test the full user flow** from marketplace add to plugin usage
8. **Use submodules** for plugins developed in separate repositories
9. **Create upstream PRs** when contributing to third-party tool repositories

## Context7-Specific Insights

1. **Automatic Tool Usage:** By loading instructions on SessionStart, Claude automatically uses Context7 MCP tools without explicit user prompts
2. **API Key Optional:** Context7 works without an API key but provides higher rate limits with one
3. **Documentation Focus:** Context7 is about fetching up-to-date library documentation, so emphasize this in the context instructions
4. **Integration Pattern:** The plugin demonstrates how to wrap existing npm-published MCP servers with enhanced Claude Code integration

## References

- [Claude Code Plugin Documentation](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Context7 Repository](https://github.com/upstash/context7)
- [Plugin Marketplace Schema](https://anthropic.com/claude-code/marketplace.schema.json)

## Date

Created: October 16, 2025
Plugin: Context7
PR: https://github.com/upstash/context7/pull/786
