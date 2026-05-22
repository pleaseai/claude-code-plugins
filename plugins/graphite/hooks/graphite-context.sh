#!/usr/bin/env bash
# SessionStart hook: inject Graphite context when the repo uses Graphite.
#
# Detection rules (either triggers injection):
#   1. `.graphite_repo_config` exists inside the git common dir
#      (the real .git directory, resolved via `git rev-parse --git-common-dir`
#      so this also works inside `git worktree` checkouts and subdirectories).
#   2. `.please/config.yml` at the repo root opts in via:
#         workflow:
#           stacked_pr:
#             enabled: true
#             tool: graphite
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

# Check `.please/config.yml` for the Graphite opt-in at the repo root:
#   workflow:
#     stacked_pr:
#       enabled: true
#       tool: graphite
# Parsed with awk to avoid a hard dependency on `yq` — walks the top-level
# `workflow:` block, descends into its `stacked_pr:` child, and requires
# both `enabled: true` and `tool: graphite` before the block ends.
PLEASE_CONFIG_FILE=""
HAS_PLEASE_OPT_IN=0
GIT_TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$GIT_TOPLEVEL" ] && [ -f "$GIT_TOPLEVEL/.please/config.yml" ]; then
  PLEASE_CONFIG_FILE="$GIT_TOPLEVEL/.please/config.yml"
  if awk '
    /^workflow:[[:space:]]*(#.*)?$/ { in_workflow=1; child_indent=0; in_stacked=0; stacked_child_indent=0; found_enabled=0; found_tool=0; next }
    /^[^[:space:]#]/                { in_workflow=0; child_indent=0; in_stacked=0; stacked_child_indent=0; found_enabled=0; found_tool=0 }
    in_workflow && /^[[:space:]]*($|#)/ { next }
    in_workflow {
      match($0, /^[[:space:]]*/)
      indent=RLENGTH
      if (child_indent==0) child_indent=indent
      if (indent < child_indent) { in_workflow=0; child_indent=0; in_stacked=0; stacked_child_indent=0; found_enabled=0; found_tool=0; next }
      if (in_stacked) {
        if (stacked_child_indent==0) stacked_child_indent=indent
        if (indent < stacked_child_indent) { in_stacked=0; stacked_child_indent=0 }
        else if (indent == stacked_child_indent) {
          if ($0 ~ /^[[:space:]]+enabled:[[:space:]]*true([[:space:]]|#|$)/) found_enabled=1
          if ($0 ~ /^[[:space:]]+tool:[[:space:]]*graphite([[:space:]]|#|$)/) found_tool=1
          if (found_enabled && found_tool) { found=1; exit }
        }
      }
      if (indent == child_indent && $0 ~ /^[[:space:]]+stacked_pr:[[:space:]]*(#.*)?$/) {
        in_stacked=1
        stacked_child_indent=0
        found_enabled=0
        found_tool=0
      }
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
  DETECTION_NOTE="\`.graphite_repo_config\` detected at \`$GRAPHITE_CONFIG_FILE\`; also opted in via \`workflow.stacked_pr.tool: graphite\` in \`$PLEASE_CONFIG_FILE\`"
elif [ "$HAS_GRAPHITE_CONFIG" -eq 1 ]; then
  DETECTION_NOTE="\`.graphite_repo_config\` detected at \`$GRAPHITE_CONFIG_FILE\`"
else
  DETECTION_NOTE="opted in via \`workflow.stacked_pr.tool: graphite\` in \`$PLEASE_CONFIG_FILE\` (run \`gt init\` if not already initialized)"
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
