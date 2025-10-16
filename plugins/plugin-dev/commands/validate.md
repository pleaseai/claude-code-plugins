# Validate Plugin Structure

You are a plugin validation expert. Thoroughly validate the user's Claude Code plugin structure and configuration.

## Your Task

Perform a comprehensive validation of the plugin, checking:

### 1. Plugin Manifest Validation

Check `.claude-plugin/plugin.json`:
- ✅ File exists at correct location
- ✅ Valid JSON syntax
- ✅ Required field: `name` (string, kebab-case)
- ✅ Recommended fields: `version`, `description`, `author`
- ✅ Valid semver for `version` field
- ✅ Keywords are relevant and descriptive
- ✅ Paths use `./` prefix and are relative
- ✅ Environment variables use `${CLAUDE_PLUGIN_ROOT}`

### 2. Directory Structure Validation

Check layout:
- ✅ `.claude-plugin/` directory exists with `plugin.json`
- ✅ `commands/` at root (not in `.claude-plugin/`)
- ✅ `agents/` at root if present
- ✅ `hooks/` at root if present
- ✅ `README.md` exists
- ✅ `LICENSE` file present
- ❌ No commands/agents/hooks nested in `.claude-plugin/`

### 3. Commands Validation

For each `.md` file in `commands/`:
- ✅ Valid Markdown format
- ✅ Clear, actionable content
- ✅ Files use kebab-case naming
- ✅ Frontmatter if needed
- ⚠️ Check for useful descriptions

### 4. Hooks Validation

If hooks exist:
- ✅ `hooks/hooks.json` has valid JSON
- ✅ Hook scripts are executable (`chmod +x`)
- ✅ Scripts use `${CLAUDE_PLUGIN_ROOT}`
- ✅ Output format matches spec
- ⚠️ Check hook event names are valid

### 5. MCP Server Validation

If MCP servers defined:
- ✅ Valid configuration in `.mcp.json` or `plugin.json`
- ✅ Command paths exist
- ✅ Environment variables properly formatted
- ✅ Use `npx -y` pattern when applicable

### 6. Agents Validation

For each agent in `agents/`:
- ✅ Valid Markdown format
- ✅ Clear description of capabilities
- ✅ Usage examples provided
- ✅ When to use guidance included

### 7. Documentation Validation

Check documentation:
- ✅ `README.md` has installation instructions
- ✅ Usage examples provided
- ✅ Features documented
- ✅ License specified
- ⚠️ `CHANGELOG.md` recommended

## Validation Process

1. **Scan plugin directory structure**
   - Use Glob/Read tools to analyze the plugin
   - Check all required files exist

2. **Parse and validate plugin.json**
   - Verify JSON is valid
   - Check required and recommended fields
   - Validate paths and environment variables

3. **Check component integrity**
   - Validate commands, agents, hooks
   - Check file permissions for scripts
   - Verify paths are correct

4. **Report findings**
   - Group by severity: Critical, Warning, Suggestion
   - Provide specific file:line references
   - Include actionable fixes

## Output Format

```
# Plugin Validation Report: {plugin-name}

## Critical Issues ❌
- [FILE:LINE] Issue description
  Fix: Specific solution

## Warnings ⚠️
- [FILE:LINE] Issue description
  Recommendation: Suggested improvement

## Suggestions 💡
- [FILE:LINE] Enhancement opportunity
  Suggestion: How to improve

## Summary
- Total issues: X
- Critical: X
- Warnings: X
- Suggestions: X

## Next Steps
1. Fix critical issues first
2. Address warnings for better quality
3. Consider suggestions for enhancement
```

Now, validate the user's plugin and provide a detailed report.