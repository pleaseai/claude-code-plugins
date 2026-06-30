# Plugin Builder Examples

Complete examples of common plugin patterns and use cases.

## Example 1: Simple Command Plugin

A basic plugin with just commands for code quality checks.

**Directory structure**:
```
code-quality/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── lint.md
│   └── format.md
└── README.md
```

**plugin.json**:
```json
{
  "name": "code-quality",
  "version": "1.0.0",
  "description": "Code quality and formatting commands",
  "author": {
    "name": "DevOps Team",
    "email": "devops@example.com"
  },
  "license": "MIT"
}
```

**commands/lint.md**:
```markdown
---
description: Run linting checks on codebase
validation:
  requiresFiles: ["package.json", ".eslintrc.json"]
---

# Lint Command

Run ESLint to check code quality.

## Steps
1. Verify ESLint configuration exists
2. Run: `npm run lint` or `eslint .`
3. Report errors and warnings
4. Suggest fixes if available
```

**commands/format.md**:
```markdown
---
description: Format code using Prettier
validation:
  requiresFiles: ["package.json"]
---

# Format Command

Format codebase with Prettier.

## Steps
1. Check if Prettier is installed
2. Run: `npm run format` or `prettier --write .`
3. Report formatted files
```

---

## Example 2: Hook-Based Plugin

Plugin that automatically formats code after file writes.

**Directory structure**:
```
auto-format/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json
│   └── format.sh
└── README.md
```

**plugin.json**:
```json
{
  "name": "auto-format",
  "version": "1.2.0",
  "description": "Automatically format files after writes",
  "author": {
    "name": "Format Team"
  },
  "hooks": "./hooks/hooks.json"
}
```

**hooks/hooks.json**:
```json
{
  "description": "Format code after file modifications",
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
```

**hooks/format.sh**:
```bash
#!/usr/bin/env bash
set -euo pipefail

# Get the file that was modified from environment
FILE_PATH="${TOOL_FILE_PATH:-}"

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Determine formatter based on file extension
case "$FILE_PATH" in
  *.js|*.jsx|*.ts|*.tsx|*.json|*.md)
    if command -v prettier &> /dev/null; then
      prettier --write "$FILE_PATH" 2>&1
    fi
    ;;
  *.py)
    if command -v black &> /dev/null; then
      black "$FILE_PATH" 2>&1
    fi
    ;;
esac

# Return hook output
jq -n --arg file "$FILE_PATH" '{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": ("Formatted: " + $file)
  }
}'
```

---

## Example 3: MCP Server Plugin

Plugin integrating external API via MCP server.

**Directory structure**:
```
deployment-api/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── deploy.md
├── servers/
│   ├── package.json
│   ├── src/
│   │   └── index.ts
│   └── dist/
│       └── index.js
└── README.md
```

**plugin.json**:
```json
{
  "name": "deployment-api",
  "version": "2.0.0",
  "description": "Deployment API integration",
  "mcpServers": {
    "deployment": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/dist/index.js"],
      "env": {
        "DEPLOY_API_URL": "${DEPLOY_API_URL:-https://api.deploy.example.com}",
        "DEPLOY_API_KEY": "${DEPLOY_API_KEY}"
      }
    }
  }
}
```

**commands/deploy.md**:
```markdown
---
description: Deploy application using deployment API
---

# Deploy Command

Deploy application to specified environment.

## Steps
1. Use deployment MCP tool to check status
2. Validate deployment configuration
3. Trigger deployment via MCP tool
4. Monitor deployment progress
5. Verify successful deployment
```

