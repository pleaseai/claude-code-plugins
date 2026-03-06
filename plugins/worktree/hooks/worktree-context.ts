#!/usr/bin/env bun
/**
 * SessionStart Hook: Git worktree context detection
 *
 * When Claude Code starts in a git worktree, this hook detects it and injects
 * context to prevent Claude from accidentally accessing the parent project path.
 *
 * Detection strategy:
 * 1. Primary: Check if cwd contains '/.claude/worktrees/' (Claude Code's EnterWorktree path)
 * 2. Fallback: Use `git rev-parse` to compare worktree root vs common git dir
 *
 * Exit codes:
 *   0 with JSON output = additionalContext injected
 *   0 with no output   = not in a worktree, nothing to inject
 */

import { spawnSync } from 'node:child_process'
import { isAbsolute, resolve } from 'node:path'
import process from 'node:process'

interface SessionStartInput {
  cwd?: string
  [key: string]: unknown
}

interface WorktreeInfo {
  worktreePath: string
  parentProjectPath: string
}

/**
 * Detect if the current working directory is a git worktree.
 *
 * Primary strategy: Claude Code's EnterWorktree always creates worktrees under
 * `{project}/.claude/worktrees/{name}`, so a simple path check is fast and reliable.
 *
 * Fallback strategy: For worktrees created via `git worktree add` at arbitrary paths,
 * compare the git common dir to the toplevel to detect worktree status.
 */
export function detectWorktree(cwd: string): WorktreeInfo | null {
  // Primary: Claude Code EnterWorktree creates worktrees at .claude/worktrees/
  const CLAUDE_WORKTREE_MARKER = '/.claude/worktrees/'
  const markerIndex = cwd.indexOf(CLAUDE_WORKTREE_MARKER)
  if (markerIndex !== -1) {
    const parentProjectPath = cwd.slice(0, markerIndex)
    return {
      worktreePath: cwd,
      parentProjectPath,
    }
  }

  // Fallback: detect arbitrary worktrees via git rev-parse
  return detectWorktreeViaGit(cwd)
}

/**
 * Use git commands to detect if cwd is a worktree (for non-.claude/worktrees/ paths).
 * Returns null if not a git repo, not a worktree, or git is unavailable.
 */
function detectWorktreeViaGit(cwd: string): WorktreeInfo | null {
  try {
    // Get the toplevel of this worktree
    const toplevel = runGit(['rev-parse', '--show-toplevel'], cwd)
    if (!toplevel) {
      return null
    }

    // Get the git common dir (points to main repo's .git for linked worktrees)
    const gitCommonDir = runGit(['rev-parse', '--git-common-dir'], cwd)
    if (!gitCommonDir) {
      return null
    }

    // In the main repo: git common dir is <toplevel>/.git
    // In a linked worktree: git common dir is the main repo's .git (outside toplevel)
    // git may return a relative path for --git-common-dir in some versions, so resolve to absolute
    const resolvedCommonDir = resolve(cwd, gitCommonDir)
    const expectedMainGitDir = `${toplevel}/.git`
    const isLinkedWorktree = resolvedCommonDir !== expectedMainGitDir

    if (!isLinkedWorktree) {
      return null
    }

    // The common dir is typically <parentProject>/.git
    // Resolve parent project path from resolved absolute common dir
    const parentProjectPath = resolvedCommonDir.endsWith('/.git')
      ? resolvedCommonDir.slice(0, -5)
      : resolvedCommonDir

    return {
      worktreePath: toplevel,
      parentProjectPath,
    }
  }
  catch (error) {
    process.stderr.write(
      `[worktree-context] git worktree detection failed: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    return null
  }
}

/**
 * Run a git command synchronously and return trimmed stdout, or null on error.
 */
function runGit(args: string[], cwd: string): string | null {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf-8',
    timeout: 3000,
  })
  if (result.error) {
    // Log spawn errors (e.g. ENOENT = git not installed, ETIMEDOUT = git timed out)
    process.stderr.write(
      `[worktree-context] git ${args.join(' ')} failed: ${result.error.message}\n`,
    )
    return null
  }
  if (result.status !== 0) {
    return null
  }
  const out = result.stdout?.trim()
  return out || null
}

/**
 * Build the additional context message for worktree sessions.
 */
export function buildWorktreeContext(info: WorktreeInfo): string {
  return `IMPORTANT: You are working in a git worktree, NOT the main project directory.
  Worktree path (USE THIS):         ${info.worktreePath}
  Parent project (DO NOT ACCESS):   ${info.parentProjectPath}
Rules:
  - ALL file reads, writes, edits, and searches MUST use the worktree path
  - NEVER access files using the parent project path
  - If you need to reference the parent project, use only the worktree path shown above`
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text()
    if (!input.trim()) {
      process.exit(0)
    }

    let hookInput: SessionStartInput
    try {
      hookInput = JSON.parse(input)
    }
    catch (error) {
      process.stderr.write(
        `[worktree-context] Failed to parse SessionStart input: ${error instanceof Error ? error.message : String(error)}\n`,
      )
      process.exit(0)
    }

    const rawCwd = hookInput.cwd
    let cwd: string
    if (rawCwd && isAbsolute(rawCwd)) {
      cwd = rawCwd
    }
    else {
      if (rawCwd) {
        process.stderr.write(
          `[worktree-context] Warning: cwd '${rawCwd}' is not absolute, falling back to process.cwd()\n`,
        )
      }
      cwd = process.cwd()
    }
    const worktreeInfo = detectWorktree(cwd)

    if (!worktreeInfo) {
      // Not a worktree — nothing to inject
      process.exit(0)
    }

    const additionalContext = buildWorktreeContext(worktreeInfo)

    const output = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext,
      },
    }

    process.stdout.write(`${JSON.stringify(output)}\n`)
    process.exit(0)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await Bun.write(Bun.stderr, `[worktree-context] Hook error: ${errorMessage}\n`)
    process.exit(0)
  }
}

if (import.meta.main) {
  await main()
}
