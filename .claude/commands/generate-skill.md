---
description: Generate skills for a project from its official documentation.
  Use for vue, nuxt, vite, unocss, pnpm, pinia, vitest, vitepress.
---

Generate agent skills for the project: **$ARGUMENTS**

Follow the guidelines in `docs/skills-generator.md` to generate Type 1 skills.

## Steps

1. **Read** `docs/skills-generator.md` for the full generation guidelines
2. **Check** `vendor/antfu-skills/instructions/$ARGUMENTS.md` for project-specific instructions (if it exists)
3. **Read** source docs from `sources/$ARGUMENTS/docs/`
4. **Generate** skill files into `skills/$ARGUMENTS/`:
   - `SKILL.md` — index with frontmatter (`name`, `description`, `metadata`) and a table of all references
   - `GENERATION.md` — tracking metadata (source path, git SHA, generation date)
   - `references/*.md` — one file per concept (prefixed by category, e.g. `core-syntax.md`, `features-plugins.md`)
5. **Copy** the generated skills into the plugin directory:
   ```bash
   mkdir -p "plugins/$ARGUMENTS/skills/$ARGUMENTS/" && cp -r "skills/$ARGUMENTS/." "plugins/$ARGUMENTS/skills/$ARGUMENTS/"
   ```
   > Note: `bun run skills:sync` only handles Type 2 (vendor) and Type 3 (manual) skills.
   > Type 1 (generated) skills must be copied manually to the plugin directory.
6. **Commit** the generated skills:
   ```bash
   git add skills/$ARGUMENTS/ plugins/$ARGUMENTS/skills/$ARGUMENTS/
   git commit -m "feat($ARGUMENTS): generate skills from official documentation"
   ```

## Output Location

- Source docs: `sources/$ARGUMENTS/` (submodule, run `bun scripts/cli.ts init` if missing)
- Generated skills: `skills/$ARGUMENTS/` (our own skills directory, never modify `vendor/antfu-skills/`)
- Synced to plugin: `plugins/$ARGUMENTS/skills/$ARGUMENTS/`

## Writing Guidelines

- Rewrite docs for agents — synthesize, don't copy verbatim
- Focus on practical usage patterns and code examples
- Omit installation guides, introductions, and content agents already know well
- One concept per reference file
- Include working code examples
- Explain *when* and *why* to use each feature, not just *how*
- Keep each reference file concise (under 200 lines)