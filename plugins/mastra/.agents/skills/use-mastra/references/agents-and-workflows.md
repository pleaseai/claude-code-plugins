# Agents & Workflows Recipes

Concise, correctness-oriented recipes for the three most common Mastra building tasks. Each recipe ends with the lookup command to run against `dist/docs/` before shipping the code.

Assumes `@mastra/core` is installed. If not, install it first (see [`../SKILL.md`](../SKILL.md) § Prerequisites).

## Recipe 1 — Agent with tools + memory

```ts
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";
import { z } from "zod";

// 1. Tools — `inputSchema` / `outputSchema` are Zod; never call them `parameters`.
const weatherTool = createTool({
  id: "get-weather",
  description: "Look up current weather by city name.",
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ temperatureC: z.number(), condition: z.string() }),
  execute: async ({ context }) => {
    // fetch from your upstream service
    return { temperatureC: 21, condition: "clear" };
  },
});

// 2. Memory — storage is REQUIRED; so is an embedder + vector if you turn on semantic recall.
const storage = new PostgresStore({ connectionString: process.env.DATABASE_URL! });
const memory = new Memory({
  id: "chat-memory",
  storage,
  options: { lastMessages: 10 }, // set semanticRecall/vector/embedder together or not at all
});

// 3. Agent — bind the tool by the exact key used in Mastra.tools below.
export const supportAgent = new Agent({
  id: "support-agent",
  name: "Support agent",
  instructions: "Answer questions about weather and escalate anything else.",
  model: "openai/gpt-5.4", // always "provider/model" — never a bare ID
  tools: { weatherTool },
  memory,
});

// 4. Mastra instance — registering tools here is the step most often skipped.
export const mastra = new Mastra({
  agents: { supportAgent },
  tools: { weatherTool },
  storage,
});

// 5. Invocation — threadId + resourceId must be stable across turns for memory to persist.
await supportAgent.generate("What's the weather in Berlin?", {
  threadId: "user-42::support",
  resourceId: "user-42",
});
```

Verify against installed version before shipping:

```bash
cat node_modules/@mastra/core/dist/docs/references/docs-agents-overview.md
cat node_modules/@mastra/core/dist/docs/references/docs-agents-using-tools.md
cat node_modules/@mastra/memory/dist/docs/references/docs-memory-overview.md
```

## Recipe 2 — Workflow with steps

```ts
import { Mastra } from "@mastra/core";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const fetchUser = createStep({
  id: "fetchUser",
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({ userId: z.string(), email: z.string() }),
  execute: async ({ inputData }) => {
    // call your DB / API
    return { userId: inputData.userId, email: "user@example.com" };
  },
});

const sendEmail = createStep({
  id: "sendEmail",
  inputSchema: z.object({ userId: z.string(), email: z.string() }),
  outputSchema: z.object({ messageId: z.string() }),
  execute: async ({ inputData }) => {
    return { messageId: `msg_${inputData.userId}` };
  },
});

const notifyUserWorkflow = createWorkflow({
  id: "notify-user",
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({ messageId: z.string() }),
})
  .then(fetchUser)
  .then(sendEmail)
  .commit(); // REQUIRED — forgetting this yields "Cannot read property 'then' of undefined" at run time.

export const mastra = new Mastra({
  workflows: { notifyUserWorkflow },
});

// Invocation
const run = await notifyUserWorkflow.createRun();
const result = await run.start({ inputData: { userId: "u_123" } });
```

Verify against installed version before shipping:

```bash
ls node_modules/@mastra/core/dist/docs/references/ | grep -i workflow
cat node_modules/@mastra/core/dist/docs/references/reference-core-createWorkflow.md 2>/dev/null
cat node_modules/@mastra/core/dist/docs/references/reference-core-createStep.md 2>/dev/null
```

(The exact filenames differ per version — list the directory and pick the matching reference file.)

## Recipe 3 — RAG pipeline

```ts
import { Mastra } from "@mastra/core";
import { MDocument } from "@mastra/rag";

const doc = MDocument.fromText(sourceText);
const chunks = await doc.chunk({ strategy: "recursive", size: 512, overlap: 50 });

// Use your vector store's `upsert` + your embedder to persist the chunks; then wire a
// vector-query tool into an agent via `createTool` from @mastra/rag.
```

Verify against installed version before shipping:

```bash
cat node_modules/@mastra/rag/dist/docs/SKILL.md
cat node_modules/@mastra/rag/dist/docs/references/docs-rag-chunking-and-embedding.md
cat node_modules/@mastra/rag/dist/docs/references/reference-tools-vector-query-tool.md
```

## General verification commands

```bash
# Typecheck — Mastra APIs are type-heavy; silent drift is rare.
pnpm tsc --noEmit   # or: bun tsc --noEmit / npm run typecheck

# Interactive check — launch Studio, exercise the agent/workflow end-to-end.
pnpm mastra dev     # open http://localhost:4111
```

Do not ship code whose APIs you have not cross-checked against `node_modules/<pkg>/dist/docs/`. If a symbol, option, or import path differs between this recipe and the bundled docs, trust the bundled docs — they match the installed version.
