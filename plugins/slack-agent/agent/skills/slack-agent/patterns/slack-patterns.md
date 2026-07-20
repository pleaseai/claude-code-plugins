# Slack Development Patterns

This document covers Slack-specific patterns and best practices for building agents with eve and Vercel Connect. The Slack channel lets your agent respond to @mentions and DMs, reply in threads, show typing indicators, and render human-in-the-loop prompts as native Slack buttons — with credentials brokered by Vercel Connect instead of long-lived tokens.

> **Note:** The Slack surface cannot be tested locally. Events route through Vercel Connect to your deployed project. Use the local TUI (`npx eve dev`) to test agent behavior, then deploy with `eve deploy` to test the Slack surface end to end.

## Channel Setup

The Slack channel is a single file in `agent/channels/`. The filename registers the channel — `slack.ts` registers the `slack` channel, served at `/eve/v1/slack`.

```typescript
// agent/channels/slack.ts
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR ?? "slack/my-agent"),
});
```

`connectSlackCredentials` returns `{ botToken, webhookVerifier }`:

- **`botToken`** — resolved fresh through Vercel Connect on each Slack API request. Short-lived, auto-rotated, scoped by the connector's bot scopes. No `SLACK_BOT_TOKEN` to store or leak.
- **`webhookVerifier`** — confirms each forwarded event genuinely came from Connect (Connect verifies the event with Slack, then forwards it to your deployment). No `SLACK_SIGNING_SECRET`, no signature/timestamp checks in your code.

The connector's trigger must point at eve's Slack route:

```bash
vercel connect create slack --triggers
vercel connect attach <uid> --triggers --trigger-path /eve/v1/slack --yes
```

`--triggers` enables Slack Event Subscriptions — without it, `app_mention` and `message.im` events never arrive.

---

## Inbound Dispatch

The channel exposes three dispatch hooks that decide whether an incoming Slack event starts (or continues) a session. Each hook returns:

- `{ auth }` — dispatch to the agent
- `null` — drop the event silently
- `{ auth, context }` — dispatch, injecting extra background context for the model

```typescript
// agent/channels/slack.ts
import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR ?? "slack/my-agent"),

  // app_mention events. Default behavior: derive workspace-scoped auth
  // and post a "Thinking…" indicator.
  async onAppMention(ctx, message) {
    // Example: only respond in a specific channel
    if (message.channelId !== "C0123456789") return null;
    return { auth: { workspaceId: message.teamId } };
  },

  // message.im events (requires the im:history bot scope).
  // Bot messages and message edits are filtered before this hook runs.
  async onDirectMessage(ctx, message) {
    return {
      auth: { workspaceId: message.teamId },
      context: "This is a private DM conversation. Be concise.",
    };
  },

  // block_actions not consumed by human-in-the-loop prompts.
  async onInteraction(action, ctx) {
    return { auth: { workspaceId: action.teamId } };
  },
});
```

**Speaker attribution:** the triggering Slack user's ID is attached to the model message automatically, so in multi-user threads the model knows who said what. You don't need to prepend usernames yourself.

---

## Custom Event Handlers

Beyond dispatch, the channel accepts an `events` map for reacting to runtime stream events. Each handler receives `(eventData, channel, ctx)`, where `channel` provides `channel.thread` (post, mention helpers) and `channel.slack` (API handle).

```typescript
export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR ?? "slack/my-agent"),
  events: {
    "message.completed"(eventData, channel, ctx) {
      // Skip intermediate turns that ended in tool calls
      if (eventData.finishReason === "tool-calls") return;
      if (eventData.message) channel.thread.post(eventData.message);
    },
  },
});
```

Useful stream events include `session.started`, `actions.requested`, `action.result`, `message.completed`, and `session.completed`. Rich tool outputs are a good fit here: give a tool a `toModelOutput` projection so the model sees a compact summary, while your event handler receives the full output on `action.result` and renders it in Slack.

---

## Thread Context

By default the agent sees only the triggering message. Enable `threadContext` to load prior thread messages into the session:

```typescript
export default slackChannel({
  credentials: connectSlackCredentials(process.env.SLACK_CONNECTOR ?? "slack/my-agent"),
  threadContext: { since: "last-agent-reply" },
});
```

`since` options:

