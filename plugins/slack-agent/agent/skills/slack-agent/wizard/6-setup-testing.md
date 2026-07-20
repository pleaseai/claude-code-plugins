# Phase 6: Set Up Testing (Optional but Recommended)

This phase guides the user through setting up a testing framework for their eve Slack agent.

---

## Step 6.1: Install Test Dependencies

```bash
pnpm add -D vitest @vitest/coverage-v8
```

---

## Step 6.2: Create Test Config

Create `vitest.config.ts` in the project root. Tests are co-located with the agent code under `agent/`; eve's build artifacts in `.eve/` are excluded.

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'agent/**/*.test.ts',
    ],
    exclude: [
      'node_modules',
      '.eve',
      '.vercel',
      'dist',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['agent/**/*.ts'],
      exclude: [
        'agent/**/*.test.ts',
        'agent/**/*.d.ts',
        'agent/__tests__/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    setupFiles: ['./agent/__tests__/setup.ts'],
    testTimeout: 10000,
    retry: 0,
    reporters: ['verbose'],
  },
});
```

You can also copy this from `./templates/eve/vitest.config.ts`.

---

## Step 6.3: Create Test Setup

Create `agent/__tests__/setup.ts` with test utilities and mocks. You can copy the template from `./templates/eve/test-setup.ts`.

This setup file provides:
- Environment variable stubs for tests (`SLACK_CONNECTOR`, `AI_GATEWAY_API_KEY` — no `SLACK_BOT_TOKEN` or `SLACK_SIGNING_SECRET`; Vercel Connect brokers Slack credentials)
- Module-boundary mocks for `eve`, `eve/tools`, `eve/channels/slack`, `@vercel/connect`, and `@vercel/connect/eve`
- Mock factories for creating test fixtures (tool `ctx`, Slack channel handle, Slack messages)
- Test lifecycle hooks

---

## Step 6.4: Add Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Step 6.5: Create Sample Tests

Copy the sample test templates from `./templates/eve/sample-tests/` into your project:

- `agent.test.ts` - Sample agent config and Slack channel tests (split into `agent/agent.test.ts` and `agent/channels/slack.test.ts`)
- `tools.test.ts` - Sample tool unit tests (copy alongside each tool, e.g. `agent/tools/get_channel_messages.test.ts`)

Customize these templates for your specific implementation. Tools are default exports from `defineTool` — test them by calling `execute(input, ctx)` directly with a mock `ctx`, covering error paths as well as the happy path.

---

## Step 6.6: Run Tests

```bash
pnpm test
```

---

## Test Coverage Guidelines

Aim for these coverage targets:

| Category | Target |
|----------|--------|
| Tools | 90%+ |
| Agent logic | 85%+ |
| Channel event handlers | 80%+ |
| Utilities | 90%+ |
| Overall | 80%+ |

Run coverage report:
```bash
pnpm test:coverage
```

---

## Security Reminders

- NEVER commit `.env` files
- NEVER log full API tokens
- Use different Vercel Connect connectors for dev and production (one connector per environment)
- Rotate credentials if exposed

---

## Complete!

Your Slack agent is now set up with:

- eve project with the filesystem-first agent layout (`agent/instructions.md`, `agent/agent.ts`, `agent/tools/`, `agent/channels/slack.ts`, `agent/skills/`)
- Slack connectivity through Vercel Connect (`SLACK_CONNECTOR`, trigger path `/eve/v1/slack`)
- Environment configuration
- Local development workflow (`npx eve dev`)
- Production deployment on Vercel
- Testing infrastructure

For ongoing development, refer to:
- `./SKILL.md` - Development standards and patterns
- `./patterns/testing-patterns.md` - Detailed testing guidance
- `./patterns/slack-patterns.md` - Slack-specific patterns
- `./reference/` - Technical reference documentation
