#!/usr/bin/env bun
/**
 * Update vendored skills.sh skills to their latest upstream versions.
 *
 * Discovers every `skills-lock.json` tracked in the repo (root + plugins/*)
 * and refreshes the skills each one locks, using the vercel-labs/skills CLI
 * (https://github.com/vercel-labs/skills) invoked via `bunx skills`.
 *
 * For each lock directory:
 *   1. `skills update --project --yes` refreshes every entry that carries a
 *      tracked `skillPath` (an in-place update against the locked source).
 *   2. Legacy entries without `skillPath` cannot be updated in place, so each
 *      is refreshed with `skills add <source> --skill <name> --agent universal -y`,
 *      which re-fetches the latest content and backfills `skillPath` tracking
 *      so future runs can take the faster `update` path.
 *
 * The CLI exits 0 even when individual skills fail to refresh, so whether a
 * directory actually changed is decided from git, not the exit code: a lock
 * directory counts as "updated" only when its tracked files change on disk.
 *
 * Usage:
 *   bun scripts/update-skills.ts                       # update every lock dir
 *   bun scripts/update-skills.ts --check               # report what would change, keep tree clean
 *   bun scripts/update-skills.ts plugins/vue plugins/vitest   # only these dirs
 *
 * When `$GITHUB_OUTPUT` is set (CI), writes machine-readable results:
 *   changed=true|false
 *   changed_dirs=<comma-separated lock dirs that changed>
 */
import { execFileSync } from "node:child_process"
import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

const ROOT = resolve(import.meta.dirname!, "..")

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SkillLockEntry {
  name: string
  source: string
  ref?: string
  sourceType?: string
  skillPath?: string
  computedHash?: string
}

export interface LockPlan {
  /** Run `skills update` because at least one entry is tracked in place. */
  runUpdate: boolean
  /** Entries that must be re-added because they lack `skillPath` tracking. */
  adds: SkillLockEntry[]
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

/** Parse a `skills-lock.json` payload into a flat list of skill entries. */
export function parseLock(content: string): SkillLockEntry[] {
  const json = JSON.parse(content) as { skills?: Record<string, Omit<SkillLockEntry, "name">> }
  const skills = json.skills ?? {}
  return Object.entries(skills).map(([name, meta]) => ({ name, ...meta }))
}

/**
 * Decide how to refresh a lock directory. Entries with a `skillPath` can be
 * updated in place via `skills update`; entries without one must be re-added.
 */
export function planForLock(content: string): LockPlan {
  const entries = parseLock(content)
  const tracked = entries.filter((e) => Boolean(e.skillPath))
  const adds = entries.filter((e) => !e.skillPath)
  return { runUpdate: tracked.length > 0, adds }
}

/** Build the argument vector for `skills add` refreshing a single skill. */
export function buildAddArgs(entry: SkillLockEntry): string[] {
  return ["skills", "add", entry.source, "--skill", entry.name, "--agent", "universal", "-y"]
}

/** Build the argument vector for the in-place `skills update`. */
export function buildUpdateArgs(): string[] {
  return ["skills", "update", "--project", "--yes"]
}

// ---------------------------------------------------------------------------
// Git / shell helpers
// ---------------------------------------------------------------------------
function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf-8" }).trim()
}

/** Tracked lock directories (relative to repo root), `.` for the repo root. */
export function findLockDirs(): string[] {
  // `git ls-files` only lists tracked files, so node_modules and other
  // ignored paths are naturally excluded.
  const out = git(["ls-files", "skills-lock.json", "**/skills-lock.json"])
  if (!out) return []
  return out
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => {
      const dir = dirname(f)
      return dir === "." ? "." : dir
    })
}

/**
 * The exact paths the skills CLI writes within a lock directory: the lock file
 * and the installed skill tree. Scoping to these (rather than the whole
 * directory) keeps the repo root — whose lock dir is `.` — from picking up
 * unrelated repo changes during change-detection or cleanup.
 */
function lockPaths(dir: string): string[] {
  const prefix = dir === "." ? "" : `${dir}/`
  return [`${prefix}skills-lock.json`, `${prefix}.agents/skills`]
}

