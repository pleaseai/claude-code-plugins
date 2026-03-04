#!/usr/bin/env bun
/**
 * Manage vendor skill submodules and sync skills into plugins/.
 * Mirrors the structure of vendor/antfu-skills/scripts/cli.ts.
 *
 * Commands:
 *   bun scripts/cli.ts init     # add vendor submodules to this repo
 *   bun scripts/cli.ts sync     # update submodules + copy skills to plugins/
 *   bun scripts/cli.ts check    # check for available upstream updates
 *   bun scripts/cli.ts cleanup  # remove stale submodules and plugin skills
 */
import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { submodules, vendors } from "./meta.ts"

const ROOT = resolve(import.meta.dirname!, "..")
const ANTFU_SKILLS_DIR = join(ROOT, "vendor/antfu-skills/skills")
const PLUGINS_DIR = join(ROOT, "plugins")

// ---------------------------------------------------------------------------
// skill dir name → plugin dir name
// ---------------------------------------------------------------------------
const SKILL_TO_PLUGIN: Record<string, string> = {
  // Type 1: generated, read from vendor/antfu-skills/skills/
  antfu: "antfu",
  nuxt: "nuxt",
  pinia: "pinia",
  pnpm: "pnpm",
  unocss: "unocss",
  vite: "vite",
  vitepress: "vitepress",
  vitest: "vitest",
  vue: "vue",
  // Type 2: vendor submodules
  "vue-best-practices": "vue",
  "vue-router-best-practices": "vue",
  "vue-testing-best-practices": "vue",
  slidev: "slidev",
  tsdown: "tsdown",
  turborepo: "turborepo",
  "vueuse-functions": "vueuse",
  "web-design-guidelines": "web-design",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function exec(cmd: string, cwd = ROOT): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
}

function execSafe(cmd: string, cwd = ROOT): string | null {
  try {
    return exec(cmd, cwd)
  } catch {
    return null
  }
}

function getGitSha(dir: string): string | null {
  return execSafe("git rev-parse HEAD", dir)
}

function isSubmoduleRegistered(submodulePath: string): boolean {
  const gitmodules = join(ROOT, ".gitmodules")
  if (!existsSync(gitmodules)) return false
  return readFileSync(gitmodules, "utf-8").includes(`path = ${submodulePath}`)
}

