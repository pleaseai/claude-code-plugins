#!/usr/bin/env bash
set -euo pipefail

# Read gemini-extension.json to get contextFileName
EXTENSION_JSON="${CLAUDE_PLUGIN_ROOT}/gemini-extension.json"

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
        cat "${CLAUDE_PLUGIN_ROOT}/${CONTEXT_FILE}"
    fi
fi