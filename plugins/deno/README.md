# deno

Bundles the **official [Deno skills](https://github.com/denoland/skills)** (MIT, maintained by Deno Land) as a marketplace plugin — dependency management with npm and JSR, permissions, `deno.json`, the built-in toolchain, migration from Node/npm/yarn/pnpm/bun, Fresh, and Deno Deploy.

Targets Deno 2.9+.

## Skills

| Skill | Covers |
|-------|--------|
| `deno` | Core skill — `deno install`/`deno add`, `package.json` + `node_modules` support, npm and JSR packages, permissions, where config belongs across `package.json`/`tsconfig.json`/`deno.json`, workspaces, the built-in toolchain (`fmt`, `lint`, `test`, `check`, `bench`, `compile`), publishing |
| `migrate-to-deno` | Moving a Node, npm, Yarn, pnpm, or Bun project to Deno — drop-in package manager use, CJS vs ESM, `node_modules` layout, lockfile migration, per-tool command equivalents |
| `deno-deploy` | Deno Deploy workflows — `deno deploy` CLI, env vars, KV access, custom domains, `--tunnel` for local development |
| `deno-frontend` | Web frontends on Deno — running React/Vite/Astro/SvelteKit/Next/Nuxt under Deno, plus Fresh 2.x routes, handlers, islands, Preact signals, Tailwind, and 1.x → 2.x migration |
| `deno-sandbox` | Executing untrusted or AI-generated code in isolation with the `@deno/sandbox` SDK |

## Install

### Claude Code

```bash
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install deno@pleaseai
```

### Codex CLI

Install via the Codex marketplace using this repository, or manually copy the plugin contents into your Codex plugins directory. See the [Codex plugin docs](https://developers.openai.com/codex/plugins/build) for the local install layout.

### Antigravity

Antigravity recognises this directory as a plugin via the root `plugin.json` marker file:

```bash
# Workspace scope (project-only)
mkdir -p .agents/plugins
cp -R <path-to-this-plugin> .agents/plugins/deno

# Global scope (all projects)
mkdir -p ~/.gemini/antigravity/plugins
cp -R <path-to-this-plugin> ~/.gemini/antigravity/plugins/deno
```

See the [Antigravity plugins docs](https://antigravity.google/docs/plugins) for background.

## Prerequisites

- Deno 2.9+ (`curl -fsSL https://deno.land/install.sh | sh`, or `brew install deno`)

## What's inside

```
plugins/deno/
├── .claude-plugin/plugin.json     # Claude Code manifest (source of truth)
├── .codex-plugin/plugin.json      # Codex manifest (generated)
├── .cursor-plugin/plugin.json     # Cursor manifest (generated)
├── plugin.json                     # Antigravity marker file (generated)
├── skills-lock.json                # skills.sh lockfile — pins the upstream revision
├── README.md                       # this file
└── .agents/skills/                 # vendor-managed — do not edit (see below)
    ├── deno/
    ├── migrate-to-deno/
    ├── deno-deploy/
    ├── deno-frontend/
    └── deno-sandbox/
```

> The Codex, Cursor, and Antigravity manifests are generated from the Claude manifest by
> `bun run plugins:multi-format` — edit `.claude-plugin/plugin.json` and re-run, do not hand-edit them.

## Updating the skills

The skills under `.agents/skills/` are **vendor-managed** and tracked by `skills-lock.json`. Do not edit them in place — changes are overwritten on the next sync. Fix issues upstream at [denoland/skills](https://github.com/denoland/skills) instead.

To pull the latest upstream revision:

```bash
bun run skills:update-locks              # refresh every lock dir in the repo
bun run skills:update-locks plugins/deno # or just this plugin
bun run skills:update-locks:check        # report what would change, leave the tree clean
```

The `.github/workflows/update-skills.yml` workflow runs this weekly and opens a `fix:` PR when upstream has moved, so release-please bumps this plugin on merge.
