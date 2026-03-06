---
description: Add a skills.sh skill as a plugin to the marketplace. Installs the skill inside the plugin directory using `bunx skills add`, then configures plugin.json with the `skills` field — no file copying required.
---

Add a skills.sh skill as a plugin to the marketplace.

**Arguments:** `$ARGUMENTS` (format: `<plugin-name> <github-repo-url> [--skill <skill-name> [<skill-name2> ...]]`)

**Examples:**
- `/add-skill slack-agent https://github.com/vercel-labs/slack-agent-skill`
- `/add-skill slack-agent https://github.com/vercel-labs/slack-agent-skill --skill slack-agent`
- `/add-skill agent-skills https://github.com/vercel-labs/agent-skills --skill pr-review commit`

---

## Step 1 — Parse & Validate Input

Parse `$ARGUMENTS` to extract:
- `PLUGIN_NAME`: first token (e.g. `agent-skills`)
- `REPO_URL`: second token (e.g. `https://github.com/vercel-labs/agent-skills`)
- `SKILL_NAMES`: all space-separated values after `--skill` flag until the end of arguments (e.g. `pr-review commit` → `["pr-review", "commit"]`). Defaults to `[PLUGIN_NAME]` if `--skill` is not provided.
- `OWNER_REPO`: short form of the URL (e.g. `vercel-labs/agent-skills`)

Validate:
- Both `PLUGIN_NAME` and `REPO_URL` are present. If not, stop and show:
  ```
  Usage: /add-skill <plugin-name> <github-repo-url> [--skill <skill-name> [<skill-name2> ...]]
  ```
- `REPO_URL` matches `https://github.com/<owner>/<repo>`. Normalize to `<owner>/<repo>` short form.
- `PLUGIN_NAME` contains only alphanumeric characters, hyphens, and underscores.
- Each name in `SKILL_NAMES` contains only alphanumeric characters, hyphens, and underscores.

Check for conflicts:
- `plugins/<PLUGIN_NAME>/` must NOT already exist
- `PLUGIN_NAME` must NOT already be in `.claude-plugin/marketplace.json`

If either check fails, stop and report the conflict.

## Step 2 — Install Skills inside Plugin Directory

Create the plugin directory and install each skill into it. Run the following for **each** name in `SKILL_NAMES`:

```bash
mkdir -p plugins/<PLUGIN_NAME>
cd plugins/<PLUGIN_NAME> && bunx skills add <OWNER_REPO> --skill <SKILL_NAME> --agent 'universal' -y
```

`bunx skills add` run from `plugins/<PLUGIN_NAME>/` will:
- Install skill files to `plugins/<PLUGIN_NAME>/.agents/skills/<SKILL_NAME>/`
- Append to (or create) `plugins/<PLUGIN_NAME>/skills-lock.json` scoped to this plugin

If any command fails, stop and show the error.

**Verify installation:**

For each skill in `SKILL_NAMES`, check that the SKILL.md exists:
```bash
ls plugins/<PLUGIN_NAME>/.agents/skills/<SKILL_NAME>/SKILL.md
```

Then read `skills-lock.json`:
```bash
cat plugins/<PLUGIN_NAME>/skills-lock.json
```

Read `skills-lock.json` to extract the `source` value (e.g. `"vercel-labs/agent-skills"`) — used in Step 3's plugin.json `repository` field.

Display the installed skill files and ask for confirmation to continue:

```
Installed skills in plugins/<PLUGIN_NAME>/.agents/skills/:
  <SKILL_NAME_1>/
    - SKILL.md
    - README.md
    - ...
  <SKILL_NAME_2>/
    - SKILL.md
    - ...

skills-lock.json created at plugins/<PLUGIN_NAME>/skills-lock.json
  source: <OWNER_REPO>

Proceed to create plugin? (yes/no)
```

## Step 3 — Create plugin.json

Fetch repo metadata for description and license:

```bash
gh api repos/<owner>/<repo> --jq '{description: .description, license: (.license.spdx_id // "NOASSERTION")}'
```

Also read the first skill's `plugins/<PLUGIN_NAME>/.agents/skills/<FIRST_SKILL_NAME>/SKILL.md` frontmatter — the `description` field there may give a better description than the repo's.

Create `plugins/<PLUGIN_NAME>/.claude-plugin/plugin.json`:

```json
{
  "name": "<PLUGIN_NAME>",
  "version": "1.0.0",
  "description": "<description from skill frontmatter or repo>",
  "license": "<SPDX from repo, or NOASSERTION if unknown>",
  "keywords": ["<PLUGIN_NAME>"],
  "skills": "./.agents/skills/"
}
```

The `"skills"` field tells Claude Code to load all skill directories from `.agents/skills/` relative to the plugin root — no file copying needed.

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

## Step 6 — Update Documentation

### README.md

Read `README.md` and add an entry for the new plugin inside the **Built-in Plugins** section, immediately before the closing `## Installation` heading (or after the last `#### ...` plugin entry in that section):

```markdown
#### <Human-readable Plugin Name>
<description from plugin.json>

**Install:** `/plugin install <PLUGIN_NAME>@pleaseai` | **Source:** [plugins/<PLUGIN_NAME>](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/<PLUGIN_NAME>)
```

Use the Edit tool to insert the block before the last plugin entry or at the end of the Built-in Plugins list.

### CLAUDE.md

Read `CLAUDE.md` and check whether any section needs updating:

- If CLAUDE.md contains a submodule or plugin source list (e.g. `external-plugins/*` mappings), add the new plugin's source repo there.
- If no relevant section exists, no update is required — skip silently.

## Step 7 — Summary Report

```
✓ Skill plugin added: <PLUGIN_NAME>

Source:
  https://github.com/<owner>/<repo>
  Installed via: bunx skills add <OWNER_REPO> --skill <SKILL_NAME_1>
                                               --skill <SKILL_NAME_2>
                                               ...

Plugin structure:
  plugins/<PLUGIN_NAME>/
  ├── .agents/skills/
  │   ├── <SKILL_NAME_1>/   ← skill files (managed by skills.sh)
  │   │   └── SKILL.md
  │   └── <SKILL_NAME_2>/
  │       └── SKILL.md
  ├── skills-lock.json       ← version lock (managed by skills.sh)
  └── .claude-plugin/
      └── plugin.json        ← "skills": "./.agents/skills/"

Changes made:
  plugins/<PLUGIN_NAME>/.claude-plugin/plugin.json   (created)
  .claude-plugin/marketplace.json                    (updated)
  release-please-config.json                         (updated)
  README.md                                          (updated)
  CLAUDE.md                                          (updated, if applicable)

To update the skills in the future:
  cd plugins/<PLUGIN_NAME> && bunx skills update

To test:
  /plugin install <PLUGIN_NAME>@pleaseai
```