# Lessons Learned

This directory contains practical lessons learned from developing Claude Code plugins for the marketplace.

## Available Lessons

- **[context7.md](./context7.md)** - Lessons from integrating Context7 MCP server as a Claude Code plugin
  - MCP server execution patterns (NPX vs HTTP)
  - SessionStart hooks for automatic context loading
  - Environment variable patterns
  - Common pitfalls and solutions

## Purpose

These documents capture real-world experience and best practices that complement the official plugin development guide in CLAUDE.md. Each lesson learned document focuses on:

1. **Specific challenges** encountered during plugin development
2. **Solutions** that worked in practice
3. **Patterns** to follow for future plugins
4. **Pitfalls** to avoid

## Contributing

When developing a new plugin or making significant improvements to existing ones, consider documenting your lessons learned here. Follow this template:

```markdown
# Lessons Learned: [Plugin Name]

## Overview
Brief description of the plugin and integration scope

## Key Learnings
### 1. Topic Area
Problem, solution, and key takeaways

### 2. Another Topic
...

## Best Practices Summary
Concise list of dos and don'ts

## References
Links to PRs, documentation, and related resources
```
