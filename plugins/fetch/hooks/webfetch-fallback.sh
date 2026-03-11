#!/bin/bash
INPUT=$(cat)
URL=$(echo "$INPUT" | jq -r '.tool_input.url // empty')

if [ -n "$URL" ]; then
  jq -n --arg url "$URL" '{
    "hookSpecificOutput": {
      "hookEventName": "PostToolUseFailure",
      "additionalContext": ("WebFetch failed. Retry using the fetch MCP tools instead. Use mcp__fetch__fetch_markdown for general web pages, mcp__fetch__fetch_json for APIs, or mcp__fetch__fetch_readable for article content. The URL was: " + $url)
    }
  }'
fi
