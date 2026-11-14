# Port Plugin

[Port.io](https://www.port.io) Internal Developer Portal integration for Claude Code. Manage your entire SDLC — blueprints, entities, scorecards, self-service actions, incidents, and DevOps/platform requests — directly from Claude through the Port MCP server.

## Regions

Port operates in two regions. The plugin configures a single `port` MCP server;
choose your region with the `mcp_host` option when you enable the plugin:

| Region | `mcp_host` | Endpoint |
|--------|------------|----------|
| EU (default) | `mcp.port.io` | `https://mcp.port.io/v1` |
| US     | `mcp.us.port.io` | `https://mcp.us.port.io/v1` |

To switch regions later, change `mcp_host` in the plugin's options from the
`/plugin` menu, then run `/mcp` and authenticate the `port` server again, since
each region has its own OAuth server. Codex, Cursor, and Antigravity do not support plugin options,
so their generated configs use the EU default; edit their MCP config to point
at the US host if needed.

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install port@pleaseai
```

## Authentication

The Port MCP server uses OAuth. After installing, run `/mcp` and complete the
authentication flow for the `port` server. No API key environment variable is
required.

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
