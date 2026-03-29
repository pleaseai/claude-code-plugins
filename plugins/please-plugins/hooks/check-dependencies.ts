#!/usr/bin/env bun
/**
 * SessionStart + PostToolUse Hook: Plugin Recommender
 *
 * Detects npm packages in the project's package.json and recommends
 * corresponding Claude Code plugins from the pleaseai marketplace.
 *
 * SessionStart (async): Scans package.json at session start
 * PostToolUse (Bash): Fires after bun/npm/pnpm add commands
 *
 * Exit codes:
 *   0 with JSON output = recommendations provided
 *   0 with no output   = no recommendations needed
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { homedir } from 'node:os'
import process from 'node:process'

export interface PluginMapping {
  packages: string[]
  pluginName: string
}

export interface ToolingMapping {
  indicators: {
    files: string[]
    packageManager: string | null
  }
  pluginName: string
}

export interface DetectedPlugin {
  pluginName: string
  source: string
}

export interface SetupOutput {
  detected: DetectedPlugin[]
  installed: string[]
}

export interface AggregatedDeps {
  /** Merged dependencies from root + all workspace packages */
  deps: Record<string, string>
  /** Maps package name → relative workspace path (only for workspace-origin deps) */
  sources: Record<string, string>
}

interface HookInput {
  cwd?: string
  hook_event_name?: string
  tool_input?: {
    command?: string
  }
  [key: string]: unknown
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string
    additionalContext: string
  }
  systemMessage: string
}

/**
 * Mapping of npm packages to marketplace plugin names.
 * To add a new mapping, edit plugin-mappings.json.
 */
import mappingsJson from './plugin-mappings.json'
import toolingJson from './tooling-mappings.json'

export const PLUGIN_MAPPINGS: PluginMapping[] = mappingsJson
export const TOOLING_MAPPINGS: ToolingMapping[] = toolingJson as ToolingMapping[]

/**
 * Resolve glob patterns to directories containing package.json files.
 * Handles simple glob patterns like "apps/*", "packages/*" without external deps.
 */
function resolveGlobPatterns(cwd: string, patterns: string[]): string[] {
  const dirs: string[] = []

  for (const pattern of patterns) {
    // Handle negation patterns (e.g., "!packages/internal")
    if (pattern.startsWith('!')) continue

    // Simple glob: "dir/*" → list entries of "dir/"
    if (pattern.endsWith('/*') || pattern.endsWith('\\*')) {
      const base = pattern.replace(/[/\\]\*$/, '')
      const basePath = join(cwd, base)
      try {
        if (!existsSync(basePath)) continue
        const entries = readdirSync(basePath)
        for (const entry of entries) {
          const fullPath = join(basePath, entry)
          try {
            if (statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'package.json'))) {
              dirs.push(fullPath)
            }
          }
          catch { /* skip inaccessible entries */ }
        }
      }
      catch { /* skip inaccessible base */ }
    }
    // Exact directory path (no glob)
    else if (!pattern.includes('*')) {
      const fullPath = join(cwd, pattern)
      try {
        if (existsSync(fullPath) && statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'package.json'))) {
          dirs.push(fullPath)
        }
      }
      catch { /* skip inaccessible */ }
    }
    // For more complex globs (e.g., "packages/**"), fall back to simple one-level resolution
    else {
      const base = pattern.split('*')[0].replace(/[/\\]$/, '')
      if (!base) continue
      const basePath = join(cwd, base)
      try {
        if (!existsSync(basePath)) continue
        const entries = readdirSync(basePath)
        for (const entry of entries) {
          const fullPath = join(basePath, entry)
          try {
            if (statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'package.json'))) {
              dirs.push(fullPath)
            }
          }
          catch { /* skip */ }
        }
      }
      catch { /* skip */ }
    }
  }

  return dirs
}

/**
 * Resolve workspace package directories from root package.json and/or pnpm-workspace.yaml.
 * Returns absolute paths to workspace directories that contain a package.json.
 */
