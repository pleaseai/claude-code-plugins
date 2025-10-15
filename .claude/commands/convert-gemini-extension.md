---
description: Convert a Gemini extension to Claude Code plugin format
---

You are tasked with converting a Gemini extension to Claude Code plugin format. Follow these steps precisely:

## Input
The user will provide a path to a Gemini extension directory containing `gemini-extension.json`.

Path to convert: $ARGUMENTS

## Conversion Steps

### 1. Validate Input
- Check if the provided path exists and contains `gemini-extension.json`
- If not found, ask the user for the correct path

### 2. Read Gemini Extension Configuration
- Read the `gemini-extension.json` file
- Extract: name, description, version, mcpServers configuration

### 3. Create Plugin Directory Structure
- Create `.claude-plugin` directory in the extension path
- Create `commands` directory if it doesn't exist (it should already exist for extensions with commands)

### 4. Generate plugin.json
Create `.claude-plugin/plugin.json` with the following structure:
```json
{
  "name": "<name from gemini-extension.json>",
  "version": "<version from gemini-extension.json>",
  "description": "<description from gemini-extension.json>",
  "commands": ["./commands"],
  "mcpServers": <copy mcpServers object from gemini-extension.json>
}
```

### 5. Convert Command Files (TOML to Markdown)
For each `.toml` file in the `commands/` directory:
- Read the TOML file
- Extract `description` and `prompt` fields
- Create a new `.md` file with the same base name
- Format as:
  ```markdown
  ---
  description: <description from TOML>
  ---

  <prompt from TOML with {{args}} replaced by $ARGUMENTS>
  ```
- **IMPORTANT**: Replace all instances of `{{args}}` with `$ARGUMENTS` in the prompt
- Keep the original TOML file (don't delete it) for reference

### 6. Update Marketplace Configuration
- Read `.claude-plugin/marketplace.json` at the repository root
- Add a new entry to the `plugins` array if not already present:
  ```json
  {
    "name": "<plugin name>",
    "description": "<plugin description>",
    "source": {
      "source": "github",
      "repo": "pleaseai/<plugin-name>"
    }
  }
  ```
- If the plugin already exists in marketplace.json, update its description

### 7. Copy Context File (if exists)
- If `contextFileName` is specified in gemini-extension.json
- Copy that context file to `.claude-plugin/context.md` or keep it in the root (both work)

### 8. Summary Report
After conversion, provide a summary:
- Plugin name and version
- Number of commands converted
- List of converted command files
- Location of plugin.json
- Whether marketplace.json was updated

### 9. Verification Steps
Suggest the user verify:
- All TOML files have corresponding MD files
- All `{{args}}` replaced with `$ARGUMENTS`
- MCP server paths are correct
- Plugin appears in marketplace.json

## Example Conversion

**Input**: `plugins/flutter`

**Output Structure**:
```
plugins/flutter/
  .claude-plugin/
    plugin.json          (NEW)
  commands/
    commit.toml          (EXISTING)
    commit.md            (NEW - converted from TOML)
    modify.toml          (EXISTING)
    modify.md            (NEW - converted from TOML)
    ...
  gemini-extension.json  (EXISTING - kept for reference)
  flutter.md             (EXISTING - context file)
```

## Error Handling
- If gemini-extension.json is missing, prompt for correct path
- If commands directory is missing, ask if this is a commands-only plugin
- If TOML parsing fails, show the error and skip that file
- If marketplace.json doesn't exist, ask if it should be created

Begin the conversion process now with the provided path.