# Phase 3: Configure Environment

This phase sets up the environment variables needed for the Slack agent to run. With Vercel Connect there are no Slack tokens to paste — the only Slack variable is `SLACK_CONNECTOR`, using the connector UID from Phase 2.

---

## Step 3.1: Link the Project and Pull Environment

Link the directory to the Vercel project and pull the environment. This fetches `VERCEL_OIDC_TOKEN` into `.env.local`, which authenticates local calls to both the AI Gateway and Vercel Connect:

```bash
vercel link
vercel env pull
```

**Note:** The pulled `VERCEL_OIDC_TOKEN` expires after ~12 hours. If local AI or Connect calls start failing with auth errors later, re-run `vercel env pull`.

---

## Step 3.2: Complete .env.local

Add to `.env.local` based on the user's LLM choice from Step 1.3 and the connector UID from Phase 2:

**If using Vercel AI Gateway via OIDC (default):**
```env
# Slack via Vercel Connect (no bot token or signing secret needed)
SLACK_CONNECTOR=slack/my-agent

# VERCEL_OIDC_TOKEN was written by `vercel env pull`

# No AI keys needed - the AI Gateway authenticates via the OIDC token!
```

**If using Vercel AI Gateway with an API key:**
```env
# Slack via Vercel Connect
SLACK_CONNECTOR=slack/my-agent

# AI Gateway key (instead of OIDC)
AI_GATEWAY_API_KEY=your-gateway-key
```

**If No LLM needed:**
```env
# Slack via Vercel Connect
SLACK_CONNECTOR=slack/my-agent
```

**Security:** Never display API keys or the OIDC token back to the user or in logs. `SLACK_CONNECTOR` is an identifier, not a secret.

---

## Step 3.3: Verify .gitignore

Ensure credentials won't be committed:

```bash
# Check .gitignore covers .env files (including .env.local)
grep -q "^\.env" .gitignore || printf ".env\n.env*.local\n" >> .gitignore
```

---

## Next Phase

Once the environment is configured, proceed to [Phase 4: Test Locally](./4-test-locally.md).
