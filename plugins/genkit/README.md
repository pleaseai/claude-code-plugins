# genkit

Bundles the **official [Genkit skills](https://github.com/genkit-ai/skills)** (maintained by the Genkit team) as a marketplace plugin — build AI-powered applications with the [Genkit](https://genkit.dev) framework in JavaScript/TypeScript, Go, Dart/Flutter, and Python.

## Skills

| Skill | Covers |
|-------|--------|
| `developing-genkit-js` | Genkit for Node.js/TypeScript — setup, flows, Dotprompt, middleware, agents (sessions, state, multi-agent, human-in-the-loop, deployment), CLI and docs lookup, best practices, and common errors |
| `developing-genkit-go` | Genkit for Go — getting started, generation, prompts, tool calling, flows and HTTP, middleware, model providers, and agents |
| `developing-genkit-dart` | Genkit for Dart/Flutter — core `genkit` package, Schemantic, Dotprompt, agents, middleware, MCP, and provider plugins (Google GenAI, Firebase AI, Anthropic, OpenAI, Chrome, Shelf) |
| `developing-genkit-python` | Genkit for Python — setup, dev workflow, Dotprompt, evals, FastAPI integration, agents, and common errors |

## Install

### Claude Code

```bash
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install genkit@pleaseai
```

### Codex CLI

Install via the Codex marketplace using this repository, or manually copy the plugin contents into your Codex plugins directory. See the [Codex plugin docs](https://developers.openai.com/codex/plugins/build) for the local install layout.

### Antigravity

Antigravity recognises this directory as a plugin via the root `plugin.json` marker file:

```bash
# Workspace scope (project-only)
mkdir -p .agents/plugins
cp -R <path-to-this-plugin> .agents/plugins/genkit

# Global scope (all projects)
mkdir -p ~/.gemini/antigravity/plugins
cp -R <path-to-this-plugin> ~/.gemini/antigravity/plugins/genkit
```

See the [Antigravity plugins docs](https://antigravity.google/docs/plugins) for background.

## What's inside

```
plugins/genkit/
├── .claude-plugin/plugin.json     # Claude Code manifest (source of truth)
├── .codex-plugin/plugin.json      # Codex manifest (generated)
├── .cursor-plugin/plugin.json     # Cursor manifest (generated)
├── plugin.json                     # Antigravity marker file (generated)
├── skills-lock.json                # skills.sh lockfile — pins the upstream revision
├── README.md                       # this file
└── .agents/skills/                 # vendor-managed — do not edit (see below)
    ├── developing-genkit-js/
    ├── developing-genkit-go/
    ├── developing-genkit-dart/
    └── developing-genkit-python/
```

> The Codex, Cursor, and Antigravity manifests are generated from the Claude manifest by
> `bun run plugins:multi-format` — edit `.claude-plugin/plugin.json` and re-run, do not hand-edit them.

## Updating the skills

The skills under `.agents/skills/` are **vendor-managed** and tracked by `skills-lock.json`. Do not edit them in place — changes are overwritten on the next sync. Fix issues upstream at [genkit-ai/skills](https://github.com/genkit-ai/skills) instead.

To pull the latest upstream revision:

```bash
bun run skills:update-locks                # refresh every lock dir in the repo
bun run skills:update-locks plugins/genkit # or just this plugin
bun run skills:update-locks:check          # report what would change, leave the tree clean
```

The `.github/workflows/update-skills.yml` workflow runs this weekly and opens a `fix:` PR when upstream has moved, so release-please bumps this plugin on merge.
