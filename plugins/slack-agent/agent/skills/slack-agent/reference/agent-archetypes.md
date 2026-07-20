# Agent Archetypes Reference

This document provides common patterns and archetypes for Slack agents built with eve. Use this as a reference when generating custom implementation plans based on user requirements.

## Implementation Plan Template

When generating a plan, use this structure:

```markdown
## Implementation Plan: [Agent Name]

### Overview
[1-2 sentence description of what this agent does]

### Core Features
1. **[Feature 1]** - [Description]
2. **[Feature 2]** - [Description]
3. **[Feature 3]** - [Description]

### Interactions (@mentions and DMs)
eve's Slack channel is mention/DM-driven — there are no slash commands.
Users talk to the agent in natural language; the model routes to tools.

| Phrasing | What it does | Example |
|----------|--------------|---------|
| `@agent [request]` | What happens | `@agent do the thing for X` |

### Dispatch Hooks & Events
Configured on the Slack channel in `agent/channels/slack.ts`:

- [ ] `onAppMention(ctx, message)` - [What happens when @mentioned; default derives workspace-scoped auth and posts "Thinking…"]
- [ ] `onDirectMessage(ctx, message)` - [DM handling; needs `im:history` scope]
- [ ] `onInteraction(action, ctx)` - [`block_actions` not consumed by HITL]
- [ ] `threadContext` - [`"thread-root"`, `"last-agent-reply"`, or a predicate, if thread history matters]
- [ ] Custom `events` handlers (e.g. `"message.completed"`) - [If delivery needs customizing]

### AI Tools (if using AI)
One file per tool in `agent/tools/` — the snake_case filename is the tool name.

Tools **fetch data and perform actions**. Never plan a tool that wraps an LLM call (summarize, parse, classify, draft) — the agent is the language model and does that work itself, guided by `instructions.md` or a skill.

| Tool | Purpose | Parameters |
|------|---------|------------|
| `tool_name` | What it does | `param1`, `param2` |

### Connections (if external APIs)
For third-party services (Linear, GitHub, Notion, ...), use Vercel Connect:
- MCP servers: `defineMcpClientConnection` with `auth: connect("provider/my-agent")` from `@vercel/connect/eve`
- Authored tools: `const auth = connect("provider/my-agent")` then `await ctx.getToken(auth)` inside `execute`

| Connection | Provider | Scope |
|------------|----------|-------|
| `provider` | What it accesses | `user` (per-user consent) or `app` |

### Schedules (if applicable)
Proactive/cron behavior uses eve schedules, which start sessions with
`receive(slack, { message, target: { channelId }, auth })`.

| Schedule | Action |
|----------|--------|
| `0 9 * * 1-5` | Description |

### Durability & State
- [ ] Stateless (simple request/response)
- [ ] Durable sessions (default) - eve persists every session via the Workflow SDK; multi-turn context, tool results, and parked HITL/auth prompts survive restarts with no extra config. No Redis required.
- [ ] Database (persistent storage, beyond session lifetime)
  - Upstash Redis for caching or cross-session lookups
  - Vercel Blob for file/document storage
  - AWS Aurora via Vercel Marketplace for relational data
  - NOTE: Do NOT recommend Vercel KV (deprecated)

### Delivery
eve's Slack channel handles rendering — no custom Block Kit:
- [ ] Typing lifecycle - "Thinking…" on inbound, "Working…" on `turn.started`, reasoning snippets and action labels as the turn progresses (automatic)
- [ ] mrkdwn text replies - Default message delivery in-thread
- [ ] HITL buttons - Approval-gated tools (`approval` from `eve/tools/approval`) render as Slack buttons/selects; responses resume the parked session
- [ ] `toModelOutput` - Show the model a compact projection while channels receive the full tool output for rich rendering

### Files to Create/Modify
- `agent/instructions.md` - Always-on system prompt
- `agent/agent.ts` - Runtime config (`defineAgent`)
- `agent/channels/slack.ts` - Slack channel + dispatch hooks
- `agent/tools/[tool_name].ts` - AI tool definitions (`defineTool`)
- `agent/skills/[skill].md` - Load-on-demand instructions (if applicable)
- `agent/connections/[provider].ts` - Vercel Connect connections (if applicable)
- `agent/hooks/` - Runtime stream event subscribers (if applicable)
- Schedule definitions - Proactive/cron sessions (if applicable)
```

