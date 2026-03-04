#!/usr/bin/env bun
/**
 * @deprecated Use scripts/cli.ts instead.
 *
 *   bun scripts/cli.ts sync
 */
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const cliScript = resolve(import.meta.dirname!, "cli.ts")

console.warn("Note: generate-antfu-plugins.ts is deprecated. Use: bun scripts/cli.ts sync\n")

const result = spawnSync("bun", [cliScript, "sync"], { stdio: "inherit" })
process.exit(result.error || result.signal ? 1 : (result.status ?? 1))
