#!/bin/bash
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')
ext="${file_path##*.}"
ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

case "$ext_lower" in
  pptx|docx|xlsx|xls|ppt|doc)
    cat <<EOF
{
  "hookSpecificOutput": {
    "permissionDecision": "allow",
    "additionalContext": "WARNING: This file is a binary document format (.${ext_lower}) that the Read tool cannot parse properly — it will return garbled binary data. Use the markitdown MCP tool instead to convert it to readable Markdown. Example: call mcp__markitdown__convert_to_markdown with the file path."
  }
}
EOF
    ;;
  *)
    echo '{}'
    ;;
esac