| Value | Behavior |
|-------|----------|
| `"thread-root"` | All prior messages in the thread (default when `threadContext` is enabled) |
| `"last-agent-reply"` | Only messages since the agent last replied (incremental) |
| `(message: SlackThreadMessage) => boolean` | Custom cutoff — includes the messages **after the last one the predicate matches** |

**Caveats:**

- Costs one `conversations.replies` API call per triggering reply.
- Requires the matching history scope on the connector (`channels:history`, `groups:history`, or `im:history` depending on where the thread lives).
- For custom filtering beyond a predicate, use `loadThreadContextMessages` directly.

---

## Typing Indicators & Delivery

The channel manages the delivery lifecycle automatically — no refresh loops or manual acks:

1. **"Thinking…"** posts as soon as an inbound event dispatches.
2. **"Working…"** replaces it on `turn.started`.
3. **Reasoning snippets** stream in on `reasoning.appended`, so users see what the agent is doing.
4. **Action labels** show on `actions.requested` when the agent calls tools.

If the model narrates before a tool call ("Let me check the weather…"), that narration takes precedence over the generic action label.

**Batching:** reasoning deltas shorter than 4 characters batch on a five-second refresh, avoiding a Slack API request per token.

---

## Mentions

Use Slack's mention syntax or the thread helper — a bare `@name` stays literal text:

```typescript
// In an event handler
channel.thread.post(`<@${userId}> your report is ready.`);

// Or with the helper
channel.thread.post(`${channel.thread.mentionUser(userId)} your report is ready.`);
```

---

## Human-in-the-Loop

When the agent needs approval or input (e.g. a tool gated with `approval` from `eve/tools/approval`), the prompt renders as Slack buttons or select menus in the thread. The user's response resumes the parked session durably — the session survives redeploys and cold starts while waiting.

**Sign-in challenges** (OAuth URLs, device codes from Connect-brokered connections) are sent **ephemerally** to the triggering user — never posted publicly. A public status message posts in-thread and updates when `authorization.completed` fires.

HITL handler context deliberately offers a narrow surface:

- `postEphemeral` — message visible only to the triggering user
- `postDirectMessage` — DM the user (requires the `im:write` bot scope)
- `state` — carry data across the park/resume boundary

There is **no public `post` and no raw API access** in HITL handlers — this keeps approval flows from accidentally leaking prompts or secrets into channels.

---

## Raw Slack API Access

For anything the channel doesn't cover (reactions, pins, custom messages):

**Inside channel handlers** — use the context handle:

```typescript
events: {
  async "session.completed"(eventData, channel, ctx) {
    await ctx.slack.request("reactions.add", {
      channel: eventData.channelId,
      timestamp: eventData.messageTs,
      name: "white_check_mark",
    });
  },
},
```

**Outside handlers** (schedules, tools, hooks) — resolve a token and call the API directly:

```typescript
import { callSlackApi, resolveSlackBotToken } from "eve/channels/slack";

const botToken = await resolveSlackBotToken(credentials);
await callSlackApi({
  botToken,
  operation: "chat.postMessage",
  body: { channel: "C0123456789", text: "Scheduled report is ready." },
});
```

**Form encoding:** `callSlackApi` form-encodes request bodies. Slack's JSON support is partial across its API surface, so form encoding is the safe default — don't hand-roll JSON `fetch` calls against Slack methods that don't accept them.

---

## Proactive Sessions

Schedules (and other non-Slack triggers) can start a session that delivers into Slack via `receive`:

```typescript
// inside a schedule's run (see https://eve.dev/docs/schedules for schedule definitions)
import slack from "../channels/slack";

await receive(slack, {
  message: "Generate the daily metrics report and summarize anything unusual.",
  target: { channelId: "C0123456789" },
  auth: { workspaceId },
});
```

- Without a `threadTs`, the session gets a **temporary continuation token**; the agent's first post anchors a new thread, and follow-ups in that thread continue the session.
- `initialMessage` (optionally a `Card`) lets you post an opener before the agent's output.
- **`initialMessage` and `threadTs` are mutually exclusive** — either open a new thread with an opener, or join an existing thread, not both.

---

## Message Formatting (mrkdwn)

Slack uses its own markdown variant called mrkdwn.

### Text Formatting
```
*bold text*
_italic text_
~strikethrough~
`inline code`
```code block```
> blockquote
```

