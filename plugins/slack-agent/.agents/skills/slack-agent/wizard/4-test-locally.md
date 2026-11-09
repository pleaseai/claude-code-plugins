# Phase 4: Test the Agent Locally

This phase guides the user through testing their agent locally with the `eve dev` TUI and the HTTP API.

**Important:** the Slack surface **cannot** be tested locally. Slack events route through Vercel Connect, which forwards to deployments only — never to localhost. There is no tunneling step (no ngrok). Everything else — instructions, tools, skills, the conversation loop — works locally, and that's what this phase exercises. The Slack surface is tested in Phase 5 against the production deployment.

---

## Step 4.0: Link to Vercel and Pull Environment

Before testing locally, connect the project to Vercel. This provides the OIDC token that authenticates both **Vercel AI Gateway** (model calls without API keys) and **Vercel Connect** (the Slack connector SDK).

1. **Create/link the Vercel project** (if not already done):
   ```bash
   vercel link
   ```
   Confirm the project is linked (creates `.vercel/` directory).

2. **Pull environment variables:**
   ```bash
   vercel env pull
   ```
   This fetches a short-lived dev token into `.env.local`, along with project env vars like `SLACK_CONNECTOR`.

**Why this is required:**

- Vercel AI Gateway authenticates via the OIDC token — no `AI_GATEWAY_API_KEY` or provider keys needed
- The `@vercel/connect` SDK authenticates with the same token
- The pulled OIDC token expires after ~12 hours — if auth errors appear later, re-run `vercel env pull`

**Note:** You'll complete the full deployment in Phase 5. This step just establishes local access to the Gateway and Connect.

---

## Step 4.1: Run the Agent in the Dev TUI

```bash
npx eve dev
```

This starts the HMR dev server with a terminal REPL/TUI. Tell the user:

> **Exercise your agent in the TUI:**
>
> 1. Send a message that matches your agent's purpose and confirm the instructions shape the reply
> 2. Trigger each tool (e.g., ask a question that requires `get_weather`) and confirm it executes and returns sensible output
> 3. If you added skills, send a request matching a skill's description and confirm it loads (watch for the `load_skill` call)
> 4. Test any approval-gated tools — the gated call should pause and resume after approval

Useful variants:

- `npx eve dev --no-ui` — run without the TUI (background/verification runs)
- `/loglevel all` in the TUI, or `npx eve dev --logs all` — verbose logs when debugging
- `npx eve dev https://your-app.vercel.app` — drive a **deployed** app interactively (used in Phase 5)

---

## Step 4.2: (Optional) Exercise the HTTP API

Every eve app serves the same stable HTTP API. With the dev server running, you can verify it directly:

```bash
# Create a session
curl -X POST http://127.0.0.1:2000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"What is the weather in Brooklyn?"}'
# → continuationToken in body, x-eve-session-id header

# Stream the session (NDJSON, application/x-ndjson)
curl http://127.0.0.1:2000/eve/v1/session/<sessionId>/stream

# Send a follow-up
curl -X POST http://127.0.0.1:2000/eve/v1/session/<sessionId> \
  -H 'content-type: application/json' \
  -d '{"continuationToken":"<token>","message":"Now do Queens."}'
```

Key stream events to look for: `session.started`, `actions.requested`, `action.result`, `message.completed`, `session.completed`.

---

## Step 4.3: Slack Testing Comes in Phase 5

Tell the user:

> **Local testing does not cover Slack.** Vercel Connect forwards Slack events (@mentions, DMs) to deployments only — localhost can never receive them. Once your agent behaves correctly in the TUI, deploy in Phase 5 and test the Slack surface there by inviting the bot and @mentioning it.

Do **not** suggest ngrok or any tunneling tool — it does not apply to the Connect forwarding model.

---

## Troubleshooting

### AI Gateway not working / Authentication errors
- Run `vercel link` to connect your project to Vercel
- Ensure `.vercel/` directory exists in your project root
- Run `vercel env pull` to refresh `.env.local` — the local OIDC token expires after ~12 hours

### Agent doesn't respond in the TUI
- Restart with verbose logs: `npx eve dev --logs all` (or `/loglevel all` in the TUI)
- Check for model-credential errors in the log output
- Confirm Node 24+ is in use (`node --version`)

### Tool not being called
- The filename is the tool name the model sees (`agent/tools/get_weather.ts` → `get_weather`) — confirm it's snake_case ASCII and the `description` clearly says when to use it
- Confirm the tool exports a `defineTool` default and has an `inputSchema` (required even if empty)

---

## Context to Store

- **Local test result** — confirmation the agent, tools, and skills behave as planned (referenced when verifying production in Phase 5)

## Next Phase

Once the agent behaves correctly locally, proceed to [Phase 5: Deploy to Production](./5-deploy-production.md) — that's where the Slack surface gets tested.
