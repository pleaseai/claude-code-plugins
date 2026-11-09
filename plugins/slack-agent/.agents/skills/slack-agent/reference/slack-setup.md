# Slack Setup Guide (Vercel Connect)

Complete guide for connecting your eve agent to Slack using Vercel Connect.

## How Slack Setup Works with Vercel Connect

You do **not** create a Slack app at api.slack.com, paste a manifest, or copy bot tokens and signing secrets. Vercel Connect replaces that entire flow.

**Vercel Connect** is a credential broker for agents and background services. Instead of storing long-lived provider secrets (bot tokens, API keys) in env vars, your code requests **short-lived, scoped tokens at runtime**. Every authorization and token request is recorded for auditing. For Slack, Connect is a **Vercel Managed Connector**: Vercel registers the Slack OAuth client, so you never handle client secrets at all.

What this means in practice:

- **No `SLACK_BOT_TOKEN`**. The eve Slack channel fetches a fresh short-lived token from Connect on each Slack API request.
- **No `SLACK_SIGNING_SECRET`**. Slack delivers events to Connect's intake URL; Connect verifies them with Slack, then forwards them to your deployment. The channel's `webhookVerifier` confirms each forwarded event came from Connect — no Slack signature checks in your code.
- **One env var**: `SLACK_CONNECTOR`, set to your connector's UID (e.g. `slack/my-agent`).

Core concepts:

| Concept | Meaning |
|---------|---------|
| **Connector** | A team-reusable registered connection to a provider, identified by UID like `slack/my-agent` (or ID like `scl_abc123`) |
| **Installation** | A provider-side install for a tenant — for Slack, a workspace the connector is installed into |
| **Connector-project link** | Binds a connector to a project and its enabled environments |
| **Token request** | A runtime request for a short-lived scoped token |

> **Beta note:** Vercel Connect is in beta (available on all plans); behavior may change before GA.

