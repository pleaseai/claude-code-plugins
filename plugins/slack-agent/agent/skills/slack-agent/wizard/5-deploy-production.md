# Phase 5: Deploy to Production

This phase guides the user through deploying their eve agent to Vercel and testing the Slack surface — which only works against a deployment (Vercel Connect forwards events to deployments, never localhost).

---

## Step 5.1: Push to GitHub

```bash
# Create repo on GitHub, then:
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

---

## Step 5.2: Deploy to Vercel

**Option A - Via CLI (recommended):**
```bash
npx eve deploy
```
This wraps `vercel deploy --prod` — eve builds and emits Vercel Build Output.

**Option B - Git-connected deploy:**
> 1. Go to https://vercel.com/new
> 2. Import your GitHub repository
> 3. Click **Deploy**
>
> After that, every push to `main` deploys to production automatically.

**If the build fails:** check the build logs for a **sandbox prewarm** failure — Vercel builds prewarm sandbox templates, and a failed prewarm fails the build.

---

## Step 5.3: Configure Production Environment Variables

Tell the user:

> **Add environment variables in Vercel:**
>
> **Option A - Via CLI:**
> ```bash
> vercel env add SLACK_CONNECTOR
> ```
> Enter your connector UID (e.g., `slack/my-agent`) when prompted. Select all environments (Production, Preview, Development) when asked.
>
> **Option B - Via Dashboard:**
> 1. Go to your project in Vercel Dashboard
> 2. Go to **Settings** -> **Environment Variables**
> 3. Add `SLACK_CONNECTOR` = your connector UID
> 4. Click **Save**

No `SLACK_BOT_TOKEN` or `SLACK_SIGNING_SECRET` is needed — Vercel Connect brokers short-lived Slack tokens at runtime and verifies forwarded webhooks.

**Note for AI configuration:**
- **Using Vercel AI Gateway (default)?** No AI API keys needed — string model IDs authenticate via the project's OIDC token on Vercel.

**Route auth:** if you replaced `placeholderAuth()` with e.g. `httpBasic()`, add its secrets (e.g., `ROUTE_AUTH_BASIC_PASSWORD`). Remember `placeholderAuth()` fails closed in production — the HTTP API rejects everything until it's replaced.

**After adding variables:** Redeploy the project for changes to take effect.
- CLI: `npx eve deploy`
- Dashboard: Deployments -> ... -> Redeploy

---

## Step 5.4: Confirm the Connector Trigger Destination

Slack events reach the agent only if the connector's trigger forwarding points at this project's production deployment on eve's Slack route.

Check the current attachment:

```bash
vercel connect list
```

If the connector isn't registered as a trigger destination on `/eve/v1/slack`, re-run the attach with the right path:

```bash
vercel connect attach <connector-uid> --triggers --trigger-path /eve/v1/slack --yes
```

- `--triggers` registers this project as a trigger destination — without it, `app_mention` / `message.im` never arrive
- `--trigger-branch` defaults to production, which is what you want here
- Note: `vercel connect detach` removes token access but does **not** remove trigger destinations — manage those on the connector (dashboard: `vercel connect open <connector-uid>`)

Deployment Protection does not block Connect's forwarded events, and no bypass secret is needed for the trigger path. If protection is enabled and you want to run verification curls against the deployment, set `VERCEL_AUTOMATION_BYPASS_SECRET` locally and pass it as the `x-vercel-protection-bypass` header on those curls only.

---

## Step 5.5: Verify Production

First, confirm the deployment is healthy:

```bash
curl https://YOUR-APP.vercel.app/eve/v1/health
```

Then tell the user:

> **Test the Slack surface:**
>
> 1. Open your Slack workspace
> 2. Invite the bot to a channel: `/invite @YourBotName`
> 3. Mention the bot: `@YourBotName hello!`
> 4. You should see a "Working…" indicator, then a reply in the thread
> 5. Check Vercel Dashboard -> Logs for the forwarded event

For an interactive smoke test of the deployed agent itself:

```bash
npx eve dev https://YOUR-APP.vercel.app
```

---

## Troubleshooting

### Bot doesn't respond to @mentions
- Invite the bot to the channel first
- Confirm the deployment finished (check Deployments in the dashboard)
- Confirm the connector trigger is attached to **this** project with `--triggers` and trigger path `/eve/v1/slack` (`vercel connect list`)
- Check the trigger branch/environment — triggers default to production; a trigger attached to another branch or a preview environment won't reach the production deployment

### Bot stuck on "Working…"
- Stream logs from the deployment: `npx eve dev https://YOUR-APP.vercel.app --logs all` (or `/loglevel all` in the TUI)

### Health check fails
- Confirm the deployment completed and the URL is correct
- If Deployment Protection is on, add `-H "x-vercel-protection-bypass: YOUR_SECRET"` to the curl

### HTTP API rejects all requests
- The scaffolded `placeholderAuth()` fails closed in production — replace it with a real auth function and set its secrets, then redeploy

---

## Context to Store

- **Deployment URL** — the production URL (used for health checks and `eve dev <url>`)
- **Deployment protection status** — whether verification curls need the `x-vercel-protection-bypass` header

## Next Phase (Optional)

Once production is verified, you may optionally proceed to [Phase 6: Set Up Testing](./6-setup-testing.md).