export function resolveWorkspacePackages(
  cwd: string,
  rootPkg: Record<string, unknown> | null,
): string[] {
  const patterns: string[] = []

  // npm/yarn/Bun: read "workspaces" field from root package.json
  if (rootPkg) {
    const workspaces = rootPkg.workspaces
    if (Array.isArray(workspaces)) {
      patterns.push(...workspaces.filter((w): w is string => typeof w === 'string'))
    }
    // yarn also supports { packages: [...] } form
    else if (workspaces && typeof workspaces === 'object' && 'packages' in workspaces) {
      const pkgs = (workspaces as Record<string, unknown>).packages
      if (Array.isArray(pkgs)) {
        patterns.push(...pkgs.filter((w): w is string => typeof w === 'string'))
      }
    }
  }

  // pnpm: read pnpm-workspace.yaml
  const pnpmWorkspacePath = join(cwd, 'pnpm-workspace.yaml')
  try {
    if (existsSync(pnpmWorkspacePath)) {
      const content = readFileSync(pnpmWorkspacePath, 'utf-8')
      // Simple YAML parsing for "packages:" array
      const lines = content.split('\n')
      let inPackages = false
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === 'packages:') {
          inPackages = true
          continue
        }
        if (inPackages) {
          if (trimmed.startsWith('- ')) {
            const value = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '')
            if (value && !patterns.includes(value)) {
              patterns.push(value)
            }
          }
          else if (trimmed && !trimmed.startsWith('#')) {
            // End of packages list
            break
          }
        }
      }
    }
  }
  catch { /* skip malformed pnpm-workspace.yaml */ }

  if (patterns.length === 0) return []

  return resolveGlobPatterns(cwd, patterns)
}

/**
 * Collect and merge dependencies from root package.json and all workspace packages.
 * Returns merged deps and a source map for workspace-origin deps.
 */
export function collectAllDependencies(cwd: string): AggregatedDeps {
  const rootPkg = loadPackageJson(cwd)
  const deps: Record<string, string> = {}
  const sources: Record<string, string> = {}

  // Add root deps first
  if (rootPkg) {
    Object.assign(deps, rootPkg.dependencies as Record<string, string> | undefined)
    Object.assign(deps, rootPkg.devDependencies as Record<string, string> | undefined)
  }

  // Add workspace deps, tracking sources for non-root packages
  const workspaceDirs = resolveWorkspacePackages(cwd, rootPkg)
  for (const dir of workspaceDirs) {
    const pkg = loadPackageJson(dir)
    if (!pkg) continue

    const relPath = relative(cwd, dir)
    const wsDeps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    }

    for (const [name, version] of Object.entries(wsDeps)) {
      if (!(name in deps)) {
        deps[name] = version
        sources[name] = relPath
      }
    }
  }

  return { deps, sources }
}

/**
 * Detect which plugin mappings match packages in the given package.json content.
 */
export function detectPackages(
  pkg: Record<string, unknown>,
  mappings: PluginMapping[],
): PluginMapping[] {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  }

  const matched: PluginMapping[] = []
  const seen = new Set<string>()

  for (const mapping of mappings) {
    if (seen.has(mapping.pluginName)) continue
    for (const pkgName of mapping.packages) {
      if (pkgName in deps) {
        matched.push(mapping)
        seen.add(mapping.pluginName)
        break
      }
    }
  }

  return matched
}

/**
 * Detect tooling plugins based on lock files and packageManager field.
 */
export function detectTooling(
  cwd: string,
  pkg: Record<string, unknown> | null,
  mappings: ToolingMapping[],
): PluginMapping[] {
  const matched: PluginMapping[] = []
  const seen = new Set<string>()

  for (const mapping of mappings) {
    if (seen.has(mapping.pluginName)) continue

    // Check lock files
    for (const file of mapping.indicators.files) {
      if (existsSync(join(cwd, file))) {
        matched.push({ packages: [], pluginName: mapping.pluginName })
        seen.add(mapping.pluginName)
        break
      }
    }
    if (seen.has(mapping.pluginName)) continue

    // Check packageManager field in package.json
    if (mapping.indicators.packageManager && pkg) {
      const pmField = pkg.packageManager as string | undefined
      if (pmField && pmField.startsWith(mapping.indicators.packageManager)) {
        matched.push({ packages: [], pluginName: mapping.pluginName })
        seen.add(mapping.pluginName)
      }
    }
  }

  return matched
}

/**
 * Filter out plugins that are already installed (present in enabledPlugins).
 * Plugins are considered installed regardless of their enabled/disabled state.
 */
export function filterInstalledPlugins(
  mappings: PluginMapping[],
  enabledPlugins: Record<string, boolean> | undefined,
): PluginMapping[] {
  if (!enabledPlugins) return mappings

  return mappings.filter((mapping) => {
    const key = `${mapping.pluginName}@pleaseai`
    return !(key in enabledPlugins)
  })
}

