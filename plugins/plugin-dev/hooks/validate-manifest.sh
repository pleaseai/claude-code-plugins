#!/usr/bin/env bash
set -euo pipefail

# Find all plugin.json files that were recently modified
find_plugin_manifests() {
    # Look for plugin.json in .claude-plugin directories
    find . -path "*/.claude-plugin/plugin.json" -type f 2>/dev/null || true
}

# Validate a single plugin.json file
validate_manifest() {
    local file="$1"
    local errors=()
    local warnings=()

    # Check if file exists and is readable
    if [[ ! -f "$file" ]]; then
        errors+=("File does not exist: $file")
        return 1
    fi

    # Validate JSON syntax
    if ! jq empty "$file" 2>/dev/null; then
        errors+=("Invalid JSON syntax in $file")
    fi

    # Check required field: name
    if ! jq -e '.name' "$file" >/dev/null 2>&1; then
        errors+=("Missing required field: name")
    else
        local name=$(jq -r '.name' "$file")
        # Validate kebab-case
        if [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
            errors+=("Plugin name must be kebab-case: $name")
        fi
    fi

    # Check recommended fields
    if ! jq -e '.version' "$file" >/dev/null 2>&1; then
        warnings+=("Missing recommended field: version")
    else
        local version=$(jq -r '.version' "$file")
        # Validate semver format
        if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$ ]]; then
            warnings+=("Version should follow semantic versioning: $version")
        fi
    fi

    if ! jq -e '.description' "$file" >/dev/null 2>&1; then
        warnings+=("Missing recommended field: description")
    fi

    if ! jq -e '.author' "$file" >/dev/null 2>&1; then
        warnings+=("Missing recommended field: author")
    fi

    # Check for absolute paths (should use relative paths with ./)
    if jq -e '.commands[]?, .agents[]?, .hooks' "$file" 2>/dev/null | grep -q '^"[^.]'; then
        errors+=("Component paths must be relative and start with ./")
    fi

    # Build validation result
    local result=""

    if [[ ${#errors[@]} -gt 0 ]]; then
        result+="❌ Plugin Manifest Validation Errors in $file:\n"
        for error in "${errors[@]}"; do
            result+="  - $error\n"
        done
    fi

    if [[ ${#warnings[@]} -gt 0 ]]; then
        result+="⚠️  Plugin Manifest Warnings in $file:\n"
        for warning in "${warnings[@]}"; do
            result+="  - $warning\n"
        done
    fi

    if [[ -n "$result" ]]; then
        echo -e "$result"
        jq -n --arg msg "$result" '{
          "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": $msg
          }
        }'
    fi
}

# Main execution
main() {
    local manifests=$(find_plugin_manifests)

    if [[ -z "$manifests" ]]; then
        exit 0
    fi

    while IFS= read -r manifest; do
        if [[ -n "$manifest" ]]; then
            validate_manifest "$manifest"
        fi
    done <<< "$manifests"
}

main