> **CLI reference:** commands and flags shown here may evolve — see the [`vercel connect` CLI docs](https://vercel.com/docs/cli/connect) for the latest reference.

## Prerequisites

- A Slack workspace where you have permission to install apps
- The latest Vercel CLI: `npm install -g vercel@latest`
- Your project linked to Vercel (`vercel link`)

## Step 1: Create the Slack Connector

Create the connector from the CLI (or from the Connect page in the Vercel dashboard):

```bash
vercel connect create slack --name my-agent --triggers
```

- `--name` sets the connector UID suffix — the full UID becomes `slack/my-agent`.
- `--triggers` enables Slack Event Subscriptions through Connect. **Without it, events like `app_mention` and `message.im` never arrive.**

The CLI sets up the connection automatically and opens your browser for the steps that need manual input: installing the connector into your Slack workspace and selecting its bot scopes and trigger events. (Branding is optional — `--icon`, `--background-color`, `--accent-color` on `create`, or `vercel connect update` later.)

### Recommended Bot Scopes

| Scope | Purpose |
|-------|---------|
| `chat:write` | Send messages as the bot |
| `channels:read` | View basic channel info |
| `channels:history` | Read messages in public channels (thread context) |
| `groups:history` | Read messages in private channels (thread context, if invited) |
| `im:history` | Read direct messages — required for the DM handler (`onDirectMessage`) |
| `mpim:history` | Read group DM history (thread context) |
| `reactions:write` | Add emoji reactions |
| `users:read` | Look up user display names |

Notes:

- `im:history` is required for the bot to respond to DMs (eve's `onDirectMessage` dispatch hook handles `message.im`).
- The `*:history` scopes are what let eve's `threadContext` option load prior thread messages — each surface (public channel, private channel, DM, group DM) needs its matching history scope.
- `im:write` is additionally needed if HITL handlers use `postDirectMessage`.
- Request the minimum scopes your agent actually needs; the connector's bot scopes bound what any runtime token can do.

### Trigger Events

Subscribe the connector to the events your agent handles:

- `app_mention` — @mentions of the bot in channels
- `message.im` — direct messages to the bot
- `message.channels`, `message.groups`, `message.mpim` — channel/group messages, if your agent listens beyond mentions

## Step 2: Attach the Connector to Your Project

Attach the connector to your project. The default trigger path is `/slack`, and eve serves its Slack channel at **`/eve/v1/slack`**, so set the path explicitly:

```bash
vercel connect attach slack/my-agent --triggers --trigger-path /eve/v1/slack --yes
```

- `--trigger-path /eve/v1/slack` — eve's canonical Slack route. Events forwarded anywhere else are dropped by your app.
- `--trigger-branch` defaults to production; set it only if events should go to a different branch's deployments.
- `--environment` (`-e`) restricts token access to specific environments (defaults to all).
- A connector can forward triggers to up to three destination projects.
- `vercel connect detach` removes token access but does **not** remove trigger destinations — manage those on the connector itself (`vercel connect open`).

Verify with `vercel connect list` (alias `ls`). Other useful subcommands: `token`, `update`, `remove` (`rm`), `open`.

### One Connector per Environment

Use a separate connector for each environment (e.g. `slack/my-agent` for production, `slack/my-agent-dev` for previews). This keeps grants, scopes, and audit trails separate and prevents cross-environment token replay.

## Step 3: Set the Environment Variable

Set `SLACK_CONNECTOR` to the connector UID in your Vercel project (and `.env.local` for local work):

```bash
SLACK_CONNECTOR=slack/my-agent
```

This is the **only** Slack-related env var. Do not set `SLACK_BOT_TOKEN` or `SLACK_SIGNING_SECRET` — leaving them out avoids mixing verification modes.

## Step 4: Wire the Channel in Your Agent

Install the Connect SDK and register the Slack channel:

```bash
npm install @vercel/connect
```

```ts
// agent/channels/slack.ts
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials(
    process.env.SLACK_CONNECTOR ?? "slack/my-agent"
  ),
});
```

The `slack.ts` filename registers the `slack` channel, served at `/eve/v1/slack`. `connectSlackCredentials` returns `{ botToken, webhookVerifier }`:

- **`botToken`** is a resolver that fetches a fresh short-lived token via Connect on every Slack API request (subject pinned to the app, not a user).
- **`webhookVerifier`** confirms each forwarded event genuinely came from Vercel Connect — this replaces Slack's signature/timestamp check in your code.

In deployments, the Connect SDK authenticates using the OIDC token Vercel injects automatically (`VERCEL_OIDC_TOKEN`). For local dev, `vercel link` + `vercel env pull` fetches a short-lived dev token into `.env.local` (it expires after ~12 hours — re-pull when it does).

## Step 5: Deploy and Invite the Bot

Slack events forward to **deployments only, never localhost** — the Slack surface cannot be tested locally. Everything else (tools, skills, sessions) works in the local eve TUI.

1. Deploy:
   ```bash
   eve deploy
   ```
   (`eve deploy` wraps `vercel deploy --prod`.)
2. Invite the bot to a channel: `/invite @YourBotName`
3. Mention it: `@YourBotName hello`

## Installations and Workspaces

Installing the connector into a Slack workspace creates an **installation**. Connect handles token rotation and multi-workspace tenancy for you. If a single connector spans multiple workspaces, pass an `installationId` when requesting tokens; with one workspace, no extra configuration is needed.

You can inspect token issuance from the CLI:

```bash
vercel connect token slack/my-agent --subject app --scopes chat:write --format=json
```

## Troubleshooting

### Events not arriving (no session starts on @mention)

**Causes and fixes:**
1. Connector created or attached without `--triggers` — Event Subscriptions are off. Re-attach with `--triggers`.
2. Wrong trigger path — must be `/eve/v1/slack`. Check with `vercel connect list`, and re-attach with `--trigger-path /eve/v1/slack` if not.
3. Wrong trigger branch — `--trigger-branch` defaults to production; if you deployed to a preview branch, events won't reach it unless the branch matches.
4. Deployment not finished (or failed) — Connect forwards to deployments only. Confirm the latest deploy succeeded.
5. Missing trigger events — verify the connector is subscribed to `app_mention` (and `message.im` for DMs).

### Bot doesn't reply in a channel

**Cause:** The bot isn't a member of the channel.

**Fix:** Invite it with `/invite @YourBotName`, then @mention it again. Also confirm the deployment finished.

### Stuck on "Working…"

**Cause:** The session started but something failed mid-turn (tool error, model auth, etc.).

**Fix:** Inspect logs with `npx eve dev --logs all` (or `/loglevel all` in the TUI) against the deployed app to see the failing step.

### Duplicate replies

**Cause:** Connect's trigger forwarding has no built-in delivery de-duplication, so an event may occasionally be delivered more than once.

**Fix:** Make handlers idempotent — e.g. track processed Slack event IDs and skip repeats.

### Trying to test Slack locally

Forwarding goes to deployments only — pointing anything at `localhost` will not work, and there is no ngrok step. Test the Slack surface against a preview or production deployment; use the local TUI for everything else.

### "channel_not_found" when joining channels

**Cause:** Bot can't access private channels.

**Solutions:**
1. The bot can only join public channels on its own
2. For private channels, a user must invite the bot
3. Check the channel ID is correct

### Rate limiting

**Cause:** Too many Slack API requests.

**Solutions:**
1. Implement exponential backoff
2. Cache responses where appropriate
3. Batch operations when possible

## Next Steps

After setup:
1. Deploy with `eve deploy`
2. Add the bot to a channel: `/invite @YourBotName`
3. Mention the bot: `@YourBotName hello`
4. Watch it think ("Thinking…" / "Working…") and reply in-thread
