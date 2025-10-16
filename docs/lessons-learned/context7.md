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

### 2. Skills vs SessionStart Hooks for Automatic Tool Usage

**Problem:** Users need to remember to ask Claude to use specific MCP tools.

**Solution Evolution:**

#### ❌ Initial Approach: SessionStart Hooks (Deprecated)

SessionStart hooks load context on every session:

```json
// hooks/hooks.json (OLD APPROACH - NOT RECOMMENDED)
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

**Limitations:**
- ❌ Loads on every session start regardless of need
- ❌ Wastes tokens even when not working with libraries
- ❌ Requires shell script + JSON output complexity
- ❌ No intelligent activation

#### ✅ Better Approach: Skills (Recommended)

Use Skills for intelligent, on-demand activation:

```yaml
# skills/context7/SKILL.md
---
name: Library Documentation Lookup
description: Fetch up-to-date documentation and code examples for any library or framework using Context7. Use when writing code with external libraries, setting up tools, configuring frameworks, or needing current API documentation. Triggers on mentions of library names, npm packages, framework setup, API docs, or code generation requests.
allowed-tools: mcp__plugin_dev-tools_context7__resolve-library-id, mcp__plugin_dev-tools_context7__get-library-docs
---

# Context7 - Library Documentation

Always use Context7 MCP tools automatically when generating code, performing setup, or needing library documentation.

## When to Use
- Writing code with external libraries
- Setting up frameworks or tools
- Needing current API documentation
- Finding best practices for libraries
```

**Advantages:**
- ✅ Claude loads skill only when working with libraries/frameworks
- ✅ Significantly reduces token usage
- ✅ Simpler maintenance (single markdown file)
- ✅ Intelligent activation based on context
- ✅ Clear trigger patterns in description

**Key Points:**
- Use gerund form for skill name ("Library Documentation Lookup")
- Include specific triggers in description (library names, frameworks, API docs)
- Specify allowed MCP tools for automatic permission
- Keep SKILL.md under 500 lines for efficiency

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

**Modern Structure (with Skills):**

```
external-plugins/context7/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (required)
├── skills/
│   └── context7/
│       └── SKILL.md             # Skill definition with auto-activation
├── README.md                   # Documentation with installation guide
└── (source code of the tool itself)
```

**Legacy Structure (with SessionStart Hooks - Deprecated):**

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
- `skills/`, `hooks/`, `commands/`, `agents/` directories must be at plugin root, NOT inside `.claude-plugin/`
- Use `${CLAUDE_PLUGIN_ROOT}` in all path references for portability
- Prefer `skills/` over `hooks/` for automatic tool usage guidance

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

#### Pitfall: Using SessionStart hooks instead of Skills
**Problem:** Using SessionStart hooks for automatic tool usage loads context on every session, wasting tokens.

**Solution:** Use Skills for intelligent, on-demand activation:
- Skills load only when relevant to the current task
- Clear trigger patterns in description
- Simpler maintenance (no shell scripts)
- Better token efficiency

#### Pitfall: Confusion between NPX and HTTP transport
**Problem:** Thinking NPX means everything runs locally and HTTP means everything is remote.

**Solution:** Understand that both patterns may call external APIs. NPX runs the MCP protocol adapter locally, but the adapter can still make network requests.

#### Pitfall: Weak trigger patterns in Skill descriptions
**Problem:** Vague skill descriptions that don't clearly specify when to activate.

**Solution:** Include specific triggers in the description:
- Library names and package managers
- Framework setup keywords
- API documentation mentions
- Code generation scenarios

## Best Practices Summary

1. **Use NPX for MCP servers** unless there's a specific reason to use HTTP
2. **Use Skills for automatic tool usage** instead of SessionStart hooks for better token efficiency
3. **Include specific triggers** in skill descriptions for intelligent activation
4. **Use environment variables** with `${VAR:-}` pattern for optional configuration
5. **Follow standard directory structure** with `.claude-plugin/` for manifest only
6. **Document installation clearly** with the correct command patterns
7. **Test the full user flow** from marketplace add to plugin usage
8. **Use submodules** for plugins developed in separate repositories
9. **Create upstream PRs** when contributing to third-party tool repositories

## Context7-Specific Insights

1. **Automatic Tool Usage:** Skills enable Claude to automatically use Context7 MCP tools when working with libraries/frameworks
2. **Token Efficiency:** Skill-based approach significantly reduces token usage compared to SessionStart hooks
3. **API Key Optional:** Context7 works without an API key but provides higher rate limits with one
4. **Documentation Focus:** Context7 is about fetching up-to-date library documentation, so emphasize this in skill descriptions
5. **Integration Pattern:** The plugin demonstrates how to wrap existing npm-published MCP servers with enhanced Claude Code integration

## References

- [Claude Code Plugin Documentation](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Context7 Repository](https://github.com/upstash/context7)
- [Plugin Marketplace Schema](https://anthropic.com/claude-code/marketplace.schema.json)

## Changelog

- **October 16, 2025**: Initial documentation with SessionStart hook approach
- **October 17, 2025**: Updated to reflect Skills-based approach as recommended pattern
  - Added Skills vs SessionStart Hooks comparison
  - Updated directory structure examples
  - Revised best practices and pitfalls
  - Updated Context7-specific insights

## Date

Created: October 16, 2025
Updated: October 17, 2025
Plugin: Context7
PR: https://github.com/upstash/context7/pull/786
