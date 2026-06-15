#!/usr/bin/env bash
# Emit CodeGraph navigation guidance ONLY when the current project is indexed
# (a `.codegraph/` directory exists at the repo root). In an unindexed repo we
# stay silent — indexing is the user's decision, and an unconditional "this
# repo is indexed" claim would send subagents into failing codegraph calls.
#
# The wording mirrors CodeGraph's own marker-fenced instructions block, which
# exists because the MCP server's `initialize` instructions reach only the main
# agent — Task-tool subagents and non-MCP harnesses see this context instead.

# Locate the indexed root. A SessionStart hook usually runs at the repo root,
# but if the session starts in a subdirectory (common in monorepos) a bare CWD
# check would miss a `.codegraph/` at the root. Prefer the git repo root, fall
# back to an upward walk for `.codegraph/`, then the CWD.
root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$root" ]; then
  dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.codegraph" ]; then
      root="$dir"
      break
    fi
    dir="$(dirname "$dir")"
  done
fi
: "${root:=$PWD}"

if [ ! -d "$root/.codegraph" ]; then
  exit 0
fi

cat <<'EOF'
## CodeGraph

This repository is indexed by CodeGraph (a `.codegraph/` directory exists). Reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tools** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them. `codegraph_node` returns one symbol's source + callers, or reads a whole file with line numbers. If the tools are listed but deferred, load them by name via tool search.
- **Shell** (no MCP client needed): `npx -y @colbymchenry/codegraph explore "<symbol names or question>"` and `npx -y @colbymchenry/codegraph node <symbol-or-file>` print the same output — portable even without a global `codegraph` install (drop the `npx -y @colbymchenry/` prefix if the CLI is on your PATH).
EOF