---

## Archetype 1: Standup / Reminder Bot

**Use case:** Collects updates from team members on a schedule and summarizes them.

### Typical Features
- Scheduled prompts at specific times (e.g., 9 AM on weekdays)
- DM-based response collection
- Summary generation and posting to channels
- Tracking who has/hasn't responded

### Example Plan

```markdown
## Implementation Plan: Standup Bot

### Overview
A bot that collects daily standup updates from team members and posts a summary to a channel.

### Core Features
1. **Scheduled Prompts** - DM team members at 9 AM asking for their update
2. **Response Collection** - Accept free-form or structured responses
3. **Summary Generation** - the agent fetches the day's responses and writes the summary itself
4. **Status Tracking** - Track who has/hasn't responded

### Interactions (@mentions and DMs)
| Phrasing | What it does | Example |
|----------|--------------|---------|
| DM the bot your update | Submit your standup update | `Working on API integration today, no blockers` |
| `@agent who's submitted?` | Check who has submitted today | `@agent standup status?` |
| `@agent configure standup` | Change standup time/channel | `@agent post the summary in #team at 10am` |

### Dispatch Hooks & Events
- [x] `onDirectMessage` - Collect standup responses in DMs
- [x] `onAppMention` - Answer questions about standup status, handle configuration
- [x] `threadContext: { since: "last-agent-reply" }` - Follow-ups in prompt threads

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `standup_collect` | Record a member's update | `userId`, `updateText` |
| `standup_get_responses` | Fetch all responses for a date (the agent writes the summary) | `date` |
| `standup_status` | List who has/hasn't responded | `date` |
| `standup_configure` | Update time/channel settings | `channelId`, `time` |

### Schedules
| Schedule | Action |
|----------|--------|
| `0 9 * * 1-5` | `receive(slack, ...)` targeting each member's DM with the standup prompt |
| `0 10 * * 1-5` | `receive(slack, ...)` targeting the team channel to post the summary |

### Durability & State
- [x] Durable sessions - Each prompt thread stays resumable all morning
- [x] Database (persistent storage) - Daily responses, configuration, history

### Delivery
- [x] mrkdwn summaries posted to the configured channel
- [x] Typing lifecycle (automatic)

### Files to Create/Modify
- `agent/instructions.md` - Standup persona and rules
- `agent/agent.ts`
- `agent/channels/slack.ts` - Mention/DM hooks, thread context
- `agent/tools/standup_collect.ts`
- `agent/tools/standup_get_responses.ts`
- `agent/tools/standup_status.ts`
- `agent/tools/standup_configure.ts`
- `lib/standup/storage.ts` - Response/config persistence
- Schedule definitions for the 9 AM prompt and 10 AM summary
```

---

## Archetype 2: Support / Help Desk Bot

**Use case:** Handles support requests, tracks tickets, and can escalate to humans.

### Typical Features
- Ticket creation and tracking
- Knowledge base search
- Escalation to human agents
- Status updates and notifications

### Example Plan

```markdown
## Implementation Plan: Support Assistant

### Overview
An AI-powered support bot that answers questions, creates tickets, and escalates to humans when needed.

### Core Features
1. **Knowledge Base Search** - Search documentation to answer questions
2. **Ticket Creation** - Create tickets in external system
3. **Escalation** - Route complex issues to human agents
4. **Status Tracking** - Check and update ticket status

### Interactions (@mentions and DMs)
| Phrasing | What it does | Example |
|----------|--------------|---------|
| `@agent [question]` | Ask a support question | `@agent how do I reset my password?` |
| `@agent file a ticket` | Create a support ticket | `@agent file a ticket: login broken on mobile` |
| `@agent status of [ticket]` | Check ticket status | `@agent what's the status of TICK-1234?` |
| DM the bot | Private multi-turn support conversation | `My deploy keeps failing...` |

### Dispatch Hooks & Events
- [x] `onAppMention` - Answer support questions in channels
- [x] `onDirectMessage` - Private support conversations
- [x] `threadContext: { since: "thread-root" }` - Full thread context for triage

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `search_knowledge_base` | Search docs for answers | `query` |
| `create_ticket` | Create ticket in system | `title`, `description`, `priority` |
| `get_ticket_status` | Check ticket status | `ticketId` |
| `escalate_to_human` | Route to human agent | `ticketId`, `reason` |

