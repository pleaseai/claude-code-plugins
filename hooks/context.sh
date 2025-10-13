#!/usr/bin/env bash
set -euo pipefail

# Read gemini-extension.json to get contextFileName
EXTENSION_JSON="${CLAUDE_PLUGIN_ROOT}/gemini-extension.json"
PLUGIN_JSON="${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"

# Get plugin name for logging
PLUGIN_NAME="unknown"
if [ -f "$PLUGIN_JSON" ]; then
    if command -v jq &> /dev/null; then
        PLUGIN_NAME=$(jq -r '.name // "unknown"' "$PLUGIN_JSON")
    else
        PLUGIN_NAME=$(grep -oP '"name"\s*:\s*"\K[^"]+' "$PLUGIN_JSON" | head -1 || echo "unknown")
    fi
fi

if [ -f "$EXTENSION_JSON" ]; then
    # Extract contextFileName using jq or grep/sed
    if command -v jq &> /dev/null; then
        CONTEXT_FILE=$(jq -r '.contextFileName // empty' "$EXTENSION_JSON")
    else
        # Fallback to grep if jq is not available
        CONTEXT_FILE=$(grep -oP '"contextFileName"\s*:\s*"\K[^"]+' "$EXTENSION_JSON" || true)
    fi

    # If contextFileName exists, read and output the file
    if [ -n "$CONTEXT_FILE" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/${CONTEXT_FILE}" ]; then
        echo "📦 Loading context from plugin: ${PLUGIN_NAME} (${CONTEXT_FILE})" >&2
        cat "${CLAUDE_PLUGIN_ROOT}/${CONTEXT_FILE}"
    fi
fi