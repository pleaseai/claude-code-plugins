# Playwright

Token-efficient browser automation CLI for coding agents — navigate, interact, screenshot, and test web apps via concise CLI commands instead of verbose MCP schemas.

## Playwright CLI vs Playwright MCP

This package provides CLI interface into Playwright. If you are using coding agents, that is the best fit.

**CLI:** Modern coding agents increasingly favor CLI–based workflows exposed as SKILLs over MCP because CLI invocations are more token-efficient: they avoid loading large tool schemas and verbose accessibility trees into the model context, allowing agents to act through concise, purpose-built commands. This makes CLI + SKILLs better suited for high-throughput coding agents that must balance browser automation with large codebases, tests, and reasoning within limited context windows.

**MCP:** MCP remains relevant for specialized agentic loops that benefit from persistent state, rich introspection, and iterative reasoning over page structure, such as exploratory automation, self-healing tests, or long-running autonomous workflows where maintaining continuous browser context outweighs token cost concerns. Learn more about [Playwright MCP](https://github.com/microsoft/playwright-mcp).

## Installation

```bash
/plugin install playwright@pleaseai
```

## Source

Skill sourced from [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) via [skills.sh](https://skills.sh/microsoft/playwright-cli).