### Connections
| Connection | Provider | Scope |
|------------|----------|-------|
| `linear` | Ticket system via `defineMcpClientConnection` + `connect("linear/my-agent")` | `user` (or `app` for non-interactive) |

### Durability & State
- [x] Durable sessions - Multi-turn support threads resume across restarts
- [x] Database (persistent storage) - Ticket cross-references, if not fully delegated to the ticket system

### Delivery
- [x] HITL buttons - `create_ticket` and `escalate_to_human` gated with `approval` so the requester confirms before filing
- [x] mrkdwn answers with linked sources
- [x] `toModelOutput` - Return compact ticket JSON to the model; channel gets the full payload

### Files to Create/Modify
- `agent/instructions.md` - Support persona, escalation policy
- `agent/agent.ts`
- `agent/channels/slack.ts`
- `agent/tools/search_knowledge_base.ts`
- `agent/tools/create_ticket.ts`
- `agent/tools/get_ticket_status.ts`
- `agent/tools/escalate_to_human.ts`
- `agent/connections/linear.ts` - Vercel Connect MCP connection
- `agent/skills/triage.md` - Triage/escalation playbook (load-on-demand)
```

---

## Archetype 3: Information / Lookup Bot

**Use case:** Fetches and formats information from external APIs.

### Typical Features
- External API integration
- Formatted mrkdwn responses
- Caching for performance
- Multiple data sources

### Example Plan

```markdown
## Implementation Plan: Weather Bot

### Overview
A bot that provides weather information for any location using an external weather API.

### Core Features
1. **Current Weather** - Get current conditions for a location
2. **Forecast** - Get multi-day forecast
3. **Alerts** - Weather alerts and warnings
4. **Location Memory** - Remember user's preferred locations

### Interactions (@mentions and DMs)
| Phrasing | What it does | Example |
|----------|--------------|---------|
| `@agent weather in [place]` | Get current weather | `@agent what's the weather in San Francisco?` |
| `@agent forecast for [place]` | Get 5-day forecast | `@agent 5-day forecast for New York` |
| `@agent any weather alerts?` | Get active alerts | `@agent weather alerts for California?` |
| `@agent set my default to [place]` | Set default location | `@agent default me to Seattle` |

### Dispatch Hooks & Events
- [x] `onAppMention` - Answer weather questions in channels
- [x] `onDirectMessage` - Private lookups
- [x] `threadContext: { since: "last-agent-reply" }` - Follow-up queries ("what about tomorrow?")

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `get_current_weather` | Fetch current conditions | `location` |
| `get_forecast` | Fetch multi-day forecast | `location`, `days` |
| `get_weather_alerts` | Fetch active alerts | `region` |
| `set_default_location` | Store a user preference | `userId`, `location` |

### Durability & State
- [x] Durable sessions - Follow-ups in a thread reuse session context (no extra config)
- [x] Database (persistent storage) - Default locations across sessions (Upstash Redis)

### Delivery
- [x] mrkdwn weather summaries
- [x] `toModelOutput` - Model sees a text summary; channel receives full API payload for richer formatting

### Files to Create/Modify
- `agent/instructions.md` - Response style, unit conventions
- `agent/agent.ts`
- `agent/channels/slack.ts`
- `agent/tools/get_current_weather.ts`
- `agent/tools/get_forecast.ts`
- `agent/tools/get_weather_alerts.ts`
- `agent/tools/set_default_location.ts`
- `lib/weather/api-client.ts`
```

---

## Archetype 4: Conversational AI Bot

**Use case:** General-purpose conversational assistant with multi-turn dialogue.

### Typical Features
- Multi-turn conversation with context
- Tool calling for actions
- Memory of past interactions
- Personality customization

### Example Plan

```markdown
## Implementation Plan: AI Assistant

### Overview
A conversational AI assistant that can help with various tasks through natural dialogue.

### Core Features
1. **Multi-turn Conversations** - Maintains context across messages
2. **Tool Calling** - Performs actions based on conversation
3. **Conversation Memory** - Durable sessions preserve dialogue per thread
4. **Customizable Personality** - `agent/instructions.md` system prompt

