#!/bin/bash
# PreToolUse hook: Detect Nuxt UI components in .vue files and provide MCP guidance.
# Reads JSON from stdin (tool_name, tool_input). Outputs hookSpecificOutput JSON on stdout.
set -euo pipefail

mapfile -t values < <(jq -r '[.tool_name, .tool_input.file_path, (.tool_input.content // ""), (.tool_input.new_string // "")] | .[]')

tool_name=${values[0]:-""}
file_path=${values[1]:-""}

# Only handle Write and Edit tools
case "$tool_name" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

# Only handle .vue files
case "$file_path" in
  *.vue) ;;
  *) exit 0 ;;
esac

# Extract relevant content based on tool type
if [ "$tool_name" = "Write" ]; then
  content=${values[2]:-""}
elif [ "$tool_name" = "Edit" ]; then
  # Only check new_string — we care about components being added, not removed
  content=${values[3]:-""}
fi

if [ -z "$content" ]; then
  exit 0
fi

# Detect Nuxt UI components (U followed by uppercase letter)
components_list=$(echo "$content" | grep -oE '<U[A-Z][a-zA-Z]+' | sed 's/^<//' | sort -u || true)

if [ -z "$components_list" ]; then
  exit 0
fi

components="<components>$(echo "$components_list" | tr '\n' ', ' | sed 's/, $//')</components>"

# Build component-specific MCP suggestions
mcp_suggestions=""
while IFS= read -r comp; do
  if [ -z "$comp" ]; then continue; fi
  # Strip the leading U to get the component name for MCP
  comp_name=$(echo "$comp" | sed 's/^U//')
  mcp_suggestions="${mcp_suggestions}  - mcp__nuxt-ui-remote__get_component(component: \"${comp_name}\") for <component>${comp}</component> API reference\n"
done <<< "$components_list"

# Build guidance message
message="Nuxt UI components detected: ${components}

IMPORTANT: LLM training data may contain outdated Nuxt UI v3 patterns. Before proceeding, verify correct v4 API usage:

${mcp_suggestions}
Common v3→v4 mistakes to avoid:
- UFormGroup is now UFormField
- USelectMenu is now USelect
- Modal/Slideover use v-model:open instead of v-model
- DropdownMenu items use flat array with { type: 'separator' } instead of nested arrays for groups
- UCard slots: header/body/footer (not default slot for body content)

Use mcp__nuxt-ui-remote__list_components to browse all available components."

jq -n --arg msg "$message" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": $msg
  }
}'
