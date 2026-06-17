# Port Plugin

[Port.io](https://www.port.io) Internal Developer Portal integration for Claude Code. Manage your entire SDLC — blueprints, entities, scorecards, self-service actions, incidents, and DevOps/platform requests — directly from Claude through the Port MCP server.

## Regions

Port operates in two regions. This plugin configures both as separate MCP servers; use the one that matches your Port account:

| Region | MCP server | Endpoint |
|--------|------------|----------|
| US     | `port-us`  | `https://mcp.us.port.io/v1` |
| EU     | `port-eu`  | `https://mcp.port.io/v1` |

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install port@pleaseai
```

## Authentication

The Port MCP server uses OAuth. After installing, run `/mcp` and complete the
authentication flow for your region (`port-us` or `port-eu`). No API key
environment variable is required.

If you only use one region, you can disable the unused MCP server from the
`/plugin` menu.

## Capabilities

- **Software catalog**: list blueprints and entities, explore services, owners, and dependencies.
- **Scorecards**: inspect scorecard rules and levels, and see which entities pass or fail.
- **Self-service actions**: list, run, and track Port self-service actions.
- **Org knowledge**: answer questions about your software using Port's knowledge sources.
- **Portal config**: inspect the sidebar and manage dashboard folders and widgets.

A bundled skill (`Port Internal Developer Portal`) activates these tools
automatically when you ask about your developer portal, scorecards, catalog, or
self-service actions.

## Links

- Website: https://www.port.io
- Port MCP server: https://github.com/port-labs/port-mcp-server
