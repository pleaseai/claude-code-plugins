/**
 * Unit tests for eve Agent Config and Slack Channel
 *
 * Copy this template to agent/agent.test.ts (config tests) and
 * agent/channels/slack.test.ts (channel tests), then customize
 * for your specific implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectSlackCredentials } from '@vercel/connect/eve';
// Import mock factories from test setup
// import { createMockChannelHandle } from './__tests__/setup';

// Module-boundary mocks (already global if you use test-setup.ts;
// shown inline here so the file works standalone)
vi.mock('eve', () => ({
  defineAgent: vi.fn((config) => config),
}));

vi.mock('eve/channels/slack', () => ({
  slackChannel: vi.fn((config) => config),
}));

vi.mock('@vercel/connect/eve', () => ({
  connectSlackCredentials: vi.fn(() => ({
    botToken: 'xoxb-test-token',
    webhookVerifier: vi.fn(),
  })),
}));

// Create mock factories inline (or import from setup)
function createMockChannelHandle(overrides = {}) {
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

describe('agent config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use the default gateway model', async () => {
    // TODO: Import your agent config
    // const agent = (await import('./agent')).default;
    //
    // expect(agent.model).toBe('anthropic/claude-sonnet-5');
    expect(true).toBe(true); // Placeholder
  });
});

describe('slack channel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('credentials', () => {
    it('should resolve credentials from SLACK_CONNECTOR', async () => {
      // TODO: Import your channel config
      // const channel = (await import('./channels/slack')).default;
      //
      // expect(connectSlackCredentials).toHaveBeenCalledWith(
      //   process.env.SLACK_CONNECTOR
      // );
      // expect(channel.credentials).toBeDefined();
      expect(connectSlackCredentials).toBeDefined();
    });
  });

  describe('custom event handlers', () => {
    it('should post completed messages to the thread', async () => {
      const handle = createMockChannelHandle();

      // TODO: Import your channel config and invoke the handler
      // const channel = (await import('./channels/slack')).default;
      // channel.events['message.completed'](
      //   { finishReason: 'stop', message: 'All done!' },
      //   handle,
      //   {}
      // );
      //
      // expect(handle.thread.post).toHaveBeenCalledWith('All done!');
      expect(handle.thread.post).toBeDefined();
    });

    it('should skip intermediate tool-call turns', async () => {
      const handle = createMockChannelHandle();

      // TODO: Invoke the handler with a tool-calls finish reason
      // channel.events['message.completed'](
      //   { finishReason: 'tool-calls', message: 'thinking...' },
      //   handle,
      //   {}
      // );
      //
      // expect(handle.thread.post).not.toHaveBeenCalled();
      expect(handle.thread.post).not.toHaveBeenCalled();
    });

    it('should use mentionUser for user mentions', async () => {
      const handle = createMockChannelHandle();

      // TODO: Test any handler that mentions users — bare "@" stays
      // literal in Slack, so handlers must use mentionUser / <@USER_ID>
      // expect(handle.thread.mentionUser).toHaveBeenCalledWith('U12345678');
      expect(handle.thread.mentionUser('U12345678')).toBe('<@U12345678>');
    });
  });
});
