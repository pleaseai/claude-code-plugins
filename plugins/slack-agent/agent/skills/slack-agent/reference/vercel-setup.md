# Vercel Deployment Guide

Complete guide for deploying your eve Slack agent to Vercel.

## Prerequisites

- A Vercel account (https://vercel.com)
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket) — or the Vercel CLI installed for direct deploys
- A Slack connector created with Vercel Connect (see the Slack setup reference)

## How eve Builds on Vercel

eve deploys to Vercel as a first-class framework:

- `eve build` compiles the agent into `.eve/`. When the `VERCEL` env var is set (as it is on Vercel builds), it also emits `.vercel/output` (Vercel Build Output).
- On Vercel, the Workflow SDK runs on **Vercel Workflows** and the default sandbox backend selects **Vercel Sandbox**. Off Vercel, `eve start` serves the Nitro Node output with a local workflow world.

**Sandbox prewarm:** Vercel builds prewarm sandbox templates (cache-keyed — build logs show `reused cached` or `built`). **If prewarm fails, the build fails.** Check the build logs for prewarm errors before debugging anything else.

## Deployment Options

### Option A: Deploy via CLI (Recommended)

```bash
npx eve deploy
```

This is equivalent to:

```bash
vercel deploy --prod
```

### Option B: Git-Connected Deploys

1. Go to https://vercel.com/new
2. Click **Import Git Repository** and select your repository
3. Configure project settings:
   - **Root Directory:** Leave as default
4. Click **Deploy**

Once connected to Git, Vercel automatically deploys:
- **Production:** On push to `main` branch
- **Preview:** On push to other branches

Note: Vercel Connect trigger forwarding targets one environment/branch per attachment (production by default) — preview deployments won't receive Slack events unless you attach a connector trigger to that branch.

## Configure Environment Variables

### Variables

| Variable | Value | Environments | Purpose |
|----------|-------|--------------|---------|
| `SLACK_CONNECTOR` | Connector UID (e.g., `slack/my-agent`) | Production, Preview | Vercel Connect Slack credentials — no `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET` needed |
| `AI_GATEWAY_API_KEY` | Gateway key | Only if not using OIDC | AI Gateway with project OIDC needs **no** key on Vercel |
| `ROUTE_AUTH_BASIC_PASSWORD` / JWT / OIDC keys | Secret | Production, Preview | Route auth for the HTTP API, matching your `AuthFn` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypass secret | Local `.env` | Lets local tools reach protected preview deployments |

Notes:

- **Model routing:** string model IDs (e.g., `anthropic/claude-sonnet-5`) route through the AI Gateway and authenticate via the project's OIDC token — no key required on Vercel.
- **Connect auth:** in deployments, `@vercel/connect` authenticates with the OIDC token Vercel injects automatically (`VERCEL_OIDC_TOKEN`); Connect verifies the project/environment against connector links. Nothing to configure beyond `SLACK_CONNECTOR` and the connector-project link.

### Via Dashboard

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the variables above and click **Save**
4. **Redeploy** your project to apply the changes

### Via CLI

```bash
vercel env add SLACK_CONNECTOR production
# You'll be prompted to enter the value
```

## Replace Placeholder Auth Before Production

Scaffolded projects protect the HTTP API with `placeholderAuth()`, which **fails closed in production** — every request to the API is rejected until you replace it.

