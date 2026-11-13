/**
 * Global test setup file
 * This runs before each test file
 *
 * Copy to agent/__tests__/setup.ts
 */
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';

// ============================================
// Environment Variables
// ============================================

// Stub environment variables for tests.
// SLACK_CONNECTOR is the only Slack variable — Vercel Connect brokers
// bot tokens and webhook verification (no SLACK_BOT_TOKEN /
// SLACK_SIGNING_SECRET).
vi.stubEnv('SLACK_CONNECTOR', 'slack/test-agent');
vi.stubEnv('AI_GATEWAY_API_KEY', 'test-ai-gateway-key');
vi.stubEnv('NODE_ENV', 'test');

// ============================================
// Global Mocks
// ============================================
// Mock at eve's module boundaries — never reach into framework internals.

// Mock eve core (defineAgent returns its config for inspection)
vi.mock('eve', () => ({
  defineAgent: vi.fn((config) => config),
}));

// Mock eve tools (defineTool returns its config, so importing a tool
// file in a test exposes description, inputSchema, and execute directly)
vi.mock('eve/tools', () => ({
  defineTool: vi.fn((config) => config),
}));

// Mock the eve Slack channel module
vi.mock('eve/channels/slack', () => ({
  slackChannel: vi.fn((config) => config),
  callSlackApi: vi.fn().mockResolvedValue({ ok: true }),
  resolveSlackBotToken: vi.fn().mockResolvedValue('xoxb-test-token'),
}));

// Mock Vercel Connect (runtime token requests)
vi.mock('@vercel/connect', () => ({
  getToken: vi.fn().mockResolvedValue('test-connect-token'),
}));

// Mock Vercel Connect's eve bindings (Slack credentials + connections)
vi.mock('@vercel/connect/eve', () => ({
  connectSlackCredentials: vi.fn(() => ({
    botToken: 'xoxb-test-token',
    webhookVerifier: vi.fn(),
  })),
  connect: vi.fn((connector) => ({ connector })),
}));

// ============================================
// Mock Factories
// ============================================

/**
 * Minimal mock for the ctx argument of defineTool's execute(input, ctx).
 * Add other fields (toolName, getSandbox, getSkill, ...) via overrides
 * only when a tool depends on them.
 */
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

/**
 * Mock for the channel handle passed to custom Slack event handlers:
 * events: { "message.completed"(eventData, channel, ctx) { ... } }
 */
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

export function createMockSlackMessage(overrides = {}) {
  return {
    text: 'test message',
    user: 'U12345678',
    channel: 'C12345678',
    ts: '1234567890.123456',
    ...overrides,
  };
}

// ============================================
// Test Lifecycle Hooks
// ============================================

beforeAll(() => {
  // Global setup before all tests
  console.log('Starting test suite...');
});

afterAll(() => {
  // Global cleanup after all tests
  console.log('Test suite complete.');
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

// ============================================
// Custom Matchers (optional)
// ============================================

// Add custom matchers if needed
// expect.extend({
//   toBeValidSlackMessage(received) {
//     const pass = received && typeof received.text === 'string';
//     return {
//       pass,
//       message: () => `expected ${received} to be a valid Slack message`,
//     };
//   },
// });
