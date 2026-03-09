#!/usr/bin/env bash
# RTK PreToolUse hook: delegates Bash command rewriting to `rtk rewrite`
# Falls back to `bunx @pleaseai/rtk` when rtk binary is not installed.
# Silently passes through if jq is not available.

set -euo pipefail

# Minimum required RTK version (native binary only)
RTK_MIN_VERSION="0.23.0"

# Passthrough: exit 0 means no changes, Claude uses the original input
passthrough() { exit 0; }

# Require jq for JSON parsing
command -v jq >/dev/null 2>&1 || passthrough

# Determine RTK command: prefer native binary, fall back to bunx
RTK_CMD=""
if command -v rtk >/dev/null 2>&1; then
  # Version guard for native binary: require rtk >= 0.23.0
  RTK_VERSION=$(rtk --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "0.0.0")
  version_gte() { printf '%s\n%s' "$2" "$1" | sort -V -C; }
  if version_gte "$RTK_VERSION" "$RTK_MIN_VERSION"; then
    RTK_CMD="rtk"
  fi
fi

if [ -z "$RTK_CMD" ]; then
  # Fall back to bunx @pleaseai/rtk (always latest, no version guard needed)
  if command -v bunx >/dev/null 2>&1; then
    RTK_CMD="bunx @pleaseai/rtk"
  else
    passthrough
  fi
fi

# Read hook input from stdin
INPUT=$(cat)

# Extract the command from tool_input
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && passthrough

# Delegate rewrite logic entirely to rtk
REWRITTEN=$($RTK_CMD rewrite "$CMD" 2>/dev/null || true)

# If no rewrite or command unchanged, passthrough
[ -z "$REWRITTEN" ] && passthrough
[ "$REWRITTEN" = "$CMD" ] && passthrough

# Rewrite command and auto-approve: RTK is a transparent proxy, so bypassing
# the permission prompt for rewritten commands is the intended behavior.
jq -n \
  --arg cmd "$REWRITTEN" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: "RTK rewrote command for token-efficient output", updatedInput: {command: $cmd}}}'
