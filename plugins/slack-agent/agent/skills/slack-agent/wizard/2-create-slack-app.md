# Phase 2: Create the Slack Connector

This phase guides the user through connecting their agent to Slack with Vercel Connect. There is no Slack app to create at api.slack.com and no manifest to paste — Vercel Connect manages the Slack OAuth client, brokers short-lived tokens at runtime, and forwards Slack events to the deployed agent. The only Slack credential the project needs is the `SLACK_CONNECTOR` env var.

**Prerequisites:** the latest Vercel CLI (`npm install -g vercel@latest`) and the project linked to Vercel (`vercel link`, done in Phase 1). The user needs permission to install apps in their Slack workspace.

---

## Step 2.0: Choose a Connector Name

Collect the connector name from the user. Use the context from Phase 1 (agent purpose) as the default.

Ask the user:

> **Let's set up your Slack connector:**
>
> 1. **Connector Name** (required) - A short kebab-case identifier (e.g., "joke-bot"). The full connector UID becomes `slack/<name>`.
> 2. **Environment** (optional) - Which environment this connector serves. Best practice is one connector per environment (e.g., `joke-bot` for production, `joke-bot-dev` for previews) to keep grants and audit trails separate.

**After collecting responses**, record the full UID (e.g., `slack/joke-bot`) — it will be used in every command below and stored as `SLACK_CONNECTOR` in Phase 3.

---

## Step 2.1: Create the Connector

Run (or have the user run) from the project directory:

```bash
vercel connect create slack --name <name> --triggers
```

- `--triggers` enables Slack Event Subscriptions through Connect. **Do not omit it** — without it, `app_mention` and `message.im` events never arrive.
- The CLI sets up the connection automatically and opens the browser for steps that need manual input — installing the connector into the Slack workspace and selecting bot scopes and trigger events.

Tell the user to select:

> **Bot scopes:** `chat:write`, `channels:read`, `channels:history`, `groups:history`, `im:history`, `mpim:history`, `reactions:write`, `users:read`
>
> - `im:history` is required for the bot to answer DMs.
> - The `*:history` scopes let eve load prior thread messages for context.
>
> **Trigger events:** `app_mention`, `message.im` (add `message.channels` / `message.groups` / `message.mpim` only if the agent should listen beyond mentions and DMs).

---

## Step 2.2: Attach with eve's Trigger Path

Attach the connector to the project. The default trigger path is `/slack`, but eve serves its Slack channel at `/eve/v1/slack`, so set the path explicitly:

```bash
vercel connect attach slack/<name> --triggers --trigger-path /eve/v1/slack --yes
```

(Don't use `detach` for this — it removes token access but does **not** remove trigger destinations. If a stale destination lingers, remove it on the connector: `vercel connect open slack/<name>`.)

**Important:** the trigger path must be exactly `/eve/v1/slack` — events forwarded anywhere else are dropped by the app. `--trigger-branch` defaults to production, which is correct for this wizard.

---

## Step 2.3: Verify

Confirm the connector exists and is attached to the project with the right trigger path:

```bash
vercel connect list
```

Check the output shows the connector UID (`slack/<name>`), the linked project, and trigger path `/eve/v1/slack`. If the path is wrong, repeat Step 2.2.

Remind the user:

> Slack events forward to **deployments only, never localhost** — the Slack surface can't be tested until the agent is deployed (Phase 5). Everything else works in the local eve TUI.

---

## Context to Store

Carry these values forward:

- **`SLACK_CONNECTOR`** = `slack/<name>` (needed for `.env` in Phase 3)
- Connector name and target Slack workspace
- Selected bot scopes and trigger events (for troubleshooting later)

No bot token or signing secret exists to collect — Connect issues short-lived tokens at runtime and verifies every forwarded event for you.

---

## Next Phase

Once the connector is created, attached at `/eve/v1/slack`, and the `SLACK_CONNECTOR` value is recorded, proceed to [Phase 3: Configure Environment](./3-configure-environment.md).
