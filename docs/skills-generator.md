# Skills Generator

Generate [Agent Skills](https://agentskills.io/home) from project documentation.

PLEASE STRICTLY FOLLOW THE BEST PRACTICES FOR SKILL: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

- Focus on agents capabilities and practical usage patterns.
- Ignore user-facing guides, introductions, get-started, install guides, etc.
- Ignore content that LLM agents already confident about in their training data.
- Make the skill as concise as possible, avoid creating too many references.

## Skill Source Types

There are three types of skill sources. The project lists are defined in `scripts/meta.ts`:

### Type 1: Generated Skills (`sources/`)

For OSS projects **without existing skills**. We clone the repo as a submodule under `sources/` and generate skills from their documentation.

- **Projects:** Vue, Nuxt, Vite, UnoCSS, Pinia, Vitest, VitePress
- **Workflow:** Read docs → Understand → Generate skills
- **Source:** `sources/{project}/docs/`
- **Output:** `skills/{project}/`

### Type 2: Synced Skills (`vendor/`)

For projects that **already maintain their own skills**. We clone their repo as a submodule under `vendor/` and sync specified skills to ours.

- **Workflow:** Pull updates → Copy specified skills (with optional renaming)
- **Source:** `vendor/{project}/skills/{skill-name}/`
- **Output:** `skills/{output-name}/`
- **Config:** Each vendor specifies which skills to sync and their output names in `scripts/meta.ts`

### Type 3: Hand-written Skills

Skills sourced from `vendor/antfu-skills/skills/` — written by Anthony Fu with his preferences, experience, tastes and best practices.

These are **read-only**. Do not modify them here; contribute changes upstream to [antfu/skills](https://github.com/antfu/skills). They are automatically copied directly to `plugins/{plugin}/skills/` by the sync script (not via the intermediate `skills/` directory).

## Repository Structure

```
.
├── scripts/
│   ├── cli.ts                      # Submodule & skill sync CLI
│   └── meta.ts                     # Project metadata (repos & URLs)
│
├── sources/                        # Type 1: OSS repos (generate from docs)
│   └── {project}/
│       └── docs/                   # Read documentation from here
│
├── vendor/                         # External read-only submodules
│   ├── antfu-skills/               # Type 3: Hand-written skills (read-only)
│   │   └── skills/
│   │       └── {skill-name}/
│   └── {project}/                  # Type 2: Projects with existing skills
│       └── skills/
│           └── {skill-name}/       # Individual skills to sync
│
├── skills/                         # Output directory (generated or synced)
│   └── {output-name}/
│       ├── SKILL.md                # Index of all skills
│       ├── GENERATION.md           # Tracking metadata (for generated skills)
│       ├── SYNC.md                 # Tracking metadata (for synced skills)
│       └── references/
│           └── *.md                # Individual skill files
│
└── plugins/                        # Plugin directories
    └── {plugin}/
        └── skills/                 # Synced directly from vendor/ by cli.ts sync
            └── {skill-name}/
```

**Important:** For Type 1 (generated), the `skills/{project}/` name must match `sources/{project}/`. For Type 2 (synced), the output name is configured in `scripts/meta.ts` and may differ from the source skill name.

## Workflows

### For Generated Skills (Type 1)

#### Adding a New Project

1. **Add entry to `scripts/meta.ts`** in the `submodules` object:
   ```ts
   export const submodules = {
     // ... existing entries
     'new-project': 'https://github.com/org/repo',
   }
   ```

2. **Run init script** to clone the submodule:
   ```bash
   bun scripts/cli.ts init
   ```
   This will clone the repository to `sources/{project}/`

3. **Follow the generation guide** below to create the skills

#### General Instructions for Generation

- Focus on agents capabilities and practical usage patterns. For user-facing guides, introductions, get-started, or common knowledge that LLM agents already know, you can skip those content.
- Categorize each references into `core`, `features`, `best-practices`, `advanced`, etc categories, and prefix the reference file name with the category. For each feature field, feel free to create more categories if needed to better organize the content.

#### Creating New Skills

- **Read** source docs from `sources/{project}/docs/`
- **Read** the instructions in `vendor/antfu-skills/instructions/{project}.md` for specific generation instructions if exists
- **Understand** the documentation thoroughly
- **Create** skill files in `skills/{project}/references/`
- **Create** `SKILL.md` index listing all skills
- **Create** `GENERATION.md` with the source git SHA

#### Updating Generated Skills

1. **Check** git diff since the SHA recorded in `GENERATION.md`:
   ```bash
   cd sources/{project}
   git diff {old-sha}..HEAD -- docs/
   ```
2. **Update** affected skill files based on changes
3. **Update** `SKILL.md` with the new version of the tool/project and skills table.
4. **Update** `GENERATION.md` with new SHA

### For Synced Skills (Type 2)

#### Initial Sync

1. **Copy** specified skills from `vendor/{project}/skills/{skill-name}/` to `skills/{output-name}/`
2. **Create** `SYNC.md` with the vendor git SHA

#### Updating Synced Skills

1. **Check** git diff since the SHA recorded in `SYNC.md`:
   ```bash
   cd vendor/{project}
   git diff {old-sha}..HEAD -- skills/{skill-name}/
   ```
2. **Copy** changed files from `vendor/{project}/skills/{skill-name}/` to `skills/{output-name}/`
3. **Update** `SYNC.md` with new SHA

**Note:** Do NOT modify synced skills manually. Changes should be contributed upstream to the vendor project.

### Syncing All Skills to Plugins

After generating or updating skills, sync them to the plugin directories:

```bash
bun run skills:sync
# or directly: bun scripts/cli.ts sync
```

This copies `skills/` → `plugins/*/skills/` according to the mapping in `scripts/meta.ts`.

## File Formats

### `SKILL.md`

Index file listing all skills with brief descriptions. Name should be in `kebab-case`.

The version should be the date of the last sync.

Also record the version of the tool/project when the skills were generated.

```markdown
---
name: {name}
description: {description}
metadata:
  author: Anthony Fu
  version: "2026.1.1"
  source: Generated from {source-url}, scripts located at https://github.com/antfu/skills
---

> The skill is based on {project} v{version}, generated at {date}.

// Some concise summary/context/introduction of the project

## Core References

| Topic | Description | Reference |
|-------|-------------|-----------|
| Markdown Syntax | Slide separators, frontmatter, notes, code blocks | [core-syntax](references/core-syntax.md) |
| Animations | v-click, v-clicks, motion, transitions | [core-animations](references/core-animations.md) |
| Headmatter | Deck-wide configuration options | [core-headmatter](references/core-headmatter.md) |

## Features

### Feature a

| Topic | Description | Reference |
|-------|-------------|-----------|
| Feature A Editor | Description of feature a | [feature-a](references/feature-a-foo.md) |
| Feature A Preview | Description of feature b | [feature-b](references/feature-a-bar.md) |

// ...
```

### `GENERATION.md`

Tracking metadata for generated skills (Type 1):

```markdown
# Generation Info

- **Source:** `sources/{project}`
- **Git SHA:** `abc123def456...`
- **Generated:** 2024-01-15
```

### `SYNC.md`

Tracking metadata for synced skills (Type 2):

```markdown
# Sync Info

- **Source:** `vendor/{project}/skills/{skill-name}`
- **Git SHA:** `abc123def456...`
- **Synced:** 2024-01-15
```

### `references/*.md`

Individual skill files. One concept per file.

At the end of the file, include the reference links to the source documentation.

```markdown
---
name: {name}
description: {description}
---

# {Concept Name}

Brief description of what this skill covers.

## Usage

Code examples and practical patterns.

## Key Points

- Important detail 1
- Important detail 2

<!--
Source references:
- {source-url}
- {source-url}
- {source-url}
-->
```

## Writing Guidelines

When generating skills (Type 1 only):

1. **Rewrite for agents** - Don't copy docs verbatim; synthesize for LLM consumption
2. **Be practical** - Focus on usage patterns and code examples
3. **Be concise** - Remove fluff, keep essential information
4. **One concept per file** - Split large topics into separate skill files
5. **Include code** - Always provide working code examples
6. **Explain why** - Not just how to use, but when and why

## Supported Projects

See `scripts/meta.ts` for the canonical list of projects and their repository URLs.