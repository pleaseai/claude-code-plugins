#!/usr/bin/env bash
# RTK PreToolUse hook: delegates Bash command rewriting to `rtk rewrite`
# Falls back to `bunx @pleaseai/rtk` when rtk binary is not installed.
# Silently passes through if jq is not available.
# Respects Claude Code deny rules: if the command matches a deny rule,
# exits 0 so the normal permission system handles it.

set -euo pipefail

# Minimum required RTK version (native binary only)
RTK_MIN_VERSION="0.23.0"

# Passthrough: exit 0 means no changes, Claude uses the original input
passthrough() { exit 0; }

# Require jq for JSON parsing
command -v jq >/dev/null 2>&1 || passthrough

# Check if a command matches any Bash(…) deny rule in the given settings files.
# Returns 0 (true) if the command is denied, 1 (false) if safe to auto-allow.
_matches_deny() {
  local cmd="$1"
  shift
  local settings_file
  for settings_file in "$@"; do
    [ -f "$settings_file" ] || continue
    local raw inner prefix
    while IFS= read -r raw; do
      [ -z "$raw" ] && continue
      # Strip Bash( prefix and ) suffix
      inner="${raw#Bash(}"
      inner="${inner%)}"
      if [[ "$inner" == *":*" ]]; then
        # Wildcard pattern: Bash(sudo:*) → match "sudo" or "sudo ..."
        prefix="${inner%:*}"
        [[ "$cmd" == "$prefix" || "$cmd" == "$prefix "* ]] && return 0
      else
        # Exact pattern: Bash(git push --force) → prefix match
        [[ "$cmd" == "$inner" || "$cmd" == "$inner "* ]] && return 0
      fi
    done < <(jq -r '.permissions.deny[]? | select(startswith("Bash("))' "$settings_file" 2>/dev/null)
  done
  return 1
}

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

# Compound commands (;, &&, ||, |, newlines, $(), backticks) can hide denied
# subcommands after a safe-looking prefix (e.g. "echo ok; sudo rm -rf /").
# Passthrough so the normal permission system evaluates the full command.
if [[ "$CMD" == *";"* || "$CMD" == *"&&"* || "$CMD" == *"||"* || \
      "$CMD" == *"&"* || "$CMD" == *"|"* || "$CMD" == *$'\n'* || \
      "$CMD" == *'$('* || "$CMD" == *'`'* ]]; then
  passthrough
fi

# Build the list of Claude Code settings files to check for deny rules.
# Checks project-level (shared + local) and global (shared + local).
DENY_SOURCES=(
  "${CLAUDE_PROJECT_DIR}/.claude/settings.json"
  "${CLAUDE_PROJECT_DIR}/.claude/settings.local.json"
  "$HOME/.claude/settings.json"
  "$HOME/.claude/settings.local.json"
)

# If the original command matches a deny rule, let normal permission flow handle it
_matches_deny "$CMD" "${DENY_SOURCES[@]}" && passthrough

# Delegate rewrite logic entirely to rtk
REWRITTEN=$($RTK_CMD rewrite "$CMD" 2>/dev/null || true)

# If no rewrite or command unchanged, passthrough
[ -z "$REWRITTEN" ] && passthrough
[ "$REWRITTEN" = "$CMD" ] && passthrough

# Rewrite command and auto-approve: RTK is a transparent proxy.
# Deny-rule check above ensures we never auto-allow explicitly denied commands.
jq -n \
  --arg cmd "$REWRITTEN" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: "RTK rewrote command for token-efficient output", updatedInput: {command: $cmd}}}'
