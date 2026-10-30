---
name: claude-code-docs
description: Answer questions about Claude Code (features, hooks, plugins, skills, MCP, Agent SDK, settings, CLI) from the official docs. Uses the ask CLI to resolve a version-pinned local mirror and csp for semantic search, falling back to grep and WebFetch. Use when the user asks how Claude Code works, what a configuration field does, or whether Claude Code supports something.
argument-hint: [question]
arguments: [question]
---

Answer this question about Claude Code using the official documentation:

**$question**

## How to find the answer

Work through these steps, falling back gracefully when a tool is missing.

### 1. Resolve the docs mirror

```bash
DOCS="$(ask src github:pleaseai/claude-code-docs)/docs"
```

`ask src` prints the root of a cached checkout of the docs mirror (clones on first use). If the `ask` CLI is not on PATH, run it via npx/bunx instead:

```bash
DOCS="$(npx -y @pleaseai/ask src github:pleaseai/claude-code-docs)/docs"
```

Only fall back to step 4 (WebFetch) when neither works, such as offline sandboxes without npm registry access.

### 2. Search for relevant pages

Prefer semantic search with csp, scoped to the per-page markdown:

```bash
csp search "$question" "$DOCS" --content docs --top-k 8
```

Or equivalently via ask (requires csp on PATH):

```bash
ask search github:pleaseai/claude-code-docs "$question" --content docs --top-k 8
```

If csp is not on PATH, run it via npx/bunx:

```bash
npx -y @pleaseai/csp search "$question" "$DOCS" --content docs --top-k 8
```

If that fails too, fall back to grep over the mirror — search for 2-3 distinct keyword variants, not one long phrase:

```bash
grep -ril "<keyword>" "$DOCS"
```

The manifest at `$DOCS/../llms.txt` lists every page with a one-line summary; reading it is a fast way to shortlist pages when keyword search is noisy.

### 3. Read and answer

Read the top matching pages (whole pages — they are small). Ground every claim in what the pages actually say:

- Answer in the user's language; keep code identifiers, field names, and flags verbatim.
- Cite each source page with its canonical URL: a mirror file `$DOCS/hooks.md` corresponds to `https://code.claude.com/docs/en/hooks`.
- Quote exact field names, JSON shapes, and version requirements (`min-version` markers) when they matter.
- If the docs do not answer the question, say so explicitly — do not fill gaps from memory.

### 4. Fallback: WebFetch

If the `ask` CLI is unavailable, fetch `https://code.claude.com/docs/llms.txt`, pick the relevant page URLs from the manifest, and fetch each as `<page-url>.md` (this plugin's hook rewrites page URLs to `.md` automatically). Then answer as in step 3.
