#!/usr/bin/env bash
set -euo pipefail

# Only inject graphify's always-on rules when this project actually has a graph.
# The context describes how to use graphify-out/, so it is irrelevant (and just
# noise) in sessions for projects that have never been graphified.
if [ ! -f "graphify-out/graph.json" ]; then
  exit 0
fi

CONTEXT_FILE="${CLAUDE_PLUGIN_ROOT}/hooks/claude-md.md"
[ -f "$CONTEXT_FILE" ] || exit 0
CONTEXT_CONTENT=$(cat "$CONTEXT_FILE")

if command -v jq >/dev/null 2>&1; then
  jq -n --arg context "$CONTEXT_CONTENT" '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "additionalContext": $context
    }
  }'
else
  # Fallback: SessionStart hooks also accept raw stdout as additional context.
  printf '%s\n' "$CONTEXT_CONTENT"
fi
