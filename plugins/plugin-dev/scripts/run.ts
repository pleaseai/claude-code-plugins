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

/**
 * Generate Codex, Antigravity, and Cursor manifests for every local plugin so
 * the same plugin directory loads across runtimes.
 */
export async function generateMultiFormat() {
  const marketplaceJsonPath = join(ROOT, ".claude-plugin", "marketplace.json")
  if (!existsSync(marketplaceJsonPath)) {
    console.error(`! marketplace not found: ${marketplaceJsonPath}`)
    process.exit(1)
  }

  const marketplaceJson = JSON.parse(readFileSync(marketplaceJsonPath, "utf-8")) as ClaudeMarketplace
  const entriesByPluginDir = new Map<string, MarketplaceEntry>()
  for (const entry of marketplaceJson.plugins) {
    if (typeof entry.source === "string" && entry.source.startsWith("./plugins/")) {
      const dirName = entry.source.replace(/^\.\/plugins\//, "")
      entriesByPluginDir.set(dirName, entry)
    }
  }

  console.log("Generating Codex + Antigravity + Cursor manifests for local plugins...\n")
  let pluginsProcessed = 0
  let filesWritten = 0
  const benignSkipped: string[] = []
  const failed: { name: string; error: string }[] = []
  const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()

  for (const dirName of pluginDirs) {
    const pluginDir = join(PLUGINS_DIR, dirName)
    const entry = entriesByPluginDir.get(dirName)
    try {
      const result = generateForPlugin(pluginDir, entry)
      if (result.reason) {
        console.log(`  ${dirName}: skipped (${result.reason})`)
        benignSkipped.push(dirName)
        continue
      }
      pluginsProcessed++
      if (result.written.length === 0) {
        console.log(`  ${dirName}: up to date`)
      } else {
        console.log(`  ${dirName}: wrote ${result.written.length} file(s)`)
        filesWritten += result.written.length
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ${dirName}: FAILED — ${msg}`)
      failed.push({ name: dirName, error: msg })
    }
  }

  // Generate Codex marketplace.json from the Claude one.
  const codexMarketplace = toCodexMarketplace(marketplaceJson)
  const codexMarketplacePath = join(ROOT, ".agents", "plugins", "marketplace.json")
  const codexWritten = writeIfChanged(codexMarketplacePath, JSON.stringify(codexMarketplace, null, 2) + "\n")
  console.log()
  if (codexWritten) {
    console.log(`Codex marketplace written: ${codexMarketplacePath}`)
    filesWritten++
  } else {
    console.log(`Codex marketplace up to date: ${codexMarketplacePath}`)
  }

  // Generate Cursor marketplace.json from the Claude one (local plugins only).
  const cursorMarketplace = toCursorMarketplace(marketplaceJson)
  const cursorMarketplacePath = join(ROOT, ".cursor-plugin", "marketplace.json")
  const cursorWritten = writeIfChanged(cursorMarketplacePath, JSON.stringify(cursorMarketplace, null, 2) + "\n")
  if (cursorWritten) {
    console.log(`Cursor marketplace written: ${cursorMarketplacePath}`)
    filesWritten++
  } else {
    console.log(`Cursor marketplace up to date: ${cursorMarketplacePath}`)
  }

  console.log(`\nProcessed ${pluginsProcessed} plugins, wrote ${filesWritten} file(s).`)
  if (benignSkipped.length > 0) console.log(`Skipped (no manifest): ${benignSkipped.join(", ")}`)
  if (failed.length > 0) {
    console.error(`\n${failed.length} plugin(s) failed:`)
    for (const f of failed) console.error(`  - ${f.name}: ${f.error}`)
    process.exit(1)
  }
  console.log("Done.")
}

if (import.meta.main) {
  await generateMultiFormat()
}