**servers/src/index.ts** (simplified):
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "deployment-api",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "deploy",
      description: "Deploy application",
      inputSchema: {
        type: "object",
        properties: {
          environment: { type: "string" },
          version: { type: "string" }
        },
        required: ["environment"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "deploy") {
    const { environment, version } = request.params.arguments;
    // Call deployment API
    return {
      content: [{
        type: "text",
        text: `Deployed to ${environment}`
      }]
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
```

---

## Example 4: Comprehensive Plugin

Full-featured plugin with all components.

**Directory structure**:
```
enterprise-tools/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── security/
│   │   ├── scan.md
│   │   └── audit.md
│   └── deploy/
│       ├── staging.md
│       └── production.md
├── agents/
│   ├── security-expert.md
│   └── deployment-specialist.md
├── skills/
│   ├── incident-response/
│   │   └── SKILL.md
│   └── compliance-checker/
│       ├── SKILL.md
│       └── templates/
├── hooks/
│   ├── hooks.json
│   ├── security-scan.sh
│   └── compliance-check.sh
├── .mcp.json
├── scripts/
│   └── helpers.sh
├── README.md
├── LICENSE
└── CHANGELOG.md
```

**plugin.json**:
```json
{
  "name": "enterprise-tools",
  "version": "3.0.0",
  "description": "Enterprise security, deployment, and compliance tools",
  "author": {
    "name": "Enterprise DevOps",
    "email": "devops@enterprise.com",
    "url": "https://github.com/enterprise"
  },
  "homepage": "https://docs.enterprise.com/claude-plugins",
  "repository": "https://github.com/enterprise/claude-tools",
  "license": "MIT",
  "keywords": ["security", "deployment", "compliance", "enterprise"],
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./mcp.json"
}
```

**agents/security-expert.md**:
```markdown
---
description: Security vulnerability analysis and remediation expert
capabilities: ["vulnerability-scanning", "security-auditing", "threat-analysis", "remediation-planning"]
---

# Security Expert Agent

Specialized agent for comprehensive security analysis.

## Expertise
- OWASP Top 10 vulnerabilities
- CVE database analysis
- Dependency vulnerability scanning
- Security best practices
- Compliance frameworks (SOC2, HIPAA, GDPR)

## When to Invoke
- Security audit requests
- Vulnerability assessment needed
- Post-incident analysis
- Compliance review required
- Risk assessment tasks

## Approach
1. Comprehensive codebase scanning
2. Dependency analysis with version checking
3. Configuration security review
4. Threat modeling
5. Prioritized remediation recommendations

## Tools Used
- Security scanning MCP tools
- Static analysis tools
- Dependency checkers
- Compliance validation tools
```

**skills/incident-response/SKILL.md**:
```markdown
---
name: Incident Response
description: Production incident response and resolution expertise. Use when handling production outages, security incidents, performance degradations, or system failures. Includes rollback procedures, root cause analysis, and postmortem documentation.
---

# Incident Response Skill

Expert guidance for handling production incidents.

## When to Use
Activate this skill when:
- Production system is down or degraded
- Security breach detected
- Data loss or corruption occurred
- Critical bug in production
- Performance severely degraded
- User-facing errors reported

## Incident Response Protocol

### 1. Immediate Assessment (0-5 minutes)
- Determine severity (P0-P4)
- Identify affected systems and users
- Check monitoring and alerting
- Form incident response team
- Start incident timeline

### 2. Containment (5-30 minutes)
- Stop the bleeding (rollback, disable feature, rate limit)
- Communicate with stakeholders
- Preserve evidence for analysis
- Document all actions taken

### 3. Investigation (ongoing)
- Analyze logs and metrics
- Review recent changes
- Check dependencies
- Identify root cause
- Test hypothesis

### 4. Resolution
- Implement fix
- Test in staging
- Deploy to production
- Verify resolution
- Monitor for recurrence

### 5. Post-Incident
- Write postmortem
- Document lessons learned
- Create action items
- Update runbooks
- Share knowledge

## Rollback Procedures

### Application Rollback
```bash
# Identify last known good version
git log --oneline | head -10

# Rollback deployment
kubectl rollout undo deployment/app-name
# or
git revert <commit-hash>
git push origin main
```

### Database Rollback
```bash
# Restore from backup
pg_restore -d database_name backup_file.dump

# Or revert migration
npm run migrate:rollback
```

### Feature Flag Rollback
```bash
# Disable feature flag immediately
feature-flag disable feature-name --env production
```

## Root Cause Analysis

Use the "5 Whys" technique:
1. What happened? (symptom)
2. Why did it happen? (immediate cause)
3. Why did that happen? (underlying cause)
4. Why did that condition exist? (root cause)
5. Why wasn't this prevented? (process issue)

## Communication Templates

### Initial Alert
```
INCIDENT: [Brief description]
Severity: P[0-4]
Status: Investigating
Impact: [User-facing impact]
ETA: [Update frequency]
```

### Resolution Notice
```
RESOLVED: [Brief description]
Duration: [Time]
Root Cause: [Summary]
Fix: [What was done]
Postmortem: [Link when available]
```

## Monitoring Checklist
- [ ] System metrics (CPU, memory, disk)
- [ ] Application metrics (response time, error rate)
- [ ] Logs (errors, warnings)
- [ ] Database performance
- [ ] Third-party dependencies
- [ ] Network connectivity

## Example Scenarios

### Scenario 1: Database Connection Failures
1. Check connection pool exhaustion
2. Verify database server status
3. Review recent schema changes
4. Check for long-running queries
5. Scale connection pool or rollback

### Scenario 2: Memory Leak
1. Identify memory growth pattern
2. Review recent code changes
3. Analyze heap dumps
4. Rollback if urgent
5. Fix and deploy properly

### Scenario 3: External API Outage
1. Confirm third-party status
2. Enable circuit breaker
3. Use cached data if available
4. Communicate with users
5. Monitor for recovery
```

**hooks/hooks.json**:
```json
{
  "description": "Security and compliance automation",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/security-scan.sh",
            "timeout": 60
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/compliance-check.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**.mcp.json**:
```json
{
  "mcpServers": {
    "security-scanner": {
      "command": "npx",
      "args": ["-y", "@company/security-mcp-server"],
      "env": {
        "SNYK_TOKEN": "${SNYK_TOKEN:-}",
        "GITHUB_TOKEN": "${GITHUB_TOKEN:-}"
      }
    },
    "deployment-api": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/deployment/index.js"],
      "env": {
        "DEPLOY_API_KEY": "${DEPLOY_API_KEY}",
        "DEPLOY_ENV": "${DEPLOY_ENV:-production}"
      }
    }
  }
}
```

---

## Example 5: Migration from Gemini CLI

Converting an existing Gemini extension to Claude Code plugin.

**Original Gemini structure**:
```
gemini-security/
├── gemini-extension.json
├── GEMINI.md
├── commands/
│   └── scan.md
└── .mcp.json
```

**Migrated Claude Code structure**:
```
gemini-security/
├── .claude-plugin/
│   └── plugin.json          # NEW
├── hooks/
│   ├── hooks.json           # NEW
│   ├── context.sh           # NEW
│   └── CONTEXT.md           # Renamed from GEMINI.md
├── commands/
│   └── scan.md              # Same
├── .mcp.json                # Same
├── gemini-extension.json    # Kept for compatibility
└── README.md                # Updated
```

**Migration script**:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Migrating Gemini extension to Claude Code plugin..."

# Step 1: Create Claude Code structure
mkdir -p .claude-plugin hooks

# Step 2: Extract metadata from gemini-extension.json
NAME=$(jq -r '.name' gemini-extension.json)
VERSION=$(jq -r '.version' gemini-extension.json)
DESCRIPTION=$(jq -r '.description' gemini-extension.json)
AUTHOR_NAME=$(jq -r '.author.name' gemini-extension.json)
AUTHOR_EMAIL=$(jq -r '.author.email' gemini-extension.json)
REPO=$(jq -r '.repository' gemini-extension.json)

# Step 3: Create plugin.json
cat > .claude-plugin/plugin.json <<EOF
{
  "name": "$NAME",
  "version": "$VERSION",
  "description": "$DESCRIPTION",
  "author": {
    "name": "$AUTHOR_NAME",
    "email": "$AUTHOR_EMAIL"
  },
  "repository": "$REPO",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json"
}
EOF

# Step 4: Create SessionStart hook for context
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

# Step 5: Create context loading script
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

# Step 6: Migrate GEMINI.md to hooks/CONTEXT.md
if [ -f "GEMINI.md" ]; then
  cp GEMINI.md hooks/CONTEXT.md
  echo "Migrated GEMINI.md to hooks/CONTEXT.md"
fi

# Step 7: Update README
cat >> README.md <<'EOF'

## Installation

### Claude Code
```sh
claude
/plugin marketplace add company/marketplace
/plugin install plugin-name@company
```

### Gemini CLI (Legacy)
```sh
gemini extension add company/plugin
```
EOF

echo "Migration complete!"
echo "Please review .claude-plugin/plugin.json and hooks/CONTEXT.md"
```

---

## Example 6: NPX-Based MCP Plugin

Simple plugin wrapping an npm-published MCP server.

**Directory structure**:
```
postgres-tools/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── query.md
└── README.md
```

**plugin.json**:
```json
{
  "name": "postgres-tools",
  "version": "1.0.0",
  "description": "PostgreSQL database tools via MCP",
  "author": {
    "name": "Database Team"
  },
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://localhost/mydb"
      ],
      "env": {
        "PGPASSWORD": "${POSTGRES_PASSWORD}"
      }
    }
  }
}
```

**commands/query.md**:
```markdown
---
description: Execute PostgreSQL queries using MCP tools
---

# Query Command

Run SQL queries against connected PostgreSQL database.

## Usage
Use the postgres MCP tools to:
- List tables
- Describe schema
- Execute SELECT queries
- Get query results

## Safety
- Always use parameterized queries
- Avoid SELECT * in production
- Use EXPLAIN for complex queries
- Limit result sets appropriately
```

**README.md**:
```markdown
# PostgreSQL Tools Plugin

PostgreSQL database integration for Claude Code.

## Installation

```sh
claude
/plugin marketplace add company/plugins
/plugin install postgres-tools@company
```

## Configuration

Set PostgreSQL connection:

```sh
export POSTGRES_PASSWORD="your-password"
```

Or use connection string in plugin.json.

## Usage

```sh
# Use MCP tools directly in conversation
# Or use slash command
/postgres-tools:query
```

## Available MCP Tools

- `list_tables`: List all tables
- `describe_table`: Get table schema
- `execute_query`: Run SELECT queries
- `execute_write`: Run INSERT/UPDATE/DELETE
```

---

## Example 7: Development Marketplace

Local marketplace for testing multiple plugins.

**Directory structure**:
```
dev-plugins/
├── .claude-plugin/
│   └── marketplace.json
├── plugin-a/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── commands/
├── plugin-b/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── agents/
└── README.md
```

**marketplace.json**:
```json
{
  "name": "dev-marketplace",
  "owner": {
    "name": "Development Team",
    "email": "dev@company.com"
  },
  "metadata": {
    "description": "Development and testing marketplace",
    "version": "1.0.0",
    "pluginRoot": "."
  },
  "plugins": [
    {
      "name": "plugin-a",
      "description": "First plugin under development",
      "version": "0.1.0",
      "source": {
        "source": "path",
        "path": "./plugin-a"
      },
      "keywords": ["dev", "testing"]
    },
    {
      "name": "plugin-b",
      "description": "Second plugin under development",
      "version": "0.1.0",
      "source": {
        "source": "path",
        "path": "./plugin-b"
      },
      "keywords": ["dev", "testing"]
    }
  ]
}
```

**Usage**:
```bash
# Add local marketplace
cd dev-plugins
claude
/plugin marketplace add .

# Install plugins for testing
/plugin install plugin-a@dev-marketplace
/plugin install plugin-b@dev-marketplace

# Test changes
# ... make modifications to plugins ...

# Reload
/plugin uninstall plugin-a@dev-marketplace
/plugin install plugin-a@dev-marketplace
```

---

## Pattern Summary

### When to Use Each Component

**Commands**: User needs to explicitly trigger an action
- Examples: deploy, format, lint, test

**Agents**: Specialized expertise for autonomous work
- Examples: security-expert, performance-analyzer, compliance-checker

**Skills**: Model-invoked expertise with specific triggers
- Examples: incident-response, terraform-deployment, kubernetes-debug

**Hooks**: Automatic actions on events
- Examples: auto-format, security-scan, compliance-check

**MCP Servers**: External system integration
- Examples: database-access, api-client, monitoring-tools

### Component Selection Guide

| Need | Use | Example |
|------|-----|---------|
| User-triggered action | Command | `/deploy production` |
| Specialized autonomous work | Agent | Security analysis |
| Automatic expertise | Skill | Incident response |
| Event-driven automation | Hook | Format after write |
| External system access | MCP | Database queries |