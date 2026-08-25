# Phase 1: Project Setup

This phase handles creating a new Slack agent project using [eve](https://eve.dev/docs), Vercel's agent framework.

## Check Current State

First, look for existing project indicators:
- `package.json` with `eve` dependency
- `agent/` directory (`agent/instructions.md`, `agent/agent.ts`)
- `agent/channels/slack.ts` (Slack channel)
- `.env` file with credentials

If these exist, this is an existing project - skip to Phase 2 or 3.

---

## For NEW Projects

### Step 1.1: Understand the Agent Purpose

Before scaffolding the project, ask the user what they're building:

> **What kind of Slack agent are you building?**
>
> Examples: joke bot, support assistant, weather bot, task manager, standup bot, etc.
>
> Tell me what you want your agent to do, and I'll create a custom implementation plan for you.

Based on their response, generate a recommended project name:
- "joke bot" -> `joke-slack-agent`
- "customer support" -> `support-slack-agent`
- "weather" -> `weather-slack-agent`
- "task manager" -> `taskbot-slack-agent`
- "standup" -> `standup-slack-agent`

Use the pattern: `<purpose>-slack-agent` (lowercase, hyphens, no spaces).

**Store this context** - you'll use it for the connector name in Phase 2 and for `agent/instructions.md` in Step 1.5.

### Step 1.2: Generate Custom Implementation Plan

Based on the user's stated purpose, generate a custom implementation plan tailored to their specific agent.

**Reference document:** See `reference/agent-archetypes.md` for common patterns and the plan template.

**Instructions for plan generation:**

1. **Analyze the agent purpose** to identify:
   - Primary interaction patterns (@mentions, DMs, button interactions, scheduled)
   - What the model needs to *do* (tools) vs. what it needs to *know* (instructions/skills)
   - Whether the agent reacts to Slack events or also runs proactively (schedules)
   - Thread-context needs (does a reply need the full thread history?)
   - External integrations needed (APIs, MCP servers, databases)

2. **Match to archetypes** from the reference document:
   - Standup/Reminder Bot
   - Support/Help Desk Bot
   - Information/Lookup Bot
   - Conversational AI Bot
   - Automation Bot
   - Notification/Alerting Bot
   - Or combine multiple archetypes for hybrid agents

3. **Generate a specific plan** using the template structure:
   - Overview (1-2 sentences)
   - Core Features (3-5 specific features)
   - Dispatch Hooks (what triggers the agent - `onAppMention`, `onDirectMessage`, `onInteraction`)
   - Tools (specific tool names and parameters - each becomes a `defineTool` file in `agent/tools/`, where the filename is the tool name)
   - Skills (load-on-demand instructions as `agent/skills/*.md`, if the agent has distinct task modes)
   - Schedules (if the agent runs proactively - with cron expressions)
   - Thread Context (whether the Slack channel should load prior thread messages)
   - Files to Create/Modify (specific file paths using eve conventions: `agent/instructions.md`, `agent/agent.ts`, `agent/tools/*.ts`, `agent/skills/*.md`, `agent/channels/slack.ts`)

4. **Include complexity indicator:**
   - **Simple** - Instructions + 1-2 tools, no external services, can be built quickly
   - **Medium** - Multiple tools, skills, or thread context, moderate effort
   - **Complex** - Multi-turn workflows, external integrations, scheduled jobs

**After generating the plan**, proceed to [Phase 1b: Approve Plan](./1b-approve-plan.md) to present it to the user for approval.

---

### Step 1.3: Choose LLM Provider

> **Note:** Only proceed to this step after the implementation plan has been approved in [Phase 1b](./1b-approve-plan.md).

Every eve agent needs a model credential. Ask the user how they want to authenticate:

> **How do you want to connect to your LLM provider?**
>
> 1. **Vercel AI Gateway with Vercel OIDC** (Recommended)
>    - Easiest setup - no API keys needed when the project is linked to Vercel
>    - Access to multiple providers (Anthropic, OpenAI, Google, etc.) via model-ID strings
>    - Built-in rate limiting and observability
>
> 2. **Vercel AI Gateway with an API key**
>    - Same Gateway routing, authenticated with `AI_GATEWAY_API_KEY`
>    - Useful outside Vercel-linked environments (e.g., external CI)

Based on their choice:

**If AI Gateway with Vercel OIDC (default):**
- eve's default model is `anthropic/claude-sonnet-5`, routed through the Gateway automatically
- No API keys needed - `vercel link` + `vercel env pull` provides `VERCEL_OIDC_TOKEN` locally; deployments get it automatically
- Store this choice for Phase 3 (no AI keys needed in .env)

**If AI Gateway with an API key:**
- Same default model; authentication via `AI_GATEWAY_API_KEY`
- Store this choice for Phase 3 (will need `AI_GATEWAY_API_KEY` in .env)

**Store this context** - you'll use it for environment configuration in Phase 3.

### Step 1.4: Scaffold the Project

**Check Node version first** - eve requires Node 24+:

```bash
node --version  # must be 24.x or later
```

Create a new eve project with the recommended name:

```bash
npx eve@latest init <recommended-name>
```

This creates the project, installs dependencies (`eve`, `ai`, `zod`), and initializes Git. If a coding-agent REPL (Claude Code, Cursor, etc.) is installed, init offers to open it — decline, or exit whichever it starts (REPL or the `eve dev` TUI), to continue with the wizard.

> **Existing codebase?** Run `eve init .` inside the project instead - it adds the `eve`, `ai`, and `zod` dependencies to the current project.

Ask the user to confirm or customize the project name before proceeding.

### Step 1.5: Set Up the Agent Files

After scaffolding, fill in the core agent files. eve is filesystem-first: a file's location says what it does, and its path usually gives it its name.

1. **Write `agent/instructions.md`** - the always-on system prompt. Generate this from the Step 1.1 interview and the approved plan: who the agent is, what it does, its tone, and any hard rules. For example, for a weather bot:

   ```markdown
   You are a friendly weather assistant for our Slack workspace.

   - Answer questions about current weather using your tools.
   - Keep replies short and conversational; reply in the thread you were mentioned in.
   - If a location is ambiguous, ask for clarification instead of guessing.
   ```

2. **Configure `agent/agent.ts`** - runtime config via `defineAgent`:

   ```typescript
   import { defineAgent } from "eve";

   export default defineAgent({
     model: "anthropic/claude-sonnet-5",
   });
   ```

   The `model` string routes through Vercel AI Gateway (it's also the default if omitted).

3. **Create the first tool** from the approved plan in `agent/tools/` - the filename (snake_case) is the tool name the model sees, no registration needed. For example, `agent/tools/get_weather.ts`:

   ```typescript
   import { defineTool } from "eve/tools";
   import { z } from "zod";

   export default defineTool({
     description: "Get the current weather for a city.",
     inputSchema: z.object({ city: z.string().min(1) }),
     async execute({ city }) {
       return { city, condition: "Sunny", temperatureF: 72 };
     },
   });
   ```

4. **Add the Slack channel** - run:

   ```bash
   eve channels add slack
   ```

   This scaffolds the channel and installs its dependency (`@vercel/connect`). Then make sure `agent/channels/slack.ts` wires credentials through Vercel Connect:

   ```typescript
   import { connectSlackCredentials } from "@vercel/connect/eve";
   import { slackChannel } from "eve/channels/slack";

   export default slackChannel({
     credentials: connectSlackCredentials(
       process.env.SLACK_CONNECTOR ?? "slack/<recommended-name>"
     ),
   });
   ```

   The `slack.ts` filename registers the `slack` channel, served at `/eve/v1/slack`. The connector UID (`SLACK_CONNECTOR`) is created in Phase 2 - no `SLACK_BOT_TOKEN` or `SLACK_SIGNING_SECRET` to manage.

### Step 1.6: Verify Project Structure

After setup, verify the project structure:

```
agent/
  instructions.md      # always-on system prompt (from the interview)
  agent.ts             # runtime config (defineAgent)
  tools/*.ts           # tools - filename = tool name (defineTool)
  skills/*.md          # load-on-demand instructions (if planned)
  channels/slack.ts    # Slack channel via Vercel Connect
```

If the structure looks correct, proceed to Phase 2.

---

## For EXISTING Projects

Verify the project structure:
- `package.json` with the `eve` dependency (if missing, run `eve init .`)
- `agent/instructions.md` and `agent/agent.ts` - core agent files
- `agent/channels/slack.ts` - Slack channel (add with `eve channels add slack` if missing)

If the structure looks correct, proceed to Phase 2 (Create the Slack Connector) or Phase 3 (Configure Environment) depending on what's already done.

---

## Next Phase

Once the project is set up, proceed to [Phase 2: Create the Slack Connector](./2-create-slack-app.md).
