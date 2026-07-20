# Testing Patterns for Slack Agents

This document provides detailed testing patterns for Slack agent projects built with eve, Vercel's filesystem-first agent framework.

## Test File Organization

Tests are co-located with the code they test, following eve's filesystem-first conventions. Build artifacts in `.eve/` are always excluded.

```
agent/
├── __tests__/
│   ├── setup.ts                  # Global test setup and mocks
│   └── helpers/
│       ├── mock-context.ts       # defineTool ctx mocks
│       └── mock-channel.ts       # Slack channel handle mocks
├── instructions.md               # Always-on system prompt (not tested)
├── agent.ts                      # Runtime config (defineAgent)
├── agent.test.ts                 # Agent config tests (co-located)
├── tools/
│   ├── get_weather.ts            # Tool — filename = tool name
│   ├── get_weather.test.ts       # Unit tests (co-located)
│   ├── search_channels.ts
│   └── search_channels.test.ts
├── channels/
│   ├── slack.ts                  # Slack channel adapter
│   └── slack.test.ts             # Channel config + event handler tests
└── skills/
    └── *.md                      # Load-on-demand instructions (not tested)
.eve/                             # Build output — exclude from tests/coverage
```

Template files: `./templates/eve/`

---

## Unit Testing Tools

eve tools are default exports from `defineTool` with an `execute(input, ctx)` signature. Test them by importing the tool and calling `execute` directly with a mock `ctx`.

### Mocking the Tool Context

`ctx` only needs the fields your tool actually uses. Keep the mock minimal — `session`, `callId`, and `abortSignal` cover most tools:

```typescript
// agent/__tests__/helpers/mock-context.ts
import { vi } from 'vitest';

export function createMockToolContext(overrides = {}) {
  return {
    session: {
      metadata: {},
      turn: 1,
      auth: {},
    },
    callId: 'call_test_123',
    abortSignal: new AbortController().signal,
    ...overrides,
  };
}
```

Add other `ctx` fields (e.g. `toolName`, `getSandbox`, `getSkill`) via `overrides` only when a tool depends on them.

### Testing a Tool Definition

```typescript
// agent/tools/get_weather.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import getWeather from './get_weather';
import { createMockToolContext } from '../__tests__/helpers/mock-context';

describe('get_weather', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return weather for a city', async () => {
    const ctx = createMockToolContext();

    const result = await getWeather.execute({ city: 'Brooklyn' }, ctx);

    expect(result.city).toBe('Brooklyn');
    expect(result.temperatureF).toBeTypeOf('number');
  });

  it('should reject invalid input via the schema', () => {
    // Zod inputSchema validation — no execute call needed
    const parsed = getWeather.inputSchema.safeParse({ city: '' });

    expect(parsed.success).toBe(false);
  });
});
```

### Testing Error Paths

Every tool test suite should cover the failure modes: upstream API errors, empty results, and invalid input. Return structured errors from `execute` rather than throwing, so the model can recover.

```typescript
// agent/tools/get_channel_messages.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callSlackApi } from 'eve/channels/slack';
import getChannelMessages from './get_channel_messages';
import { createMockToolContext } from '../__tests__/helpers/mock-context';

// Mock at the module boundary — never reach into eve internals
vi.mock('eve/channels/slack', () => ({
  callSlackApi: vi.fn(),
  resolveSlackBotToken: vi.fn().mockResolvedValue('xoxb-test-token'),
}));

describe('get_channel_messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch messages from channel', async () => {
    vi.mocked(callSlackApi).mockResolvedValue({
      ok: true,
      messages: [
        { text: 'Hello', user: 'U123', ts: '123.001' },
        { text: 'World', user: 'U456', ts: '123.002' },
      ],
      has_more: false,
    });

    const result = await getChannelMessages.execute(
      { channel_id: 'C12345678', limit: 10 },
      createMockToolContext()
    );

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toBe('Hello');
  });

  it('should handle empty channel', async () => {
    vi.mocked(callSlackApi).mockResolvedValue({
      ok: true,
      messages: [],
      has_more: false,
    });

    const result = await getChannelMessages.execute(
      { channel_id: 'C_EMPTY', limit: 10 },
      createMockToolContext()
    );

    expect(result.success).toBe(true);
    expect(result.messages).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(callSlackApi).mockRejectedValue(
      new Error('channel_not_found')
    );

    const result = await getChannelMessages.execute(
      { channel_id: 'C_INVALID', limit: 10 },
      createMockToolContext()
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('channel_not_found');
  });
});
```

### Testing Tools That Use Vercel Connect Tokens

Tools that call third-party APIs get short-lived tokens via Vercel Connect. Mock `@vercel/connect` at the module boundary so no real token requests happen in tests:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getToken } from '@vercel/connect';
import createIssue from './create_issue';
import { createMockToolContext } from '../__tests__/helpers/mock-context';

vi.mock('@vercel/connect', () => ({
  getToken: vi.fn().mockResolvedValue('test-connect-token'),
}));

