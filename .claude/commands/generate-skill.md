---
description: Generate skills for a project from its official documentation.
  Use for vue, nuxt, vite, unocss, pnpm, pinia, vitest, vitepress.
---

Generate agent skills for the project: **$ARGUMENTS**

Follow the guidelines in `vendor/antfu-skills/AGENTS.md` to generate Type 1 skills.

## Steps

1. **Read** `vendor/antfu-skills/AGENTS.md` for the full generation guidelines
2. **Check** `vendor/antfu-skills/instructions/$ARGUMENTS.md` for project-specific instructions (if it exists)
3. **Read** source docs from `vendor/antfu-skills/sources/$ARGUMENTS/docs/`
4. **Generate** skill files into `vendor/antfu-skills/skills/$ARGUMENTS/`:
   - `SKILL.md` — index with frontmatter (`name`, `description`, `metadata`) and a table of all references
   - `GENERATION.md` — tracking metadata (source path, git SHA, generation date)
   - `references/*.md` — one file per concept (prefixed by category, e.g. `core-syntax.md`, `features-plugins.md`)
5. **Run** the sync script to copy the generated skills into the plugin:
   ```bash
   bun scripts/generate-antfu-plugins.ts
   ```

## Output Location

- Generated skills: `vendor/antfu-skills/skills/$ARGUMENTS/`
- Synced to plugin: `plugins/$ARGUMENTS/skills/$ARGUMENTS/`

## Writing Guidelines

- Rewrite docs for agents — synthesize, don't copy verbatim
- Focus on practical usage patterns and code examples
- Omit installation guides, introductions, and content agents already know well
- One concept per reference file
- Include working code examples
- Explain *when* and *why* to use each feature, not just *how*
- Keep each reference file concise (under 200 lines)