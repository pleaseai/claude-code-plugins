# Plugin Builder Templates

Ready-to-use templates for quick plugin development.

## Template 1: Minimal Plugin

Copy-paste template for basic plugin.

```bash
#!/usr/bin/env bash
# Save as: create-minimal-plugin.sh

PLUGIN_NAME="${1:-my-plugin}"

mkdir -p "$PLUGIN_NAME/.claude-plugin"
mkdir -p "$PLUGIN_NAME/commands"

cat > "$PLUGIN_NAME/.claude-plugin/plugin.json" <<EOF
{
  "name": "$PLUGIN_NAME",
  "version": "1.0.0",
  "description": "Brief description of what this plugin does",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "license": "MIT"
}
EOF

cat > "$PLUGIN_NAME/commands/example.md" <<'EOF'
---
description: Example command description
---

# Example Command

Instructions for Claude on how to execute this command.

## Steps
1. First step
2. Second step
3. Final step
EOF

cat > "$PLUGIN_NAME/README.md" <<EOF
# $PLUGIN_NAME

Brief description of the plugin.

## Installation

\`\`\`sh
claude
/plugin marketplace add owner/marketplace
/plugin install $PLUGIN_NAME@marketplace
\`\`\`

## Usage

\`\`\`sh
/$PLUGIN_NAME:example
\`\`\`
EOF

echo "Created plugin: $PLUGIN_NAME"
```

---

## Template 2: Command-Only Plugin

```bash
#!/usr/bin/env bash
# Save as: create-command-plugin.sh

PLUGIN_NAME="${1:-my-commands}"

mkdir -p "$PLUGIN_NAME/.claude-plugin"
mkdir -p "$PLUGIN_NAME/commands"

cat > "$PLUGIN_NAME/.claude-plugin/plugin.json" <<EOF
{
  "name": "$PLUGIN_NAME",
  "version": "1.0.0",
  "description": "Collection of useful commands",
  "author": {
    "name": "Your Name"
  }
}
EOF

cat > "$PLUGIN_NAME/commands/lint.md" <<'EOF'
---
description: Run code linting checks
validation:
  requiresFiles: ["package.json"]
---

# Lint Command

Run linting on the codebase.

## Steps
1. Check for linter configuration
2. Run linter: npm run lint or equivalent
3. Report results
4. Suggest fixes if available
EOF

cat > "$PLUGIN_NAME/commands/test.md" <<'EOF'
---
description: Run test suite
validation:
  requiresFiles: ["package.json"]
---

# Test Command

Execute project test suite.

## Steps
1. Verify test framework installed
2. Run tests: npm test or equivalent
3. Report results with coverage
4. Highlight failures
EOF

cat > "$PLUGIN_NAME/commands/build.md" <<'EOF'
---
description: Build project for production
---

# Build Command

Create production build.

## Steps
1. Clean previous builds
2. Run build command
3. Verify output
4. Report build status
EOF
```

---

## Template 3: Hook Plugin

```bash
#!/usr/bin/env bash
# Save as: create-hook-plugin.sh

PLUGIN_NAME="${1:-auto-format}"

mkdir -p "$PLUGIN_NAME/.claude-plugin"
mkdir -p "$PLUGIN_NAME/hooks"

cat > "$PLUGIN_NAME/.claude-plugin/plugin.json" <<EOF
{
  "name": "$PLUGIN_NAME",
  "version": "1.0.0",
  "description": "Automatic code formatting after writes",
  "hooks": "./hooks/hooks.json"
}
EOF

cat > "$PLUGIN_NAME/hooks/hooks.json" <<'EOF'
{
  "description": "Format code after file writes",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/format.sh",
            "timeout": 30,
            "blocking": true
          }
        ]
      }
    ]
  }
}
EOF

cat > "$PLUGIN_NAME/hooks/format.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

FILE="${TOOL_FILE_PATH:-}"

if [ -z "$FILE" ]; then
  exit 0
fi

# Format based on file type
case "$FILE" in
  *.js|*.jsx|*.ts|*.tsx|*.json)
    if command -v prettier &> /dev/null; then
      prettier --write "$FILE"
    fi
    ;;
  *.py)
    if command -v black &> /dev/null; then
      black "$FILE"
    fi
    ;;
esac

jq -n --arg file "$FILE" '{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": ("Formatted: " + $file)
  }
}'
EOF

chmod +x "$PLUGIN_NAME/hooks/format.sh"
```

