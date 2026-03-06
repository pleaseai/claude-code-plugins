#!/bin/bash
# PreToolUse hook: auto-allow reading skill reference files
# Allows Read tool calls targeting ${CLAUDE_PLUGIN_ROOT}/skills/*/references/*.md

set -euo pipefail

input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name // empty')

if [ "$tool_name" != "Read" ]; then
  exit 0
fi

file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

# Normalize to absolute path
case "$file_path" in
  /*)
    abs_path="$file_path"
    ;;
  *)
    abs_path="${CLAUDE_PROJECT_DIR:-$PWD}/${file_path}"
    ;;
esac

# Canonicalize path to prevent traversal attacks
if ! abs_path="$(realpath -m "$abs_path" 2>/dev/null || python3 -c "import pathlib, sys; print(str(pathlib.Path(sys.argv[1]).resolve(strict=False)))" "$abs_path" 2>/dev/null)"; then
  exit 0
fi

# Canonicalize plugin root
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ]; then
  exit 0
fi

if ! plugin_root="$(realpath -m "$plugin_root" 2>/dev/null || python3 -c "import pathlib, sys; print(str(pathlib.Path(sys.argv[1]).resolve(strict=False)))" "$plugin_root" 2>/dev/null)"; then
  exit 0
fi

plugin_root="${plugin_root%/}"

# Match: <plugin_root>/skills/<skill>/references/<file>.md
# Require exactly two path components between skills/ and references/
case "$abs_path" in
  "${plugin_root}/skills/"*/references/*.md)
    # Verify no extra path segments between skills/ and references/
    remainder="${abs_path#${plugin_root}/skills/}"
    skill_name="${remainder%%/*}"
    after_skill="${remainder#${skill_name}/}"
    if [[ "$after_skill" == references/*.md && "$after_skill" != *"/"*"/"* ]]; then
      echo '{"hookSpecificOutput":{"permissionDecision":"allow"}}'
    fi
    ;;
esac

exit 0
