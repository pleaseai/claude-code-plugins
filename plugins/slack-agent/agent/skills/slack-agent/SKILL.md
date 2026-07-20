---
description: "Use when building Slack agents/bots with eve (Vercel's filesystem-first agent framework), @vercel/connect, or eve/channels/slack. Covers defineAgent/defineTool patterns, Vercel Connect credential brokering, Slack channel setup, testing requirements, and quality standards."
---
# Slack Agent Development Skill

This skill builds Slack agents with **eve** — Vercel's filesystem-first framework for durable backend agents — using **Vercel Connect** for Slack credentials:

- **eve** (`eve` package) — agent runtime, tools, channels, durability
- **@vercel/connect** — brokered short-lived Slack tokens; no bot tokens or signing secrets to manage

## Skill Invocation Handling

When this skill is invoked via `/slack-agent`, check for arguments and route accordingly:

### Command Arguments

| Argument | Action |
|----------|--------|
| `new` | **Run the setup wizard from Phase 1.** Read `./wizard/1-project-setup.md` and guide the user through creating a new Slack agent. |
| `configure` | Start wizard at Phase 2 or 3 for existing projects |
| `deploy` | Start wizard at Phase 5 for production deployment |
| `test` | Start wizard at Phase 6 to set up testing |
| (no argument) | Auto-detect based on project state (see below) |

### Auto-Detection (No Argument)

If invoked without arguments, detect the project state and route appropriately:

1. **No `package.json` with `eve` and no `agent/` directory** → Treat as `new`, start Phase 1
2. **Has eve project but no `agent/channels/slack.ts`** → Start Phase 2 (Slack connector + channel)
3. **Has Slack channel but no `SLACK_CONNECTOR` configured** → Start Phase 3
4. **Configured but not deployed** → Start Phase 5 (the Slack surface only works on a deployment)
5. **Deployed but no tests** → Start Phase 6
6. **Otherwise** → Provide general assistance using this skill's patterns

### Project Detection

Detect an eve project by either signal:

- **`package.json` contains `"eve"`** as a dependency
- **An `agent/` directory** with `instructions.md` and/or `agent.ts` exists

If neither is present, this is a new project: scaffold with `npx eve@latest init` (Node 24+ required).

### Wizard Phases

The wizard is located in `./wizard/` with these phases:
- `1-project-setup.md` - Understand purpose, generate custom implementation plan, scaffold with `npx eve@latest init`
- `1b-approve-plan.md` - Present plan for user approval before scaffolding
- `2-create-slack-app.md` - Create the Slack connector with Vercel Connect and add the Slack channel
- `3-configure-environment.md` - Set up env vars (`SLACK_CONNECTOR`, model credentials)
- `4-test-locally.md` - Test agent logic locally with the `eve dev` TUI (Slack surface tests happen after deploy)
- `5-deploy-production.md` - Deploy with `eve deploy`, verify the Slack surface
- `6-setup-testing.md` - Vitest configuration

**IMPORTANT:** For `new` projects, you MUST:
1. Read `./wizard/1-project-setup.md` first
2. Ask the user what kind of agent they want to build
3. Generate a custom implementation plan using `./reference/agent-archetypes.md`
4. Present the plan for approval (Phase 1b) BEFORE scaffolding the project
5. Only proceed to scaffold after the plan is approved

---

## General Development Guidance

You are working on a Slack agent project built with eve. Follow these mandatory practices for all code changes.

## Project Stack

- **Framework**: eve (filesystem-first agent framework; Node 24+)
- **Slack channel**: `eve/channels/slack` + `@vercel/connect` for credentials
- **AI**: model routed through Vercel AI Gateway by default (`anthropic/claude-sonnet-5`); tool schemas with `zod`
- **Durability**: Workflow SDK under the hood (Vercel Workflows when deployed on Vercel)
- **Linting**: Biome
- **Package Manager**: pnpm (or npm — `npx eve@latest init` installs with npm)

```json
{
  "engines": { "node": "24.x" },
  "dependencies": {
    "eve": "latest",
    "ai": "latest",
    "zod": "^3.x",
    "@vercel/connect": "latest"
  }
}
```

