#!/bin/bash
# PreToolUse hook: Detect Nuxt UI components in .vue files and provide MCP guidance.
# Reads JSON from stdin (tool_name, tool_input). Outputs hookSpecificOutput JSON on stdout.
set -euo pipefail

input=$(cat)

tool_name=$(echo "$input" | jq -r '.tool_name // empty')

# Only handle Write and Edit tools
case "$tool_name" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Only handle .vue files
case "$file_path" in
  *.vue) ;;
  *) exit 0 ;;
esac

# Extract relevant content based on tool type
if [ "$tool_name" = "Write" ]; then
  content=$(echo "$input" | jq -r '.tool_input.content // empty')
elif [ "$tool_name" = "Edit" ]; then
  # Only check new_string — we care about components being added, not removed
  content=$(echo "$input" | jq -r '.tool_input.new_string // empty')
fi

if [ -z "$content" ]; then
  exit 0
fi

# Detect Nuxt UI components (U followed by uppercase letter)
components=$(echo "$content" | grep -oE '<U[A-Z][a-zA-Z]+' | sed 's/^<//' | sort -u | tr '\n' ', ' | sed 's/,$//')

if [ -z "$components" ]; then
  exit 0
fi

# Build component-specific MCP suggestions
mcp_suggestions=""
for comp in $(echo "$components" | tr ',' '\n' | sed 's/^ //'); do
  # Strip the leading U to get the component name for MCP
  comp_name=$(echo "$comp" | sed 's/^U//')
  mcp_suggestions="${mcp_suggestions}  - mcp__nuxt-ui-remote__get_component(component: \"${comp_name}\") for ${comp} API reference\n"
done

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
