---
name: use-mastra
description: 'Answer questions about the Mastra AI framework and help build agents, workflows, tools, memory, and RAG features. Use when developers: (1) ask about Mastra APIs like `Mastra`, `Agent`, `createWorkflow`, `createTool`, `createStep`, `Memory`, or run the `mastra` CLI; (2) wire up agents, workflows, or step-based orchestration; (3) integrate `@mastra/*` packages (`@mastra/core`, `@mastra/memory`, `@mastra/rag`, `@mastra/evals`, `@mastra/deployer`, `@mastra/server`, `@mastra/pg`, `@mastra/libsql`, `@mastra/mcp`); (4) debug TypeScript errors from Mastra APIs or model-router strings. Triggers on: "Mastra", "@mastra/core", "mastra agent", "mastra workflow", "createWorkflow", "createTool", "createStep", "mastra memory", "semantic recall", "mastra rag", "mastra deployer", "mastra evals", "mastra studio", "provider/model".'
---

## Prerequisites

Before writing Mastra code, verify the relevant package is installed in the current project:

```bash
ls node_modules/mastra 2>/dev/null          # CLI + project scaffolding + platform API
ls node_modules/@mastra/ 2>/dev/null        # scoped packages (core, memory, rag, ...)
```

If the needed package is missing, install **only** what the task requires using the project's package manager (detect via lockfile):

```bash
# root CLI / platform (only when invoking `mastra dev`, `mastra build`, etc.)
pnpm add mastra        # or: bun add mastra / npm i mastra / yarn add mastra

# scoped packages — add what you actually use
pnpm add @mastra/core @mastra/memory @mastra/rag
```

Do not install packages you do not yet need. Mastra is opinionated about module format — confirm TypeScript target before writing: `target: ES2022`, `module: ES2022`, `moduleResolution: bundler`.

## Critical: Do Not Trust Internal Knowledge

Mastra evolves rapidly. Constructor signatures, exported symbol names, workflow step APIs, memory option shapes, and model-router providers shift between minor versions. Training-data recollection of Mastra APIs is likely wrong.

When working with Mastra:

1. Resolve the installed version first (`node_modules/<pkg>/package.json`).
2. Read the SKILL.md shipped *inside that version* at `node_modules/<pkg>/dist/docs/SKILL.md` before coding.
3. Verify every constructor, export, and option against `dist/docs/references/*.md` or `dist/docs/assets/SOURCE_MAP.json`.
4. Run typecheck after every change — Mastra APIs are type-heavy and silent drift is rare.
5. Never invent provider strings, plugin names, or adapter imports. Enumerate first.
6. Surface deprecations to the user instead of silently picking one pattern.

If documentation cannot be found locally or remotely to back an answer, say so explicitly.

## Finding Documentation

### Bundled docs in `node_modules/`

Every Mastra package that ships documentation places it at `<pkg>/dist/docs/`:

```
node_modules/<pkg>/dist/docs/
├── SKILL.md                       # package overview + links
├── assets/SOURCE_MAP.json         # export → source file mapping
└── references/                    # one .md per topic or exported symbol
    ├── docs-<topic>.md            # concept guides
    └── reference-<symbol>.md      # API reference
```

Packages confirmed to ship `dist/docs/` (v1.6.2 / core 1.27.0 as of 2026-04):

| Package | What it covers |
| --- | --- |
| `mastra` | CLI commands (`mastra dev`, `mastra build`), platform REST API |
| `@mastra/core` | `Mastra`, `Agent`, `createTool`, `createWorkflow`, `createStep`, processors, guardrails, browser/editor |
| `@mastra/memory` | `Memory`, threads, working memory, semantic recall, storage |
| `@mastra/rag` | `MDocument`, chunking, embeddings, retrieval, GraphRAG, rerankers |
| `@mastra/evals` | Scorers, datasets, experiments, CI harness |
| `@mastra/deployer`, `@mastra/server` | Build / deploy / serve Mastra projects |
| `@mastra/pg`, `@mastra/libsql`, `@mastra/mcp` | Storage adapters, MCP server integration |

See [`references/packages.md`](references/packages.md) for purpose + SKILL path per package, plus which packages currently lack bundled docs (remote-only).

### Canonical lookup flow

```bash
# 1. Start from the overview shipped with the installed version
cat node_modules/@mastra/core/dist/docs/SKILL.md

# 2. Grep references/ for the topic or symbol
grep -rli "Agent" node_modules/@mastra/core/dist/docs/references/
grep -rli "createWorkflow" node_modules/@mastra/core/dist/docs/references/

# 3. Resolve an exported symbol back to its type definition
cat node_modules/@mastra/core/dist/docs/assets/SOURCE_MAP.json | jq '."Agent"'
cat node_modules/@mastra/core/dist/<path-from-source-map>
```

