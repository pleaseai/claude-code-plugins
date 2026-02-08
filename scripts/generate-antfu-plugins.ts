#!/usr/bin/env bun
/**
 * Generate Claude Code plugins from vendor/antfu-skills
 * Idempotent: safe to run multiple times
 *
 * Usage: bun scripts/generate-antfu-plugins.ts
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const REPO_ROOT = resolve(import.meta.dirname!, "..")
const VENDOR_SKILLS = join(REPO_ROOT, "vendor/antfu-skills/skills")
const PLUGINS_DIR = join(REPO_ROOT, "plugins")

if (!existsSync(VENDOR_SKILLS)) {
  console.error("ERROR: vendor/antfu-skills/skills not found. Run: git submodule update --init")
  process.exit(1)
}

// skill-name -> plugin-name mapping
const SKILL_TO_PLUGIN: Record<string, string> = {
  antfu: "antfu",
  nuxt: "nuxt",
  pinia: "pinia",
  pnpm: "pnpm",
  slidev: "slidev",
  tsdown: "tsdown",
  turborepo: "turborepo",
  unocss: "unocss",
  vite: "vite",
  vitepress: "vitepress",
  vitest: "vitest",
  vue: "vue",
  "vue-best-practices": "vue",
  "vue-router-best-practices": "vue",
  "vue-testing-best-practices": "vue",
  "vueuse-functions": "vueuse",
  "web-design-guidelines": "web-design",
}

// plugin -> description (manual overrides)
const PLUGIN_DESCRIPTIONS: Record<string, string> = {
  antfu: "Anthony Fu's opinionated tooling and conventions for JavaScript/TypeScript projects",
  slidev: "Create and present web-based slides for developers using Markdown, Vue components, code highlighting, and animations",
  tsdown: "Bundle TypeScript and JavaScript libraries with blazing-fast speed powered by Rolldown",
  turborepo: "Turborepo monorepo build system guidance for task pipelines, caching, CI optimization, and the turbo CLI",
  vue: "Vue 3 core, best practices, router patterns, and testing",
  vueuse: "Apply VueUse composables where appropriate to build concise, maintainable Vue.js / Nuxt features",
  "web-design": "Review UI code for Web Interface Guidelines compliance",
}

// plugin -> keywords
const PLUGIN_KEYWORDS: Record<string, string[]> = {
  antfu: ["antfu", "conventions", "eslint", "typescript"],
  nuxt: ["nuxt", "vue", "ssr", "antfu"],
  pinia: ["pinia", "vue", "state-management", "antfu"],
  pnpm: ["pnpm", "package-manager", "monorepo", "antfu"],
  slidev: ["slidev", "slides", "presentation", "antfu"],
  tsdown: ["tsdown", "bundler", "typescript", "antfu"],
  turborepo: ["turborepo", "monorepo", "build-system", "antfu"],
  unocss: ["unocss", "css", "atomic-css", "antfu"],
  vite: ["vite", "build-tool", "bundler", "antfu"],
  vitepress: ["vitepress", "documentation", "static-site", "antfu"],
  vitest: ["vitest", "testing", "unit-test", "antfu"],
  vue: ["vue", "vue3", "composition-api", "antfu"],
  vueuse: ["vueuse", "vue", "composables", "antfu"],
  "web-design": ["web-design", "ui", "accessibility", "antfu"],
}

/** Extract description from SKILL.md frontmatter */
function extractDescription(skillDir: string): string {
  const skillMd = join(skillDir, "SKILL.md")
  if (!existsSync(skillMd)) return ""

  const content = readFileSync(skillMd, "utf-8")
  const lines = content.split("\n")

  let frontmatterCount = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === "---") {
      frontmatterCount++
      if (frontmatterCount >= 2) break
      continue
    }

    if (frontmatterCount !== 1) continue

    const match = line.match(/^description:\s*(.*)$/)
    if (!match) continue

    const value = match[1].trim()
    // Inline value (not multiline indicator)
    if (value && value !== "|" && value !== ">") {
      return value.replace(/^["']|["']$/g, "")
    }
    // Multiline: read next line
    if (i + 1 < lines.length) {
      return lines[i + 1].trim()
    }
  }
  return ""
}

/** Get the primary skill name for a plugin (for homepage URL) */
function primarySkillForPlugin(plugin: string): string {
  switch (plugin) {
    case "vueuse": return "vueuse-functions"
    case "web-design": return "web-design-guidelines"
    default: return plugin
  }
}

// Collect unique plugin names, sorted
const pluginList = [...new Set(Object.values(SKILL_TO_PLUGIN))].sort()

console.log(`Generating ${pluginList.length} plugins...`)

for (const plugin of pluginList) {
  const pluginDir = join(PLUGINS_DIR, plugin)
  const manifestDir = join(pluginDir, ".claude-plugin")
  const skillsDir = join(pluginDir, "skills")

  mkdirSync(manifestDir, { recursive: true })
  mkdirSync(skillsDir, { recursive: true })

  // Determine description
  let desc = PLUGIN_DESCRIPTIONS[plugin]
  if (!desc) {
    const primarySkill = primarySkillForPlugin(plugin)
    desc = extractDescription(join(VENDOR_SKILLS, primarySkill))
  }

  // Truncate if too long
  if (desc.length > 200) {
    desc = `${desc.slice(0, 197)}...`
  }

  const keywords = PLUGIN_KEYWORDS[plugin] ?? [plugin, "antfu"]
  const primarySkill = primarySkillForPlugin(plugin)

  // Write plugin.json
  const manifest = {
    name: plugin,
    version: "1.1.0",
    description: desc,
    author: {
      name: "Anthony Fu",
      url: "https://github.com/antfu",
    },
    homepage: `https://github.com/antfu/skills/tree/main/skills/${primarySkill}`,
    repository: "https://github.com/antfu/skills",
    license: "MIT",
    keywords,
  }

  writeFileSync(
    join(manifestDir, "plugin.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )

  // Copy skills (not symlink - plugins don't resolve symlinks)
  for (const [skill, targetPlugin] of Object.entries(SKILL_TO_PLUGIN)) {
    if (targetPlugin !== plugin) continue

    const src = join(VENDOR_SKILLS, skill)
    const dest = join(skillsDir, skill)

    rmSync(dest, { recursive: true, force: true })
    cpSync(src, dest, { recursive: true })
  }

  // Special case: turborepo has commands
  if (plugin === "turborepo") {
    const commandsDir = join(pluginDir, "commands")
    mkdirSync(commandsDir, { recursive: true })

    const src = join(VENDOR_SKILLS, "turborepo/command/turborepo.md")
    const dest = join(commandsDir, "turborepo.md")

    rmSync(dest, { force: true })
    cpSync(src, dest)
  }

  console.log(`  ✓ ${plugin}`)
}

console.log(`Done. Generated ${pluginList.length} plugins in plugins/`)
