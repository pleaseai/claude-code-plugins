---
name: Project documentation conventions
description: Established conventions for skill reference files and SKILL.md index files in this plugin marketplace repo
type: project
---

Skill reference files use YAML frontmatter with `name` and `description` fields (no `allowed-tools`).
Source URL comments appear at the bottom of each reference file in an HTML comment block.
SKILL.md index files use a table structure with Topic/Description/Reference columns, grouped into sections (Core, Features, Advanced, API).
Plugin-only (knowledge-only) plugins have `plugin.json` with `"skills": "./.agents/skills/"` and no `mcpServers` field.
The `skills/nuxt-i18n/` top-level directory mirrors `plugins/nuxt-i18n/.agents/skills/nuxt-i18n/` — both sets of files are identical and appear to be duplicates that are generated/synced.

**Why:** Observed in nuxt-i18n PR (2026-03-28), first knowledge-only plugin without MCP server.
**How to apply:** When reviewing skill-only plugins, expect no `mcpServers` in plugin.json and no `allowed-tools` in SKILL.md.