/**
 * Extract package names from a package install command.
 * Returns empty array for non-install commands or lockfile-only installs.
 */
export function extractPackagesFromCommand(command: string): string[] {
  const trimmed = command.trim()

  // Match: bun add, npm install, npm add, pnpm add, pnpm install
  const installMatch = trimmed.match(
    /^(?:bun\s+add|npm\s+(?:install|add)|pnpm\s+(?:add|install))\s+(.*)/,
  )
  if (!installMatch) return []

  const args = installMatch[1].trim()
  if (!args) return []

  // Split by whitespace, filter out flags (starting with -), and strip version/tag suffixes
  // e.g. pkg@latest → pkg, pkg@^1.0.0 → pkg, but @scope/pkg stays @scope/pkg
  return args
    .split(/\s+/)
    .filter(arg => !arg.startsWith('-') && arg.length > 0)
    .map(arg => arg.replace(/(?<=.)@.*$/, ''))
}

/**
 * Build the hook output JSON with systemMessage and additionalContext.
 */
export function buildOutput(mappings: PluginMapping[], eventName: string): HookOutput {
  const installCommands = mappings
    .map(m => `/plugin install ${m.pluginName}@pleaseai`)
    .join('\n')

  const pluginList = mappings
    .map(m => m.pluginName)
    .join(', ')

  const systemMessage = `📦 Recommended plugins detected! Install them for better assistance:\n\n${installCommands}`

  const additionalContext = `The following Claude Code plugins are available for packages detected in this project: ${pluginList}. These plugins provide specialized skills, context, and tools. Recommend the user install them when relevant to their task.`

  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext,
    },
    systemMessage,
  }
}

/**
 * Read and merge enabledPlugins from project-level and user-level settings.
 */
function loadEnabledPlugins(cwd: string): Record<string, boolean> {
  const merged: Record<string, boolean> = {}

  const paths = [
    join(homedir(), '.claude', 'settings.json'),
    join(cwd, '.claude', 'settings.json'),
  ]

  for (const settingsPath of paths) {
    try {
      if (!existsSync(settingsPath)) continue
      const content = readFileSync(settingsPath, 'utf-8')
      const settings = JSON.parse(content)
      if (settings.enabledPlugins && typeof settings.enabledPlugins === 'object') {
        Object.assign(merged, settings.enabledPlugins)
      }
    }
    catch {
      // Ignore malformed settings files
    }
  }

  return merged
}

/**
 * Read package.json from the given directory.
 */
