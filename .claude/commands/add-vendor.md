---
description: Add a new Type 2 vendor (skill provider) to the plugin marketplace. Automates the full workflow: meta.ts entry, cli.ts mapping, submodule init, plugin creation, and skill sync.
---

Add a new Type 2 vendor to the marketplace.

**Arguments:** `$ARGUMENTS` (format: `<vendor-name> <github-repo-url>`)

**Example:** `/add-vendor mastra https://github.com/mastra-ai/skills`

---

## Step 1 — Parse & Validate Input

Parse `$ARGUMENTS` to extract:
- `VENDOR_NAME`: first token (e.g. `oxc`)
- `REPO_URL`: second token (e.g. `https://github.com/nicolo-ribaudo/oxc`)

Validate:
- Both tokens are present. If not, stop and show: `Usage: /add-vendor <name> <github-repo-url>`
- `REPO_URL` matches pattern `https://github.com/<owner>/<repo>` (or `git@github.com:<owner>/<repo>`). Normalize to HTTPS form.
- `VENDOR_NAME` contains only alphanumeric characters, hyphens, and underscores.

Check `scripts/meta.ts` — read the file and verify `VENDOR_NAME` is NOT already a key in the `vendors` object. If it already exists, stop and report: `Vendor '<name>' already exists in scripts/meta.ts`.

## Step 2 — Explore Vendor Repository

Use the GitHub MCP tool or `gh` CLI to browse the vendor repository and find its `skills/` directory:

```bash
gh api repos/<owner>/<repo>/contents/skills
```

- If the API returns a 404 or the directory doesn't exist, stop and report:
  ```
  No skills/ directory found in <REPO_URL>.
  This repository is not a Type 2 vendor (it doesn't self-host skills).
  Consider using /generate-skill for Type 1 skill generation from docs.
  ```
- If the directory exists, list all subdirectory names under `skills/` — these are the available source skills.

Display the found skills to the user:
```
Found skills in <REPO_URL>/skills/:
  - <skill-1>
  - <skill-2>
  ...
```

## Step 3 — Determine Skill → Plugin Mappings

For each skill found, determine:
1. **Output skill name** — usually the same as the source skill name (identity mapping). Ask the user if they want to rename any skill.
2. **Target plugin** — which `plugins/<plugin>/` directory the skill should go into.

Read `scripts/cli.ts` to see existing `SKILL_TO_PLUGIN` entries and existing plugins in `plugins/`.

```bash
ls plugins/
```

Present a proposed mapping table and ask for confirmation:

```
Proposed skill mappings:
  Source skill       → Output skill       → Target plugin
  ─────────────────────────────────────────────────────
  <src-skill-1>      → <src-skill-1>      → <vendor-name>  (new plugin)
  <src-skill-2>      → <src-skill-2>      → <vendor-name>  (new plugin)

Target plugin `plugins/<vendor-name>/` does not exist and will be created.

Confirm? (or specify different plugin targets)
```

Wait for user confirmation or corrections before proceeding.

## Step 4 — Update `scripts/meta.ts`

Read `scripts/meta.ts` and add the new vendor entry to the `vendors` object. Insert it before the closing `}` of the `vendors` object:

```typescript
"<vendor-name>": {
  source: "<repo-url>",
  skills: {
    "<src-skill-1>": "<out-skill-1>",
    "<src-skill-2>": "<out-skill-2>",
  },
},
```

Use the Edit tool to make this change precisely.

## Step 5 — Update `scripts/cli.ts`

Read `scripts/cli.ts` and add entries to the `SKILL_TO_PLUGIN` object under the `// Type 2: vendor submodules` comment:

```typescript
"<out-skill-1>": "<target-plugin>",
"<out-skill-2>": "<target-plugin>",
```

Use the Edit tool to insert these lines after the last existing Type 2 entry.

## Step 6 — Run `bun scripts/cli.ts init`

This adds the git submodule at `vendor/<vendor-name>/`:

```bash
bun scripts/cli.ts init
```

Report the result. If it fails, stop and show the error — do not continue to sync.

## Step 7 — Create Plugin (if new target plugin)

For each unique target plugin that doesn't already exist in `plugins/`:

**7a. Create plugin directory and `plugin.json`:**

```bash
mkdir -p plugins/<plugin-name>/.claude-plugin
```

Fetch the vendor repo's README or description to get a meaningful description:

```bash
gh api repos/<owner>/<repo> --jq '.description'
```

Create `plugins/<plugin-name>/.claude-plugin/plugin.json`:

```json
{
  "name": "<plugin-name>",
  "version": "1.0.0",
  "description": "<description from repo or user input>",
  "author": {
    "name": "Minsu Lee",
    "url": "https://github.com/amondnet"
  },
  "repository": "<repo-url>",
  "license": "MIT",
  "keywords": ["<vendor-name>"]
}
```

**7b. Add entry to `.claude-plugin/marketplace.json`:**

Read `.claude-plugin/marketplace.json` and add the new plugin entry to the `plugins` array (before the closing `]`):

```json
{
  "name": "<plugin-name>",
  "description": "<description>",
  "source": "./plugins/<plugin-name>"
}
```

Use the Edit tool to insert the new entry.

**7c. Add entry to `release-please-config.json`:**

Read `release-please-config.json` and add the new plugin package to the `packages` object (before the closing `}`):

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

Use the Edit tool to insert the new entry after the last existing `plugins/*` entry.

## Step 8 — Run `bun scripts/cli.ts sync`

This syncs skills from `vendor/<vendor-name>/skills/` to `plugins/<plugin>/skills/` and auto-commits:

```bash
bun scripts/cli.ts sync
```

Report the result. Note any warnings or errors.

## Step 9 — Summary Report

Show a complete summary of all changes made:

```
✓ Vendor addition complete: <vendor-name>

Changes made:
  scripts/meta.ts
    + Added vendor entry "<vendor-name>" with <N> skill(s)

  scripts/cli.ts
    + Added SKILL_TO_PLUGIN entries:
        "<out-skill-1>" → "<target-plugin>"

  vendor/<vendor-name>/           (git submodule)
    + Added submodule from <repo-url>

  plugins/<plugin-name>/          (if newly created)
    + Created .claude-plugin/plugin.json
    + Added to .claude-plugin/marketplace.json
    + Added to release-please-config.json

  plugins/<plugin-name>/skills/   (synced by cli.ts sync)
    + <out-skill-1>/SKILL.md
    + <out-skill-1>/SYNC.md

Next steps:
  - Review the generated plugin.json and update description/keywords as needed
  - Test the plugin: /plugin install <plugin-name>@pleaseai
  - Consider adding the vendor repo to the marketplace README
```