# Slack Agent Setup Wizard

Interactive wizard for building and deploying Slack agents on Vercel using [eve](https://eve.dev/docs), Vercel's agent framework, with Slack credentials brokered by [Vercel Connect](https://vercel.com/kb/guide/vercel-connect). This wizard guides users through the complete setup process from project creation to production deployment.

## Key Feature: Custom Implementation Planning

When starting a new project, the wizard generates a **custom implementation plan** tailored to the specific agent the user wants to build. Instead of a generic template setup, users get:

- Specific dispatch hooks for their use case
- Appropriate tools and skills
- Right-sized thread-context and scheduling choices
- Concrete file paths to create

This plan is presented for approval before any code is scaffolded, allowing users to refine the scope before implementation.

## How to Use

The wizard is divided into 7 phases. Based on the user's request and project state, determine which phase to start with:

### Command Arguments

- `new` - Start fresh with Phase 1 (new project)
- `configure` - Start with Phase 2 or 3 (existing project)
- `deploy` - Start with Phase 5 (deploy to production)
- `test` - Start with Phase 6 (set up testing)
- (no argument) - Auto-detect based on project state

### Phase Detection

Check the project state to determine the appropriate starting phase:

| Condition | Starting Phase |
|-----------|----------------|
| No `package.json` with `eve` (and no `agent/` directory) | Phase 1 - New project |
| Has project but no Slack connector (`SLACK_CONNECTOR` unset) | Phase 2 - Create the Slack connector |
| Has connector but no `.env` file | Phase 3 - Configure environment |
| Has `.env` but not tested locally | Phase 4 - Test locally |
| Tested locally but not deployed | Phase 5 - Deploy to production |
| Deployed but no tests | Phase 6 - Set up testing |

### Wizard Phases

1. **[Project Setup](./1-project-setup.md)** - Understand purpose, generate implementation plan
1b. **[Approve Plan](./1b-approve-plan.md)** - Review and approve custom implementation plan
2. **[Create the Slack Connector](./2-create-slack-app.md)** - Register a Slack connector with Vercel Connect
3. **[Configure Environment](./3-configure-environment.md)** - Set up .env
4. **[Test Locally](./4-test-locally.md)** - Test the agent in the `eve dev` TUI
5. **[Deploy to Production](./5-deploy-production.md)** - Vercel deployment
6. **[Set Up Testing](./6-setup-testing.md)** - Vitest configuration (optional)

## Context to Maintain

Throughout the wizard, track these user choices for use in later phases:

- **Agent purpose** - What the agent does (used for naming, instructions.md, and the connector name)
- **Implementation plan** - The approved custom plan with features, hooks, and tools
- **Project name** - Directory name for the project
- **LLM provider choice** - AI Gateway with OIDC, or Gateway API key
- **Slack connector UID** - e.g. `slack/my-agent` (value of `SLACK_CONNECTOR`)
- **Deployment URL** - Vercel URL for production
- **Deployment protection status** - Whether bypass secret is needed

## Quick Reference

| Command | Purpose |
|---------|---------|
| `eve dev` | Start local dev server + terminal TUI (port 2000) |
| `eve dev https://<app>` | Drive a deployed app interactively |
| `eve build` | Compile the agent into `.eve/` |
| `eve deploy` | Deploy to Vercel (wraps `vercel deploy --prod`) |
| `vercel connect create slack --triggers` | Register a Slack connector |
| `vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes` | Point the connector's triggers at the agent |
| `vercel link` + `vercel env pull` | Link the project and pull OIDC/dev env vars |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates |

## Environment Variables Summary

| Variable | Required | Where to Get It |
|----------|----------|-----------------|
| `SLACK_CONNECTOR` | Yes | Connector UID from `vercel connect create slack` (e.g. `slack/my-agent`) |
| `VERCEL_OIDC_TOKEN` | Auto | Injected in deployments; locally via `vercel env pull` (expires ~12h) |
| `AI_GATEWAY_API_KEY` | Only if not using Vercel OIDC | Vercel dashboard > AI Gateway |

**No Slack tokens needed** - Vercel Connect brokers short-lived Slack credentials at runtime (no `SLACK_BOT_TOKEN` or `SLACK_SIGNING_SECRET`) and verifies webhooks for you. **Using Vercel AI Gateway with OIDC?** No AI API keys needed either.
