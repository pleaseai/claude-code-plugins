# Environment Variables Reference

Complete reference for all environment variables used in eve Slack agent projects.

With eve + Vercel Connect, the variable surface is deliberately small: there is **no `SLACK_BOT_TOKEN` and no `SLACK_SIGNING_SECRET`**. Slack credentials are brokered at runtime by Vercel Connect — your code requests short-lived, scoped tokens instead of storing long-lived secrets, and the channel's `webhookVerifier` confirms forwarded events came from Connect instead of checking Slack's signing secret.

## Required Variables

### SLACK_CONNECTOR

**Description:** The UID of your Vercel Connect Slack connector. This is the only Slack-related environment variable. `connectSlackCredentials` uses it to resolve short-lived bot tokens at runtime and to verify forwarded Slack events.

**Source:**
1. Create the connector: `vercel connect create slack --triggers`
2. The UID is shown in the output (also visible via `vercel connect list` or the dashboard Connect page)

**Format:** `slack/<connector-name>` (e.g., `slack/my-agent`) or a connector ID like `scl_abc123`

**Usage:**
```typescript
// agent/channels/slack.ts
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials(
    process.env.SLACK_CONNECTOR ?? "slack/my-agent"
  ),
});
```

**Notes:**
- Not a secret — it identifies the connector; access is governed by the connector-project link and the deployment's OIDC token
- The connector must be **attached to your project and environment** (`vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack`)
- If you deployed via the eve Slack starter's Deploy button, the connector was provisioned and `SLACK_CONNECTOR` was set automatically
- Use a separate connector per environment (see Security Best Practices)

---

### VERCEL_OIDC_TOKEN (local development only)

**Description:** Short-lived OIDC token that authenticates your local process to Vercel services — the AI Gateway and Vercel Connect both accept it. On Vercel deployments this token is injected automatically; you never set it there.

**Source:**
```bash
vercel link       # once, to link the directory to your Vercel project
vercel env pull   # writes VERCEL_OIDC_TOKEN into .env.local
```

**Format:** JWT string

**Notes:**
- Expires after **~12 hours** — re-run `vercel env pull` when local AI or Connect calls start failing with auth errors
- Never set this manually or copy it between machines; always pull a fresh one

---

## AI Integration

You have two options for AI/LLM credentials. eve routes string model IDs (e.g., `anthropic/claude-sonnet-5`) through the Vercel AI Gateway by default.

### Option 1: Vercel AI Gateway with project OIDC (recommended)

When deployed on Vercel, the AI Gateway authenticates with the project's OIDC token automatically. **No API keys needed.**

**For local development:** link the project and pull the OIDC token:

```bash
vercel link
vercel env pull   # fetches VERCEL_OIDC_TOKEN into .env.local (~12h expiry)
```

```typescript
// agent/agent.ts
import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-5", // routes through AI Gateway — no API key
});
```

**Benefits:**
- Zero API-key management
- Access to multiple providers (Anthropic, OpenAI, Google, etc.) through one interface
- Built-in rate limiting and observability
- Works automatically on Vercel deployments

---

### Option 2: AI_GATEWAY_API_KEY

**Description:** API key for the Vercel AI Gateway. Use this instead of OIDC when running outside Vercel (external CI, other hosts) or if you prefer a long-lived credential locally.

**Source:** Vercel dashboard > AI Gateway > API Keys

**Usage:** Same code as Option 1 — the gateway picks up `AI_GATEWAY_API_KEY` from the environment. String model IDs in `defineAgent` keep working unchanged.

---

## Route Auth Secrets

eve exposes a stable HTTP API (`/eve/v1/...`) on every deployment. The scaffolded `placeholderAuth()` fails closed in production — you must replace it with a real auth strategy, and each strategy has its own secret material.

### ROUTE_AUTH_BASIC_PASSWORD

**Description:** Password for the `httpBasic()` route-auth strategy — the simplest way to protect eve's HTTP API.

**Source:** Generate a strong random value yourself, e.g.:
```bash
openssl rand -base64 32
```

**Security:**
- Never commit to version control
- Use a different password per environment
- Rotate if compromised

### JWT / OIDC key material

**Description:** If you protect eve's HTTP API with `jwtHmac()`, `jwtEcdsa()`, `oidc()`, or a custom `AuthFn` instead of basic auth, store the corresponding secret (HMAC shared secret, ECDSA public key, or OIDC issuer configuration) as environment variables. `vercelOidc()` needs no extra secret — it verifies Vercel-issued OIDC tokens.

**Security:** Same rules as any secret — never commit, per-environment values, rotate on exposure. Note that the Slack channel is not affected by route auth choice: forwarded Slack events are verified via Vercel OIDC by Connect's webhook verifier.

---

## Deployment Variables

### VERCEL_AUTOMATION_BYPASS_SECRET

**Description:** Bypass secret for Vercel Deployment Protection. Needed when your **preview deployments are protected** and something outside the browser (e.g., `eve dev https://<preview-url>` from your machine, or external smoke tests) must reach the deployment.

**Source:** Vercel dashboard > Project Settings > Deployment Protection > Protection Bypass for Automation

**Usage:** Set it locally (e.g., in `.env.local`) when driving a protected preview deployment. Not needed for production if production is publicly reachable.

---

## Optional Variables

### CRON_SECRET

**Description:** Shared secret to authenticate Vercel Cron invocations of your own scheduled endpoints, so random visitors can't trigger cron routes. (eve's built-in schedules don't need this; it applies to any custom cron routes you add.)

**Source:** Generate a strong random value and set it in Vercel; Vercel sends it as `Authorization: Bearer <CRON_SECRET>` on cron requests.

---

### NODE_ENV

**Description:** Node.js environment indicator.