### Filesystem-First Layout

In eve, a file's location says what it does, and its path usually gives it its name. The whole agent lives under `agent/`:

```
agent/
├── instructions.md        # Always-on system prompt
├── agent.ts               # Runtime config (defineAgent): model, reasoning, compaction
├── tools/                 # Tools — filename (snake_case ASCII) = tool name the model sees
│   ├── get_weather.ts
│   └── search_docs.ts
├── skills/                # Load-on-demand instructions (*.md with description frontmatter)
│   └── incident-triage.md
├── channels/
│   └── slack.ts           # Slack channel — filename registers it at /eve/v1/slack
├── connections/           # MCP / OpenAPI connections (optional)
└── hooks/                 # Subscribe to runtime stream events (optional)
```

Even a two-file agent (`instructions.md` + `agent.ts`) gets file, shell, web, and delegation tools out of the box from the default harness. Full docs are bundled at `node_modules/eve/docs/` once eve is installed — read them when a detail isn't covered here.

```ts
// agent/agent.ts
import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-5", // routed via Vercel AI Gateway
});
```

---

## Quality Standards (MANDATORY)

These quality requirements MUST be followed for every code change. There are no exceptions.

### After EVERY File Modification

1. **Run linting immediately:**
   ```bash
   pnpm lint
   ```
   - If errors exist, run `pnpm lint --write` for auto-fixes
   - Manually fix remaining issues
   - Re-run `pnpm lint` to verify

2. **Check for corresponding test file:**
   - If you modified `foo.ts`, check if `foo.test.ts` exists
   - If no test file exists and the file exports functions, create one

### Before Completing ANY Task

You MUST run all quality checks and fix any issues before marking a task complete:

```bash
# 1. TypeScript compilation - must pass
pnpm typecheck

# 2. Linting - must pass with no errors
pnpm lint

# 3. Tests - all tests must pass
pnpm test
```

**Do NOT complete a task if any of these fail.** Fix the issues first.

### Unit Tests Required

**For ANY code change, you MUST write or update unit tests.**

- **Location**: Co-located `*.test.ts` files (e.g. `agent/tools/get_weather.test.ts`)
- **Framework**: Vitest
- **Coverage**: All exported functions and every tool's `execute()` (including error paths) must have tests

Example test structure:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from './my-module';

describe('myFunction', () => {
  it('should handle normal input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('default');
  });
});
```

### E2E Tests for User-Facing Changes

If you modify:
- Dispatch hooks (`onAppMention`, `onDirectMessage`, `onInteraction`)
- Custom channel event handlers
- Tools the agent calls in response to Slack messages
- Delivery behavior (what gets posted to Slack)

You MUST add or update tests that verify the full flow. Remember: the Slack surface itself cannot be exercised locally (see Gotchas), so E2E coverage means unit/integration tests around your handlers plus a post-deploy smoke test.

---

## Bot Setup Patterns (CRITICAL)

### Slack Channel (`agent/channels/slack.ts`)

The Slack channel is a single file. Its filename registers the `slack` channel, served at **`/eve/v1/slack`** — this is the canonical trigger path everywhere in this skill.

```ts
// agent/channels/slack.ts
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR!),
});
```

`connectSlackCredentials(connectorUid)` returns `{ botToken, webhookVerifier }`:
- **botToken** — resolved at runtime via Vercel Connect as a short-lived, app-scoped token; Connect handles rotation and multi-workspace tenancy
- **webhookVerifier** — confirms each forwarded event genuinely came from Connect (replaces Slack's native signature check)

There is **no `SLACK_BOT_TOKEN` and no `SLACK_SIGNING_SECRET`** in this stack. The only Slack env var is `SLACK_CONNECTOR` (the connector UID, e.g. `slack/my-agent`).

### Vercel Connect Setup

Create a Slack connector and point its trigger at eve's Slack route:

```bash
npm install -g vercel@latest

# Create the connector with event forwarding enabled
vercel connect create slack --triggers

