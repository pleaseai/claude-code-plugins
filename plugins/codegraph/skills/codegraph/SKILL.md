---
name: Navigating Codebases with CodeGraph
description: Query a pre-indexed knowledge graph of a codebase (symbols, call graphs, dependencies, impact) instead of scanning files with grep/glob/Read. Use when exploring an unfamiliar codebase, tracing who calls or is called by a function, assessing the blast radius of a change, finding where a symbol is defined or used, or answering architecture questions. Triggers on mentions of code navigation, call graph, callers, callees, impact analysis, symbol search, or understanding code structure.
allowed-tools: mcp__codegraph__codegraph_search, mcp__codegraph__codegraph_explore, mcp__codegraph__codegraph_callers, mcp__codegraph__codegraph_callees, mcp__codegraph__codegraph_impact, mcp__codegraph__codegraph_node, mcp__codegraph__codegraph_status, mcp__codegraph__codegraph_files
---

# CodeGraph - Local Code Intelligence

CodeGraph gives you a pre-indexed knowledge graph of the current project — symbol
relationships, call graphs, and code structure — so you can answer questions
instantly instead of consuming tokens scanning files with grep, glob, and Read.

## When to Use

**First check:** CodeGraph applies only in repositories it has indexed — a
`.codegraph/` directory exists at the repo root. If there is no `.codegraph/`
directory, skip CodeGraph entirely; indexing is the user's decision (suggest
`codegraph init` only if they want it).

In an indexed repo, reach for CodeGraph **before** grep/find or reading files when
you need to understand or locate code:

- **Explore / answer most code questions** in one call → `codegraph_explore`
  (returns the relevant symbols' verbatim source plus the call paths between them)
- **Inspect one symbol** (source + callers) or read a whole file with line numbers
  → `codegraph_node`
- **Search** for a symbol, type, or concept by name/intent → `codegraph_search`
- **Trace callers** — who invokes this function/method? → `codegraph_callers`
- **Trace callees** — what does this function call? → `codegraph_callees`
- **Assess impact / blast radius** of changing a symbol → `codegraph_impact`
- **List indexed files** in the project → `codegraph_files`
- **Check index health / freshness** → `codegraph_status`

## How to Use

1. For broad questions ("how does X work?", "where is auth handled?"), start with
   `codegraph_explore` — it answers most code questions in a single call.
2. To navigate relationships from a known symbol, use `codegraph_node`, then
   `codegraph_callers` / `codegraph_callees`.
3. Before refactoring or renaming, run `codegraph_impact` to find everything affected.
4. If the MCP tools are listed but deferred, load them by name via tool search.
5. **Shell fallback (always works):** `codegraph explore "<symbols or question>"`
   and `codegraph node <symbol-or-file>` print the same output as the MCP tools —
   useful for subagents or harnesses without an MCP client.
6. If a tool response shows a `⚠️` staleness banner naming a file, `Read` that file
   directly for live content — it was edited within the sync debounce window.

## Important Notes

- **Indexing is per-project**, signalled by the `.codegraph/` directory. No
  `.codegraph/` → don't call CodeGraph tools.
- **100% local.** No code leaves the machine; the server bundles its own runtime.
- The index auto-syncs on file changes via a native file watcher, so results stay
  current as the codebase evolves.