### Interactions (@mentions and DMs)
| Phrasing | What it does | Example |
|----------|--------------|---------|
| `@agent [anything]` | Start a conversation in a thread | `@agent help me draft an email to the team` |
| Reply in the thread | Continue the conversation | `Make it more formal` |
| DM the bot | Private conversation | `Summarize this doc for me...` |

### Dispatch Hooks & Events
- [x] `onAppMention` - Respond to @mentions with AI
- [x] `onDirectMessage` - Full private conversations
- [x] `threadContext: { since: "thread-root" }` - Multi-user thread context (speaker attribution is preserved automatically)

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `search_web` | Search the internet | `query` |
| `calculate` | Perform calculations | `expression` |
| `set_reminder` | Create a reminder | `message`, `time` |

### Durability & State
- [x] Durable sessions - Conversation history per thread, resumable and crash-safe by default
- [x] Database (persistent storage) - Long-term memory across threads (optional)

### Delivery
- [x] Typing lifecycle - Reasoning snippets and action labels keep long turns transparent
- [x] mrkdwn replies in-thread
- [x] HITL buttons - Gate side-effecting tools like `set_reminder` with `approval: once()`

### Files to Create/Modify
- `agent/instructions.md` - Personality and behavior
- `agent/agent.ts` - Model, reasoning effort, compaction
- `agent/channels/slack.ts`
- `agent/tools/search_web.ts`
- `agent/tools/calculate.ts`
- `agent/tools/set_reminder.ts`
- `agent/skills/[topic].md` - Specialized behaviors, loaded on demand
```

---

## Archetype 5: Automation Bot

**Use case:** Automates workflows and integrates with external services.

### Typical Features
- Natural-language triggers for actions
- Approval-gated confirmations (HITL)
- External service integrations via Vercel Connect
- Scheduled automations

### Example Plan

```markdown
## Implementation Plan: Deploy Bot

### Overview
A bot that helps manage deployments, CI/CD pipelines, and release workflows.

### Core Features
1. **Deployment Triggers** - Start deployments by asking the agent
2. **Status Monitoring** - Check deployment status
3. **Rollback Support** - Quick rollback to previous versions
4. **Notifications** - Post updates to channels

### Interactions (@mentions and DMs)
| Phrasing | What it does | Example |
|----------|--------------|---------|
| `@agent deploy [env]` | Trigger a deployment | `@agent deploy staging` |
| `@agent deploy status` | Check deployment status | `@agent how's the production deploy?` |
| `@agent rollback [env]` | Rollback to previous version | `@agent roll back production` |
| `@agent recent releases` | List recent releases | `@agent what shipped this week?` |

### Dispatch Hooks & Events
- [x] `onAppMention` - Deployment requests and questions
- [x] `onInteraction` - Any `block_actions` beyond the built-in HITL buttons

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `trigger_deployment` | Start a deployment | `environment`, `branch` |
| `get_deployment_status` | Check status | `deploymentId` |
| `rollback_deployment` | Trigger rollback | `environment`, `version` |
| `list_releases` | Get recent releases | `count` |

### Connections
| Connection | Provider | Scope |
|------------|----------|-------|
| `github` | Repo/workflow access via `connect("github/my-agent")` in tools (`ctx.getToken`) | `app` for CI actions, `user` if attribution matters |

### Durability & State
- [x] Durable sessions - An approval-gated deploy pauses the session and resumes on the button click, even across restarts. Make interrupted side effects idempotent (steps interrupted mid-execution re-run).

### Delivery
- [x] HITL buttons - `trigger_deployment` and `rollback_deployment` use `approval: always()`; confirm/cancel renders as Slack buttons
- [x] Typing lifecycle - Action labels show which step is running
- [x] mrkdwn status updates

### Files to Create/Modify
- `agent/instructions.md` - Deployment policies, environment rules
- `agent/agent.ts`
- `agent/channels/slack.ts`
- `agent/tools/trigger_deployment.ts`
- `agent/tools/get_deployment_status.ts`
- `agent/tools/rollback_deployment.ts`
- `agent/tools/list_releases.ts`
- `agent/connections/github.ts` (if using an MCP connection instead of authored tools)
```

---

## Archetype 6: Notification / Alerting Bot

**Use case:** Monitors systems and sends alerts to Slack channels.

### Typical Features
- Alert ingestion from external systems
- Alert routing to appropriate channels
- Alert acknowledgment and silencing
- Escalation rules

### Example Plan

```markdown
## Implementation Plan: Alert Bot