describe('create_issue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should request a token and call the API', async () => {
    const result = await createIssue.execute(
      { title: 'Bug report' },
      createMockToolContext()
    );

    expect(getToken).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('should surface token failures as tool errors', async () => {
    vi.mocked(getToken).mockRejectedValueOnce(new Error('unauthorized'));

    const result = await createIssue.execute(
      { title: 'Bug report' },
      createMockToolContext()
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('unauthorized');
  });
});
```

---

## Testing the Slack Channel

The channel adapter (`agent/channels/slack.ts`) is a config object produced by `slackChannel(...)`. Mock `eve/channels/slack` and `@vercel/connect/eve` so the test never resolves real credentials, then assert on the config and exercise any custom event handlers.

### Channel Configuration

```typescript
// agent/channels/slack.test.ts
import { describe, it, expect, vi } from 'vitest';
import { connectSlackCredentials } from '@vercel/connect/eve';

vi.mock('eve/channels/slack', () => ({
  slackChannel: vi.fn((config) => config),
}));

vi.mock('@vercel/connect/eve', () => ({
  connectSlackCredentials: vi.fn(() => ({
    botToken: 'xoxb-test-token',
    webhookVerifier: vi.fn(),
  })),
}));

describe('slack channel', () => {
  it('should resolve credentials from SLACK_CONNECTOR', async () => {
    const channel = (await import('./slack')).default;

    expect(connectSlackCredentials).toHaveBeenCalledWith(
      process.env.SLACK_CONNECTOR
    );
    expect(channel.credentials).toBeDefined();
  });
});
```

### Custom Event Handlers

Custom event handlers receive `(eventData, channel, ctx)` where `channel.thread` posts to the triggering Slack thread and `channel.slack.request` calls the raw Slack API. Mock that handle:

```typescript
// agent/__tests__/helpers/mock-channel.ts
import { vi } from 'vitest';

export function createMockChannelHandle(overrides = {}) {
  return {
    thread: {
      post: vi.fn().mockResolvedValue(undefined),
      mentionUser: vi.fn((userId: string) => `<@${userId}>`),
    },
    slack: {
      request: vi.fn().mockResolvedValue({ ok: true }),
    },
    ...overrides,
  };
}
```

```typescript
// agent/channels/slack.test.ts (continued)
import { createMockChannelHandle } from '../__tests__/helpers/mock-channel';

describe('message.completed handler', () => {
  it('should post the completed message to the thread', async () => {
    const channel = (await import('./slack')).default;
    const handle = createMockChannelHandle();

    channel.events['message.completed'](
      { finishReason: 'stop', message: 'All done!' },
      handle,
      {}
    );

    expect(handle.thread.post).toHaveBeenCalledWith('All done!');
  });

  it('should skip intermediate tool-call turns', async () => {
    const channel = (await import('./slack')).default;
    const handle = createMockChannelHandle();

    channel.events['message.completed'](
      { finishReason: 'tool-calls', message: 'thinking...' },
      handle,
      {}
    );

    expect(handle.thread.post).not.toHaveBeenCalled();
  });
});
```

---

## Testing Agent Configuration

`agent/agent.ts` is a small config file, but a smoke test catches accidental model or option regressions:

```typescript
// agent/agent.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('eve', () => ({
  defineAgent: vi.fn((config) => config),
}));

describe('agent config', () => {
  it('should use the default gateway model', async () => {
    const agent = (await import('./agent')).default;

    expect(agent.model).toBe('anthropic/claude-sonnet-5');
  });
});
```

---

## E2E Testing Patterns

Unit tests cover tools and handlers in isolation. For end-to-end verification, use eve's HTTP API against a running dev server (`npx eve dev --no-ui`) — no mocks:

```bash
# Create a session and assert on the reply
curl -X POST http://127.0.0.1:2000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"What is the weather in Brooklyn?"}'

# Stream events (NDJSON): session.started → actions.requested →
# action.result → message.completed → session.completed
curl http://127.0.0.1:2000/eve/v1/session/<sessionId>/stream
```

Note: the Slack surface itself cannot be exercised locally — Slack events route through Vercel Connect to the deployed project. Test the Slack path against a preview or production deployment (`eve dev https://your-app.vercel.app` for an interactive smoke test); everything else works locally.

### Multi-Turn Tool Flow (unit level)

```typescript
describe('E2E: tool flow', () => {
  it('should handle sequential tool calls in a session', async () => {
    const ctx = createMockToolContext({
      session: { metadata: {}, turn: 1, auth: {} },
    });

    const first = await getWeather.execute({ city: 'Brooklyn' }, ctx);
    expect(first.city).toBe('Brooklyn');

    const followUpCtx = createMockToolContext({
      session: { metadata: {}, turn: 2, auth: {} },
    });

    const second = await getWeather.execute({ city: 'Queens' }, followUpCtx);
    expect(second.city).toBe('Queens');
  });
});
```

---

## Mock Helpers

Keep all shared mocks in `agent/__tests__/helpers/` and mock at eve's module boundaries (`eve`, `eve/tools`, `eve/channels/slack`, `@vercel/connect`, `@vercel/connect/eve`) — never reach into framework internals.

```typescript
// agent/__tests__/setup.ts (excerpt — see templates/eve/test-setup.ts)
import { vi } from 'vitest';

// Only Slack env var needed — Vercel Connect brokers credentials
vi.stubEnv('SLACK_CONNECTOR', 'slack/test-agent');
vi.stubEnv('AI_GATEWAY_API_KEY', 'test-ai-gateway-key');

vi.mock('eve/tools', () => ({
  defineTool: vi.fn((config) => config),
}));

vi.mock('eve/channels/slack', () => ({
  slackChannel: vi.fn((config) => config),
  callSlackApi: vi.fn().mockResolvedValue({ ok: true }),
  resolveSlackBotToken: vi.fn().mockResolvedValue('xoxb-test-token'),
}));

vi.mock('@vercel/connect', () => ({
  getToken: vi.fn().mockResolvedValue('test-connect-token'),
}));

vi.mock('@vercel/connect/eve', () => ({
  connectSlackCredentials: vi.fn(() => ({
    botToken: 'xoxb-test-token',
    webhookVerifier: vi.fn(),
  })),
  connect: vi.fn((connector) => ({ connector })),
}));
```

Mocking `defineTool` as an identity function means importing a tool file in a test returns its config object directly — `description`, `inputSchema`, and `execute` are all inspectable.

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
