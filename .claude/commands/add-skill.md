---
description: Add a skills.sh skill as a plugin to the marketplace. Installs the skill inside the plugin directory using `bunx skills add`, then configures plugin.json with the `skills` field — no file copying required.
---

Add a skills.sh skill as a plugin to the marketplace.

**Arguments:** `$ARGUMENTS` (format: `<plugin-name> <github-repo-url> [--skill <skill-name>]`)

**Examples:**
- `/add-skill slack-agent https://github.com/vercel-labs/slack-agent-skill`
- `/add-skill slack-agent https://github.com/vercel-labs/slack-agent-skill --skill slack-agent`

---

## Step 1 — Parse & Validate Input

Parse `$ARGUMENTS` to extract:
- `PLUGIN_NAME`: first token (e.g. `slack-agent`)
- `REPO_URL`: second token (e.g. `https://github.com/vercel-labs/slack-agent-skill`)
- `SKILL_NAME`: value after `--skill` flag, defaults to `PLUGIN_NAME`
- `OWNER_REPO`: short form of the URL (e.g. `vercel-labs/slack-agent-skill`)

Validate:
- Both `PLUGIN_NAME` and `REPO_URL` are present. If not, stop and show:
  ```
  Usage: /add-skill <plugin-name> <github-repo-url> [--skill <skill-name>]
  ```
- `REPO_URL` matches `https://github.com/<owner>/<repo>`. Normalize to `<owner>/<repo>` short form.
- `PLUGIN_NAME` contains only alphanumeric characters, hyphens, and underscores.
- `SKILL_NAME` contains only alphanumeric characters, hyphens, and underscores.

Check for conflicts:
- `plugins/<PLUGIN_NAME>/` must NOT already exist
- `PLUGIN_NAME` must NOT already be in `.claude-plugin/marketplace.json`

If either check fails, stop and report the conflict.

## Step 2 — Install Skill inside Plugin Directory

Create the plugin directory and install the skill into it:

```bash
mkdir -p plugins/<PLUGIN_NAME>
cd plugins/<PLUGIN_NAME> && bunx skills add <OWNER_REPO> --skill <SKILL_NAME> --agent 'universal' -y
```

`bunx skills add` run from `plugins/<PLUGIN_NAME>/` will:
- Install skill files to `plugins/<PLUGIN_NAME>/.agents/skills/<SKILL_NAME>/`
- Create `plugins/<PLUGIN_NAME>/skills-lock.json` scoped to this plugin

If the command fails, stop and show the error.

**Verify installation:**

Check that both files exist:
```bash
ls plugins/<PLUGIN_NAME>/.agents/skills/<SKILL_NAME>/SKILL.md
cat plugins/<PLUGIN_NAME>/skills-lock.json
```

Read `skills-lock.json` to extract the `source` value (e.g. `"vercel-labs/slack-agent-skill"`) — used in Step 3's plugin.json `repository` field.

Display the installed skill files and ask for confirmation to continue:

```
Installed skill in plugins/<PLUGIN_NAME>/.agents/skills/<SKILL_NAME>/:
  - SKILL.md
  - README.md
  - ...

skills-lock.json created at plugins/<PLUGIN_NAME>/skills-lock.json
  source: <OWNER_REPO>

Proceed to create plugin? (yes/no)
```

## Step 3 — Create plugin.json

Fetch repo metadata for description, author, and license:

```bash
gh api repos/<owner>/<repo> --jq '{description: .description, owner: (.owner.name // .owner.login), license: (.license.spdx_id // "NOASSERTION")}'
```

Also read `plugins/<PLUGIN_NAME>/.agents/skills/<SKILL_NAME>/SKILL.md` frontmatter — the `description` field there may give a better description than the repo's.

Create `plugins/<PLUGIN_NAME>/.claude-plugin/plugin.json`:

```json
{
  "name": "<PLUGIN_NAME>",
  "version": "1.0.0",
  "description": "<description from skill frontmatter or repo>",
  "author": {
    "name": "<human-readable owner name>",
    "url": "https://github.com/<owner>"
  },
  "repository": "https://github.com/<owner>/<repo>",
  "license": "<SPDX from repo, or NOASSERTION if unknown>",
  "keywords": ["<PLUGIN_NAME>"],
  "skills": "./.agents/skills/"
}
```

The `"skills"` field tells Claude Code to load skill directories from `.agents/skills/` relative to the plugin root — no file copying needed.

## Step 4 — Add Entry to `.claude-plugin/marketplace.json`

Read `.claude-plugin/marketplace.json` and add the new plugin entry to the `plugins` array:

```json
{
  "name": "<PLUGIN_NAME>",
  "description": "<description>",
  "source": "./plugins/<PLUGIN_NAME>"
}
```

Use the Edit tool to insert the new entry before the closing `]`.

## Step 5 — Add Entry to `release-please-config.json`

Read `release-please-config.json` and add the new plugin package to the `packages` object after the last existing `plugins/*` entry:

```json
"plugins/<PLUGIN_NAME>": {
  "release-type": "simple",
  "component": "<PLUGIN_NAME>",
  "extra-files": [
    {
      "type": "json",
      "path": ".claude-plugin/plugin.json",
      "jsonpath": "$.version"
    }
  ]
}
```

## Step 6 — Summary Report

```
✓ Skill plugin added: <PLUGIN_NAME>

Source:
  https://github.com/<owner>/<repo>
  Installed via: bunx skills add <OWNER_REPO> --skill <SKILL_NAME>

Plugin structure:
  plugins/<PLUGIN_NAME>/
  ├── .agents/skills/<SKILL_NAME>/   ← skill files (managed by skills.sh)
  │   └── SKILL.md
  ├── skills-lock.json               ← version lock (managed by skills.sh)
  └── .claude-plugin/
      └── plugin.json                ← "skills": "./.agents/skills/"

Changes made:
  plugins/<PLUGIN_NAME>/.claude-plugin/plugin.json   (created)
  .claude-plugin/marketplace.json                    (updated)
  release-please-config.json                         (updated)

To update the skill in the future:
  cd plugins/<PLUGIN_NAME> && bunx skills update

To test:
  /plugin install <PLUGIN_NAME>@pleaseai
```