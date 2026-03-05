#!/usr/bin/env bun
/**
 * Manage vendor skill submodules and sync skills into plugins/.
 * Mirrors the structure of vendor/antfu-skills/scripts/cli.ts.
 *
 * Commands:
 *   bun scripts/cli.ts init     # add vendor submodules to this repo
 *   bun scripts/cli.ts sync     # update submodules + copy skills directly to plugins/
 *   bun scripts/cli.ts check    # check for available upstream updates
 *   bun scripts/cli.ts cleanup  # remove stale submodules and plugin skills
 */
import { execFileSync, execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { submodules, vendors } from "./meta.ts"

const ROOT = resolve(import.meta.dirname!, "..")
const ANTFU_MANUAL_DIR = join(ROOT, "vendor/antfu-skills/skills") // read-only: Type 3 manual skills
const PLUGINS_DIR = join(ROOT, "plugins")

// ---------------------------------------------------------------------------
// skill dir name → plugin dir name
// ---------------------------------------------------------------------------
export const SKILL_TO_PLUGIN: Record<string, string> = {
  // Type 1: generated directly into plugins/{plugin}/skills/{skill}/ via /generate-skill
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
  mastra: "mastra",
  "nuxt-ui": "nuxt-ui",
  "supabase-postgres-best-practices": "supabase",
  "prisma-cli": "prisma",
  "prisma-client-api": "prisma",
  "prisma-database-setup": "prisma",
  "prisma-driver-adapter-implementation": "prisma",
  "prisma-postgres": "prisma",
  "prisma-upgrade-v7": "prisma",
  "best-practices": "better-auth",
  "create-auth": "better-auth",
  emailAndPassword: "better-auth",
  organization: "better-auth",
  twoFactor: "better-auth",
  "agent-browser": "agent-browser",
  dogfood: "agent-browser",
  electron: "agent-browser",
  slack: "agent-browser",
  "use-ai-sdk": "ai-sdk",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// NOTE: exec/execSafe use shell execution. Do NOT call with user-provided or
// external input — use execFile/execFileSafe instead (they bypass the shell).
export function exec(cmd: string, cwd = ROOT): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
}

export function execSafe(cmd: string, cwd = ROOT): string | null {
  try {
    return exec(cmd, cwd)
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e)
    process.stderr.write(`  [warn] command failed: ${cmd}\n         ${msg}\n`)
    return null
  }
}

export function execFile(cmd: string, args: string[], cwd = ROOT): string {
  return execFileSync(cmd, args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
}

export function execFileSafe(cmd: string, args: string[], cwd = ROOT): string | null {
  try {
    return execFile(cmd, args, cwd)
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e)
    process.stderr.write(`  [warn] command failed: ${cmd} ${args.join(" ")}\n         ${msg}\n`)
    return null
  }
}

export function getGitSha(dir: string): string | null {
  return execSafe("git rev-parse HEAD", dir)
}

export function isSubmoduleRegistered(submodulePath: string): boolean {
  return getRegisteredSubmodulePaths().includes(submodulePath)
}

export function getRegisteredSubmodulePaths(): string[] {
  const gitmodules = join(ROOT, ".gitmodules")
  if (!existsSync(gitmodules)) return []
  return Array.from(readFileSync(gitmodules, "utf-8").matchAll(/^\s*path\s*=\s*(\S+)/gm), m => m[1] ?? "")
}

export function ensurePlugin(plugin: string) {
  const pluginDir = join(PLUGINS_DIR, plugin)
  mkdirSync(join(pluginDir, "skills"), { recursive: true })
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
export async function initSubmodules() {
  // Type 1: sources
  console.log("Initializing source submodules...\n")
  for (const [name, url] of Object.entries(submodules)) {
    const submodulePath = `sources/${name}`
    const fullPath = join(ROOT, submodulePath)

    if (isSubmoduleRegistered(submodulePath)) {
      if (!existsSync(join(fullPath, ".git"))) {
        process.stdout.write(`  init: ${submodulePath} ... `)
        execFileSafe("git", ["submodule", "update", "--init", submodulePath])
        console.log("done")
      } else {
        console.log(`  already initialized: ${submodulePath}`)
      }
      continue
    }

    process.stdout.write(`  adding: ${name}  (${url}) ... `)
    try {
      mkdirSync(dirname(fullPath), { recursive: true })
      execFile("git", ["submodule", "add", url, submodulePath])
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
        execFileSafe("git", ["submodule", "update", "--init", submodulePath])
        console.log("done")
      } else {
        console.log(`  already initialized: ${submodulePath}`)
      }
      continue
    }

    process.stdout.write(`  adding: ${name}  (${config.source}) ... `)
    try {
      mkdirSync(dirname(fullPath), { recursive: true })
      execFile("git", ["submodule", "add", config.source, submodulePath])
      console.log("done")
    } catch (e) {
      console.error(`failed\n    ${e}`)
    }
  }

  console.log("\nDone.")
}