---

## Template 4: MCP Plugin

```bash
#!/usr/bin/env bash
# Save as: create-mcp-plugin.sh

PLUGIN_NAME="${1:-api-tools}"
MCP_PACKAGE="${2:-@company/mcp-server}"

mkdir -p "$PLUGIN_NAME/.claude-plugin"
mkdir -p "$PLUGIN_NAME/commands"

cat > "$PLUGIN_NAME/.claude-plugin/plugin.json" <<EOF
{
  "name": "$PLUGIN_NAME",
  "version": "1.0.0",
  "description": "API integration tools",
  "mcpServers": {
    "api": {
      "command": "npx",
      "args": ["-y", "$MCP_PACKAGE"],
      "env": {
        "API_KEY": "\${API_KEY:-}",
        "API_URL": "\${API_URL:-https://api.example.com}"
      }
    }
  }
}
EOF

cat > "$PLUGIN_NAME/commands/api-call.md" <<'EOF'
---
description: Make API calls using MCP tools
---

# API Call Command

Execute API requests via MCP integration.

## Steps
1. Use MCP tools to list available endpoints
2. Prepare request parameters
3. Execute API call
4. Format and display response
EOF

cat > "$PLUGIN_NAME/README.md" <<EOF
# $PLUGIN_NAME

API integration tools for Claude Code.

## Configuration

Set required environment variables:

\`\`\`sh
export API_KEY="your-api-key"
export API_URL="https://api.example.com"  # optional
\`\`\`

## Installation

\`\`\`sh
claude
/plugin marketplace add owner/marketplace
/plugin install $PLUGIN_NAME@marketplace
\`\`\`

## Available MCP Tools

The plugin provides MCP tools for API interaction. Use them directly in conversation or via the slash command:

\`\`\`sh
/$PLUGIN_NAME:api-call
\`\`\`
EOF
```

---

## Template 5: Complete Plugin

```bash
#!/usr/bin/env bash
# Save as: create-complete-plugin.sh

PLUGIN_NAME="${1:-complete-plugin}"

mkdir -p "$PLUGIN_NAME/.claude-plugin"
mkdir -p "$PLUGIN_NAME/commands"
mkdir -p "$PLUGIN_NAME/agents"
mkdir -p "$PLUGIN_NAME/skills/expert"
mkdir -p "$PLUGIN_NAME/hooks"

cat > "$PLUGIN_NAME/.claude-plugin/plugin.json" <<EOF
{
  "name": "$PLUGIN_NAME",
  "version": "1.0.0",
  "description": "Complete plugin with all components",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://github.com/yourusername"
  },
  "homepage": "https://docs.example.com/$PLUGIN_NAME",
  "repository": "https://github.com/yourusername/$PLUGIN_NAME",
  "license": "MIT",
  "keywords": ["tool", "automation"],
  "hooks": "./hooks/hooks.json",
  "mcpServers": {
    "service": {
      "command": "npx",
      "args": ["-y", "@company/mcp-server"],
      "env": {
        "API_KEY": "\${API_KEY:-}"
      }
    }
  }
}
EOF

cat > "$PLUGIN_NAME/commands/action.md" <<'EOF'
---
description: Execute main plugin action
---

# Action Command

Main command for this plugin.

## Steps
1. Validate prerequisites
2. Execute action
3. Report results
EOF

cat > "$PLUGIN_NAME/agents/specialist.md" <<'EOF'
---
description: Specialized agent for specific tasks
capabilities: ["task1", "task2", "task3"]
---

# Specialist Agent

Expert in specific domain.

## Expertise
- Detailed knowledge area 1
- Detailed knowledge area 2

## When to Invoke
- Scenario 1
- Scenario 2

## Approach
How this agent solves problems.
EOF

cat > "$PLUGIN_NAME/skills/expert/SKILL.md" <<'EOF'
---
name: Domain Expert
description: Expertise in specific domain. Use when working with X files, handling Y errors, or implementing Z patterns.
---

# Domain Expert Skill

Expert knowledge for specific domain.

## When to Use
Specific triggers:
- Working with .xyz files
- Error message contains "XYZ error"
- Implementing ABC pattern

## Instructions
Detailed guidance for Claude.
EOF

cat > "$PLUGIN_NAME/hooks/hooks.json" <<'EOF'
{
  "description": "Automation hooks",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/action.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
EOF

cat > "$PLUGIN_NAME/hooks/action.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Your hook logic here

jq -n '{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Hook executed"
  }
}'
EOF

chmod +x "$PLUGIN_NAME/hooks/action.sh"

cat > "$PLUGIN_NAME/README.md" <<EOF
# $PLUGIN_NAME

Complete plugin with all components.

## Features

- Commands for user-triggered actions
- Agents for specialized tasks
- Skills for automatic expertise
- Hooks for automation
- MCP integration for external services

## Installation

\`\`\`sh
claude
/plugin marketplace add owner/marketplace
/plugin install $PLUGIN_NAME@marketplace
\`\`\`

## Configuration

\`\`\`sh
export API_KEY="your-api-key"
\`\`\`

## Usage

### Commands
\`\`\`sh
/$PLUGIN_NAME:action
\`\`\`

### Agents
Agents are invoked automatically by Claude.

### Skills
Skills are triggered automatically based on context.

### Hooks
Hooks run automatically on events.

### MCP Tools
MCP tools available in conversation.
EOF

cat > "$PLUGIN_NAME/LICENSE" <<'EOF'
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

cat > "$PLUGIN_NAME/CHANGELOG.md" <<'EOF'
# Changelog

## [1.0.0] - 2025-01-01

### Added
- Initial release
- Commands for basic actions
- Agents for specialized tasks
- Skills for automatic expertise
- Hooks for automation
- MCP integration
EOF
```

