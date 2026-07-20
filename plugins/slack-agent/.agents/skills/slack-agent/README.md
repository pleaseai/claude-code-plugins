# Slack Agent Skill

A skill for building and deploying Slack agents on Vercel with **[eve](https://eve.dev/docs)** (Vercel's durable agent framework) and **[Vercel Connect](https://vercel.com/kb/guide/vercel-connect)** (managed Slack credentials — no bot tokens or signing secrets to handle).

## Features

- **Interactive Setup Wizard**: Step-by-step guidance from project creation to production deployment
- **eve Framework**: Filesystem-first agents — `instructions.md`, `defineAgent`, tools in `agent/tools/`, a Slack channel in `agent/channels/` — with a durable, crash-safe runtime
- **Vercel Connect Integration**: Managed Slack OAuth, token rotation, and webhook verification; the only Slack env var is `SLACK_CONNECTOR`
- **Custom Implementation Planning**: Generates a tailored plan based on your agent's purpose before scaffolding
- **Quality Standards**: Embedded testing and code quality requirements
- **AI Integration**: Vercel AI Gateway (`anthropic/claude-sonnet-5` by default) — no AI API keys on Vercel
- **Comprehensive Patterns**: eve tools, approval gating, thread context, and Slack delivery patterns
- **Testing Framework**: Vitest configuration and sample tests

## Installation

### Via skills.sh (Recommended)

npx skills add vercel-labs/slack-agent-skill

### Manual Installation

Clone the repository into your skills directory. For example, with Claude Code:

git clone https://github.com/vercel-labs/slack-agent-skill.git ~/.claude/skills/slack-agent-skill

## Usage

### Starting a New Project

Run the slash command:

```
/slack-agent

Or with arguments:
/slack-agent new       # Start fresh project (scaffolds with eve)
/slack-agent configure # Configure existing project (auto-detects eve)
/slack-agent deploy    # Deploy to production
/slack-agent test      # Set up testing
```

The wizard will guide you through:
1. Project setup with custom implementation plan generation and approval
2. Slack connector creation with Vercel Connect
3. Environment configuration
4. Local agent testing with the eve dev TUI
5. Production deployment to Vercel
6. Test framework setup

Note: Slack events route through Vercel Connect to your deployed project, so the Slack surface itself is tested after deploy — no ngrok tunnel needed. Everything else (tools, instructions, conversations) is tested locally in the `eve dev` TUI.

### Development

When working on an existing Slack agent project, the skill detects eve from `package.json`:
- **`"eve"` in dependencies** — Uses eve patterns (tools in `agent/tools/`, Slack channel in `agent/channels/slack.ts`)

The skill then provides:
- Code quality standards (linting, testing, TypeScript)
- eve-specific patterns (tools, skills, channels, hooks, approval gating)
- AI integration guidance (Vercel AI Gateway)
- Deployment best practices

## Key Commands

```bash
# Setup
npx eve@latest init my-agent          # Scaffold a new eve project (Node 24+)
vercel connect create slack --triggers # Create the Slack connector
vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes

# Development
eve dev               # Local dev server + terminal TUI

# Quality
pnpm lint             # Check linting
pnpm lint --write     # Auto-fix lint issues
pnpm typecheck        # TypeScript check
pnpm test             # Run tests

# Deployment
eve deploy            # Production deployment (wraps vercel deploy --prod)
```

## Quality Standards

The skill enforces these requirements:

- **Unit tests** for all exported functions
- **E2E tests** for user-facing changes
- **Linting** must pass (Biome)
- **TypeScript** must compile without errors
- **All tests** must pass before completion

## Related Resources

- [eve Documentation](https://eve.dev/docs)
- [eve on the Vercel Knowledge Base](https://vercel.com/kb/eve)
- [Vercel Connect Guide](https://vercel.com/kb/guide/vercel-connect)
- [eve Slack Agent Starter](https://vercel.com/kb/guide/eve-slack-agent-starter)
- [AI SDK Documentation](https://ai-sdk.dev)
- [Slack API Documentation](https://api.slack.com)
- [Vercel Documentation](https://vercel.com/docs)

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.