function loadPackageJson(cwd: string): Record<string, unknown> | null {
  const pkgPath = join(cwd, 'package.json')
  try {
    if (!existsSync(pkgPath)) return null
    const content = readFileSync(pkgPath, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return null
  }
}

/**
 * Resolve the source identifier for a detected package plugin.
 * Returns the first matching package name found in dependencies.
 * When depSources is provided, prefixes workspace path for workspace-origin deps.
 */
function resolvePackageSource(
  pluginName: string,
  deps: Record<string, string>,
  mappings: PluginMapping[],
  depSources?: Record<string, string>,
): string {
  const mapping = mappings.find(m => m.pluginName === pluginName)
  const matchedPkg = mapping?.packages.find(p => p in deps)
  if (!matchedPkg) return pluginName

  // If the matched package came from a workspace, prefix with the workspace path
  if (depSources && matchedPkg in depSources) {
    return `${depSources[matchedPkg]}: ${matchedPkg}`
  }

  return matchedPkg
}

/**
 * Resolve the source identifier for a detected tooling plugin.
 * Returns the matched lock file name or packageManager field value.
 */
function resolveToolingSource(
  pluginName: string,
  cwd: string,
  pkg: Record<string, unknown> | null,
  mappings: ToolingMapping[],
): string {
  const mapping = mappings.find(m => m.pluginName === pluginName)
  if (!mapping) return pluginName

  for (const file of mapping.indicators.files) {
    if (existsSync(join(cwd, file))) return file
  }

  if (mapping.indicators.packageManager && pkg) {
    const pmField = pkg.packageManager as string | undefined
    if (pmField && pmField.startsWith(mapping.indicators.packageManager)) {
      return `packageManager:${pmField}`
    }
  }

  return pluginName
}

/**
 * Scan project for setup command. Returns detected plugins with source info,
 * separated into not-yet-installed and already-installed lists.
 * Scans root and all workspace packages.
 */
export function scanForSetup(cwd: string): SetupOutput {
  const pkg = loadPackageJson(cwd)
  const enabledPlugins = loadEnabledPlugins(cwd)

  // Collect deps from root + workspace packages
  const { deps: allDeps, sources: depSources } = collectAllDependencies(cwd)

  // Detect packages using aggregated deps
  const aggregatedPkg = { dependencies: allDeps } as Record<string, unknown>
  const pkgMatches = Object.keys(allDeps).length > 0 ? detectPackages(aggregatedPkg, PLUGIN_MAPPINGS) : []
  const toolingMatches = detectTooling(cwd, pkg, TOOLING_MAPPINGS)

  // Merge, deduplicating by pluginName
  const seen = new Set(pkgMatches.map(m => m.pluginName))
  const allMatches = [...pkgMatches, ...toolingMatches.filter(m => !seen.has(m.pluginName))]

  // Annotate each match with a source identifier and split into installed vs not-installed
  const installed: string[] = []
  const detected: DetectedPlugin[] = []

  for (const match of allMatches) {
    const key = `${match.pluginName}@pleaseai`
    const isTooling = toolingMatches.some(m => m.pluginName === match.pluginName) && !pkgMatches.some(m => m.pluginName === match.pluginName)
    const source = isTooling
      ? resolveToolingSource(match.pluginName, cwd, pkg, TOOLING_MAPPINGS)
      : resolvePackageSource(match.pluginName, allDeps, PLUGIN_MAPPINGS, depSources)

    if (key in enabledPlugins) {
      installed.push(match.pluginName)
    }
    else {
      detected.push({ pluginName: match.pluginName, source })
    }
  }

  return { detected, installed }
}

/**
 * Detect plugin mappings for a given hook event.
 * Returns null if no relevant packages are detected.
 */
function detectForEvent(hookInput: HookInput): PluginMapping[] | null {
  const cwd = hookInput.cwd || process.cwd()
  const eventName = hookInput.hook_event_name || 'SessionStart'

  let detected: PluginMapping[]

  if (eventName === 'PostToolUse') {
    const command = hookInput.tool_input?.command
    if (!command) return null

    const installedPackages = extractPackagesFromCommand(command)
    if (installedPackages.length === 0) return null

    detected = PLUGIN_MAPPINGS.filter(mapping =>
      mapping.packages.some(pkg => installedPackages.includes(pkg)),
    )
  }
  else {
    const pkg = loadPackageJson(cwd)
    const tooling = detectTooling(cwd, pkg, TOOLING_MAPPINGS)

    // Collect deps from root + workspace packages
    const { deps: allDeps } = collectAllDependencies(cwd)

    if (Object.keys(allDeps).length === 0) {
      detected = tooling
    }
    else {
      const aggregatedPkg = { dependencies: allDeps } as Record<string, unknown>
      const pkgDetected = detectPackages(aggregatedPkg, PLUGIN_MAPPINGS)
      // Merge, deduplicating by pluginName
      const seen = new Set(pkgDetected.map(m => m.pluginName))
      detected = [...pkgDetected, ...tooling.filter(m => !seen.has(m.pluginName))]
    }
  }

  if (detected.length === 0) return null

  const enabledPlugins = loadEnabledPlugins(cwd)
  const recommendations = filterInstalledPlugins(detected, enabledPlugins)

  return recommendations.length > 0 ? recommendations : null
}

async function main(): Promise<void> {
  // --setup mode: output structured JSON for the setup command
  if (process.argv.includes('--setup')) {
    try {
      const cwd = process.cwd()
      const result = scanForSetup(cwd)
      process.stdout.write(`${JSON.stringify(result)}\n`)
      process.exit(0)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      process.stderr.write(`[please-plugins] Setup error: ${errorMessage}\n`)
      process.exit(1)
    }
    return
  }

  // Hook mode: read from stdin
  try {
    const input = await Bun.stdin.text()
    if (!input.trim()) {
      process.exit(0)
    }

    let hookInput: HookInput
    try {
      hookInput = JSON.parse(input)
    }
    catch {
      process.exit(0)
    }

    const eventName = hookInput.hook_event_name || 'SessionStart'
    const recommendations = detectForEvent(hookInput)

    if (!recommendations) {
      process.exit(0)
    }

    const output = buildOutput(recommendations, eventName)
    process.stdout.write(`${JSON.stringify(output)}\n`)
    process.exit(0)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[please-plugins] Hook error: ${errorMessage}\n`)
    process.exit(0)
  }
}

if (import.meta.main) {
  await main()
}