---

## Template 6: Development Marketplace

```bash
#!/usr/bin/env bash
# Save as: create-dev-marketplace.sh

MARKETPLACE_NAME="${1:-dev-marketplace}"

mkdir -p "$MARKETPLACE_NAME/.claude-plugin"

cat > "$MARKETPLACE_NAME/.claude-plugin/marketplace.json" <<EOF
{
  "name": "$MARKETPLACE_NAME",
  "owner": {
    "name": "Development Team",
    "email": "dev@example.com"
  },
  "metadata": {
    "description": "Development marketplace for testing",
    "version": "1.0.0"
  },
  "plugins": []
}
EOF

cat > "$MARKETPLACE_NAME/README.md" <<EOF
# $MARKETPLACE_NAME

Development marketplace for testing plugins locally.

## Usage

\`\`\`sh
cd $MARKETPLACE_NAME
claude
/plugin marketplace add .
\`\`\`

## Adding Plugins

Edit \`.claude-plugin/marketplace.json\` and add plugin entries:

\`\`\`json
{
  "plugins": [
    {
      "name": "my-plugin",
      "description": "Plugin description",
      "source": {
        "source": "path",
        "path": "./plugins/my-plugin"
      }
    }
  ]
}
\`\`\`

Then create the plugin directory:

\`\`\`sh
mkdir -p plugins/my-plugin
# ... create plugin files
\`\`\`

Install for testing:

\`\`\`sh
/plugin install my-plugin@$MARKETPLACE_NAME
\`\`\`
EOF
```

---

## Template 7: Gemini Migration Script