### Remote fallbacks

If the package is not installed, or a doc is missing from `dist/docs/`:

1. `https://mastra.ai/llms.txt` — index of current docs (fetch and grep).
2. `https://mastra.ai/docs/` — full documentation site.
3. The `@mastra/mcp-docs-server` MCP server (configured by this plugin in `plugin.json`) — returns the same docs over MCP tool calls.

Remote docs track `main` and may be ahead of the installed version; always prefer bundled docs when both are available.

## Mastra Package Map

Concise map of what each package exports and where its docs live. Full table with docs paths and verification notes: [`references/packages.md`](references/packages.md).

| Need | Package | Typical import |
| --- | --- | --- |
| `Mastra`, `Agent`, `createTool`, `createWorkflow`, `createStep` | `@mastra/core` | `@mastra/core`, `@mastra/core/agent`, `@mastra/core/workflows`, `@mastra/core/tools` |
| Threads, working memory, semantic recall | `@mastra/memory` | `@mastra/memory` |
| RAG pipeline — chunk, embed, retrieve, rerank | `@mastra/rag` | `@mastra/rag` |
| Scorers, datasets, experiments | `@mastra/evals` | `@mastra/evals` |
| Postgres / LibSQL storage + vectors | `@mastra/pg`, `@mastra/libsql` | `@mastra/pg`, `@mastra/libsql` |
| MCP server integration | `@mastra/mcp` | `@mastra/mcp` |
| CLI + Studio + platform API | `mastra` | `mastra` (dev dependency for CLI; runtime for platform clients) |
| Build & deploy | `@mastra/deployer`, `@mastra/server` | usually only invoked via CLI |

## Building Agents & Workflows

Concise recipes — each one ends with "verify against `dist/docs/` before shipping": [`references/agents-and-workflows.md`](references/agents-and-workflows.md).

Rules of thumb:

- **Agent vs Workflow.** Use `Agent` for open-ended tasks (research, chat, triage). Use `createWorkflow` + `createStep` for deterministic pipelines with a fixed shape and explicit state.
- **Register everything on `Mastra`.** Tools, agents, workflows, storage, and logger all hang off a single `Mastra` instance. Passing tools to an agent without also registering them on `Mastra` is a common bug.
- **Model strings.** Always `provider/model` (e.g. `openai/gpt-5.4`, `anthropic/claude-sonnet-4-5`). Never bare model IDs. The provider-registry script shipped with the existing `mastra` skill (`plugins/mastra/.agents/skills/mastra/scripts/provider-registry.mjs`) enumerates valid provider keys and current model names — run it before generating code that references a model.
- **`.commit()`** is required on workflows. Forgetting it is the #1 cause of `Cannot read property 'then' of undefined`.
- **`threadId` + `resourceId`** must be stable across turns for memory to persist.
- **Typecheck** after every change: `pnpm tsc --noEmit` (or `bun tsc --noEmit`, `npm run typecheck`).

## When Typecheck or Runtime Fails

Before searching source code, grep [`references/common-errors.md`](references/common-errors.md) for the failing symptom. It indexes the most frequent Mastra failure modes (ESM/CJS mismatch, tools registered but not called, memory without storage, semantic recall without a vector store, workflow missing `.commit()`, invalid model string, wrong `threadId`) against the canonical fix.

If the symptom is not listed:

```bash
# resolve the error string inside installed source
rg -n "error string fragment" node_modules/@mastra/core/dist
rg -n "error string fragment" node_modules/@mastra/<subpkg>/dist
```

## Relationship to the `mastra` skill

This plugin ships a separate, richer primer at `plugins/mastra/.agents/skills/mastra/SKILL.md` (v2.0.0, sourced from `mastra-ai/skills`). That skill is a **framework primer** — concepts, doc-lookup strategy, upgrade guides, migration notes, extensive common-errors coverage.

`use-mastra` is the **task-triggered workflow skill** — concise, trigger-heavy, focused on redirecting agents to version-accurate `dist/docs/` and stopping training-data hallucinations. The two are complementary; Claude Code will auto-activate whichever matches the task framing.

When in doubt, read the primer first (`plugins/mastra/.agents/skills/mastra/SKILL.md`) and use this skill's references for quick per-package lookup paths and concise recipes.

## References

- [`references/packages.md`](references/packages.md) — every Mastra package, its purpose, and the exact `dist/docs/` path to read
- [`references/agents-and-workflows.md`](references/agents-and-workflows.md) — canonical recipes: agent with tools + memory, workflow with steps, Mastra-instance registration
- [`references/common-errors.md`](references/common-errors.md) — symptom → cause → fix for the most frequent Mastra failures