/** True when the skill paths under `dir` have uncommitted changes. */
function dirHasChanges(dir: string): boolean {
  const out = git(["status", "--porcelain", "--", ...lockPaths(dir)])
  return out.length > 0
}

/**
 * Discard changes the skills CLI made under `dir`. Scoped to {@link lockPaths}
 * so reverting the repo root never wipes unrelated untracked files.
 */
function revertDir(dir: string): void {
  const paths = lockPaths(dir)
  // Restore tracked modifications; ignore paths that aren't tracked.
  for (const p of paths) {
    try {
      git(["checkout", "--", p])
    } catch {
      // path not tracked (e.g. nothing to restore) — fine.
    }
  }
  // Drop any untracked files the CLI added under those paths.
  execFileSync("git", ["clean", "-fdq", "--", ...paths], { cwd: ROOT, encoding: "utf-8" })
}

function runSkills(args: string[], cwd: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync("bunx", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    })
    return { ok: true, output }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    return { ok: false, output: err.stdout || err.stderr || err.message || String(e) }
  }
}

// ---------------------------------------------------------------------------
// Per-directory update
// ---------------------------------------------------------------------------
export interface DirResult {
  dir: string
  changed: boolean
  failures: string[]
}

function updateDir(dir: string): DirResult {
  const absDir = dir === "." ? ROOT : join(ROOT, dir)
  const lockPath = join(absDir, "skills-lock.json")
  const failures: string[] = []

  if (!existsSync(lockPath)) {
    return { dir, changed: false, failures: [`missing ${relative(ROOT, lockPath)}`] }
  }

  const plan = planForLock(readFileSync(lockPath, "utf-8"))

  if (plan.runUpdate) {
    const res = runSkills(buildUpdateArgs(), absDir)
    // `skills update` exits 0 even on per-skill failures — surface them.
    if (/Failed to update/i.test(res.output)) {
      failures.push("skills update reported a failure (see logs)")
    }
  }

  for (const entry of plan.adds) {
    const res = runSkills(buildAddArgs(entry), absDir)
    if (!res.ok) {
      failures.push(`skills add ${entry.source} --skill ${entry.name} failed`)
    }
  }

  return { dir, changed: dirHasChanges(dir), failures }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const checkOnly = args.includes("--check")
  const explicitDirs = args.filter((a) => !a.startsWith("--"))

  const dirs = explicitDirs.length > 0 ? explicitDirs : findLockDirs()
  if (dirs.length === 0) {
    console.log("No skills-lock.json files found.")
    return
  }

  console.log(`${checkOnly ? "Checking" : "Updating"} ${dirs.length} skill lock director${dirs.length === 1 ? "y" : "ies"}...\n`)

  const changed: string[] = []
  const failed: DirResult[] = []

  for (const dir of dirs) {
    const label = dir === "." ? "(root)" : dir
    process.stdout.write(`• ${label} ... `)
    const result = updateDir(dir)

    if (result.failures.length > 0) failed.push(result)

    if (result.changed) {
      changed.push(dir)
      console.log(result.failures.length ? "updated (with warnings)" : "updated")
      if (checkOnly) revertDir(dir)
    } else {
      console.log(result.failures.length ? "no change (with warnings)" : "up to date")
    }

    for (const f of result.failures) console.log(`    ⚠ ${f}`)
  }

  console.log()
  if (changed.length === 0) {
    console.log("All skills are up to date.")
  } else {
    const verb = checkOnly ? "would update" : "updated"
    console.log(`${verb} ${changed.length} director${changed.length === 1 ? "y" : "ies"}:`)
    for (const d of changed) console.log(`  - ${d === "." ? "(root)" : d}`)
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} director${failed.length === 1 ? "y" : "ies"} had warnings (kept best-effort changes).`)
  }

  // Emit machine-readable results for CI.
  const ghOutput = process.env.GITHUB_OUTPUT
  if (ghOutput) {
    appendFileSync(ghOutput, `changed=${changed.length > 0 ? "true" : "false"}\n`)
    appendFileSync(ghOutput, `changed_dirs=${changed.join(",")}\n`)
  }
}

if (import.meta.main) {
  await main()
}