### Links and Mentions
```
<https://example.com|Link Text>
<@U12345678>              # User mention
<#C12345678>              # Channel link
<!here>                   # @here mention
<!channel>                # @channel mention
<!date^1234567890^{date_short}|fallback>  # Date formatting
```

### Lists
```
Slack doesn't support markdown lists, use:
* Bullet point (use the actual bullet character)
1. Numbered manually
```

---

## Webhook Delivery & Verification

Slack never calls your deployment directly. The flow is:

1. Slack delivers events to Vercel Connect's intake URL.
2. Connect verifies the event with Slack (signature, timestamp).
3. Connect POSTs the event to your registered trigger path (`/eve/v1/slack`).
4. The channel's `webhookVerifier` confirms each forwarded request genuinely came from Connect before it reaches your handlers.

Consequences:

- **No signature checks in your code.** Don't set `SLACK_SIGNING_SECRET` — omitting it entirely avoids mixing verification modes.
- **HTTP-only forwarding** — no Socket Mode.
- **Deployments only** — Connect forwards to preview/production deployments, never localhost.

### Idempotent Handlers

Connect provides **no delivery de-duplication** — the same Slack event can arrive more than once. Combined with eve's durability model (a step interrupted mid-execution re-runs on resume), side-effecting handlers must be idempotent. A simple pattern is tracking processed event IDs:

```typescript
async onAppMention(ctx, message) {
  const seen = await markEventProcessed(message.eventId); // e.g. INSERT ... ON CONFLICT
  if (!seen.isNew) return null; // duplicate delivery — drop
  return { auth: { workspaceId: message.teamId } };
},
```

### Content Type Reference

| Event Type | Content-Type | Handled Automatically |
|------------|--------------|----------------------|
| Slash commands | `application/x-www-form-urlencoded` | Yes |
| Events API | `application/json` | Yes |
| Interactivity | `application/x-www-form-urlencoded` (JSON in the `payload` field) | Yes |
| URL verification | `application/json` | Yes |

---

## Error Handling

Map Slack API error codes to user-friendly messages instead of surfacing raw errors:

```typescript
events: {
  async "session.completed"(eventData, channel, ctx) {
    try {
      await ctx.slack.request("chat.postMessage", {
        channel: targetChannelId,
        text: summary,
      });
    } catch (error) {
      console.error("Slack post failed:", error);
      let userMessage = "Something went wrong. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("channel_not_found")) {
          userMessage = "I don't have access to that channel.";
        } else if (error.message.includes("not_in_channel")) {
          userMessage = "Please invite me to the channel first.";
        }
      }
      channel.thread.post(userMessage);
    }
  },
},
```

Common Slack error codes:

| Code | Meaning | Fix |
|------|---------|-----|
| `channel_not_found` | Bot can't see the channel | Check the channel ID; private channels need an invite |
| `not_in_channel` | Bot isn't a member | Invite the bot to the channel |
| `rate_limited` | Too many API calls | Back off and retry after the `Retry-After` interval |

### Troubleshooting

- **No reply to @mentions** — invite the bot to the channel and confirm the deployment finished. Remember: the Slack surface only works against a deployment, not `eve dev`.
- **Stuck on "Working…"** — inspect logs with `npx eve dev --logs all`, or `/loglevel all` in the TUI.

---

## Best Practices Summary

1. **Handle errors gracefully** with user-friendly messages
2. **Use ephemeral messages** for sensitive or temporary information (sign-in challenges already are)
3. **Log errors** with context for debugging
4. **Use threads** to keep channels clean — the channel replies in-thread by default
5. **Respect rate limits** — back off on `rate_limited` and let the channel's built-in batching handle streaming updates
6. **Keep handlers idempotent** — Connect does not de-duplicate deliveries, and interrupted steps re-run
7. **Request minimum bot scopes** on the connector; add `im:history` for DMs and `im:write` for HITL direct messages only if you use them
8. **Never store Slack tokens** — `SLACK_CONNECTOR` is the only Slack env var; Connect issues short-lived tokens at runtime
9. **Return `null` from dispatch hooks** to drop unwanted events instead of dispatching and ignoring
10. **Use `toModelOutput`** to keep bulky tool outputs out of model context while still rendering them richly in Slack