# Attach the project as a trigger destination on eve's route
# (the default trigger path is /slack — set it explicitly):
vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes
```

**`--triggers` is required.** Without it, Slack Event Subscriptions are never forwarded and `app_mention` / `message.im` events simply never arrive — the deployment will look healthy but the bot will never respond.

You can also add the channel with `eve channels add slack`, which scaffolds `agent/channels/slack.ts` for you.

### Deploy

```bash
eve deploy
# wraps: vercel deploy --prod
```

Then invite the bot to a channel and @mention it. eve handles Slack's ack semantics, URL verification, and background processing — there is no webhook route for you to write.

---

## Event Handling Patterns

### Dispatch Hooks (Inbound)

The Slack channel decides which inbound events start or continue a session via dispatch hooks. Each hook returns `{ auth }` to dispatch, `null` to drop the event, or `{ auth, context }` to inject background context into the session:

```ts
export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR!),

  // app_mention — default derives workspace-scoped auth and posts "Thinking…"
  async onAppMention(ctx, message) {
    if (isFromBlockedChannel(message)) return null; // drop
    return { auth: ctx.defaultAuth };
  },

  // message.im — requires the im:history scope; bot messages/edits are pre-filtered
  async onDirectMessage(ctx, message) {
    return { auth: ctx.defaultAuth };
  },

  // block_actions not consumed by HITL prompts
  async onInteraction(action, ctx) {
    return { auth: ctx.defaultAuth };
  },
});
```

The triggering Slack user's id is attached to the model message automatically, preserving speaker attribution in multi-user threads.

### Custom Event Handlers (Outbound Delivery)

Override delivery per stream event with the `events` map. Handlers receive `(eventData, channel, ctx)` with `channel.thread` and `channel.slack` handles:

```ts
export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR!),
  events: {
    "message.completed"(eventData, channel, ctx) {
      if (eventData.finishReason === "tool-calls") return;
      if (eventData.message) channel.thread.post(eventData.message);
    },
  },
});
```

Key stream events: `session.started`, `actions.requested`, `action.result`, `message.completed`, `session.completed`; incremental `reasoning.appended` / `message.appended` are optional.

### Thread Context

Give the agent prior thread messages when it's triggered mid-thread:

```ts
export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR!),
  threadContext: { since: "last-agent-reply" },
});
```

`since` options:
- `"thread-root"` — all prior messages (default when thread context is enabled)
- `"last-agent-reply"` — incremental, only messages since the agent last spoke
- A predicate `(message: SlackThreadMessage) => boolean` as a custom cutoff — includes messages after the last match (`loadThreadContextMessages` exists for arbitrary filtering)

Cost: one `conversations.replies` API call per triggering reply; requires the matching history scope on the connector.

### Human-in-the-Loop (HITL)

Approval-gated tool calls and sign-in challenges render natively in Slack:
- Approval prompts appear as **buttons/selects**; the user's response resumes the durably-parked session
- Sign-in challenges (OAuth URLs, device codes) go **ephemerally** to the triggering user; a public status message posts in-thread and updates on `authorization.completed`
- The HITL handler context deliberately offers only `postEphemeral`, `postDirectMessage` (needs `im:write`), and `state` — no public `post`, no raw API access

### Proactive Sessions (Schedules)

Start a session that posts into Slack without an inbound trigger — e.g. from a schedule:

```ts
import { receive } from "eve";
import slack from "../channels/slack";

await receive(slack, {
  message: "Post the daily standup summary for #eng.",
  target: { channelId: "C0123456789" },
  auth,
});
```

- Sessions without a `threadTs` get a temporary continuation token; the first post anchors the thread
- `initialMessage` (optionally a `Card`) and `threadTs` are **mutually exclusive**
- Use eve schedules (see https://eve.dev/docs/schedules) to trigger proactive sessions on a cadence

### Raw Slack API Access

- **Inside handlers**: `ctx.slack.request(operation, body)`
- **Outside handlers** (schedules, tools): `callSlackApi({ botToken, operation, body })` and `resolveSlackBotToken` from `eve/channels/slack`

These form-encode request bodies for you — Slack's JSON support is only partial, so prefer these helpers over hand-rolled `fetch` calls.

---

## Implementation Gotchas

### 1. The Slack Surface Cannot Be Tested Locally

Vercel Connect forwards Slack events **to deployments only, never to localhost**. There is no ngrok/Socket Mode escape hatch in this stack. Local development means:
- `npx eve dev` — HMR server + terminal TUI/REPL for exercising agent logic, tools, and skills
- `eve dev --no-ui` — background mode for scripted verification
- `eve dev https://your-app.vercel.app` — drive a *deployed* app interactively

