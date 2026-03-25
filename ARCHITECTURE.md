# ARCHITECTURE.md

> Bird's-eye view of the Claude Code Plugins Marketplace repository.
> Last updated: 2026-03-25

## Overview

This repository is a **curated marketplace of plugins for Claude Code**, maintained by Passion Factory. It aggregates plugins from multiple sources — external git submodules, vendor-synced skill repositories, auto-converted Gemini CLI extensions, and hand-crafted built-in plugins — into a single installable marketplace. Users add the marketplace with `/plugin marketplace add pleaseai/claude-code-plugins` and install individual plugins with `/plugin install <name>@pleaseai`.

The codebase is structured as a **Turborepo monorepo** using Bun workspaces. It contains a Nuxt 4 web frontend for browsing plugins, shared configuration packages, and a CLI-driven pipeline (`scripts/cli.ts`) that manages the lifecycle of syncing, generating, and validating plugin artifacts.

## Entry Points

| File / Path | Purpose |
|---|---|
| `.claude-plugin/marketplace.json` | **Start here.** The marketplace manifest — defines all installable plugins, their metadata, and source locations |
| `scripts/cli.ts` | Plugin management CLI: `init` (add submodules), `sync` (generate artifacts), `check` (upstream updates), `cleanup` (remove stale) |
| `scripts/meta.ts` | Source registry — declares all plugin sources (Types 1-4) and their mappings |
| `apps/web/nuxt.config.ts` | Web marketplace application entry point (Nuxt 4) |
| `turbo.json` | Turborepo task pipeline configuration |
| `package.json` | Root workspace definition — workspaces: `packages/*`, `apps/*`, `plugins/*` |

## Module Structure

```
claude-code-plugins/
├── .claude-plugin/          # Marketplace manifest
├── apps/
│   └── web/                 # Nuxt 4 marketplace frontend
├── docs/                    # Development standards & guides
├── external-plugins/        # Type 4: Git submodules (read-only sources)
├── hooks/                   # Repository-level Claude Code hooks
├── packages/                # Shared configuration packages
├── plugins/                 # All installable plugin artifacts
├── scripts/                 # Build tooling & sync pipeline
├── sources/                 # Type 1: Documentation submodules for skill generation
└── vendor/                  # Type 2/3: Vendor skill submodules
```

### `.claude-plugin/`

Contains `marketplace.json` — the single source of truth for which plugins are available in the marketplace. Each entry specifies the plugin's name, description, category, keywords, and source location.

### `apps/web/`

Nuxt 4 (Vue 3) web application for browsing the marketplace. Uses Nuxt UI v4 for components, Nuxt Content for markdown pages, and better-sqlite3 for local data. Deployed as a static site via `bun run generate`.

### `docs/`

Development standards and reference documentation. Not user-facing — these guide contributors:
- `commit-convention.md` — Conventional commit rules
- `STANDARDS.md` — Engineering quality standards
- `TDD.md`, `TESTING.md` — Testing methodology
- `plugins.md` — Plugin development guide
- `skills-generator.md` — Skill generation workflow
- `adr/` — Architecture Decision Records
- `lessons-learned/` — Post-implementation notes

### `external-plugins/`

Read-only git submodules containing **Type 4** plugins: external projects that are either Gemini CLI extensions or standalone Claude Code plugins. These are the canonical upstream sources. The sync pipeline reads from here and generates artifacts into `plugins/`.

Current external plugins: chrome-devtools-mcp, code-review, firebase, flutter, google-workspace, grafana, nanobanana, open-aware, playwright-cli, postgres, security, spec-kit.

### `hooks/`

Repository-level Claude Code hooks. `hooks.json` defines a `SessionStart` hook that loads context via `context.sh`. These hooks apply to the marketplace repository itself, not to individual plugins.

### `packages/`

Shared configuration packages published under the `@pleaseai` scope:

| Package | Purpose |
|---|---|
| `eslint-config` | Shared ESLint configuration (extends `@antfu/eslint-config`) |
| `typescript-config` | Shared `tsconfig.json` base |
| `vitest-config` | Shared Vitest configuration |

### `plugins/`