```bash
#!/usr/bin/env bash
# Save as: migrate-gemini-to-claude.sh

set -euo pipefail

if [ ! -f "gemini-extension.json" ]; then
  echo "Error: gemini-extension.json not found"
  exit 1
fi

echo "Migrating Gemini extension to Claude Code plugin..."

# Create directories
mkdir -p .claude-plugin hooks

# Extract from gemini-extension.json
NAME=$(jq -r '.name' gemini-extension.json)
VERSION=$(jq -r '.version' gemini-extension.json)
DESCRIPTION=$(jq -r '.description' gemini-extension.json)
AUTHOR_NAME=$(jq -r '.author.name // "Unknown"' gemini-extension.json)
AUTHOR_EMAIL=$(jq -r '.author.email // ""' gemini-extension.json)
REPO=$(jq -r '.repository // ""' gemini-extension.json)
LICENSE=$(jq -r '.license // "MIT"' gemini-extension.json)

# Create plugin.json
cat > .claude-plugin/plugin.json <<EOF
{
  "name": "$NAME",
  "version": "$VERSION",
  "description": "$DESCRIPTION",
  "author": {
    "name": "$AUTHOR_NAME"$([ -n "$AUTHOR_EMAIL" ] && echo ",
    \"email\": \"$AUTHOR_EMAIL\"")
  }$([ -n "$REPO" ] && echo ",
  \"repository\": \"$REPO\""),
  "license": "$LICENSE",
  "hooks": "./hooks/hooks.json"
}
EOF

# Add MCP config if exists
if [ -f ".mcp.json" ]; then
  jq '. + {"mcpServers": "./.mcp.json"}' .claude-plugin/plugin.json > .claude-plugin/plugin.json.tmp
  mv .claude-plugin/plugin.json.tmp .claude-plugin/plugin.json
fi

# Create SessionStart hook for context
cat > hooks/hooks.json <<'EOF'
{
  "description": "Load plugin usage instructions",
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
EOF

# Create context script
cat > hooks/context.sh <<'EOF'
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
EOF

chmod +x hooks/context.sh

# Migrate context file
if [ -f "GEMINI.md" ]; then
  cp GEMINI.md hooks/CONTEXT.md
  echo "✓ Migrated GEMINI.md to hooks/CONTEXT.md"
fi

# Update README if it exists
if [ -f "README.md" ]; then
  if ! grep -q "Claude Code" README.md; then
    cat >> README.md <<'EOF'

## Installation

### Claude Code
```sh
claude
/plugin marketplace add owner/marketplace
/plugin install plugin-name@marketplace
```

### Gemini CLI (Legacy)
```sh
gemini extension add owner/extension
```
EOF
    echo "✓ Updated README.md with installation instructions"
  fi
fi

echo ""
echo "Migration complete!"
echo ""
echo "Created:"
echo "  - .claude-plugin/plugin.json"
echo "  - hooks/hooks.json"
echo "  - hooks/context.sh"
[ -f "hooks/CONTEXT.md" ] && echo "  - hooks/CONTEXT.md"
echo ""
echo "Next steps:"
echo "1. Review .claude-plugin/plugin.json"
echo "2. Review hooks/CONTEXT.md (if applicable)"
echo "3. Test with: claude --debug"
echo "4. Commit changes"
```

---

## Quick Reference

### Run Template Scripts

```bash
# Download and run
curl -O https://raw.githubusercontent.com/company/templates/create-plugin.sh
chmod +x create-plugin.sh
./create-plugin.sh my-plugin

# Or inline
bash <(curl -s https://raw.githubusercontent.com/company/templates/create-plugin.sh) my-plugin
```

### Create Plugin from Scratch

```bash
# Minimal
./create-minimal-plugin.sh my-plugin

# With commands
./create-command-plugin.sh my-commands

# With hooks
./create-hook-plugin.sh auto-format

# With MCP
./create-mcp-plugin.sh api-tools @company/mcp-server

# Complete
./create-complete-plugin.sh enterprise-tools

# Dev marketplace
./create-dev-marketplace.sh dev-plugins
```

### Migrate Gemini Extension

```bash
# In your Gemini extension directory
./migrate-gemini-to-claude.sh
```

### Test Plugin Locally

```bash
# Create dev marketplace
mkdir -p dev-marketplace/.claude-plugin
cat > dev-marketplace/.claude-plugin/marketplace.json <<EOF
{
  "name": "dev",
  "owner": {"name": "Dev"},
  "plugins": [{
    "name": "my-plugin",
    "source": {"source": "path", "path": "../my-plugin"}
  }]
}
EOF

# Add and install
claude
/plugin marketplace add ./dev-marketplace
/plugin install my-plugin@dev
```

---

## Customization Guide

### Modify Templates

1. Copy template script
2. Edit sections:
   - Directory structure
   - plugin.json content
   - Component files
   - README content
3. Save and make executable
4. Run with your parameters

### Add Custom Components

```bash
# Add to template after mkdir commands
mkdir -p "$PLUGIN_NAME/custom-dir"

# Add custom files
cat > "$PLUGIN_NAME/custom-dir/file.ext" <<'EOF'
... content ...
EOF
```

### Parameterize Templates

```bash
# Accept parameters
AUTHOR="${2:-Your Name}"
EMAIL="${3:-your.email@example.com}"

# Use in template
"author": {
  "name": "$AUTHOR",
  "email": "$EMAIL"
}
```