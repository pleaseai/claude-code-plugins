---
description: Add a Gemini CLI extension as a Type 4 synced plugin to the marketplace. Automates the full workflow: meta.ts entry, submodule init, plugin generation, and sync.
---

Add a new Gemini CLI extension to the marketplace as a Type 4 synced plugin.

**Arguments:** `$ARGUMENTS` (format: `<extension-name> <github-repo-url>`)

**Example:** `/add-gemini-extension firebase https://github.com/pleaseai/firebase-plugin`

---

## Step 1 — Parse & Validate Input

Parse `$ARGUMENTS` to extract:
- `EXTENSION_NAME`: first token (e.g. `open-aware`)
- `REPO_URL`: second token (e.g. `https://github.com/qodo-ai/open-aware`)

Validate:
- Both tokens are present. If not, stop and show: `Usage: /add-gemini-extension <name> <github-repo-url>`
- `REPO_URL` matches pattern `https://github.com/<owner>/<repo>` (or `git@github.com:<owner>/<repo>`). Normalize to HTTPS form.
- `EXTENSION_NAME` contains only alphanumeric characters, hyphens, and underscores.

Read `scripts/meta.ts` and verify `EXTENSION_NAME` is NOT already a key in the `extensions` object. If it already exists, stop and report: `Extension '<name>' already exists in scripts/meta.ts`.

## Step 2 — Explore Repository

Use the GitHub MCP tool or `gh` CLI to fetch the `gemini-extension.json` from the repository:

```bash
gh api repos/<owner>/<repo>/contents/gemini-extension.json --jq '.content' | base64 -d
```

If not found, stop and report:
```
No gemini-extension.json found in <REPO_URL>.
This repository does not appear to be a Gemini CLI extension.
```

From `gemini-extension.json`, extract:
- `name`, `version`, `description` (may be absent)
- `contextFileName` (optional — triggers SessionStart hook generation)
- `mcpServers` (required)
- Presence of `commands/` directory (check via GitHub API)

Check for a `commands/` directory:
```bash
gh api repos/<owner>/<repo>/contents/commands
```

Display a summary of what was found:
```
Found Gemini extension in <REPO_URL>:
  name:            <name>
  version:         <version>
  description:     <description or "(none)">
  contextFileName: <file or "(none)">
  mcpServers:      <list of server names>
  commands/:       <yes/no — N .toml files>
```

## Step 3 — Present Proposed Mapping

Show the user what will be generated:

```
Proposed plugin generation for extension '<EXTENSION_NAME>':

  Source:   external-plugins/<EXTENSION_NAME>/  (git submodule)
  Output:   plugins/<PLUGIN_NAME>/

  Generated artifacts:
    plugins/<PLUGIN_NAME>/.claude-plugin/plugin.json    (from mcpServers)
    plugins/<PLUGIN_NAME>/gemini-extension.json         (copy)
    plugins/<PLUGIN_NAME>/hooks/hooks.json              (if contextFileName)
    plugins/<PLUGIN_NAME>/hooks/context.sh              (if contextFileName)
    plugins/<PLUGIN_NAME>/<contextFileName>             (if contextFileName)
    plugins/<PLUGIN_NAME>/commands/*.md                 (if commands/ exists)
    plugins/<PLUGIN_NAME>/SYNC.md

  Note: ${extensionPath} references in mcpServers will be replaced with ${CLAUDE_PLUGIN_ROOT}

Confirm? (y/n)
```

Wait for user confirmation before proceeding.

## Step 4 — Update `scripts/meta.ts`

Read `scripts/meta.ts` and add the new entry to the `extensions` object. Insert it before the closing `}`:

```typescript
"<extension-name>": {
  source: "<repo-url>",
},
```

If `pluginName` differs from the extension name, add it:
```typescript
"<extension-name>": {
  source: "<repo-url>",
  pluginName: "<plugin-name>",
},
```

Use the Edit tool to make this change precisely.

## Step 5 — Run `bun scripts/cli.ts init`

Add the git submodule at `external-plugins/<extension-name>/`:

```bash
bun scripts/cli.ts init
```

Report the result. If it fails, stop and show the error — do not continue.

## Step 6 — Create Plugin Scaffolding

**6a. Create `.claude-plugin/plugin.json`** in `plugins/<plugin-name>/`:

```bash
mkdir -p plugins/<plugin-name>/.claude-plugin
```

Fetch repo metadata for author/license:
```bash
gh api repos/<owner>/<repo> --jq '{description: .description, owner: .owner.login, license: .license.spdx_id}'
```

Create `plugins/<plugin-name>/.claude-plugin/plugin.json`:
```json
{
  "name": "<plugin-name>",
  "version": "1.0.0",
  "description": "<description from repo>",
  "author": {
    "name": "<owner from repo>",
    "url": "https://github.com/<owner>"
  },
  "repository": "<repo-url>",
  "license": "<license or MIT>",
  "keywords": ["<extension-name>"]
}
```

**6b. Add entry to `.claude-plugin/marketplace.json`:**

Read `.claude-plugin/marketplace.json` and add to the `plugins` array:
```json
{
  "name": "<plugin-name>",
  "description": "<description>",
  "source": "./plugins/<plugin-name>"
}
```

**6c. Add entry to `release-please-config.json`:**

Read `release-please-config.json` and add to the `packages` object after the last `plugins/*` entry:
```json
"plugins/<plugin-name>": {
  "release-type": "simple",
  "component": "<plugin-name>",
  "extra-files": [
    {
      "type": "json",
      "path": ".claude-plugin/plugin.json",
      "jsonpath": "$.version"
    }
  ]
}
```

## Step 7 — Run `bun scripts/cli.ts sync`

Generate plugin artifacts from the extension:

```bash
bun scripts/cli.ts sync
```

This will:
- Generate `plugins/<plugin-name>/.claude-plugin/plugin.json` (overwriting the scaffold if mcpServers differ — review afterwards)
- Copy context file and generate hooks (if `contextFileName` exists)
- Convert TOML commands to Markdown (if `commands/` exists)
- Write `SYNC.md` and auto-commit

Report the result. Note any warnings or errors.

## Step 8 — Summary Report

Show a complete summary:

```
✓ Extension addition complete: <extension-name>

Changes made:
  scripts/meta.ts
    + Added extension entry "<extension-name>"

  external-plugins/<extension-name>/       (git submodule)
    + Added submodule from <repo-url>

  plugins/<plugin-name>/
    + Created .claude-plugin/plugin.json
    + Added to .claude-plugin/marketplace.json
    + Added to release-please-config.json
    + Synced by cli.ts sync (SYNC.md, commands, hooks)

Next steps:
  - Review generated plugins/<plugin-name>/.claude-plugin/plugin.json
  - Test the plugin: /plugin install <plugin-name>@pleaseai
  - Consider adding skipCommands: true to meta.ts if commands are not relevant
```