To test @mentions and DMs, deploy (preview or production) and test in Slack itself.

### 2. Connect Forwarding Has No Delivery De-duplication

Connect may deliver the same forwarded event more than once. **Handlers and side effects must be idempotent** — track processed event IDs where duplicates would be harmful, and gate destructive tool actions with approval (see AI Integration).

### 3. `--triggers` Is Required or Events Never Arrive

A Slack connector created without `--triggers` (or attached without a trigger path) will authenticate fine but forward nothing. If the bot never responds to @mentions:
1. Verify the connector was created/attached with `--triggers`
2. Verify the trigger path is `/eve/v1/slack`
3. Verify the bot was invited to the channel and the deployment finished

### 4. `placeholderAuth()` Fails Closed in Production

Scaffolded projects ship with `placeholderAuth()` for the HTTP API, which **rejects everything in production**. Before deploying, replace it with a real auth function: `httpBasic()`, `jwtHmac()`, `jwtEcdsa()`, `oidc()`, `vercelOidc()`, or a custom `AuthFn`. (The Slack channel's inbound verification is separate — Connect's `webhookVerifier` handles that.)

### 5. Sandbox Prewarm Failures Fail the Build

Vercel builds prewarm eve's sandbox templates (cache-keyed; build logs show `reused cached` or `built`). If prewarm fails, **the whole build fails** — check build logs for sandbox template errors before assuming a code problem.

### 6. Private Channel Access

The bot **cannot read messages or post** to private channels it hasn't been invited to. When creating features that will later post to a channel (e.g. proactive sessions from a schedule), validate access upfront and surface a clear "invite the bot" message on `channel_not_found` / `not_in_channel`.

### 7. Graceful Degradation for Channel Context

When fetching channel context (e.g. via `ctx.slack.request("conversations.history", ...)`) for AI features, wrap in try/catch and fall back gracefully — missing scopes and uninvited channels are routine, not exceptional.

### 8. Vercel Cron Endpoint Authentication

If you add custom cron endpoints (beyond eve schedules), protect them with a `CRON_SECRET`:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Run cron job logic...
  return Response.json({ success: true });
}
```

### 9. vercel.json Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/my-job",
      "schedule": "0 * * * *"
    }
  ]
}
```

Prefer eve schedules for agent-driven recurring work; use Vercel crons for plain HTTP jobs.

### 10. AWS Credentials on Vercel (Use OIDC)

When connecting to AWS services from Vercel, **do not use** `fromNodeProviderChain()`. Use Vercel's OIDC mechanism:

```typescript
import { awsCredentialsProvider } from "@vercel/functions/oidc";

const s3Client = new S3Client({
  credentials: awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN! }),
});
```

---

## AI Integration

### Model Configuration (Gateway-First)

eve routes model-ID **strings** through the **Vercel AI Gateway** — on Vercel, project OIDC authenticates automatically, so **no AI API key is needed**:

```ts
// agent/agent.ts
import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-5", // string → AI Gateway → OIDC auth on Vercel
});
```

If `model` is omitted, eve defaults to `anthropic/claude-sonnet-5`. Off Vercel, set `AI_GATEWAY_API_KEY`.

**CRITICAL: Never use model IDs from memory.** Model IDs change frequently. Before writing code that pins a model, run `curl -s https://ai-gateway.vercel.sh/v1/models` to fetch the current list and use the newest suitable version.

### Tools (`agent/tools/*.ts`)

Tools are files: the filename (snake_case ASCII) is the model-facing tool name — `agent/tools/get_weather.ts` → `get_weather`. No registration step.