function getRegisteredSubmodulePaths(): string[] {
  const gitmodules = join(ROOT, ".gitmodules")
  if (!existsSync(gitmodules)) return []
  return Array.from(readFileSync(gitmodules, "utf-8").matchAll(/path\s*=\s*(.+)/g), m => m[1].trim())
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
async function initSubmodules() {
  // Type 1: sources
  console.log("Initializing source submodules...\n")
  for (const [name, url] of Object.entries(submodules)) {
    const submodulePath = `sources/${name}`
    const fullPath = join(ROOT, submodulePath)

    if (isSubmoduleRegistered(submodulePath)) {
      if (!existsSync(join(fullPath, ".git"))) {
        process.stdout.write(`  init: ${submodulePath} ... `)
        execSafe(`git submodule update --init ${submodulePath}`)
        console.log("done")
      } else {
        console.log(`  already initialized: ${submodulePath}`)
      }
      continue
    }

    process.stdout.write(`  adding: ${name}  (${url}) ... `)
    try {
      mkdirSync(dirname(fullPath), { recursive: true })
      exec(`git submodule add ${url} ${submodulePath}`)
      console.log("done")
    } catch (e) {
      console.error(`failed\n    ${e}`)
    }
  }

  // Type 2: vendors
  console.log("\nInitializing vendor submodules...\n")
  for (const [name, config] of Object.entries(vendors)) {
    const submodulePath = `vendor/${name}`
    const fullPath = join(ROOT, submodulePath)

    if (isSubmoduleRegistered(submodulePath)) {
      if (!existsSync(join(fullPath, ".git"))) {
        process.stdout.write(`  init: ${submodulePath} ... `)
        execSafe(`git submodule update --init ${submodulePath}`)
        console.log("done")
      } else {
        console.log(`  already initialized: ${submodulePath}`)
      }
      continue
    }

    process.stdout.write(`  adding: ${name}  (${config.source}) ... `)
    try {
      mkdirSync(dirname(fullPath), { recursive: true })
      exec(`git submodule add ${config.source} ${submodulePath}`)
      console.log("done")
    } catch (e) {
      console.error(`failed\n    ${e}`)
    }
  }

  console.log("\nDone.")
}

// ---------------------------------------------------------------------------
// sync
// ---------------------------------------------------------------------------
async function syncSubmodules() {
  // 1. Update each vendor submodule
  process.stdout.write("Updating vendor submodules... ")
  for (const name of Object.keys(vendors)) {
    const submodulePath = `vendor/${name}`
    if (isSubmoduleRegistered(submodulePath)) {
      execSafe(`git submodule update --remote --merge ${submodulePath}`)
    }
  }
  console.log("done\n")

  // 2. Copy vendor skills → vendor/antfu-skills/skills/
  console.log("Syncing vendor skills...")
  for (const [name, config] of Object.entries(vendors)) {
    const submodulePath = `vendor/${name}`
    const vendorPath = join(ROOT, submodulePath)

    if (!isSubmoduleRegistered(submodulePath) || !existsSync(vendorPath)) {
      console.warn(`  ! not initialized: ${name}  (run: bun scripts/cli.ts init)`)
      continue
    }

    const vendorSkillsDir = join(vendorPath, "skills")
    if (!existsSync(vendorSkillsDir)) {
      console.warn(`  ! no skills/ in vendor/${name}`)
      continue
    }

    for (const [srcSkill, outSkill] of Object.entries(config.skills)) {
      const src = join(vendorSkillsDir, srcSkill)
      const dest = join(ANTFU_SKILLS_DIR, outSkill)

      if (!existsSync(src)) {
        console.warn(`  ! skill not found: vendor/${name}/skills/${srcSkill}`)
        continue
      }

      process.stdout.write(`  ${srcSkill} → skills/${outSkill} ... `)
      rmSync(dest, { recursive: true, force: true })
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })

      // Copy LICENSE from vendor root
      const licenseNames = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md", "license.txt"]
      for (const licenseName of licenseNames) {
        const licensePath = join(vendorPath, licenseName)
        if (existsSync(licensePath)) {
          cpSync(licensePath, join(dest, "LICENSE.md"))
          break
        }
      }

      // Write SYNC.md
      const sha = getGitSha(vendorPath)
      const date = new Date().toISOString().split("T")[0]
      writeFileSync(join(dest, "SYNC.md"), `# Sync Info\n\n- **Source:** \`vendor/${name}/skills/${srcSkill}\`\n- **Git SHA:** \`${sha}\`\n- **Synced:** ${date}\n`)

      console.log("done")
    }
  }

  // 3. Copy all skills → plugins/*/skills/
  console.log("\nCopying skills to plugins...")
  const pluginList = [...new Set(Object.values(SKILL_TO_PLUGIN))].sort()

  for (const plugin of pluginList) {
    const pluginDir = join(PLUGINS_DIR, plugin)
    const skillsDir = join(pluginDir, "skills")
    mkdirSync(skillsDir, { recursive: true })

    // Ensure package.json for release-please
    const pkgPath = join(pluginDir, "package.json")
    if (!existsSync(pkgPath)) {
      writeFileSync(pkgPath, `${JSON.stringify({ name: plugin, version: "0.0.1", private: true }, null, 2)}\n`)
    }

    for (const [skill, targetPlugin] of Object.entries(SKILL_TO_PLUGIN)) {
      if (targetPlugin !== plugin) continue
      const src = join(ANTFU_SKILLS_DIR, skill)
      const dest = join(skillsDir, skill)
      if (!existsSync(src)) {
        console.warn(`  ! skill not found: ${skill}`)
        continue
      }
      rmSync(dest, { recursive: true, force: true })
      cpSync(src, dest, { recursive: true })
    }

    // turborepo: copy command file
    if (plugin === "turborepo") {
      const commandsDir = join(pluginDir, "commands")
      mkdirSync(commandsDir, { recursive: true })
      const src = join(ANTFU_SKILLS_DIR, "turborepo/command/turborepo.md")
      const dest = join(commandsDir, "turborepo.md")
      if (existsSync(src)) {
        rmSync(dest, { force: true })
        cpSync(src, dest)
      }
    }

    console.log(`  ✓ ${plugin}`)
  }

  console.log(`\nDone. Synced ${pluginList.length} plugins.`)
}

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------
async function checkUpdates() {
  process.stdout.write("Fetching remote changes... ")
  for (const name of Object.keys(submodules)) {
    const path = join(ROOT, "sources", name)
    if (existsSync(path)) execSafe("git fetch", path)
  }
  for (const name of Object.keys(vendors)) {
    const path = join(ROOT, "vendor", name)
    if (existsSync(path)) execSafe("git fetch", path)
  }
  console.log("done\n")

  const updates: { name: string; type: string; behind: number }[] = []

  for (const name of Object.keys(submodules)) {
    const path = join(ROOT, "sources", name)
    if (!existsSync(path)) continue
    const behind = execSafe("git rev-list HEAD..@{u} --count", path)
    const count = behind ? Number.parseInt(behind) : 0
    if (count > 0) updates.push({ name, type: "source", behind: count })
  }

  for (const name of Object.keys(vendors)) {
    const path = join(ROOT, "vendor", name)
    if (!existsSync(path)) continue
    const behind = execSafe("git rev-list HEAD..@{u} --count", path)
    const count = behind ? Number.parseInt(behind) : 0
    if (count > 0) updates.push({ name, type: "vendor", behind: count })
  }

  if (updates.length === 0) {
    console.log("All submodules are up to date.")
  } else {
    console.log("Updates available:")
    for (const u of updates) {
      console.log(`  ${u.name} (${u.type}): ${u.behind} commits behind`)
    }
  }
}