**Values:**
- `development` - Local development
- `production` - Production deployment
- `test` - Test environment

**Default:** `development` locally, `production` on Vercel

---

### LOG_LEVEL

**Description:** Controls logging verbosity.

**Values:**
- `debug` - All logs including debug info
- `info` - Standard operational logs
- `warn` - Warnings and errors only
- `error` - Errors only

**Default:** `info`

---

## Local Development Setup

Create a `.env.local` file in your project root. Prefer `vercel env pull`, which writes it for you (including `VERCEL_OIDC_TOKEN`), then add anything project-specific.

> **Note:** Slack events can't be received locally — Connect forwards them to deployments only. Locally you develop against the eve TUI (`npx eve dev`); Slack is tested on preview/production deployments.

### Option 1: AI Gateway with project OIDC (default)

```env
# Slack via Vercel Connect (no bot token or signing secret needed)
SLACK_CONNECTOR=slack/my-agent

# Pulled by `vercel env pull` — expires after ~12 hours, re-pull when it does
VERCEL_OIDC_TOKEN=eyJ...

# Route auth for eve's HTTP API (if using httpBasic())
ROUTE_AUTH_BASIC_PASSWORD=your-strong-password

# Optional
NODE_ENV=development
LOG_LEVEL=debug

# No AI keys needed - the AI Gateway authenticates via the OIDC token!
```

### Option 2: AI Gateway with an API key

```env
# Slack via Vercel Connect
SLACK_CONNECTOR=slack/my-agent

# AI Gateway key (instead of OIDC)
AI_GATEWAY_API_KEY=your-gateway-key

# Route auth for eve's HTTP API
ROUTE_AUTH_BASIC_PASSWORD=your-strong-password

# Optional
NODE_ENV=development
LOG_LEVEL=debug
```

## Security Best Practices

### 1. Never Commit Secrets

Ensure `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

### 2. Use Different Credentials Per Environment

| Environment | Connector | Other secrets |
|-------------|-----------|---------------|
| Development | `slack/my-agent-dev` | Dev route-auth password |
| Preview | `slack/my-agent-preview` | Preview route-auth password |
| Production | `slack/my-agent` | Prod route-auth password |

**One connector per environment.** Separate connectors give you separate grants, scopes, and audit trails, and prevent cross-environment token replay. Attach each with the matching `--environment` flag.

### 3. Never Persist Tokens

Connect exists so you don't store provider tokens. Request them at runtime — the SDK caches in-process and auto-refreshes near expiry, so per-request calls are fine. Never write a Connect-issued token to a database, log, env var, or file.

### 4. Request Minimum Scopes

Only grant the connector the bot scopes your agent needs, and request minimum scopes per token. Review scopes on the connector's Connect page.

### 5. Rotate Compromised Credentials

Connect-issued Slack tokens are short-lived, so exposure windows are small — but if other secrets leak:

**Route-auth password / JWT secrets:** generate a new value, update the Vercel env var, redeploy.

**Automation bypass secret:** regenerate it under Project Settings > Deployment Protection.

### 6. Monitor Usage

- Every Connect authorization and token request is recorded — review the audit log on the connector's page
- Monitor Vercel function logs for errors
- Set up alerts for anomalies

## Vercel Environment Configuration

### Setting Variables

**Via Dashboard:**
1. Project Settings > Environment Variables
2. Add variable name and value
3. Select environments (Production/Preview/Development)
4. Save and redeploy

**Via CLI:**
```bash
vercel env add VARIABLE_NAME production
```

### Environment Scopes

| Scope | When Used |
|-------|-----------|
| Production | `vercel --prod` deployments |
| Preview | Pull request deployments |
| Development | `vercel env pull` / local development |

### Sensitive vs Non-Sensitive

Mark variables as **Sensitive** for:
- API keys (`AI_GATEWAY_API_KEY`)
- Route-auth passwords and JWT secrets
- `VERCEL_AUTOMATION_BYPASS_SECRET`, `CRON_SECRET`

Sensitive variables:
- Are encrypted at rest
- Don't appear in logs
- Can't be read via API

`SLACK_CONNECTOR` is an identifier, not a secret — it doesn't need the sensitive flag.

## Accessing Variables

### In Server Code

eve tools run in your app runtime with full `process.env` access:

```typescript
// Direct access
const connector = process.env.SLACK_CONNECTOR;

// With validation
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const connector = getRequiredEnv('SLACK_CONNECTOR');
```

## Troubleshooting

### Variable Not Found

**Symptoms:** `undefined` value, missing env error

**Solutions:**
1. Check variable name spelling (case-sensitive)
2. Verify `.env.local` is in project root
3. Restart the dev server after changes
4. Redeploy after adding to Vercel

### Connect / Gateway Auth Errors Locally

**Symptoms:** authentication errors from the AI Gateway or `@vercel/connect` during local development that previously worked

**Solutions:**
1. The local `VERCEL_OIDC_TOKEN` expires after ~12 hours — re-run `vercel env pull`
2. Verify the directory is linked to the right project (`vercel link`)
3. If running outside Vercel entirely (external CI), use `AI_GATEWAY_API_KEY` for the gateway and pass a Vercel access token to the Connect SDK

### Connector Not Working

**Symptoms:** token requests fail in a deployment; Slack events never arrive

**Solutions:**
1. Confirm the connector is **attached to this project and environment**: `vercel connect list`, or re-attach with `vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack`
2. Connect verifies the deployment's project/environment against connector links — a connector attached only to production won't issue tokens to preview
3. For missing events, confirm the connector was created with `--triggers` (without it, `app_mention` / `message.im` never arrive) and that the trigger path is `/eve/v1/slack`
4. Remember trigger forwarding goes to deployments only — Slack can't be tested against localhost
