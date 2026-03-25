#!/usr/bin/env bun
/**
 * Manage vendor skill submodules and sync skills into plugins/.
 * Manages vendor skill submodules, extensions, and skills.sh plugins.
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
import type { SubmoduleMeta } from "./meta.ts"
import { extensions, submodules, vendors } from "./meta.ts"
import { convertMcpServerPaths, parseToml } from "./extension-helpers.ts"

const ROOT = resolve(import.meta.dirname!, "..")
const PLUGINS_DIR = join(ROOT, "plugins")

// ---------------------------------------------------------------------------
// skill dir name → plugin dir name
// ---------------------------------------------------------------------------
export const SKILL_TO_PLUGIN: Record<string, string> = {
  // Type 2: vendor submodules
  "web-design-guidelines": "web-design",
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
// helpers: resolve source/depth from string | SubmoduleMeta
// ---------------------------------------------------------------------------
function resolveSubmodule(entry: string | SubmoduleMeta): { source: string; depth?: number } {
  if (typeof entry === "string") return { source: entry }
  return { source: entry.source, depth: entry.depth }
}

function depthArgs(depth?: number): string[] {
  return depth ? ["--depth", String(depth)] : []
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
function initSubmoduleGroup(label: string, prefix: string, entries: Array<[string, { source: string; depth?: number }]>) {
  console.log(`\nInitializing ${label}...\n`)
  for (const [name, { source, depth }] of entries) {
    const submodulePath = `${prefix}/${name}`
    const fullPath = join(ROOT, submodulePath)

    if (isSubmoduleRegistered(submodulePath)) {
      if (!existsSync(join(fullPath, ".git"))) {
        process.stdout.write(`  init: ${submodulePath} ... `)
        execFileSafe("git", ["submodule", "update", "--init", ...depthArgs(depth), submodulePath])
        console.log("done")
      } else {
        console.log(`  already initialized: ${submodulePath}`)
      }
      continue
    }

    process.stdout.write(`  adding: ${name}  (${source}) ... `)
    try {
      mkdirSync(dirname(fullPath), { recursive: true })
      execFile("git", ["submodule", "add", ...depthArgs(depth), source, submodulePath])
      if (depth) {
        execFile("git", ["config", "-f", ".gitmodules", `submodule.${submodulePath}.shallow`, "true"])
      }
      console.log("done")
    } catch (e) {
      console.error(`failed\n    ${e}`)
    }
  }
}

export async function initSubmodules() {
  initSubmoduleGroup("source submodules", "sources", Object.entries(submodules).map(([n, v]) => [n, resolveSubmodule(v)]))
  initSubmoduleGroup("vendor submodules", "vendor", Object.entries(vendors).map(([n, c]) => [n, { source: c.source, depth: c.depth }]))
  initSubmoduleGroup("extension submodules", "external-plugins", Object.entries(extensions).map(([n, c]) => [n, { source: c.source, depth: c.depth }]))
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
    const updated = execFileSafe("git", ["submodule", "update", "--remote", "--merge", ...depthArgs(config.depth), submodulePath])
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
        cpSync(src, dest, { recursive: true, verbatimSymlinks: true })
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

  // 2. Update skills.sh managed plugins
  console.log("\nUpdating skills.sh plugins...\n")
  if (!existsSync(PLUGINS_DIR)) {
    console.log("  no plugins directory found, skipping skills.sh plugin check")
  }
  const skillsShPlugins = existsSync(PLUGINS_DIR)
    ? readdirSync(PLUGINS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && existsSync(join(PLUGINS_DIR, d.name, "skills-lock.json")))
        .map(d => d.name)
    : []

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

  // 4. Sync Gemini CLI extensions → plugins/<name>/
  console.log("\nSyncing Gemini extensions to plugins...\n")
  for (const [name, config] of Object.entries(extensions)) {
    const submodulePath = `external-plugins/${name}`
    const extensionPath = join(ROOT, submodulePath)
    const pluginName = config.pluginName ?? name
    const pluginDir = join(PLUGINS_DIR, pluginName)
    const resolvedPluginDir = resolve(pluginDir)
    const resolvedPluginsDir = resolve(PLUGINS_DIR)
    if (
      resolvedPluginDir !== resolvedPluginsDir &&
      !resolvedPluginDir.startsWith(`${resolvedPluginsDir}/`) &&
      !resolvedPluginDir.startsWith(`${resolvedPluginsDir}\\`)
    ) {
      console.error(`  ! invalid pluginName for ${name}: "${pluginName}" (escapes plugins directory)`)
      continue
    }

    if (!isSubmoduleRegistered(submodulePath) || !existsSync(extensionPath)) {
      console.warn(`  ! not initialized: ${name}  (run: bun scripts/cli.ts init)`)
      continue
    }

    // Update submodule to latest
    process.stdout.write(`[${name}] updating submodule... `)
    const updated = execFileSafe("git", ["submodule", "update", "--remote", "--merge", ...depthArgs(config.depth), submodulePath])
    if (updated === null) {
      console.log("FAILED")
      console.warn(`  ! Skipping ${name} to avoid committing stale content.`)
      continue
    }
    const sha = getGitSha(extensionPath)
    console.log(`${sha?.slice(0, 7) ?? "?"}`)

    // Read gemini-extension.json
    const extensionJsonPath = join(extensionPath, "gemini-extension.json")
    if (!existsSync(extensionJsonPath)) {
      console.warn(`  ! no gemini-extension.json in external-plugins/${name}`)
      continue
    }

    let extensionJson: Record<string, unknown>
    try {
      extensionJson = JSON.parse(readFileSync(extensionJsonPath, "utf-8")) as Record<string, unknown>
    } catch (e) {
      console.error(`  ! failed to parse gemini-extension.json: ${e}`)
      continue
    }

    const changedPaths: string[] = [submodulePath]

    // Determine if commands will be generated
    const sourceCommandsDir = join(extensionPath, "commands")
    let hasCommands = false
    if (!config.skipCommands && existsSync(sourceCommandsDir)) {
      const cmdFiles = readdirSync(sourceCommandsDir).filter(f => f.endsWith(".toml") || f.endsWith(".md"))
      hasCommands = cmdFiles.length > 0
    }

    // Generate plugins/<name>/.claude-plugin/plugin.json
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true })
    const rawMcpServers = extensionJson.mcpServers
    const mcpServers =
      rawMcpServers && typeof rawMcpServers === "object"
        ? convertMcpServerPaths(rawMcpServers as Record<string, unknown>)
        : {}
    const pluginJson: Record<string, unknown> = {
      name: extensionJson.name ?? pluginName,
      version: extensionJson.version ?? "1.0.0",
      ...(extensionJson.description ? { description: extensionJson.description } : {}),
      mcpServers,
    }
    if (hasCommands) pluginJson.commands = ["./commands"]

    const pluginJsonPath = join(pluginDir, ".claude-plugin", "plugin.json")
    writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2) + "\n")
    changedPaths.push(`plugins/${pluginName}/.claude-plugin/plugin.json`)
    console.log(`  plugin.json generated`)

    // Handle context file via SessionStart hook
    const contextFileName = typeof extensionJson.contextFileName === "string" ? extensionJson.contextFileName : null
    if (contextFileName) {
      const contextSrc = join(extensionPath, contextFileName)
      const resolvedContextSrc = resolve(contextSrc)
      const resolvedExtensionPath = resolve(extensionPath)
      if (
        resolvedContextSrc !== resolvedExtensionPath &&
        !resolvedContextSrc.startsWith(`${resolvedExtensionPath}/`) &&
        !resolvedContextSrc.startsWith(`${resolvedExtensionPath}\\`)
      ) {
        console.error(`  ! invalid contextFileName for ${name}: "${contextFileName}" (escapes extension directory)`)
        continue
      }
      if (existsSync(contextSrc)) {
        const contextDest = join(pluginDir, contextFileName)
        mkdirSync(dirname(contextDest), { recursive: true })
        cpSync(contextSrc, contextDest)
        changedPaths.push(`plugins/${pluginName}/${contextFileName}`)
        console.log(`  context file synced: ${contextFileName}`)
      } else {
        console.warn(`  ! contextFileName not found: ${contextFileName}`)
      }

      // Copy gemini-extension.json so context.sh can read contextFileName
      cpSync(extensionJsonPath, join(pluginDir, "gemini-extension.json"))
      changedPaths.push(`plugins/${pluginName}/gemini-extension.json`)

      // Generate hooks/hooks.json
      mkdirSync(join(pluginDir, "hooks"), { recursive: true })
      const hooksJson = {
        description: "Load plugin context at session start",
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: "command",
                  command: "${CLAUDE_PLUGIN_ROOT}/hooks/context.sh",
                  timeout: 10,
                },
              ],
            },
          ],
        },
      }
      writeFileSync(join(pluginDir, "hooks", "hooks.json"), JSON.stringify(hooksJson, null, 2) + "\n")
      changedPaths.push(`plugins/${pluginName}/hooks/hooks.json`)

      // Copy hooks/context.sh
      const contextShSrc = join(ROOT, "hooks", "context.sh")
      if (existsSync(contextShSrc)) {
        const contextShDest = join(pluginDir, "hooks", "context.sh")
        cpSync(contextShSrc, contextShDest)
        execFileSafe("chmod", ["+x", contextShDest])
        changedPaths.push(`plugins/${pluginName}/hooks/context.sh`)
        console.log(`  hooks/context.sh copied`)
      } else {
        console.warn(`  ! WARNING: hooks/context.sh not found at ${contextShSrc} — hooks.json will reference a missing script`)
      }
    }

    // Convert TOML commands to Markdown
    if (!config.skipCommands && existsSync(sourceCommandsDir)) {
      const outputCommandsDir = join(pluginDir, "commands")
      mkdirSync(outputCommandsDir, { recursive: true })

      const allFiles = readdirSync(sourceCommandsDir)
      const tomlFiles = allFiles.filter(f => f.endsWith(".toml"))
      const mdFilesInSource = allFiles.filter(f => f.endsWith(".md"))
      const mdFilesInSourceSet = new Set(mdFilesInSource)

      for (const tomlFile of tomlFiles) {
        const baseName = tomlFile.replace(/\.toml$/, "")
        const mdFile = `${baseName}.md`

        if (mdFilesInSourceSet.has(mdFile)) {
          // Prefer existing .md over TOML conversion
          cpSync(join(sourceCommandsDir, mdFile), join(outputCommandsDir, mdFile))
          changedPaths.push(`plugins/${pluginName}/commands/${mdFile}`)
          console.log(`  command synced: ${mdFile}`)
        } else {
          // Convert TOML → Markdown
          const tomlContent = readFileSync(join(sourceCommandsDir, tomlFile), "utf-8")
          const parsed = parseToml(tomlContent)
          if (parsed) {
            const { description, prompt } = parsed
            const escapedPrompt = prompt.replace(/\{\{args\}\}/g, "$ARGUMENTS")
            const mdContent = description
              ? `---\ndescription: ${description}\n---\n\n${escapedPrompt}\n`
              : `${escapedPrompt}\n`
            writeFileSync(join(outputCommandsDir, mdFile), mdContent)
            changedPaths.push(`plugins/${pluginName}/commands/${mdFile}`)
            console.log(`  command converted: ${tomlFile} → ${mdFile}`)
          } else {
            console.warn(`  ! failed to parse TOML: ${tomlFile}`)
          }
        }
      }

      // Copy standalone .md files not paired with any TOML
      for (const mdFile of mdFilesInSource) {
        const baseName = mdFile.replace(/\.md$/, "")
        if (!tomlFiles.includes(`${baseName}.toml`)) {
          cpSync(join(sourceCommandsDir, mdFile), join(outputCommandsDir, mdFile))
          changedPaths.push(`plugins/${pluginName}/commands/${mdFile}`)
          console.log(`  command copied: ${mdFile}`)
        }
      }
    }

    // Copy skills/ directory if present
    const sourceSkillsDir = join(extensionPath, "skills")
    if (!config.skipSkills && existsSync(sourceSkillsDir)) {
      const outputSkillsDir = join(pluginDir, "skills")
      mkdirSync(outputSkillsDir, { recursive: true })

      for (const entry of readdirSync(sourceSkillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue

        const srcSkill = join(sourceSkillsDir, entry.name)
        const destSkill = join(outputSkillsDir, entry.name)

        process.stdout.write(`  skill synced: ${entry.name} ... `)
        try {
          rmSync(destSkill, { recursive: true, force: true })
          mkdirSync(destSkill, { recursive: true })
          cpSync(srcSkill, destSkill, { recursive: true })
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error(`FAILED\n  ! could not copy skill ${entry.name}: ${msg}`)
          rmSync(destSkill, { recursive: true, force: true })
          continue
        }

        // Write SYNC.md to each skill
        const skillDate = new Date().toISOString().split("T")[0]
        writeFileSync(
          join(destSkill, "SYNC.md"),
          `# Sync Info\n\n- **Source:** \`external-plugins/${name}/skills/${entry.name}\`\n- **Git SHA:** \`${sha}\`\n- **Synced:** ${skillDate}\n`,
        )

        changedPaths.push(`plugins/${pluginName}/skills/${entry.name}`)
        console.log("done")
      }
    }

    // Copy LICENSE
    const licenseNames = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md", "license.txt"]
    for (const licenseName of licenseNames) {
      const licensePath = join(extensionPath, licenseName)
      if (existsSync(licensePath)) {
        cpSync(licensePath, join(pluginDir, "LICENSE.md"))
        changedPaths.push(`plugins/${pluginName}/LICENSE.md`)
        break
      }
    }

    // Copy CHANGELOG if present
    const changelogNames = ["CHANGELOG.md", "CHANGELOG", "changelog.md", "changelog"]
    for (const changelogName of changelogNames) {
      const changelogPath = join(extensionPath, changelogName)
      if (existsSync(changelogPath)) {
        cpSync(changelogPath, join(pluginDir, "CHANGELOG.md"))
        changedPaths.push(`plugins/${pluginName}/CHANGELOG.md`)
        console.log(`  CHANGELOG.md copied`)
        break
      }
    }

    // Write SYNC.md
    const date = new Date().toISOString().split("T")[0]
    writeFileSync(
      join(pluginDir, "SYNC.md"),
      `# Sync Info\n\n- **Source:** \`external-plugins/${name}\`\n- **Git SHA:** \`${sha}\`\n- **Synced:** ${date}\n`,
    )
    changedPaths.push(`plugins/${pluginName}/SYNC.md`)

    // Commit if anything changed
    try {
      if (hasGitChanges(changedPaths)) {
        if (sha === null) {
          console.warn(`  ! WARNING: could not read git SHA for external-plugins/${name}. Commit will say 'unknown'.`)
        }
        const shortSha = sha?.slice(0, 7) ?? "unknown"
        try {
          commitChanges(changedPaths, `chore(sync): sync extension ${name} to ${shortSha}`)
          committed.push(name)
          console.log(`  → committed: chore(sync): sync extension ${name} to ${shortSha}\n`)
        } catch (e) {
          console.error(`  ! failed to commit extension ${name}: ${e}`)
        }
      } else {
        console.log(`  → no changes\n`)
      }
    } catch (e) {
      console.error(`  ! failed to check/commit extension ${name}: ${e}`)
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
  for (const name of Object.keys(extensions)) {
    const path = join(ROOT, "external-plugins", name)
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

  for (const name of Object.keys(extensions)) {
    const path = join(ROOT, "external-plugins", name)
    if (!existsSync(path)) continue
    const behind = execSafe("git rev-list HEAD..@{u} --count", path)
    const count = behind ? Number.parseInt(behind) : 0
    if (count > 0) updates.push({ name, type: "extension", behind: count })
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
    ...Object.keys(extensions).map(n => `external-plugins/${n}`),
  ])
  const registered = getRegisteredSubmodulePaths().filter(
    p =>
      p.startsWith("sources/") ||
      p.startsWith("vendor/") ||
      p.startsWith("external-plugins/"),
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
