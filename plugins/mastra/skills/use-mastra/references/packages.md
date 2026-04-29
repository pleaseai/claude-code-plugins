# Mastra Package Map

Purpose: one row per Mastra-shipped npm package, with the canonical `dist/docs/` path to read before writing code against it, and whether the package currently bundles documentation or is remote-only.

Verify the installed version (not the latest published) by reading each package's own `package.json` — `dist/docs/` always reflects the version *installed in the consumer's `node_modules/`*, not the version that shipped these pages.

## Packages that ship `dist/docs/SKILL.md`

| Package | Purpose | SKILL path (relative to consumer's `node_modules/`) |
| --- | --- | --- |
| `mastra` | CLI (`mastra dev`, `mastra build`, `mastra start`), project scaffolding, platform REST API reference | `mastra/dist/docs/SKILL.md` |
| `@mastra/core` | Framework core: `Mastra` instance, `Agent`, `createTool`, `createWorkflow`, `createStep`, processors, guardrails, supervisor agents, channels, structured output, browser + editor APIs | `@mastra/core/dist/docs/SKILL.md` |
| `@mastra/memory` | `Memory` class, threads, message history, working memory, observational memory, semantic recall, storage binding | `@mastra/memory/dist/docs/SKILL.md` |
| `@mastra/rag` | `MDocument`, chunking strategies, embeddings, retrieval, reranking, GraphRAG, vector-query tool | `@mastra/rag/dist/docs/SKILL.md` |
| `@mastra/evals` | Scorers (custom + built-in), datasets, experiments, CI-friendly evals harness | `@mastra/evals/dist/docs/SKILL.md` |
| `@mastra/deployer` | Build / package Mastra projects for deployment | `@mastra/deployer/dist/docs/SKILL.md` |
| `@mastra/server` | HTTP handlers and server runtime used by `mastra dev` and production deployments | `@mastra/server/dist/docs/SKILL.md` |
| `@mastra/pg` | Postgres storage + vector adapter | `@mastra/pg/dist/docs/SKILL.md` |
| `@mastra/libsql` | LibSQL / SQLite storage + vector adapter | `@mastra/libsql/dist/docs/SKILL.md` |
| `@mastra/mcp` | MCP (Model Context Protocol) server integration | `@mastra/mcp/dist/docs/SKILL.md` |

Each package's `dist/docs/` contains a `references/` directory with per-topic and per-symbol markdown files, and an `assets/SOURCE_MAP.json` that maps exported symbols to their compiled type-definition files (`*.d.ts`).

## Packages without bundled docs (remote-only)

| Package | Purpose | Where to read |
| --- | --- | --- |
| `@mastra/observability` | Tracing, scoring telemetry, OTLP exporters | `https://mastra.ai/docs/observability` or `https://mastra.ai/llms.txt` |

Other `@mastra/*` packages exist (framework adapters, auxiliary storage drivers, voice providers, etc.). If a package you care about is not listed here, run `npm pack <pkg> --dry-run --json | jq '.[0].files[].path' | grep -i docs` to confirm whether it ships `dist/docs/`. If nothing matches, treat it as remote-only.

## Verifying at runtime

```bash
# List every @mastra/* package installed in the consumer project
ls node_modules/@mastra/

# Check whether a specific one bundles docs
test -f node_modules/@mastra/core/dist/docs/SKILL.md && echo "core ships docs" || echo "core: remote-only"

# Read its index
cat node_modules/@mastra/core/dist/docs/SKILL.md

# List every topic / symbol it covers
ls node_modules/@mastra/core/dist/docs/references/
```

## Cross-package topic duplication

Some topics (agent approval, supervisor agents, agent networks) appear in multiple packages' `references/` directories (e.g. in both `@mastra/core` and `@mastra/memory`) because they touch multiple subsystems. When a doc exists in more than one place, prefer the copy shipped by the package whose API you are calling — that copy matches the installed version of that package.

## SKILL.md naming note

Each package's bundled `SKILL.md` sets `name:` to a package-specific value (e.g. `name: mastra`, `name: mastra-core`, `name: mastra-memory`). These are intended to be read as reference documentation, not loaded as Claude Code skills, so they do not collide with the `mastra` and `use-mastra` skills installed in this plugin.
