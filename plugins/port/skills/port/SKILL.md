---
name: Port Internal Developer Portal
description: Query and operate Port.io — the Internal Developer Portal that governs your SDLC. Use when working with software catalogs, blueprints, entities, scorecards, self-service actions, incidents, or DevOps/platform requests. Triggers on mentions of Port, port.io, IDP, developer portal, scorecards, blueprints, service catalog, or self-service actions.
allowed-tools: mcp__port-us__list_blueprints, mcp__port-us__list_entities, mcp__port-us__list_actions, mcp__port-us__list_scorecards, mcp__port-us__run_action, mcp__port-us__track_action_run, mcp__port-us__describe_user_details, mcp__port-us__search_port_knowledge_sources, mcp__port-us__get_sidebar, mcp__port-us__load_skill, mcp__port-eu__list_blueprints, mcp__port-eu__list_entities, mcp__port-eu__list_actions, mcp__port-eu__list_scorecards, mcp__port-eu__run_action, mcp__port-eu__track_action_run, mcp__port-eu__describe_user_details, mcp__port-eu__search_port_knowledge_sources, mcp__port-eu__get_sidebar, mcp__port-eu__load_skill
---

# Port Internal Developer Portal

Use the Port MCP tools automatically when the user works with their Internal Developer Portal — the software catalog, scorecards, self-service actions, or any SDLC governance task on Port.io.

## Regions

Port operates in two regions, exposed as two MCP servers in this plugin:

| Region | MCP server | Endpoint |
|--------|------------|----------|
| US     | `port-us`  | `https://mcp.us.port.io/v1` |
| EU     | `port-eu`  | `https://mcp.port.io/v1` |

Use **one** region — whichever matches the user's Port account. If unsure which region they are on, call `describe_user_details` on each and use the one that authenticates, or ask. Do not duplicate calls across both regions.

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

- Authentication is handled by the Port MCP server's OAuth flow (`/mcp` to connect). No API key env var is required.
- `run_action` may trigger real infrastructure changes — treat it as a write operation and confirm intent first.
- Some MCP servers expose additional capabilities via `load_skill`; call it to discover Port-specific guided workflows when available.