Replace it with a real auth function: `httpBasic()`, `jwtHmac()`, `jwtEcdsa()`, `oidc()`, `vercelOidc()`, or a custom `AuthFn`. Set the matching secrets (e.g., `ROUTE_AUTH_BASIC_PASSWORD`) in Vercel env vars. See the eve auth guide (https://eve.dev/docs/guides/auth-and-route-protection).

The Slack channel route (`/eve/v1/slack`) is verified separately: the channel's `webhookVerifier` confirms each event forwarded by Vercel Connect.

## Point the Slack Connector at Your Deployment

Slack events don't hit your deployment directly — Slack delivers to Vercel Connect, which verifies them and POSTs to your registered trigger destination. That destination must be your deployment's eve Slack route:

```bash
vercel connect attach <connector-uid> --triggers --trigger-path /eve/v1/slack --yes
```

- `--triggers` enables Slack Event Subscriptions (without it, `app_mention` / `message.im` never arrive)
- `--trigger-branch` defaults to production
- Forwarding goes to **deployments only, not localhost**

## Verify Deployment

1. **Health check:**
   ```bash
   curl https://your-app.vercel.app/eve/v1/health
   ```
2. **Create a session over the HTTP API:**
   ```bash
   curl -X POST https://your-app.vercel.app/eve/v1/session \
     -H 'content-type: application/json' \
     -d '{"message":"Hello!"}'
   ```
   (Include the credentials required by your route auth.)
3. **Interactive smoke test** — drive the deployed app from the local TUI:
   ```bash
   npx eve dev https://your-app.vercel.app
   ```
4. **Slack:** invite the bot to a channel and @mention it. Check Vercel Dashboard > Logs for the forwarded event.

## Deployment Protection

Connect's forwarded Slack events are **not** blocked by Deployment Protection — no bypass secret is needed on the trigger path. Protection only affects your own requests to the deployment (verification curls, `eve dev <url>`).

If protection is enabled and you need to reach the deployment yourself:

1. Go to Vercel Dashboard > Project Settings > **Deployment Protection**
2. Under **Protection Bypass for Automation**, copy the secret (also available as the `VERCEL_AUTOMATION_BYPASS_SECRET` env var)
3. Include it where needed:
   - **Manual verification:** add the header to your curls:
     `curl -H "x-vercel-protection-bypass: YOUR_SECRET" https://your-app.vercel.app/eve/v1/health`
   - **Local tooling:** set `VERCEL_AUTOMATION_BYPASS_SECRET` in your local `.env`
4. Rotate the bypass secret periodically

## Monitoring

### Vercel Dashboard

- **Deployments:** View deployment history and status
- **Logs:** Real-time function logs
- **Analytics:** Request metrics and performance

### Recommended Logging

Add logging to your tools and hooks for debugging:

```typescript
console.log('[tool:get_weather]', { city });
```

Logs appear in Vercel Dashboard > Logs. For interactive debugging against the deployment, `npx eve dev https://your-app.vercel.app --logs all` streams the agent's activity.

## Troubleshooting

### Build fails on Vercel

- Check build logs for a **sandbox prewarm** failure — a failed prewarm fails the build

### All API requests rejected in production

**Cause:** the scaffolded `placeholderAuth()` fails closed in production.

**Solution:** replace it with a real auth function and set its secrets (see above).

### Bot doesn't respond to @mentions

1. Invite the bot to the channel
2. Confirm the deployment finished
3. Confirm the connector trigger is attached to this project with `--triggers` and trigger path `/eve/v1/slack` (`vercel connect list`)
4. Check the trigger branch — it defaults to production; a trigger attached to another branch/environment won't reach this deployment

### 504 Gateway Timeout on API endpoints

**Cause:** a synchronous request exceeded the function time limit.

**Solutions:**
1. Use the streaming endpoint (`/eve/v1/session/<id>/stream`) rather than waiting for completion
2. Remember that agent turns themselves run durably on Vercel Workflows — long-running work isn't bounded by a single request, so prefer session-create + stream over blocking calls

### Environment Variables Not Working

**Cause:** Variables not available after adding.

**Solutions:**
1. Redeploy after adding variables
2. Check variable scope (Production/Preview/Development)
3. Verify variable names match exactly (case-sensitive)

## Production Checklist

Before going live:

- [ ] `SLACK_CONNECTOR` set for Production (and Preview if used)
- [ ] Connector trigger attached with `--triggers` and trigger path `/eve/v1/slack`
- [ ] `placeholderAuth()` replaced with a real auth function; route-auth secrets configured
- [ ] Model credential in place (OIDC-backed AI Gateway, `AI_GATEWAY_API_KEY`, or provider key)
- [ ] Build succeeded, including sandbox prewarm
- [ ] `/eve/v1/health` returns healthy
- [ ] Test @mention working in Slack
- [ ] Logging configured for debugging

## Rollback

If something goes wrong:

1. Go to **Deployments** in Vercel Dashboard
2. Find a working previous deployment
3. Click the **...** menu
4. Select **Promote to Production**

This instantly reverts to the previous version. The connector trigger targets the environment, not a specific deployment, so Slack events follow the promotion automatically.
