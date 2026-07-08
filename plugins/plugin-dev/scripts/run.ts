#!/usr/bin/env bun
/**
 * Multi-runtime manifest generator for this marketplace's local plugins.
 *
 * This is a repo-maintenance script that lives inside the plugin-dev plugin so
 * the plugin is self-contained: `/plugin-dev:multi-format` invokes it directly
 * (`bun ${CLAUDE_PLUGIN_ROOT}/scripts/run.ts`). The repo-root `scripts/cli.ts
 * multi-format` command re-exports {@link generateMultiFormat} from here so the
 * historical invocation keeps working.
 *
 * It reads the Claude Code marketplace (the single source of truth) at the repo
 * root and emits Codex, Antigravity, and Cursor manifests for every local
 * plugin. See ./multi-format.ts for the per-runtime format mapping rules.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  type ClaudeMarketplace,
  generateForPlugin,
  type MarketplaceEntry,
  toCodexMarketplace,
  toCursorMarketplace,
  writeIfChanged,
} from "./multi-format.ts"

// This file lives at plugins/plugin-dev/scripts/run.ts, so the repo root is
// three directories up. Resolving from the script location (not CLAUDE_PLUGIN_ROOT)
// keeps the generator pointed at this marketplace's manifests regardless of how
// it is invoked.
const ROOT = resolve(import.meta.dirname!, "..", "..", "..")
const PLUGINS_DIR = join(ROOT, "plugins")

interface PluginRunResult {
  pluginsProcessed: number
  filesWritten: number
  benignSkipped: string[]
  failed: { name: string; error: string }[]
}

/** Read the Claude marketplace, or exit(1) if it is missing. */
function loadMarketplace(): ClaudeMarketplace {
  const marketplaceJsonPath = join(ROOT, ".claude-plugin", "marketplace.json")
  if (!existsSync(marketplaceJsonPath)) {
    console.error(`! marketplace not found: ${marketplaceJsonPath}`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(marketplaceJsonPath, "utf-8")) as ClaudeMarketplace
}

/** Index local (`./plugins/...`) marketplace entries by their plugin directory name. */
function localEntriesByDir(marketplaceJson: ClaudeMarketplace): Map<string, MarketplaceEntry> {
  const entriesByPluginDir = new Map<string, MarketplaceEntry>()
  for (const entry of marketplaceJson.plugins) {
    if (typeof entry.source === "string" && entry.source.startsWith("./plugins/")) {
      entriesByPluginDir.set(entry.source.replace(/^\.\/plugins\//, ""), entry)
    }
  }
  return entriesByPluginDir
}

/** Generate per-runtime manifests for every plugin directory, logging per-plugin status. */
function processPlugins(entriesByPluginDir: Map<string, MarketplaceEntry>): PluginRunResult {
  const out: PluginRunResult = { pluginsProcessed: 0, filesWritten: 0, benignSkipped: [], failed: [] }
  const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()

  for (const dirName of pluginDirs) {
    try {
      const result = generateForPlugin(join(PLUGINS_DIR, dirName), entriesByPluginDir.get(dirName))
      if (result.reason) {
        console.log(`  ${dirName}: skipped (${result.reason})`)
        out.benignSkipped.push(dirName)
        continue
      }
      out.pluginsProcessed++
      if (result.written.length === 0) {
        console.log(`  ${dirName}: up to date`)
      } else {
        console.log(`  ${dirName}: wrote ${result.written.length} file(s)`)
        out.filesWritten += result.written.length
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ${dirName}: FAILED — ${msg}`)
      out.failed.push({ name: dirName, error: msg })
    }
  }
  return out
}

/** Emit the Codex + Cursor marketplace files from the Claude marketplace; returns files written. */
function writeMarketplaces(marketplaceJson: ClaudeMarketplace): number {
  const targets: { label: string; path: string; doc: unknown }[] = [
    { label: "Codex", path: join(ROOT, ".agents", "plugins", "marketplace.json"), doc: toCodexMarketplace(marketplaceJson) },
    { label: "Cursor", path: join(ROOT, ".cursor-plugin", "marketplace.json"), doc: toCursorMarketplace(marketplaceJson) },
  ]
  console.log()
  let written = 0
  for (const { label, path, doc } of targets) {
    if (writeIfChanged(path, JSON.stringify(doc, null, 2) + "\n")) {
      console.log(`${label} marketplace written: ${path}`)
      written++
    } else {
      console.log(`${label} marketplace up to date: ${path}`)
    }
  }
  return written
}

/**
 * Generate Codex, Antigravity, and Cursor manifests for every local plugin so
 * the same plugin directory loads across runtimes.
 */
export async function generateMultiFormat() {
  const marketplaceJson = loadMarketplace()

  console.log("Generating Codex + Antigravity + Cursor manifests for local plugins...\n")
  const run = processPlugins(localEntriesByDir(marketplaceJson))
  const filesWritten = run.filesWritten + writeMarketplaces(marketplaceJson)

  console.log(`\nProcessed ${run.pluginsProcessed} plugins, wrote ${filesWritten} file(s).`)
  if (run.benignSkipped.length > 0) console.log(`Skipped (no manifest): ${run.benignSkipped.join(", ")}`)
  if (run.failed.length > 0) {
    console.error(`\n${run.failed.length} plugin(s) failed:`)
    for (const f of run.failed) console.error(`  - ${f.name}: ${f.error}`)
    process.exit(1)
  }
  console.log("Done.")
}

if (import.meta.main) {
  await generateMultiFormat()
}
