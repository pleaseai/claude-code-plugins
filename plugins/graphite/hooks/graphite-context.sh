#!/usr/bin/env bash
# SessionStart hook: inject Graphite context when the repo uses Graphite.
#
# Detection rules (either triggers injection):
#   1. `.graphite_repo_config` exists inside the git common dir
#      (the real .git directory, resolved via `git rev-parse --git-common-dir`
#      so this also works inside `git worktree` checkouts and subdirectories).
#   2. `.please/config.yml` at the repo root sets `graphite.enabled: true`
#      — lets a project opt in before `gt init` has been run.

set -euo pipefail

# Not a git repo, or git not installed → nothing to do.
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null || true)"
if [ -z "$GIT_COMMON_DIR" ]; then
  exit 0
fi

# Resolve to absolute path (git may return a relative path like ".git").
if [ -d "$GIT_COMMON_DIR" ]; then
  GIT_COMMON_DIR="$(cd "$GIT_COMMON_DIR" && pwd)"
fi

GRAPHITE_CONFIG_FILE="$GIT_COMMON_DIR/.graphite_repo_config"
HAS_GRAPHITE_CONFIG=0
if [ -f "$GRAPHITE_CONFIG_FILE" ]; then
  HAS_GRAPHITE_CONFIG=1
fi

# Check `.please/config.yml` for `graphite.enabled: true` at the repo root.
# Parsed with awk to avoid a hard dependency on `yq` — matches the top-level
# `graphite:` key followed by an indented `enabled: true` before any other
# top-level key appears.
PLEASE_CONFIG_FILE=""
HAS_PLEASE_OPT_IN=0
GIT_TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$GIT_TOPLEVEL" ] && [ -f "$GIT_TOPLEVEL/.please/config.yml" ]; then
  PLEASE_CONFIG_FILE="$GIT_TOPLEVEL/.please/config.yml"
  if awk '
    /^graphite:[[:space:]]*(#.*)?$/ { in_graphite=1; next }
    /^[^[:space:]#]/                { in_graphite=0 }
    in_graphite && /^[[:space:]]+enabled:[[:space:]]*true([[:space:]]|#|$)/ {
      found=1; exit
    }
    END { exit !found }
  ' "$PLEASE_CONFIG_FILE"; then
    HAS_PLEASE_OPT_IN=1
  fi
fi

if [ "$HAS_GRAPHITE_CONFIG" -eq 0 ] && [ "$HAS_PLEASE_OPT_IN" -eq 0 ]; then
  exit 0
fi

# Build a short, accurate detection note for the injected context.
if [ "$HAS_GRAPHITE_CONFIG" -eq 1 ] && [ "$HAS_PLEASE_OPT_IN" -eq 1 ]; then
  DETECTION_NOTE="\`.graphite_repo_config\` detected at \`$GRAPHITE_CONFIG_FILE\`; also opted in via \`graphite.enabled: true\` in \`$PLEASE_CONFIG_FILE\`"
elif [ "$HAS_GRAPHITE_CONFIG" -eq 1 ]; then
  DETECTION_NOTE="\`.graphite_repo_config\` detected at \`$GRAPHITE_CONFIG_FILE\`"
else
  DETECTION_NOTE="opted in via \`graphite.enabled: true\` in \`$PLEASE_CONFIG_FILE\` (run \`gt init\` if not already initialized)"
fi

# Detect whether the `gt` CLI is on PATH so we can tailor the guidance.
if command -v gt >/dev/null 2>&1; then
  GT_NOTE="\`gt\` CLI is available on PATH."
else
  GT_NOTE="\`gt\` CLI is **not installed**. Install it before driving Graphite: \`brew install withgraphite/tap/graphite\` or \`npm i -g @withgraphite/graphite-cli\`, then \`gt auth\`."
fi

# Keep the injected context short — the \`graphite\` skill covers the full
# mental model and command reference. This hook just flags the repo type
# at session start so Claude reaches for \`gt\` (not raw \`git\`) immediately.
CONTEXT=$(cat <<EOF
This repository is configured for **Graphite stacked PRs** ($DETECTION_NOTE).

- Prefer \`gt\` over raw \`git\` for branch creation, rebasing, and pushes. Plain \`git\` is still fine for staging, diffing, logs, and inspection.
- Never run \`git rebase\` on a tracked branch — it wipes Graphite metadata. Use \`gt modify\`, \`gt restack\`, or \`gt move\` instead.
- The \`graphite:graphite\` skill (background, auto-activating) carries the full workflow — golden path, conflict resolution, worktrees, multi-trunk. It will load itself once stacked-PR work appears in context.

$GT_NOTE
EOF
)

# Emit as SessionStart additionalContext. Claude Code accepts BOTH forms:
#   - JSON `{hookSpecificOutput: {hookEventName, additionalContext}}` (preferred,
#     same convention as the repo-level hooks/context.sh)
#   - Plain stdout (treated verbatim as additionalContext)
# We prefer JSON when `jq` is available and fall back to plain stdout otherwise
# — both are valid hook outputs, this is graceful degradation, not a contract
# violation.
if command -v jq >/dev/null 2>&1; then
  jq -n --arg context "$CONTEXT" '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "additionalContext": $context
    }
  }'
else
  printf '%s\n' "$CONTEXT"
fi
