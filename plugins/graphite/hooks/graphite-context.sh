#!/usr/bin/env bash
# SessionStart hook: inject Graphite context when the repo uses Graphite.
#
# Detection rule: `.graphite_repo_config` exists inside the git common dir
# (the real .git directory, resolved via `git rev-parse --git-common-dir`
# so this also works inside `git worktree` checkouts and subdirectories).

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

CONFIG_FILE="$GIT_COMMON_DIR/.graphite_repo_config"
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0
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
This repository is configured for **Graphite stacked PRs** (\`.graphite_repo_config\` detected at \`$CONFIG_FILE\`).

- Prefer \`gt\` over raw \`git\` for branch creation, rebasing, and pushes. Plain \`git\` is still fine for staging, diffing, logs, and inspection.
- Never run \`git rebase\` on a tracked branch — it wipes Graphite metadata. Use \`gt modify\`, \`gt restack\`, or \`gt move\` instead.
- The \`graphite\` skill in this plugin has the full workflow (golden path, conflict resolution, worktrees, multi-trunk). Load it via the Skill tool when stacked-PR work begins.

$GT_NOTE
EOF
)

# Emit as SessionStart additionalContext (JSON form, same convention as the
# repo-level hooks/context.sh). Fall back to plain stdout if jq is missing.
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
