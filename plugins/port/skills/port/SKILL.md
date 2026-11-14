---
name: Port Internal Developer Portal
description: Query and operate Port.io — the Internal Developer Portal that governs your SDLC. Use when working with software catalogs, blueprints, entities, scorecards, self-service actions, incidents, or DevOps/platform requests. Triggers on mentions of Port, port.io, IDP, developer portal, scorecards, blueprints, service catalog, or self-service actions.
allowed-tools: mcp__plugin_port_port__list_blueprints, mcp__plugin_port_port__list_entities, mcp__plugin_port_port__list_actions, mcp__plugin_port_port__list_scorecards, mcp__plugin_port_port__run_action, mcp__plugin_port_port__track_action_run, mcp__plugin_port_port__describe_user_details, mcp__plugin_port_port__search_port_knowledge_sources, mcp__plugin_port_port__get_sidebar, mcp__plugin_port_port__load_skill
---

# Port Internal Developer Portal

Use the Port MCP tools automatically when the user works with their Internal Developer Portal — the software catalog, scorecards, self-service actions, or any SDLC governance task on Port.io.

## Region

Port operates in two regions. The plugin exposes a single `port` MCP server whose host comes from the plugin's `mcp_host` option:

| Region | `mcp_host` | Endpoint |
|--------|------------|----------|
| EU (default) | `mcp.port.io` | `https://mcp.port.io/v1` |
| US     | `mcp.us.port.io` | `https://mcp.us.port.io/v1` |

If the server is not authenticated, tell the user to complete the Port OAuth flow through their client's MCP authentication (`/mcp` in Claude Code); if `describe_user_details` reports an org in the other region, tell the user to change `mcp_host` in the plugin's options and re-authenticate.

## When to Use

- **Catalog discovery**: list blueprints/entities, find services, owners, dependencies.
- **Scorecards & quality**: check scorecard rules, levels, and which entities pass/fail.
- **Self-service**: list and run self-service actions, then track their run status.
- **Knowledge**: answer questions about the org's software using `search_port_knowledge_sources`.
- **Portal config**: inspect the sidebar, manage folders and dashboard widgets.

## How to Use

1. Start with `describe_user_details` to confirm the active org/region when context is missing.
2. Use `list_blueprints` → `list_entities` to explore the catalog before answering catalog questions.
3. Use `list_scorecards` for quality/compliance questions.
4. For self-service: `list_actions` to find the action, `run_action` to execute, then `track_action_run` to monitor until completion. Confirm with the user before running any action that creates or changes infrastructure.
5. For org-knowledge questions, prefer `search_port_knowledge_sources` over guessing.

## Important Notes

- Authentication is handled by the Port MCP server's OAuth flow, completed through the client's MCP authentication (`/mcp` in Claude Code). No API key env var is required.
- `run_action` may trigger real infrastructure changes — treat it as a write operation and confirm intent first.
- Some MCP servers expose additional capabilities via `load_skill`; call it to discover Port-specific guided workflows when available.