// ---------------------------------------------------------------------------
// sync helpers
// ---------------------------------------------------------------------------
export function hasGitChanges(paths: string[]): boolean {
  const status = execFileSafe("git", ["status", "--porcelain", "--", ...paths])
  if (status === null) throw new Error("git status failed")
  return status.trim() !== ""
}

export function commitChanges(paths: string[], message: string) {
  execFile("git", ["add", "--", ...paths])
  execFile("git", ["commit", "-m", message])
}

// ---------------------------------------------------------------------------
// sync
// ---------------------------------------------------------------------------
export async function syncSubmodules() {
  const committed: string[] = []

  // 1. Sync Type 2 vendor skills → plugins/{plugin}/skills/{skill}/ + commit per vendor
  console.log("Syncing vendor skills to plugins...\n")
  for (const [name, config] of Object.entries(vendors)) {
    const submodulePath = `vendor/${name}`
    const vendorPath = join(ROOT, submodulePath)

    if (!isSubmoduleRegistered(submodulePath) || !existsSync(vendorPath)) {
      console.warn(`  ! not initialized: ${name}  (run: bun scripts/cli.ts init)`)
      continue
    }

    // Update submodule to latest
    process.stdout.write(`[${name}] updating submodule... `)
    const updated = execFileSafe("git", ["submodule", "update", "--remote", "--merge", submodulePath])
    if (updated === null) {
      console.log("FAILED")
      console.warn(`  ! Skipping ${name} to avoid committing stale content.`)
      continue
    }
    const sha = getGitSha(vendorPath)
    console.log(`${sha?.slice(0, 7) ?? "?"}`)

    const skillsDirValue = config.skillsDir ?? "skills"
    const vendorSkillsDir = join(vendorPath, skillsDirValue)
    const resolvedSkillsDir = resolve(vendorSkillsDir)
    const resolvedVendorPath = resolve(vendorPath)
    if (
      resolvedSkillsDir !== resolvedVendorPath &&
      !resolvedSkillsDir.startsWith(`${resolvedVendorPath}/`) &&
      !resolvedSkillsDir.startsWith(`${resolvedVendorPath}\\`)
    ) {
      console.error(`  ! invalid skillsDir for ${name}: "${config.skillsDir}" (escapes vendor directory)`)
      continue
    }
    if (!existsSync(vendorSkillsDir)) {
      console.warn(`  ! no ${skillsDirValue}/ in vendor/${name}`)
      continue
    }

    const changedPaths: string[] = [submodulePath]

    for (const [srcSkill, outSkill] of Object.entries(config.skills)) {
      const src = join(vendorSkillsDir, srcSkill)
      const plugin = SKILL_TO_PLUGIN[outSkill]
      if (!plugin) {
        console.warn(`  ! no plugin mapping for skill: ${outSkill}`)
        continue
      }
      if (!existsSync(src)) {
        const relSrc = skillsDirValue === "." ? `vendor/${name}/${srcSkill}` : `vendor/${name}/${skillsDirValue}/${srcSkill}`
        console.warn(`  ! skill not found: ${relSrc}`)
        continue
      }

      ensurePlugin(plugin)
      const dest = join(PLUGINS_DIR, plugin, "skills", outSkill)
      const destRelative = `plugins/${plugin}/skills/${outSkill}`

      process.stdout.write(`  ${srcSkill} → ${destRelative} ... `)
      try {
        rmSync(dest, { recursive: true, force: true })
        mkdirSync(dest, { recursive: true })
        cpSync(src, dest, { recursive: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`FAILED\n  ! could not copy ${srcSkill}: ${msg}`)
        rmSync(dest, { recursive: true, force: true })
        continue
      }

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
      const date = new Date().toISOString().split("T")[0]
      const skillsSubpath = skillsDirValue === "." ? srcSkill : `${skillsDirValue}/${srcSkill}`
      writeFileSync(join(dest, "SYNC.md"), `# Sync Info\n\n- **Source:** \`vendor/${name}/${skillsSubpath}\`\n- **Git SHA:** \`${sha}\`\n- **Synced:** ${date}\n`)

      changedPaths.push(destRelative)
      console.log("done")
    }

    // turborepo: also sync command file
    if (name === "turborepo") {
      const turborepoCommandSrc = join(PLUGINS_DIR, "turborepo/skills/turborepo/command/turborepo.md")
      if (existsSync(turborepoCommandSrc)) {
        const commandsDir = join(PLUGINS_DIR, "turborepo/commands")
        mkdirSync(commandsDir, { recursive: true })
        const dest = join(commandsDir, "turborepo.md")
        rmSync(dest, { force: true })
        cpSync(turborepoCommandSrc, dest)
        changedPaths.push("plugins/turborepo/commands/turborepo.md")
        console.log("  turborepo command synced")
      }
    }

    // Commit this vendor's changes
    if (hasGitChanges(changedPaths)) {
      if (sha === null) {
        console.warn(`  ! WARNING: could not read git SHA for vendor/${name}. Commit message will say 'unknown'.`)
      }
      const shortSha = sha?.slice(0, 7) ?? "unknown"
      commitChanges(changedPaths, `chore(sync): sync ${name} to ${shortSha}`)
      committed.push(name)
      console.log(`  → committed: chore(sync): sync ${name} to ${shortSha}\n`)
    } else {
      console.log(`  → no changes\n`)
    }
  }

  // 2. Copy Type 3 manual skills from vendor/antfu-skills/skills/ → plugins/{plugin}/skills/
  console.log("Syncing manual skills to plugins...")
  const manualPaths: string[] = []
  for (const skill of ["antfu"]) {
    const plugin = SKILL_TO_PLUGIN[skill]
    if (!plugin) continue

    const src = join(ANTFU_MANUAL_DIR, skill)
    if (!existsSync(src)) {
      console.warn(`  ! manual skill not found: ${skill}`)
      continue
    }

    ensurePlugin(plugin)
    const dest = join(PLUGINS_DIR, plugin, "skills", skill)

    process.stdout.write(`  ${skill} → plugins/${plugin}/skills/${skill} ... `)
    rmSync(dest, { recursive: true, force: true })
    cpSync(src, dest, { recursive: true, verbatimSymlinks: true })
    manualPaths.push(`plugins/${plugin}/skills/${skill}`)
    console.log("done")
  }

  if (manualPaths.length > 0 && hasGitChanges(manualPaths)) {
    const sha = getGitSha(join(ROOT, "vendor/antfu-skills"))
    const shortSha = sha?.slice(0, 7) ?? "unknown"
    commitChanges(manualPaths, `chore(sync): sync antfu manual skills to ${shortSha}`)
    committed.push("antfu-skills")
    console.log(`  → committed: chore(sync): sync antfu manual skills to ${shortSha}`)
  } else {
    console.log("  → no changes")
  }

  // 3. Update skills.sh managed plugins
  console.log("\nUpdating skills.sh plugins...\n")
  const skillsShPlugins = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(PLUGINS_DIR, d.name, "skills-lock.json")))
    .map(d => d.name)

  for (const plugin of skillsShPlugins) {
    const pluginDir = join(PLUGINS_DIR, plugin)
    const changedPaths = [`plugins/${plugin}`]

    process.stdout.write(`[${plugin}] bunx skills update... `)
    const result = execFileSafe("bunx", ["skills", "update", "-y"], pluginDir)
    if (result === null) {
      console.log("FAILED")
      continue
    }
    console.log("done")

    if (hasGitChanges(changedPaths)) {
      commitChanges(changedPaths, `chore(sync): update skills.sh plugin ${plugin}`)
      committed.push(`${plugin} (skills.sh)`)
      console.log(`  → committed: chore(sync): update skills.sh plugin ${plugin}\n`)
    } else {
      console.log(`  → no changes\n`)
    }
  }

  if (committed.length === 0) {
    console.log("\nAll skills are up to date. Nothing to commit.")
  } else {
    console.log(`\nDone. ${committed.length} commit(s): ${committed.join(", ")}`)
  }
}

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------
export async function checkUpdates() {
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
export async function cleanup() {
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
    console.log("Removing extra submodules:")
    for (const submodulePath of extraSubmodules) {
      process.stdout.write(`  ${submodulePath} ... `)
      try {
        execFileSafe("git", ["submodule", "deinit", "-f", submodulePath])
        const gitModulesCache = join(ROOT, ".git/modules", submodulePath)
        if (existsSync(gitModulesCache)) rmSync(gitModulesCache, { recursive: true })
        execFile("git", ["rm", "-f", submodulePath])
        console.log("removed")
      } catch (e) {
        console.error(`failed: ${e}`)
      }
    }
  }

  // 2. Stale skill directories in plugins/
  const expectedSkills = new Set(Object.keys(SKILL_TO_PLUGIN))
  let cleanedCount = 0

  for (const plugin of new Set(Object.values(SKILL_TO_PLUGIN))) {
    const skillsDir = join(PLUGINS_DIR, plugin, "skills")
    if (!existsSync(skillsDir)) continue

    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (!expectedSkills.has(entry.name)) {
        process.stdout.write(`  removing stale skill: plugins/${plugin}/skills/${entry.name} ... `)
        rmSync(join(skillsDir, entry.name), { recursive: true })
        console.log("done")
        cleanedCount++
      }
    }
  }

  if (extraSubmodules.length === 0 && cleanedCount === 0) {
    console.log("Everything is clean.")
  } else {
    console.log("Cleanup done.")
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (import.meta.main) {
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
      console.log("  sync     Update submodules and sync skills directly to plugins/")
      console.log("  check    Check for available upstream updates")
      console.log("  cleanup  Remove stale submodules and plugin skills")
      process.exit(1)
  }
}