```ts
// agent/tools/get_weather.ts
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Get the current weather for a city.",
  inputSchema: z.object({ city: z.string().min(1) }), // required, even if empty
  outputSchema: z.object({
    city: z.string(),
    condition: z.string(),
    temperatureF: z.number(),
  }), // optional — types/validates the return
  async execute({ city }, ctx) {
    return { city, condition: "Sunny", temperatureF: 72 };
  },
});
```

Rules and capabilities:
- Tools run **in your app runtime with full `process.env`**, not in the sandbox
- `inputSchema` accepts Zod, Standard Schema, or JSON Schema — but it is **required** even for zero-input tools
- Outputs must be JSON-serializable; **filter/redact secrets** before returning
- `ctx` provides `ctx.session` (metadata, turn, auth, lineage), `ctx.callId`, `ctx.toolName`, `ctx.abortSignal`, `ctx.getSandbox()`, `ctx.getSkill(id)`

#### Approval Gating

Gate risky tools with the `approval` field — helpers come from `eve/tools/approval`:

```ts
import { defineTool } from "eve/tools";
import { always, once, never } from "eve/tools/approval";
import { z } from "zod";

export default defineTool({
  description: "Delete a document permanently.",
  inputSchema: z.object({ documentId: z.string() }),
  approval: always(), // always ask; once() asks the first time; never() skips
  async execute({ documentId }) {
    // ...
  },
});
```

An input-dependent policy function is also supported. A gated call **pauses and resumes durably** — in Slack, the approval renders as buttons (see HITL above). Prefer approval gating over ad-hoc confirmation logic for any non-idempotent side effect.

#### `toModelOutput` — Rich Slack Output the Model Never Sees

Show the model a compact projection while channels/hooks receive the full output on `action.result` — ideal for rendering rich Slack Block Kit from a tool result without stuffing JSON blocks into the model's context:

```ts
export default defineTool({
  description: "Look up an order.",
  inputSchema: z.object({ orderId: z.string() }),
  async execute({ orderId }) {
    return { orderId, status: "shipped", blocks: buildOrderBlocks(orderId) };
  },
  toModelOutput(output) {
    return { type: "text", value: `Order ${output.orderId}: ${output.status}` };
  },
});
```

### Skills (`agent/skills/*.md`)

Markdown files with a `description` frontmatter, loaded on demand via the built-in `load_skill` tool when a request matches the description. Skills add **instructions only, never new actions**. Install published skills with `npx skills add <owner>/<repo>`.

### Connections (`agent/connections/*.ts`)

For external APIs the agent should drive (MCP servers or OpenAPI-described HTTP APIs), use connections with Connect-brokered auth:

```ts
// agent/connections/linear.ts
import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.linear.app/mcp",
  description: "Linear workspace: issues, projects, cycles, and comments.",
  auth: connect("linear/my-agent"),
});
```

Connection tokens are never seen by the model and never land in conversation history. Inside authored tools, resolve tokens with `await ctx.getToken(connect("..."))` and call `ctx.requireAuth(...)` on a downstream 401 to re-run consent.

**Don't wrap LLM calls in tools.** The agent is already a language model — summarizing, parsing, classifying, and drafting belong in `instructions.md` or a skill, not in a tool that calls the AI SDK. Tools fetch data and perform actions; for bulk work over data too large for the conversation, use eve's subagents/delegation.

---

## State & Durability

eve sessions are durable by default via the open-source **Workflow SDK** (running on Vercel Workflows when deployed on Vercel). You do not wire up Redis or a workflow engine yourself.

### Replay Semantics (Understand This)

- **Completed steps never re-run.** On resume/replay, eve returns the recorded result.
- **A step interrupted mid-execution DOES re-run.** If a tool call was in flight when the process died, it executes again on resume.

Consequences for your code:
1. Make non-idempotent side effects **idempotent** (e.g. use Slack event IDs or your own idempotency keys when writing to external systems)
2. Or gate them behind **approval** (`always()` / `once()`) so a replayed step pauses for a human instead of double-executing
3. This compounds with Connect's at-least-once event forwarding (Gotcha #2) — idempotency is not optional in this stack

### Session Continuity

