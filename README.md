# Claude Code Plugins Marketplace

[![GitHub stars](https://img.shields.io/github/stars/pleaseai/claude-code-plugins?style=social)](https://github.com/pleaseai/claude-code-plugins)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/pleaseai/claude-code-plugins)](https://github.com/pleaseai/claude-code-plugins/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/pleaseai/claude-code-plugins)](https://github.com/pleaseai/claude-code-plugins/pulls)

A curated marketplace of plugins for [Claude Code](https://www.anthropic.com/news/claude-code-plugins), providing custom collections of slash commands, agents, MCP servers, and hooks to enhance your development workflow.

**Repository:** [https://github.com/pleaseai/claude-code-plugins](https://github.com/pleaseai/claude-code-plugins)

## Overview

This marketplace is maintained by Passion Factory and provides bundled plugins that extend Claude Code's capabilities with specialized tools and automation.

## Available Plugins

### External Plugins

#### Nano Banana
Generate and manipulate images using the Gemini 2.5 Flash Image model directly from Claude Code.

**Install:** `/plugin install nanobanana@pleaseai` | **Repository:** [pleaseai/nanobanana-plugin](https://github.com/pleaseai/nanobanana-plugin)

#### Security Analysis (`gemini-cli-security`)
AI-powered security analysis for code changes and pull requests, identifying vulnerabilities and security risks.

**Install:** `/plugin install gemini-cli-security@pleaseai` | **Repository:** [pleaseai/security-plugin](https://github.com/pleaseai/security-plugin)

#### Flutter Development
Flutter and Dart-related commands and context for enhanced mobile development workflow.

**Install:** `/plugin install flutter@pleaseai` | **Repository:** [pleaseai/flutter-plugin](https://github.com/pleaseai/flutter-plugin)

#### Code Review
Comprehensive code review plugin for Claude Code with specialized review agents.

**Install:** `/plugin install code-review@pleaseai` | **Repository:** [pleaseai/code-review-plugin](https://github.com/pleaseai/code-review-plugin)

#### Spec Kit
Toolkit to help you get started with Spec-Driven Development.

**Install:** `/plugin install spec-kit@pleaseai` | **Repository:** [pleaseai/spec-kit-plugin](https://github.com/pleaseai/spec-kit-plugin)

#### Firebase
Prototype, build & run modern apps users love with Firebase's backend, AI, and operational infrastructure.

**Install:** `/plugin install firebase@pleaseai` | **Repository:** [pleaseai/firebase-plugin](https://github.com/pleaseai/firebase-plugin)

#### Grafana
A Model Context Protocol (MCP) server for Grafana providing access to dashboards, datasources, and querying capabilities.

**Install:** `/plugin install grafana@pleaseai` | **Repository:** [grafana/mcp-grafana](https://github.com/grafana/mcp-grafana)

#### Chrome DevTools MCP
Control and inspect a live Chrome browser through MCP — automate actions, debug, and analyze performance using Chrome DevTools.

**Install:** `/plugin install chrome-devtools-mcp@pleaseai` | **Repository:** [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)


#### Playwright CLI
Token-efficient browser automation CLI for coding agents — navigate, interact, screenshot, and test web apps.

**Install:** `/plugin install playwright-cli@pleaseai` | **Repository:** [pleaseai/playwright-cli](https://github.com/pleaseai/playwright-cli)

---

### Built-in Plugins

#### Plugin Dev
Best practices, guidelines, and validation tools for Claude Code plugin development.

**Install:** `/plugin install plugin-dev@pleaseai` | **Source:** [plugins/plugin-dev](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/plugin-dev)

#### Gatekeeper
Auto-approve safe commands, AI-assisted review for the rest.

**Install:** `/plugin install gatekeeper@pleaseai` | **Source:** [plugins/gatekeeper](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/gatekeeper)

#### Cubic
AI-powered code review using Cubic CLI to detect bugs, security vulnerabilities, and style issues.

**Install:** `/plugin install cubic@pleaseai` | **Source:** [plugins/cubic](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/cubic)

#### MCP Dev
Guide for creating high-quality MCP servers with best practices, TypeScript/Python patterns, and evaluation tools.

**Install:** `/plugin install mcp-dev@pleaseai` | **Source:** [plugins/mcp-dev](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/mcp-dev)

#### Nuxt UI
Nuxt UI component library with comprehensive documentation, templates, and examples via MCP server.

**Install:** `/plugin install nuxt-ui@pleaseai` | **Source:** [plugins/nuxt-ui](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/nuxt-ui)

#### Vue
Vue 3 core, best practices, router patterns, and testing.

**Install:** `/plugin install vue@pleaseai` | **Source:** [plugins/vue](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/vue)

#### Nuxt
Nuxt full-stack Vue framework with SSR, auto-imports, and file-based routing.

**Install:** `/plugin install nuxt@pleaseai` | **Source:** [plugins/nuxt](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/nuxt)

#### Pinia
Pinia official Vue state management library, type-safe and extensible.

**Install:** `/plugin install pinia@pleaseai` | **Source:** [plugins/pinia](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/pinia)

#### VueUse
VueUse composables for building concise, maintainable Vue.js / Nuxt features.

**Install:** `/plugin install vueuse@pleaseai` | **Source:** [plugins/vueuse](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/vueuse)

#### Vite
Vite build tool configuration, plugin API, SSR, and Rolldown migration.

**Install:** `/plugin install vite@pleaseai` | **Source:** [plugins/vite](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/vite)

#### Vitest
Vitest fast unit testing framework powered by Vite with Jest-compatible API.

**Install:** `/plugin install vitest@pleaseai` | **Source:** [plugins/vitest](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/vitest)

#### VitePress
VitePress static site generator powered by Vite and Vue.

**Install:** `/plugin install vitepress@pleaseai` | **Source:** [plugins/vitepress](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/vitepress)

#### UnoCSS
UnoCSS instant atomic CSS engine, superset of Tailwind CSS.

**Install:** `/plugin install unocss@pleaseai` | **Source:** [plugins/unocss](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/unocss)

#### Web Design
Review UI code for Web Interface Guidelines compliance.

**Install:** `/plugin install web-design@pleaseai` | **Source:** [plugins/web-design](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/web-design)

#### Turborepo
Turborepo monorepo build system guidance for task pipelines, caching, and CI optimization.

**Install:** `/plugin install turborepo@pleaseai` | **Source:** [plugins/turborepo](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/turborepo)

#### tsdown
Bundle TypeScript and JavaScript libraries with blazing-fast speed powered by Rolldown.

**Install:** `/plugin install tsdown@pleaseai` | **Source:** [plugins/tsdown](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/tsdown)

#### Slidev
Create and present web-based slides for developers using Markdown and Vue components.

**Install:** `/plugin install slidev@pleaseai` | **Source:** [plugins/slidev](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/slidev)

#### pnpm
Node.js package manager with strict dependency resolution and workspace support.

**Install:** `/plugin install pnpm@pleaseai` | **Source:** [plugins/pnpm](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/pnpm)

#### Antfu
Anthony Fu's opinionated tooling and conventions for JavaScript/TypeScript projects.

**Install:** `/plugin install antfu@pleaseai` | **Source:** [plugins/antfu](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/antfu)

#### Mastra
Official agent skills for coding agents working with the Mastra AI framework.

**Install:** `/plugin install mastra@pleaseai` | **Source:** [plugins/mastra](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/mastra)

#### Supabase
Agent Skills to help developers using AI agents with Supabase.

**Install:** `/plugin install supabase@pleaseai` | **Source:** [plugins/supabase](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/supabase)

#### Prisma
Official agent skills for Prisma ORM — schema design, migrations, queries, and database workflows.

**Install:** `/plugin install prisma@pleaseai` | **Source:** [plugins/prisma](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/prisma)

#### Better Auth
Better Auth authentication framework skills for JavaScript/TypeScript projects.

**Install:** `/plugin install better-auth@pleaseai` | **Source:** [plugins/better-auth](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/better-auth)

#### Agent Browser
Browser and desktop app automation for AI agents — web browsing, Electron app control, Slack automation, and QA testing workflows.

**Install:** `/plugin install agent-browser@pleaseai` | **Source:** [plugins/agent-browser](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/agent-browser)

#### AI SDK
The AI Toolkit for TypeScript — official agent skills for building AI-powered applications and agents with Vercel AI SDK.

**Install:** `/plugin install ai-sdk@pleaseai` | **Source:** [plugins/ai-sdk](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/ai-sdk)

#### Slack Agent
Skills for building Slack agents and bots with Chat SDK, Bolt for JavaScript, and Slack API integrations.

**Install:** `/plugin install slack-agent@pleaseai` | **Source:** [plugins/slack-agent](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/slack-agent)

#### MCP Neo4j
Neo4j MCP servers for graph database operations, memory management, Aura cloud management, and data modeling.

**Install:** `/plugin install mcp-neo4j@pleaseai` | **Source:** [plugins/neo4j](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/neo4j)

#### Worktree
Git worktree isolation: injects context at session start and blocks file access to the parent project path via PreToolUse hooks.

**Install:** `/plugin install worktree@pleaseai` | **Source:** [plugins/worktree](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/worktree)

#### MarkItDown
Convert documents (PDF, DOCX, PPTX, images, etc.) to Markdown using Microsoft's MarkItDown MCP server.

**Install:** `/plugin install markitdown@pleaseai` | **Source:** [plugins/markitdown](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/markitdown)

#### ast-grep
Guide for writing ast-grep rules to perform structural code search and analysis. Use when users need to search codebases using Abstract Syntax Tree (AST) patterns, find specific code structures, or perform complex code queries that go beyond simple text search.

**Install:** `/plugin install ast-grep@pleaseai` | **Source:** [plugins/ast-grep](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/ast-grep)

#### Chat SDK
Build multi-platform chat bots with Chat SDK — unified TypeScript SDK for Slack, Teams, Google Chat, Discord, GitHub, and Linear.

**Install:** `/plugin install chat-sdk@pleaseai` | **Source:** [plugins/chat-sdk](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/chat-sdk)

#### Docus
Write beautiful documentations with Nuxt and Markdown.

**Install:** `/plugin install docus@pleaseai` | **Source:** [plugins/docus](https://github.com/pleaseai/claude-code-plugins/tree/main/plugins/docus)

## Installation

### Add This Marketplace

```bash
/plugin marketplace add pleaseai/claude-code-plugins
```

### Install a Plugin

Once the marketplace is added, install any plugin with:

```bash
# External plugins
/plugin install nanobanana@pleaseai
/plugin install gemini-cli-security@pleaseai
/plugin install flutter@pleaseai
/plugin install code-review@pleaseai
/plugin install spec-kit@pleaseai
/plugin install firebase@pleaseai
/plugin install grafana@pleaseai
/plugin install chrome-devtools-mcp@pleaseai
/plugin install playwright-cli@pleaseai

# Built-in plugins
/plugin install plugin-dev@pleaseai
/plugin install gatekeeper@pleaseai
/plugin install cubic@pleaseai
/plugin install mcp-dev@pleaseai
/plugin install nuxt-ui@pleaseai
/plugin install vue@pleaseai
/plugin install nuxt@pleaseai
/plugin install pinia@pleaseai
/plugin install vueuse@pleaseai
/plugin install vite@pleaseai
/plugin install vitest@pleaseai
/plugin install vitepress@pleaseai
/plugin install unocss@pleaseai
/plugin install web-design@pleaseai
/plugin install turborepo@pleaseai
/plugin install tsdown@pleaseai
/plugin install slidev@pleaseai
/plugin install pnpm@pleaseai
/plugin install antfu@pleaseai
/plugin install mastra@pleaseai
/plugin install supabase@pleaseai
/plugin install prisma@pleaseai
/plugin install better-auth@pleaseai
/plugin install agent-browser@pleaseai
/plugin install ai-sdk@pleaseai
/plugin install slack-agent@pleaseai
/plugin install mcp-neo4j@pleaseai
/plugin install worktree@pleaseai
/plugin install markitdown@pleaseai
/plugin install chat-sdk@pleaseai
/plugin install docus@pleaseai
```

## What Are Claude Code Plugins?

Claude Code plugins are customizable extensions that can include:

- **Slash Commands**: Create shortcuts for frequent operations
- **Subagents**: Purpose-built agents for specialized tasks
- **MCP Servers**: Connect to external tools and data sources
- **Hooks**: Customize Claude Code's workflow behavior
- **Context Files**: AI-specific instructions loaded automatically on session start

Plugins can be easily toggled on and off as needed, making them perfect for:
- Enforcing team coding standards
- Supporting open source package usage
- Sharing productivity workflows
- Connecting internal tools
- Bundling related customizations

## Development

### Antfu Skill Plugins

The antfu-based skill plugins (vue, nuxt, vite, etc.) are managed via `scripts/cli.ts`, which mirrors the behavior of [antfu/skills](https://github.com/antfu/skills).

#### Skill Source Types

| Type | Location | How it works |
|------|----------|-------------|
| **Type 1 (Generated)** | `sources/{name}/` | Clone source repo, generate skills manually via `/generate-skill` |
| **Type 2 (Vendored)** | `vendor/{name}/` | Clone repo with existing `skills/` dir, sync automatically |
| **Type 3 (Manual)** | `vendor/antfu-skills/skills/antfu/` | Hand-written by Anthony Fu, read directly |

#### CLI Commands

```bash
# Add submodules defined in scripts/meta.ts
bun run skills:init

# Update vendor submodules + copy skills to plugins/
bun run skills:sync

# Check for upstream updates
bun run skills:check

# Remove stale submodules and plugin skills
bun run skills:cleanup
```

#### Adding a New Vendor (Type 2)

1. Add entry to `vendors` in `scripts/meta.ts`:
   ```ts
   "my-lib": {
     source: "https://github.com/org/my-lib",
     skills: { "my-skill": "my-skill" },
   }
   ```
2. Add skill → plugin mapping in `SKILL_TO_PLUGIN` in `scripts/cli.ts`
3. Run `bun run skills:init` then `bun run skills:sync`

#### Adding a New Source (Type 1)

1. Add entry to `submodules` in `scripts/meta.ts`:
   ```ts
   "my-lib": "https://github.com/org/my-lib"
   ```
2. Run `bun run skills:init` to clone the repo to `sources/my-lib/`
3. Generate skills using `/generate-skill my-lib`
4. Add skill → plugin mapping in `SKILL_TO_PLUGIN` in `scripts/cli.ts`
5. Run `bun run skills:sync`

## Support

For questions or issues:
- Email: support@passionfactory.ai
- Repository Issues: [Create an issue](https://github.com/pleaseai/claude-code-plugins/issues)

## License

This marketplace is licensed under the [MIT License](LICENSE).

Please refer to individual plugin repositories for their respective licenses.

---

