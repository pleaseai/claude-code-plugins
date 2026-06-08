---
name: semble
description: Semantic code search using the Semble CLI. Use when exploring an unfamiliar codebase, finding code by what it does rather than exact text, locating an implementation, understanding how a feature works, or discovering related code. Triggers on requests like "where is X handled", "find the code that does Y", "how does Z work", "search the codebase for", or any semantic/exploratory code question where grep's literal matching is a poor fit.
allowed-tools: Bash, Read
---

# Semble - Semantic Code Search

Semble finds code by **meaning**, not literal text. Describe what code does (or name a symbol) and Semble returns the most relevant chunks ranked by semantic similarity. It builds and caches an index automatically on first run and invalidates it when files change.

Prefer Semble over Grep/Glob for any exploratory or semantic question. Reserve grep for exhaustive literal matches or confirming an exact string.

## When to Use

- **Exploring an unfamiliar codebase**: "where is authentication handled?", "how does the caching layer work?"
- **Finding an implementation by intent**: "find the code that retries failed requests" — even when you don't know the function name.
- **Locating a symbol**: search by an identifier like `save_pretrained` and let Semble surface every relevant usage and definition.
- **Discovering related code**: given a known file and line, find structurally/semantically similar code elsewhere.

## How to Use

Run `semble` via `Bash`. If `semble` is not on `$PATH`, use `uvx --from "semble[mcp]" semble` in its place (requires [`uv`](https://docs.astral.sh/uv/)).

### Search by description or symbol

```bash
semble search "authentication flow" ./my-project
semble search "save_pretrained" ./my-project
semble search "save model to disk" ./my-project --top-k 10
```

Results are cached automatically on first run and invalidated when files change. `path` defaults to the current directory when omitted; git URLs are accepted.

### Widen the content scope

By default Semble searches code. Widen the scope when the answer may live elsewhere:

```bash
semble search "deployment guide" ./my-project --content docs    # documentation and prose
semble search "database host port" ./my-project --content config # config files (yaml, toml, ...)
semble search "authentication" ./my-project --content all        # code, docs, and config
```

### Find related code

Pass a `file_path` and `line` from a prior search result to discover similar implementations:

```bash
semble find-related src/auth.py 42 ./my-project
```

## Recommended Workflow

1. Start with `semble search` to find relevant chunks; the index is built and cached automatically.
2. Switch content scope to `docs`, `config`, or `all` when a code-only search misses the target.
3. Inspect full files (with `Read`) only when a returned chunk lacks enough context.
4. Use `semble find-related` on a promising result to explore connected implementations.
5. Fall back to grep only for exhaustive literal matching.

## Important Notes

- **`uv` is required** when running via `uvx`. Install `uv` if `semble` is not already on `$PATH`.
- Indexing happens on first search and is cached; subsequent searches are fast and refresh automatically when files change.
