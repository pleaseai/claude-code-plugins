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

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import process from 'node:process'

export interface PluginMapping {
  packages: string[]
  pluginName: string
}

export interface ToolingMapping {
  indicators: {
    lockFiles: string[]
    packageManager: string | null
  }
  pluginName: string
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
    for (const lockFile of mapping.indicators.lockFiles) {
      if (existsSync(join(cwd, lockFile))) {
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

    if (!pkg) {
      detected = tooling
    }
    else {
      const pkgDetected = detectPackages(pkg, PLUGIN_MAPPINGS)
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
