# Common Errors

Symptom → cause → fix for the most frequent Mastra failure modes. Grep this file by error-message fragment before searching source.

For longer narrative coverage, see the sibling skill's reference at `../../mastra/references/common-errors.md`.

## `Cannot find module '@mastra/core'` / `Cannot use import statement outside a module`

**Cause.** Mastra requires native ES modules. CommonJS `tsconfig.json` or a missing `"type": "module"` in `package.json` breaks the import graph.

**Fix.**

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

```jsonc
// package.json
{ "type": "module" }
```

## `Property 'tools' does not exist on type 'Agent'` / `Property 'X' does not exist on type 'AgentConfig'`

**Cause.** The API changed between Mastra versions; training data is stale.

**Fix.** Read the SKILL.md and reference shipped with the installed version, not memory:

```bash
cat node_modules/@mastra/core/dist/docs/SKILL.md
cat node_modules/@mastra/core/dist/docs/assets/SOURCE_MAP.json | jq '."Agent"'
cat node_modules/@mastra/core/dist/<path-from-SOURCE_MAP>
```

## Agent replies "I don't have access to that tool" even though a tool was defined

**Cause.** Tool created but not registered on the `Mastra` instance, or the key used in `agent.tools` doesn't match the key used in `mastra.tools`.

**Fix.** Register the tool in both places with the same key:

```ts
const mastra = new Mastra({
  agents: { supportAgent },
  tools: { weatherTool },     // same key as below
});

const supportAgent = new Agent({
  id: "support-agent",
  tools: { weatherTool },      // same key as above
  /* ... */
});
```

## `Cannot read property 'then' of undefined` when running a workflow

**Cause.** `.commit()` was not called on the workflow chain. Until `.commit()` runs, the workflow is a builder, not a runnable object.

**Fix.**

```ts
const workflow = createWorkflow({ /* ... */ })
  .then(step1)
  .then(step2)
  .commit();                    // REQUIRED

const run = await workflow.createRun();
await run.start({ inputData });
```

## Agent forgets previous messages across turns

**Cause.** One of: (a) no `storage` on `Memory`, (b) `threadId` differs between calls, (c) `resourceId` missing or changing.

**Fix.** Keep both IDs stable across a single user's conversation:

```ts
await agent.generate("…", {
  threadId: "user-42::support",
  resourceId: "user-42",
});
```

If `storage` is missing, instantiate one (e.g. `new PostgresStore({ connectionString })` from `@mastra/pg`, or `new LibSQLStore(...)` from `@mastra/libsql`) and pass it into `new Memory({ storage, ... })`.

## `Storage is required for Memory`

**Cause.** `new Memory({ })` was called without `storage`.

**Fix.** Always pass a storage adapter:

```ts
const memory = new Memory({
  id: "chat-memory",
  storage,                       // REQUIRED
  options: { lastMessages: 10 },
});
```

## Semantic recall returns only recent messages (no semantic hits)

**Cause.** `semanticRecall: true` enabled without `vector` + `embedder` configured.

**Fix.** Semantic recall needs all three:

```ts
const memory = new Memory({
  id: "semantic-memory",
  storage,
  vector: chromaVectorStore,     // REQUIRED
  embedder: openaiEmbedder,      // REQUIRED
  options: {
    lastMessages: 10,
    semanticRecall: true,        // REQUIRED
  },
});
```

## Tool input throws `ZodError: Expected X, received Y`

**Cause.** Tool invocation does not match `inputSchema`. Also — the field is `inputSchema`, not `parameters` (that's the AI SDK name).

**Fix.** Align the call site with the schema. If a field should be optional, mark it `z.X().optional()`.

## `Model 'gpt-4' not found` / `Invalid model format`

**Cause.** Model string missing the provider prefix.

**Fix.** Always use `provider/model`:

```ts
const agent = new Agent({ model: "openai/gpt-5.4" });         // ✅
const agent = new Agent({ model: "anthropic/claude-sonnet-4-5" }); // ✅
const agent = new Agent({ model: "gpt-4" });                   // ❌
```

Enumerate valid providers and current model names with the script shipped in the sibling skill:

```bash
node plugins/mastra/.agents/skills/mastra/scripts/provider-registry.mjs --list
node plugins/mastra/.agents/skills/mastra/scripts/provider-registry.mjs --provider openai
```

Never use model IDs from memory — they change frequently.

## `connect ECONNREFUSED` against Postgres / LibSQL

**Cause.** Database not running, wrong connection string, or `storage.init()` not called.

**Fix.**

1. Start the database (Docker, local process, managed service, …).
2. Verify `DATABASE_URL` / equivalent.
3. Call `await storage.init()` at app startup so schema tables exist.

## Tool suspension never resumes

**Cause.** `context.suspend(...)` called, but nothing later calls `run.resume({ resumeData })` or the resume payload doesn't match `resumeSchema`.

**Fix.** Define both schemas and resume with matching data:

```ts
const approvalTool = createTool({
  id: "approval",
  inputSchema: z.object({ request: z.string() }),
  suspendSchema: z.object({ requestId: z.string() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  execute: async ({ context }) => {
    if (!context.resumeData) {
      context.suspend({ requestId: crypto.randomUUID() });
      return;
    }
    return { approved: context.resumeData.approved };
  },
});

await run.resume({ resumeData: { approved: true } });
```

## When the symptom isn't listed

1. Grep the installed source for the exact error string:
   ```bash
   rg -n "error string fragment" node_modules/@mastra/core/dist
   rg -n "error string fragment" node_modules/@mastra/<subpkg>/dist
   ```
2. Check the bundled reference docs for the nearest API:
   ```bash
   ls node_modules/@mastra/<pkg>/dist/docs/references/
   ```
3. Fall back to `https://mastra.ai/docs` or the `@mastra/mcp-docs-server` MCP tool.
4. Verify all `@mastra/*` versions match: `pnpm list | grep @mastra/`. Version skew across the scope is a common silent cause.