### Overview
A bot that receives alerts from monitoring systems and routes them to appropriate channels.

### Core Features
1. **Alert Ingestion** - Monitoring systems start sessions via eve's HTTP API (`POST /eve/v1/session`) or a schedule polls the monitoring API
2. **Smart Routing** - Route alerts to appropriate channels based on rules
3. **Acknowledgment** - Team members ack alerts via buttons
4. **Escalation** - Escalate unacknowledged alerts

### Interactions (@mentions and DMs)
| Phrasing | What it does | Example |
|----------|--------------|---------|
| Ack button on the alert | Acknowledge an alert | (HITL button click) |
| `@agent silence [service]` | Silence alerts for a service | `@agent silence api-server for 1h` |
| `@agent active alerts` | View active alerts | `@agent what's firing right now?` |
| `@agent who's on call?` | Show who's on call | `@agent who's on call tonight?` |

### Dispatch Hooks & Events
- [x] `onAppMention` - Status queries, silencing
- [x] `onInteraction` - Ack/silence `block_actions` not consumed by HITL

### AI Tools
| Tool | Purpose | Parameters |
|------|---------|------------|
| `route_alert` | Pick target channel from rules | `alert` |
| `ack_alert` | Mark an alert acknowledged | `alertId`, `userId` |
| `silence_alerts` | Silence a service | `service`, `duration` |
| `list_active_alerts` | Show unresolved alerts | — |
| `get_on_call` | Show on-call rotation | — |

### Schedules
| Schedule | Action |
|----------|--------|
| `*/5 * * * *` | Check for unacked alerts; escalate via `receive(slack, { message, target: { channelId }, auth })` |

### Durability & State
- [x] Durable sessions - Proactive alert sessions anchor a thread on first post; escalation follow-ups continue it
- [x] Database (persistent storage) - Alert state, ack status, routing rules

### Delivery
- [x] HITL buttons - Ack/silence rendered as buttons on the alert post
- [x] mrkdwn alert formatting with severity and links
- [x] Proactive posts - Schedules use `receive(slack, ...)`; outside handlers, `callSlackApi({ botToken, operation, body })` with `resolveSlackBotToken` for raw API needs

### Files to Create/Modify
- `agent/instructions.md` - Routing rules, severity conventions
- `agent/agent.ts`
- `agent/channels/slack.ts` - Mention/interaction hooks
- `agent/tools/route_alert.ts`
- `agent/tools/ack_alert.ts`
- `agent/tools/silence_alerts.ts`
- `agent/tools/list_active_alerts.ts`
- `agent/tools/get_on_call.ts`
- `lib/alerts/router.ts`
- `lib/alerts/escalation.ts`
- Schedule definition for the 5-minute escalation check
```

---

## Pattern Recognition Guide

Use these signals to determine which archetype(s) apply:

| User says... | Likely Archetype |
|-------------|------------------|
| "standup", "daily", "check-in", "status update" | Standup/Reminder |
| "support", "help desk", "tickets", "customer" | Support/Help Desk |
| "weather", "lookup", "API", "fetch", "data" | Information/Lookup |
| "chat", "assistant", "conversation", "AI" | Conversational AI |
| "deploy", "CI/CD", "automate", "workflow" | Automation |
| "alert", "monitor", "notify", "on-call" | Notification/Alerting |

### Hybrid Agents

Many real-world agents combine multiple archetypes. For example:
- **Support + Conversational** - AI-powered support with multi-turn dialogue
- **Automation + Alerting** - Deploy bot that also sends deployment notifications
- **Information + Conversational** - Weather bot with natural language queries

When users describe hybrid needs, combine relevant features from multiple archetypes.

---

## Implementation Complexity Guide

When generating plans, indicate complexity to set expectations:

| Complexity | Characteristics | Example |
|------------|-----------------|---------|
| **Simple** | 1-3 tools, no database, no schedules | Weather lookup |
| **Medium** | Multiple tools, Vercel Connect connection, HITL approvals | Ticket system |
| **Complex** | Multi-turn workflows, database, schedules, proactive sessions | Full standup bot |

Include a complexity indicator in your generated plans to help users understand scope.
