---
name: Find Plugin
description: Helps users discover and install Claude Code plugins from the pleaseai marketplace. Use this skill whenever a user asks "how do I do X", "find a plugin for X", "is there a plugin that can...", "recommend a plugin", "what plugins are available", wants to extend Claude Code capabilities, or mentions a technology/framework and could benefit from a plugin they haven't installed yet. Also use when the user is stuck on a task that an available plugin could solve, even if they don't explicitly ask for a plugin.
allowed-tools: Bash, Read, Glob, Grep
---

# Find Plugin

Search the pleaseai marketplace to discover and recommend Claude Code plugins that match the user's needs.

## How It Works

The marketplace provides two layers of discovery:

1. **Plugin catalog** — the marketplace manifest lists every available plugin with its name, description, category, and keywords.
2. **Skill index** — installed plugins expose skills (SKILL.md files) that describe specific capabilities in detail. Searching skill descriptions surfaces more precise matches than plugin metadata alone.

## Step 1: Read the Marketplace Catalog

```bash
cat ~/.claude/plugins/marketplaces/pleaseai/.claude-plugin/marketplace.json
```

Parse the `plugins` array. Each entry contains:
- `name` — plugin identifier (used in install command)
- `description` — what the plugin does
- `category` — broad domain (framework, tooling, database, ai, etc.)
- `keywords` — searchable tags

## Step 2: Search Installed Plugin Skills

Skills offer richer descriptions than the top-level plugin metadata. Scan skill files for matches:

```bash
# List all available skill directories
find ~/.claude/plugins/marketplaces/pleaseai/plugins/*/skills -maxdepth 1 -type d 2>/dev/null

# Search skill descriptions for the user's query terms (covers both skills/ and .agents/skills/ layouts)
grep -rilFi "<search-terms>" ~/.claude/plugins/marketplaces/pleaseai/plugins/*/{skills,.agents/skills}/*/SKILL.md 2>/dev/null
```

Read the SKILL.md frontmatter (`name` and `description` fields) of matching skills to understand what each one provides.

## Step 3: Match and Rank

Score each plugin against the user's query:

1. **Direct keyword match** — plugin name, keywords, or category directly matches the query
2. **Skill-level match** — a skill description within the plugin matches the query
3. **Semantic match** — the plugin's description addresses the user's underlying need even without exact keyword overlap

Prioritize plugins that solve the user's immediate problem over tangentially related ones. Deduplicate the combined results from Step 1 and Step 2 before ranking — the same plugin may appear in both the catalog and skill search.

## Step 4: Present Recommendations

For each recommended plugin, show:

```
**{plugin-name}** — {description}
  Category: {category}
  Install: claude plugin install {plugin-name}@pleaseai
```

Group results by relevance:
- **Best matches** — directly address the user's need
- **Related** — might be useful depending on context

If a plugin is already installed, indicate that:
```
**{plugin-name}** (installed) — {description}
```

Check installed status from the installed plugins registry:
```bash
jq -r '.plugins | keys[]' ~/.claude/plugins/installed_plugins.json
```

Check if `{plugin-name}@pleaseai` appears in the output. A plugin is installed if its key exists in this file.

## Step 5: Offer Installation

After presenting recommendations, offer to install:

> "Want me to install any of these? Just say which ones."

Install with:
```bash
claude plugin install {plugin-name}@pleaseai
```

## When No Plugin Exists

If no plugin matches the user's need:

1. Say so clearly — don't force a bad match
2. Offer to help directly with the task using available tools
3. If the need is common enough, suggest it could become a plugin

## Plugin Categories

Quick reference for the types of plugins available:

| Category | Examples |
|----------|----------|
| **Framework** | nuxt, vue, react, next, vitepress, slidev, tiptap |
| **Mobile** | flutter, react-native |
| **Database** | prisma, supabase, mcp-neo4j |
| **Tooling** | vite, pnpm, turborepo, tsdown, gatekeeper, ast-grep |
| **AI** | nanobanana, ai-sdk, mastra, gemini |
| **Monitoring** | grafana, sentry, posthog |
| **Cloud/Deploy** | firebase, vercel |
| **Payments** | stripe, tosspayments, revenuecat |
| **Browser** | chrome-devtools-mcp, agent-browser, playwright-cli |
| **Productivity** | google-workspace, notion |
| **Security** | gemini-cli-security |
| **Review** | code-review, cubic |
| **Document** | markitdown, edgeparse, fetch |
| **Development** | plugin-dev, mcp-dev, please-plugins, git-ai |