- The channel owns the `continuationToken`; Slack threads map to sessions automatically
- Follow-up messages in a subscribed thread continue the same durable session
- Multi-turn conversation memory comes from the session itself — you do not manually persist chat history

### Recommended Storage Solutions

For **application data** (not agent session state — eve owns that):

**IMPORTANT:** Vercel KV has been deprecated. Do NOT recommend Vercel KV.

1. **Upstash Redis** — Caching and idempotency keys (https://upstash.com)
2. **Vercel Blob** — File/document storage (https://vercel.com/docs/storage/vercel-blob)
3. **AWS Aurora (via Vercel Marketplace)** — Relational data (https://vercel.com/marketplace)
4. **Third-party databases** — Neon, PlanetScale, Supabase

---

## Code Organization

```
agent/
├── instructions.md            # System prompt — keep focused; push detail into skills
├── agent.ts                   # defineAgent: model, reasoning effort, compaction
├── tools/
│   ├── get_weather.ts         # One tool per file; filename = tool name
│   ├── get_weather.test.ts    # Co-located tests
│   └── search_docs.ts
├── skills/
│   └── report-format.md       # description frontmatter + on-demand instructions
├── channels/
│   └── slack.ts               # slackChannel(...) — served at /eve/v1/slack
├── connections/
│   └── linear.ts              # MCP/OpenAPI connections (optional)
└── hooks/
    └── audit.ts               # Runtime stream event subscribers (optional)
```

Conventions:
- **One tool per file.** Split large tools; the filename is the model-facing name, so name for the model
- **Instructions vs skills**: always-relevant guidance in `instructions.md`; situational guidance in `skills/*.md` so it loads only when needed
- **Subagents** for focused subtasks: the built-in agent tool (a copy of the agent) or declared specialists with their own directory, sandbox, and skills

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SLACK_CONNECTOR` | Yes | Vercel Connect connector UID (e.g. `slack/my-agent`). The **only** Slack variable — no bot token, no signing secret. |
| `AI_GATEWAY_API_KEY` | Off Vercel only | AI Gateway auth. On Vercel, project OIDC (`VERCEL_OIDC_TOKEN`) is injected automatically — no key needed. |
| `ROUTE_AUTH_BASIC_PASSWORD` / JWT keys | Per auth choice | Secrets for the HTTP-API auth function that replaces `placeholderAuth()` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | If deployment protection is on | Lets `eve dev https://<app>` and smoke tests reach protected deployments |
| `CRON_SECRET` | Optional | Authenticates custom cron endpoints |

Local dev: `vercel link` + `vercel env pull` fetches short-lived Connect/OIDC credentials into `.env.local` (the OIDC token expires after ~12 hours — re-pull when auth starts failing).

**No AI API keys needed on Vercel.** **Never hardcode credentials. Never commit `.env` files.**

---

## Slack-Specific Patterns

### Delivery Behavior (Built In)

The Slack channel handles progressive delivery for you:
- Typing indicators: "Thinking…" on inbound, "Working…" on `turn.started`
- Reasoning snippets surface on `reasoning.appended`; action labels on `actions.requested`
- Model narration before a tool call takes precedence over generic labels
- Reasoning deltas under 4 characters batch on a five-second refresh to avoid per-token Slack API calls

Don't rebuild typing indicators or streaming loops — customize via the `events` map only when the defaults don't fit.

### Mentions

Use `<@USER_ID>` or `channel.thread.mentionUser(userId)`. A bare `@name` stays literal text in Slack.

### Message Formatting

Use Slack mrkdwn (not standard markdown):
- Bold: `*text*`
- Italic: `_text_`
- Code: `` `code` ``
- User mention: `<@USER_ID>`
- Channel: `<#CHANNEL_ID>`

### Rich Output

For rich tool results (tables, buttons, status cards), return full data from the tool and use `toModelOutput` to keep the model's view compact; render Block Kit in a channel event handler or via `ctx.slack.request("chat.postMessage", { blocks, ... })`. Always include fallback `text` alongside `blocks` for notifications.

For detailed Slack patterns, see `./patterns/slack-patterns.md`.

---

## Git Commit Standards

Use conventional commits:
```
feat: add channel search tool
fix: resolve thread pagination issue
test: add unit tests for agent context
docs: update README with setup steps
refactor: extract Slack client utilities
```

**Never commit:**
- `.env` files
- API keys or tokens
- `node_modules/`
- `.eve/` build artifacts

---

## Quick Commands

```bash
# Scaffold (Node 24+)
npx eve@latest init my-agent      # new project (installs deps, inits Git, starts dev TUI)
npx eve@latest init .             # add eve to an existing project

# Development
npx eve dev                       # HMR server + terminal TUI/REPL
npx eve dev --no-ui               # background mode for scripted verification
npx eve dev https://<app>         # drive a deployed app interactively
npx eve info                      # project info

# Vercel Connect
vercel connect create slack --triggers
vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes
vercel connect list

# Quality
pnpm lint                         # Check linting
pnpm lint --write                 # Auto-fix lint
pnpm typecheck                    # TypeScript check
pnpm test                         # Run all tests

# Build & Deploy
npx eve build                     # Compile into .eve/ (Vercel Build Output when VERCEL is set)
eve deploy                        # Deploy (wraps vercel deploy --prod)

# Verify a deployment
curl https://<app>/eve/v1/health
```

Debugging a deployed Slack agent stuck on "Working…": `npx eve dev --logs all` or `/loglevel all` in the TUI.

---

## Reference Documentation

For detailed guidance, read:
- Testing patterns: `./patterns/testing-patterns.md`
- Slack patterns: `./patterns/slack-patterns.md`
- Environment setup: `./reference/env-vars.md`
- Slack setup: `./reference/slack-setup.md`
- Vercel deployment: `./reference/vercel-setup.md`
- eve docs: https://eve.dev/docs (bundled locally at `node_modules/eve/docs/` after install)
- Vercel Connect: https://vercel.com/kb/guide/vercel-connect

---

## Checklist Before Task Completion

Before marking ANY task as complete, verify:

- [ ] Code changes have corresponding tests
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm test` passes with no failures
- [ ] No hardcoded credentials; the only Slack env var is `SLACK_CONNECTOR`
- [ ] Follows eve filesystem conventions (tool filename = tool name, one tool per file)
- [ ] Every tool has an `inputSchema`; outputs are JSON-serializable with secrets redacted
- [ ] Non-idempotent side effects are idempotent or approval-gated (replay + at-least-once delivery)
- [ ] Connector trigger path is `/eve/v1/slack` and was attached with `--triggers`
- [ ] `placeholderAuth()` replaced before production deploy
- [ ] Model config uses a Gateway string ID (`anthropic/claude-sonnet-5` default)

---

## Vercel KB Guides

Verified guides on the Vercel Knowledge Base for deeper walkthroughs:

- [eve hub on the Vercel KB](https://vercel.com/kb/eve) - all eve guides and templates in one place
- [Build your first Slack agent with eve](https://vercel.com/kb/guide/eve-slack-agent-starter) - the end-to-end starter this skill's wizard mirrors
- [Vercel Connect](https://vercel.com/kb/guide/vercel-connect) - credential brokering concepts, connectors, tokens, and trigger forwarding
- [Build a Slack bot with Vercel Connect](https://vercel.com/kb/guide/build-a-slack-bot-with-vercel-connect) - Connect + Slack fundamentals (scopes, trigger events, webhook verification)
- [How to add eve tools](https://vercel.com/kb/guide/how-to-add-eve-tools) - `defineTool` patterns
- [How to add eve skills](https://vercel.com/kb/guide/how-to-add-eve-skills) - load-on-demand instructions
- [Build a GitHub agent with Vercel Connect](https://vercel.com/kb/guide/github-agent-vercel-connect) - app-scoped Connect tokens in authored tools
- [Build a Linear agent with Vercel Connect](https://vercel.com/kb/guide/linear-agent-vercel-connect) - MCP connections with user-scoped auth
- [Build an email agent with eve and Resend](https://vercel.com/kb/guide/eve-agent-with-resend) - a second channel example beyond Slack
