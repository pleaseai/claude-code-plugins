# ADR 001: Context File Support in Claude Code Plugins

## Status

Accepted

## Date

2025-10-15

## Context

Our plugin marketplace converts Gemini CLI extensions to Claude Code plugins. Gemini CLI extensions use a `contextFileName` field in `gemini-extension.json` to specify AI-specific instruction files (e.g., `GEMINI.md`, `flutter.md`) that provide context and guidelines to the AI model.

Claude Code's native plugin format (`plugin.json`) does not have built-in support for context files. Without this feature, we lose important AI context when converting plugins, reducing their effectiveness.

### Requirements

1. Maintain compatibility with Gemini CLI extensions
2. Enable automatic context loading for converted plugins
3. Provide visual indication in the marketplace UI
4. Follow Claude Code's plugin conventions

## Decision

We will add `contextFileName` support to Claude Code plugins through the following implementation:

### 1. Plugin Configuration

Add `contextFileName` field to `.claude-plugin/plugin.json`:

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "contextFileName": "GEMINI.md",
  "mcpServers": { ... },
  "hooks": { ... }
}
```

### 2. Context Loading Hook

Implement a SessionStart hook (`hooks/context.sh`) that:
- Reads `contextFileName` from `plugin.json` (primary)
- Falls back to `gemini-extension.json` for backwards compatibility
- Loads the specified context file
- Returns content via Claude Code's hook output format

```bash
#!/usr/bin/env bash
# Priority: plugin.json -> gemini-extension.json
CONTEXT_FILE=$(jq -r '.contextFileName // empty' "$PLUGIN_JSON")
if [ -z "$CONTEXT_FILE" ]; then
  CONTEXT_FILE=$(jq -r '.contextFileName // empty' "$EXTENSION_JSON")
fi
```

### 3. UI Indication

Add a "Context" badge in the marketplace PluginCard component:
- Purple badge with document icon
- Tooltip: "Includes Context File"
- Displayed when `contextFileName` field is present

## Consequences

### Positive

1. **Seamless Migration**: Gemini CLI extensions retain their context functionality
2. **Automatic Loading**: No manual context setup required by users
3. **Backwards Compatible**: Falls back to `gemini-extension.json` if needed
4. **User Visibility**: Clear indication of context support in marketplace
5. **Extensible**: Other plugins can adopt this pattern

### Negative

1. **Additional HTTP Request**: Marketplace fetches `plugin.json` to check for context
2. **Hook Dependency**: Requires jq or grep for JSON parsing
3. **Non-Standard**: Not part of Claude Code's official plugin spec

### Neutral

1. **Maintenance**: Need to keep `context.sh` hook synchronized across plugins
2. **Documentation**: Requires clear documentation for plugin developers

## Implementation Details

### Files Modified

- `plugins/*/​.claude-plugin/plugin.json` - Added `contextFileName` field
- `plugins/*/hooks/context.sh` - Updated to read from `plugin.json`
- `apps/web/app/components/PluginCard.vue` - Added Context badge
- `CLAUDE.md` - Documented contextFileName feature

### Hook Configuration

All plugins with context files now include:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/context.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## Alternatives Considered

### 1. Use Only gemini-extension.json

**Pros**: No changes to plugin.json
**Cons**: Doesn't integrate with Claude Code's native format

**Rejected**: Goes against the goal of proper Claude Code plugin integration

### 2. Bundle Context in Commands

**Pros**: Uses existing command infrastructure
**Cons**: Context would need to be manually invoked

**Rejected**: Not automatic, poor user experience

### 3. Hardcode Context File Names

**Pros**: Simpler implementation
**Cons**: Inflexible, doesn't work for plugins with different naming conventions

**Rejected**: Flutter plugin uses `flutter.md`, not standard name

## References

- Claude Code Plugin Documentation
- Gemini CLI Extension Format
- SessionStart Hook Specification
- Issue: [Add MCP and Context badges to marketplace]