// ---------------------------------------------------------------------------
// cleanup
// ---------------------------------------------------------------------------
async function cleanup() {
  // 1. Extra submodules not in meta.ts
  const expectedPaths = new Set([
    ...Object.keys(submodules).map(n => `sources/${n}`),
    ...Object.keys(vendors).map(n => `vendor/${n}`),
    "vendor/antfu-skills",
  ])
  const registered = getRegisteredSubmodulePaths().filter(
    p => p.startsWith("sources/") || (p.startsWith("vendor/") && p !== "vendor/antfu-skills"),
  )
  const extraSubmodules = registered.filter(p => !expectedPaths.has(p))

  if (extraSubmodules.length > 0) {
    console.log("Removing extra vendor submodules:")
    for (const submodulePath of extraSubmodules) {
      process.stdout.write(`  ${submodulePath} ... `)
      try {
        execSafe(`git submodule deinit -f ${submodulePath}`)
        const gitModulesCache = join(ROOT, ".git/modules", submodulePath)
        if (existsSync(gitModulesCache)) rmSync(gitModulesCache, { recursive: true })
        exec(`git rm -f ${submodulePath}`)
        console.log("removed")
      } catch (e) {
        console.error(`failed: ${e}`)
      }
    }
  }

  // 2. Stale skill directories in plugins/
  const expectedSkills = new Set(Object.keys(SKILL_TO_PLUGIN))
  let cleanedPlugins = 0

  const pluginList = [...new Set(Object.values(SKILL_TO_PLUGIN))].sort()
  for (const plugin of pluginList) {
    const skillsDir = join(PLUGINS_DIR, plugin, "skills")
    if (!existsSync(skillsDir)) continue

    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (!expectedSkills.has(entry.name)) {
        process.stdout.write(`  removing stale skill: plugins/${plugin}/skills/${entry.name} ... `)
        rmSync(join(skillsDir, entry.name), { recursive: true })
        console.log("done")
        cleanedPlugins++
      }
    }
  }

  if (extraSubmodules.length === 0 && cleanedPlugins === 0) {
    console.log("Everything is clean.")
  } else {
    console.log("Cleanup done.")
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const command = process.argv[2]

switch (command) {
  case "init":
    await initSubmodules()
    break
  case "sync":
    await syncSubmodules()
    break
  case "check":
    await checkUpdates()
    break
  case "cleanup":
    await cleanup()
    break
  default:
    console.log("Usage: bun scripts/cli.ts <command>")
    console.log()
    console.log("Commands:")
    console.log("  init     Add vendor submodules to this repo")
    console.log("  sync     Update submodules and copy skills to plugins/")
    console.log("  check    Check for available upstream updates")
    console.log("  cleanup  Remove stale submodules and plugin skills")
    process.exit(1)
}
