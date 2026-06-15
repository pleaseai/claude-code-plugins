#!/usr/bin/env bash
# Emit CodeGraph navigation guidance ONLY when the current project is indexed
# (a `.codegraph/` directory exists at the repo root). In an unindexed repo we
# stay silent — indexing is the user's decision, and an unconditional "this
# repo is indexed" claim would send subagents into failing codegraph calls.
#
# The wording mirrors CodeGraph's own marker-fenced instructions block, which
# exists because the MCP server's `initialize` instructions reach only the main
# agent — Task-tool subagents and non-MCP harnesses see this context instead.

if [ ! -d ".codegraph" ]; then
  exit 0
fi

cat <<'EOF'
## CodeGraph

This repository is indexed by CodeGraph (a `.codegraph/` directory exists). Reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tools** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them. `codegraph_node` returns one symbol's source + callers, or reads a whole file with line numbers. If the tools are listed but deferred, load them by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` and `codegraph node <symbol-or-file>` print the same output — useful for subagents or harnesses without an MCP client.
EOF
