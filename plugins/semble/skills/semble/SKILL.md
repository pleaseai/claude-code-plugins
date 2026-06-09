---
name: semble
description: Semantic code search using the Semble MCP server. Use when exploring an unfamiliar codebase, finding code by what it does rather than exact text, locating an implementation, understanding how a feature works, or discovering related code. Triggers on requests like "where is X handled", "find the code that does Y", "how does Z work", "search the codebase for", or any semantic/exploratory code question where grep's literal matching is a poor fit.
allowed-tools: mcp__semble__search, mcp__semble__find_related, Read
---

# Semble - Semantic Code Search

Semble finds code by **meaning**, not literal text. Describe what code does (or name a symbol) and Semble returns the most relevant chunks ranked by semantic similarity. It builds and caches an index automatically on first use and refreshes it when files change.

Prefer Semble over Grep/Glob/Read for any exploratory or semantic question. Reserve grep for exhaustive literal matches or confirming an exact string.

## When to Use

- **Exploring an unfamiliar codebase**: "where is authentication handled?", "how does the caching layer work?"
- **Finding an implementation by intent**: "find the code that retries failed requests" — even when you don't know the function name.
- **Locating a symbol**: search by an identifier like `save_pretrained` and let Semble surface every relevant usage and definition.
- **Discovering related code**: given a known file and line, find structurally/semantically similar code elsewhere.

## How to Use

This plugin provides the Semble MCP server, which exposes two tools.

### `mcp__semble__search`

Find relevant code with a natural-language or code query.

- `query` (required) — natural language or code, e.g. `"authentication flow"`, `"save model to disk"`, or a symbol like `save_pretrained`.
- `repo` (optional) — the project root to index. When working in a local project, pass the absolute project root. For remote code, pass an explicit `https://` git URL. **Never guess or infer URLs.**
- `top_k` (optional, default 5) — number of results to return.

The index is built on first use and cached for the session; it refreshes automatically when files change.

### `mcp__semble__find_related`

Find code semantically similar to a specific location — use after `search` to explore connected implementations or callers.

- `file_path` (required) — use the `file_path` from a prior `search` result.
- `line` (required) — 1-indexed line number from that result.
- `repo` (optional) — same as above.
- `top_k` (optional, default 5).

## Recommended Workflow

1. Start with `mcp__semble__search`, passing the project root as `repo`; the index builds and caches automatically.
2. Inspect full files (with `Read`) only when a returned chunk lacks enough context.
3. Use `mcp__semble__find_related` on a promising result to explore connected implementations.
4. Fall back to grep only for exhaustive literal matching.

## Important Notes

- The MCP server runs via `uvx --from "semble[mcp]" semble`, so [`uv`](https://docs.astral.sh/uv/) must be installed. No API key is required.
- The first search in a session indexes the repo (downloads a small embedding model on first ever run); subsequent searches are fast and refresh automatically when files change.
- Content scope (code vs. docs/config) is fixed at server launch. By default Semble indexes code; append `--content docs`, `--content config`, or `--content all` to the server args to widen it.