**The output directory.** Contains all installable plugin artifacts, whether manually maintained or auto-generated. Each plugin follows the standard Claude Code plugin structure:

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json       # Plugin manifest (required)
├── skills/               # Skill definitions (SKILL.md files)
├── commands/             # Slash commands (markdown)
├── hooks/                # Plugin-specific hooks
└── SYNC.md               # Present if auto-generated (do not edit)
```

**Plugin categories by origin:**

- **Manually maintained**: `gatekeeper`, `plugin-dev` — hand-crafted, fully controlled
- **Type 1 (Generated)**: `vue`, `nuxt`, `vitest`, `vite`, etc. — skills generated from official documentation submodules via `/generate-skill`
- **Type 2 (Vendor-synced)**: `slidev`, `vueuse`, `prisma`, `better-auth`, etc. — skills synced from upstream vendor skill repositories
- **Type 3 (Manual copy)**: `antfu` — hand-written skills copied from `vendor/antfu-skills/`
- **Type 4 (Extension-synced)**: `google-workspace` — auto-converted from Gemini CLI extensions in `external-plugins/`

Files with a `SYNC.md` marker are auto-generated and will be overwritten on the next `bun run skills:sync`. Do not edit them manually.

### `scripts/`

Build tooling for the plugin pipeline:

| File | Purpose |
|---|---|
| `cli.ts` | Main CLI — `init`, `sync`, `check`, `cleanup` commands |
| `meta.ts` | Source registry — Type 1 submodules, Type 2 vendors, Type 4 extensions |
| `extension-helpers.ts` | Gemini CLI extension conversion utilities (TOML parsing, MCP path conversion) |
| `generate-antfu-plugins.ts` | Generate plugin manifests for antfu-style plugins |
| `*.test.ts` | Unit tests for the scripts |

### `sources/`

Git submodules of **official documentation repositories** (Type 1). Used as raw input for the `/generate-skill` command, which reads the docs and produces skill files in `plugins/`. Contains repos like `vuejs/docs`, `nuxt/nuxt`, `vitejs/vite`, `vitest-dev/vitest`.

### `vendor/`

Git submodules of **vendor skill repositories** (Types 2 and 3). These are projects that maintain their own `skills/` directory. The sync pipeline copies skills from vendor repos into the corresponding `plugins/<name>/skills/` directory.

## Plugin Type System

The marketplace distinguishes four plugin source types, managed through `scripts/meta.ts`:

| Type | Source | Artifact Location | Sync Method |
|---|---|---|---|
| **Type 1** | `sources/<name>/` (docs repos) | `plugins/<name>/skills/` | `/generate-skill` (manual) |
| **Type 2** | `vendor/<name>/` (skill repos) | `plugins/<name>/skills/` | `bun run skills:sync` (auto) |
| **Type 3** | `vendor/antfu-skills/` | `plugins/antfu/skills/` | `bun run skills:sync` (copy) |
| **Type 4** | `external-plugins/<name>/` | `plugins/<name>/` | `bun run skills:sync` (convert) |

**Data flow for Type 4 (extension sync):**
```
external-plugins/<name>/           →  plugins/<name>/
  gemini-extension.json            →  .claude-plugin/plugin.json
  commands/*.toml                  →  commands/*.md
  <contextFileName>                →  hooks/ + context file
```

## Architecture Invariants

These rules must be maintained. Violating them will break the sync pipeline or marketplace integrity.

1. **Never edit auto-generated files.** Any file in `plugins/` that has a `SYNC.md` marker is managed by the sync pipeline. Manual edits will be overwritten. To modify, change the upstream source and re-sync.

2. **`external-plugins/` is read-only.** These are git submodules pointing to upstream repos. Changes must be made in the upstream repository and pulled via `git submodule update`.

3. **Every installable plugin must be in `marketplace.json`.** The marketplace manifest is the single source of truth for what users can install. A plugin existing in `plugins/` but absent from `marketplace.json` is not installable.

4. **Plugin manifests live at `.claude-plugin/plugin.json`.** This exact path is required by Claude Code. No alternative locations are supported.

5. **`hooks/hooks.json` is auto-loaded.** Claude Code automatically discovers `hooks/hooks.json` in each plugin. Do NOT reference it in `plugin.json`'s `hooks` field — that field is for additional hook files only.

6. **Skills over SessionStart hooks.** New plugins should use skills (`skills/<name>/SKILL.md`) for context injection rather than SessionStart hooks. Skills are loaded on-demand, saving tokens.

7. **Workspace packages use `@pleaseai` scope.** Shared packages in `packages/` are scoped as `@pleaseai/<name>` and referenced with `workspace:*` protocol.

8. **Conventional commits enforced.** All commits must follow conventional commit format. Husky pre-commit hooks and commitlint validate this automatically.

9. **Node 22.x required.** The `.nvmrc` specifies Node 22. The web app and build tooling depend on Node 22 features.

## Cross-Cutting Concerns

### Testing

- **Framework**: Vitest 4.x with shared configuration from `@pleaseai/vitest-config`
- **Scope**: `packages/` and `apps/` have separate Vitest project configurations
- **Scripts tests**: `scripts/*.test.ts` run in Node environment
- **Integration tests**: Separated from unit tests, run via `bun run test:integration`
- **Coverage**: V8 provider, reports in text/JSON/HTML/lcov formats

### Build & CI

- **Turborepo** orchestrates all tasks: `build`, `test`, `lint`, `e2e`
- **Release Please** manages versioning across all packages and plugins via `release-please-config.json`
- Plugin versions are bumped in both `package.json` and `.claude-plugin/plugin.json` (via `extra-files` config)

### Linting & Formatting

- ESLint with `@antfu/eslint-config` — shared via `@pleaseai/eslint-config`
- Prettier for formatting
- ESLint cache enabled for performance (`turbo.json` outputs `.eslintcache`)

### Plugin Validation

```bash
claude plugin validate <path-to-plugin-dir>
claude plugin validate .claude-plugin/marketplace.json
```

Always validate after creating or modifying plugins.

### Development Commands

```bash
bun install                    # Install all dependencies
bun run dev                    # Start web app dev server
bun run test                   # Run all unit tests via Turborepo
bun run lint                   # Lint all workspaces
bun run build                  # Build all workspaces
bun run skills:init            # Add submodules from meta.ts
bun run skills:sync            # Sync vendor skills + convert extensions
bun run skills:check           # Check for upstream updates
bun run skills:cleanup         # Remove stale submodules and skills
```
