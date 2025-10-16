# Agent Skills Guide

> Comprehensive guide to Claude Code skills and agent skills, including architecture, best practices, and implementation patterns.

## Overview

Agent Skills are modular capabilities that extend Claude's functionality through organized folders containing instructions, scripts, and resources. They transform Claude from a general-purpose assistant into a domain specialist by providing specialized knowledge, workflows, and best practices.

## Table of Contents

- [What Are Agent Skills?](#what-are-agent-skills)
- [Skills vs Commands vs Hooks](#skills-vs-commands-vs-hooks)
- [How Skills Work](#how-skills-work)
- [Skill Architecture](#skill-architecture)
- [Creating Skills](#creating-skills)
- [Best Practices](#best-practices)
- [Progressive Loading Strategy](#progressive-loading-strategy)
- [Tool Access Control](#tool-access-control)
- [Testing and Validation](#testing-and-validation)
- [Integration Points](#integration-points)

## What Are Agent Skills?

Agent Skills are reusable, filesystem-based resources that provide Claude with domain-specific expertise: workflows, context, and best practices. Each skill consists of a required `SKILL.md` file with instructions that Claude reads when relevant, plus optional supporting files.

**Key distinction**: Skills are "model-invoked"—Claude autonomously decides when to use them based on your request and the skill's description. This differs from slash commands, which require explicit user activation.

### Skills vs Commands vs Hooks

Understanding when to use each component type:

| Component | Activation | Use Case | Example |
|-----------|-----------|----------|---------|
| **Skills** | Model-invoked (automatic) | Domain expertise, workflows | Excel analysis, PDF processing |
| **Commands** | User-invoked (explicit) | Specific actions, workflows | `/commit`, `/review-pr` |
| **Hooks** | Event-triggered (automatic) | Automation, context loading | Format on save, load MCP docs |

**When to Use Skills:**
- Providing domain-specific knowledge (e.g., security best practices)
- Defining complex workflows (e.g., document processing pipelines)
- Adding specialized capabilities (e.g., data analysis patterns)
- Teaching Claude about project-specific patterns

**When to Use Commands:**
- User needs explicit control over execution
- Action should be deliberately triggered
- Workflow has clear start/end points

**When to Use Hooks:**
- Automatic responses to events (SessionStart, PostToolUse)
- Loading context at specific moments
- Validation or formatting automation

## How Skills Work

### Discovery Sources

Claude discovers skills from three sources:

1. **Personal Skills**: `~/.claude/skills/`
   - User-specific skills available across all projects
   - Persist across sessions and projects

2. **Project Skills**: `.claude/skills/`
   - Project-specific skills for team sharing
   - Version controlled with project code

3. **Plugin Skills**: Bundled with installed plugins
   - Distributed through plugin marketplace
   - Automatically available when plugin is enabled

### Progressive Disclosure

The system uses progressive disclosure, reading supporting files only when needed to manage context efficiently. This three-tier loading system optimizes context usage:

- **Level 1 (Metadata)**: YAML frontmatter loads at startup (~100 tokens per skill)
- **Level 2 (Instructions)**: Main SKILL.md content loads when triggered (<5k tokens)
- **Level 3 (Resources)**: Additional files load on-demand with minimal token cost

This ensures only relevant content occupies the context window at any given time.

## Skill Architecture

### Basic Structure

A minimal skill requires:
```
my-skill/
└── SKILL.md
```

### Complete Structure

A comprehensive skill might include:
```
my-skill/
├── SKILL.md           # Required: Main skill definition
├── REFERENCE.md       # Optional: Detailed reference docs
├── EXAMPLES.md        # Optional: Usage examples
├── ADVANCED.md        # Optional: Advanced features
├── scripts/           # Optional: Helper scripts
│   ├── analyze.py
│   └── process.sh
└── templates/         # Optional: File templates
    ├── report.md
    └── config.json
```

### SKILL.md Structure

The `SKILL.md` file uses YAML frontmatter with critical fields:

```yaml
---
name: Skill Name
description: What it does and when to use it
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Skill Content

## Quick Start
Basic usage instructions...

## Advanced Features
For advanced usage, see [REFERENCE.md](./REFERENCE.md).

## Examples
For examples, see [EXAMPLES.md](./EXAMPLES.md).
```

### Mandatory Fields

**name** (string, max 64 characters)
- Use gerund form (verb + -ing): "Processing PDFs," "Analyzing spreadsheets"
- Be specific and descriptive
- Avoid vague names like "Helper" or "Utils"

**description** (string, max 1024 characters)
- Write in third person (avoid "I can" or "you can")
- Include both functionality and usage triggers
- Be specific with key terms
- Specify file types, domains, or scenarios

**Example:**
```yaml
---
name: Analyzing Excel Spreadsheets
description: Extract data from Excel files, generate pivot tables, create charts, and analyze trends. Use when working with .xlsx files, when user mentions Excel, spreadsheets, data analysis, or asks to visualize tabular data.
---
```

## Creating Skills

### Step-by-Step Process

**1. Plan Your Skill**
- Define the specific capability or domain
- Identify when Claude should use it
- List required tools and resources

**2. Create Skill Directory**
```bash
# Personal skill
mkdir -p ~/.claude/skills/excel-analysis

# Project skill
mkdir -p .claude/skills/security-review

# Plugin skill
mkdir -p .claude-plugin/skills/deployment-tools
```

**3. Write SKILL.md**
```markdown
---
name: Security Code Review
description: Review code for security vulnerabilities, input validation issues, authentication flaws. Use when reviewing code, analyzing pull requests, or user mentions security, vulnerabilities, or safety.
allowed-tools: Read, Grep, Glob
---

# Security Code Review

## Overview
This skill helps identify common security vulnerabilities in code.

## Review Checklist
1. Input validation and sanitization
2. Authentication and authorization
3. Sensitive data exposure
4. SQL injection risks
5. XSS vulnerabilities

## For detailed patterns, see [PATTERNS.md](./PATTERNS.md)
```

**4. Add Supporting Files (Optional)**
```bash
# Add reference documentation
cat > ~/.claude/skills/excel-analysis/REFERENCE.md << 'EOF'
# Excel Analysis Reference

## Supported Operations
- Data extraction
- Pivot table generation
- Chart creation
- Trend analysis
EOF
```

**5. Test the Skill**
```bash
# Start Claude Code
claude

# Test trigger phrases from your description
# "Can you analyze this Excel file?"
# "I need to review this code for security issues"
```

## Best Practices

### Design Principles

**1. Conciseness is Essential**
The context window is shared across system prompts, conversation history, and other Skills. Challenge every piece of information: "Does Claude really need this explanation?"

```markdown
# ❌ Too verbose
This skill provides comprehensive capabilities for analyzing Excel spreadsheets
including but not limited to data extraction, transformation, visualization,
statistical analysis, and report generation.

# ✅ Concise
Analyze Excel files: extract data, create charts, generate reports.
```

**2. Keep Skills Focused**
Each skill should address one capability. Avoid broad categories like "document processing"—instead create specific skills for PDF forms, Excel analysis, etc.

```
# ❌ Too broad
document-processing/     # Tries to handle all document types

# ✅ Focused
pdf-forms/              # Specific to PDF form handling
excel-analysis/         # Specific to Excel analysis
word-templates/         # Specific to Word templates
```

**3. Appropriate Freedom Levels**
Match specificity to task fragility:

- **High freedom** (text instructions): Multiple valid approaches exist
  ```markdown
  Review code for security issues focusing on input validation and authentication.
  ```

- **Medium freedom** (pseudocode): Preferred patterns with acceptable variation
  ```markdown
  1. Scan for SQL queries
  2. Check for parameterization
  3. Flag string concatenation
  ```

- **Low freedom** (specific scripts): Fragile operations requiring exact sequences
  ```markdown
  Run: `./scripts/security-scan.sh --strict --report=json`
  ```

### Naming Best Practices

**Use Gerund Form**
```yaml
# ✅ Good
name: Processing PDFs
name: Analyzing Security Vulnerabilities
name: Managing Database Migrations

# ❌ Avoid
name: PDF Helper
name: Security Utils
name: Database Tool
```

### Description Best Practices

**Write Specific Triggers**
```yaml
# ❌ Vague
description: Helps with data analysis and processing tasks.

# ✅ Specific
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Include Multiple Activation Patterns**
```yaml
description: Analyze Excel spreadsheets, generate pivot tables, create charts. Use when working with .xlsx files, when user mentions Excel, spreadsheets, data analysis, or asks to visualize tabular data.
```

### Content Organization Patterns

**Pattern 1: High-Level Guide with References**
Main SKILL.md provides quick start; advanced features link to separate files.

```markdown
---
name: Excel Analysis
description: Analyze Excel files and generate reports
---

# Excel Analysis

## Quick Start
Basic operations for analyzing Excel files.

## Advanced Features
For advanced pivot tables and macros, see [ADVANCED.md](./ADVANCED.md).

## Reference
Complete API documentation in [REFERENCE.md](./REFERENCE.md).
```

**Pattern 2: Domain-Specific Organization**
Organize by domain to avoid loading irrelevant context.

```
database-analysis/
├── SKILL.md           # Main overview
├── sales/
│   ├── SCHEMAS.md     # Sales-specific schemas
│   └── QUERIES.md     # Sales queries
├── finance/
│   ├── SCHEMAS.md     # Finance schemas
│   └── QUERIES.md     # Finance queries
└── marketing/
    ├── SCHEMAS.md     # Marketing schemas
    └── QUERIES.md     # Marketing queries
```

When users ask about sales metrics, Claude only reads sales-related schemas.

**Pattern 3: Conditional Details**
Show basic content with links to advanced sections.

```markdown
# Security Review

## Basic Checks
- SQL injection
- XSS vulnerabilities

## Advanced Analysis
For comprehensive security patterns including:
- Authentication flows
- Cryptographic implementations
- API security

See [SECURITY-PATTERNS.md](./SECURITY-PATTERNS.md)
```

### Progressive Loading Strategy

**Keep SKILL.md Under 500 Lines**
```markdown
# ❌ Single large file (1500 lines)
SKILL.md

# ✅ Split into focused files
SKILL.md           (300 lines)
REFERENCE.md       (400 lines)
EXAMPLES.md        (300 lines)
ADVANCED.md        (500 lines)
```

**Use One-Level-Deep References**
```markdown
# ✅ Good - Claude can read these easily
SKILL.md → REFERENCE.md
SKILL.md → EXAMPLES.md

# ❌ Avoid - Claude may only partially read
SKILL.md → REFERENCE.md → DEEP-DETAILS.md → SPECIFIC-CASES.md
```

**Include Table of Contents for Long Files**
```markdown
# Reference Documentation

## Table of Contents
- [Data Extraction](#data-extraction)
- [Pivot Tables](#pivot-tables)
- [Chart Generation](#chart-generation)
- [Report Templates](#report-templates)

## Data Extraction
...
```

## Tool Access Control

The `allowed-tools` frontmatter field restricts which tools Claude can use:

```yaml
---
name: Read-Only Code Analysis
description: Analyze code structure and patterns
allowed-tools: Read, Grep, Glob
---
```

This enables:
- **Read-only skills**: Analysis without modification
- **Limited-scope capabilities**: Only specific tools needed
- **No permission requests**: Approved tools work automatically

**Common Tool Combinations:**

```yaml
# Read-only analysis
allowed-tools: Read, Grep, Glob

# Code modification
allowed-tools: Read, Write, Edit, Grep, Glob

# Full development
allowed-tools: Read, Write, Edit, Grep, Glob, Bash

# Web research
allowed-tools: WebFetch, WebSearch, Read, Write
```

**Note**: This feature applies only to Claude Code skills, not API or claude.ai skills.

## Testing and Validation

### Testing Checklist

**1. Activation Testing**
- Test all trigger phrases from description
- Verify Claude activates skill at appropriate times
- Ensure skill doesn't activate incorrectly

**2. Content Testing**
- Verify instructions are clear and actionable
- Test progressive loading of reference files
- Confirm tool restrictions work as expected

**3. Cross-Model Testing**
Test skills across Claude Haiku, Sonnet, and Opus. What works for Opus may need additional detail for Haiku.

**4. Team Validation**
- Share with team members for feedback
- Validate activation patterns match expectations
- Confirm instructions are universally clear

### Testing Workflow

```bash
# 1. Start Claude Code
claude

# 2. Test direct triggers
# Type phrases from your skill description

# 3. Test context triggers
# Mention domain-specific terms

# 4. Verify tool usage
# Ensure skill respects allowed-tools restrictions

# 5. Check progressive loading
# Request advanced features to trigger reference files
```

## Integration Points

### Claude Code Integration

Skills integrate with Claude Code through three locations:

```bash
# Personal skills (user-specific)
~/.claude/skills/my-skill/
└── SKILL.md

# Project skills (team-shared, version controlled)
.claude/skills/my-skill/
└── SKILL.md

# Plugin skills (distributed via plugins)
.claude-plugin/skills/my-skill/
└── SKILL.md
```

### Plugin Distribution

Package skills in plugins for marketplace distribution:

```json
{
  "name": "security-tools",
  "version": "1.0.0",
  "description": "Security analysis skills and tools",
  "skills": "./skills/"
}
```

Skills in `.claude-plugin/skills/` are automatically available when the plugin is installed.

### Version Control

**Project Skills:**
```bash
# Add to git
git add .claude/skills/
git commit -m "feat: add security review skill"
git push
```

**Plugin Skills:**
```bash
# Versioned with plugin
cd external-plugins/security/
git add .claude-plugin/skills/
git commit -m "feat: add vulnerability scanning skill"
```

## Advanced Patterns

### Skill Composition

Combine multiple skills for complex workflows:

```markdown
---
name: Full Stack Security Review
description: Comprehensive security review combining code analysis, dependency checking, and infrastructure review
---

# Full Stack Security Review

This skill orchestrates multiple security capabilities:

1. **Code Review** - See code-security skill
2. **Dependency Analysis** - See dependency-audit skill
3. **Infrastructure Check** - See infra-security skill

## Workflow
1. Run code security scan
2. Audit dependencies for vulnerabilities
3. Review infrastructure configuration
4. Generate comprehensive report
```

### Conditional Loading

Load context based on project structure:

```markdown
---
name: Framework-Specific Testing
description: Run framework-specific tests based on project type
---

# Framework-Specific Testing

## Detection
- Check package.json for framework
- Look for framework-specific config files

## Framework Guides
- React: [REACT-TESTING.md](./REACT-TESTING.md)
- Vue: [VUE-TESTING.md](./VUE-TESTING.md)
- Angular: [ANGULAR-TESTING.md](./ANGULAR-TESTING.md)

Only load the relevant framework guide.
```

### Dynamic Scripts

Reference executable scripts for complex operations:

```markdown
---
name: Database Migration
description: Manage database schema migrations safely
allowed-tools: Bash, Read, Write
---

# Database Migration

## Safety Checks
Before migration, run:
```bash
${SKILL_ROOT}/scripts/pre-migration-check.sh
```

## Migration
Execute migration:
```bash
${SKILL_ROOT}/scripts/migrate.sh --environment=staging
```

## Validation
Verify migration:
```bash
${SKILL_ROOT}/scripts/validate-schema.sh
```
```

## Troubleshooting

### Common Issues

**Skill Not Activating**
- Check description includes clear trigger phrases
- Verify SKILL.md has valid YAML frontmatter
- Ensure skill is in correct directory (personal/project/plugin)

**Tool Permission Errors**
- Add required tools to `allowed-tools` in frontmatter
- Verify tool names match exactly (case-sensitive)

**Reference Files Not Loading**
- Keep references one level deep from SKILL.md
- Use relative paths in markdown links
- Ensure files exist at specified paths

**Skill Conflicts**
- Check for similar descriptions across skills
- Make descriptions more specific
- Use unique trigger phrases

### Debugging

```bash
# Check skill directory structure
ls -la ~/.claude/skills/my-skill/
ls -la .claude/skills/my-skill/

# Validate SKILL.md frontmatter
head -n 10 ~/.claude/skills/my-skill/SKILL.md

# Test with verbose output
claude --debug
```

## Example Skills

### Example 1: Security Code Review

```markdown
---
name: Security Code Review
description: Review code for security vulnerabilities, input validation issues, SQL injection, XSS, authentication flaws. Use when reviewing code, analyzing pull requests, or user mentions security, vulnerabilities, or safety.
allowed-tools: Read, Grep, Glob
---

# Security Code Review

## Review Process

### 1. Input Validation
Check for:
- Unvalidated user input
- Missing sanitization
- Type coercion issues

### 2. Authentication & Authorization
Verify:
- Proper authentication mechanisms
- Authorization checks on sensitive operations
- Session management security

### 3. Data Protection
Review:
- Sensitive data exposure
- Encryption usage
- Secure storage practices

## Common Vulnerabilities

For detailed vulnerability patterns, see [VULNERABILITIES.md](./VULNERABILITIES.md).

## Remediation Guides

For fix recommendations, see [REMEDIATION.md](./REMEDIATION.md).
```

### Example 2: Excel Data Analysis

```markdown
---
name: Excel Data Analysis
description: Analyze Excel spreadsheets, extract data, create pivot tables, generate charts, identify trends. Use when working with .xlsx files, Excel files, spreadsheets, or user asks to analyze tabular data.
allowed-tools: Read, Write, Bash
---

# Excel Data Analysis

## Quick Analysis

### Data Extraction
```bash
${SKILL_ROOT}/scripts/extract-data.py --file=input.xlsx --sheet=Sales
```

### Pivot Table Generation
```bash
${SKILL_ROOT}/scripts/pivot.py --input=data.csv --rows=Region --values=Revenue
```

### Chart Creation
For chart templates and examples, see [CHARTS.md](./CHARTS.md).

## Advanced Features

For advanced statistical analysis and custom visualizations, see [ADVANCED.md](./ADVANCED.md).
```

### Example 3: API Documentation Generation

```markdown
---
name: API Documentation Generation
description: Generate API documentation from code, create OpenAPI specs, document endpoints, parameters, responses. Use when documenting APIs, creating API specs, or user mentions API docs, OpenAPI, Swagger.
allowed-tools: Read, Write, Grep, Glob
---

# API Documentation Generation

## Process

### 1. Endpoint Discovery
Scan codebase for API endpoints:
- Express routes
- FastAPI endpoints
- REST controllers

### 2. Schema Extraction
Extract request/response schemas from:
- Type definitions
- Validation schemas
- Database models

### 3. Documentation Generation
Generate OpenAPI 3.0 specification with:
- Endpoint paths
- HTTP methods
- Parameters
- Request/response bodies
- Authentication requirements

## Templates

For OpenAPI templates, see [TEMPLATES.md](./TEMPLATES.md).

## Examples

For complete examples, see [EXAMPLES.md](./EXAMPLES.md).
```

## Resources

### Official Documentation
- [Claude Code Skills](https://docs.claude.com/en/docs/claude-code/skills)
- [Agent Skills Overview](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [Agent Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)

### Related Documentation
- [Slash Commands](https://docs.claude.com/en/docs/claude-code/slash-commands)
- [Hooks](https://docs.claude.com/en/docs/claude-code/hooks)
- [Plugins](https://docs.claude.com/en/docs/claude-code/plugins)
- [MCP Servers](https://docs.claude.com/en/docs/claude-code/mcp)

### Project Documentation
- [Plugin Development](./plugins.md)
- [Commit Conventions](./commit-convention.md)
- [Development Standards](./STANDARDS.md)
- [Testing Guidelines](./TESTING.md)

## Changelog

- **October 17, 2025**: Initial documentation created with comprehensive skill architecture, best practices, and examples