#!/usr/bin/env bun
/**
 * PreToolUse Hook: Deny parent project path access in git worktrees
 *
 * When Claude Code is running in a git worktree, this hook prevents Claude from
 * accessing files from the parent project path. It intercepts Read, Grep, Glob,
 * Edit, Write, and MultiEdit tool calls and blocks any path that points to the parent project.
 *
 * Note: Bash tool is not protected by this hook. The hook provides best-effort
 * isolation; it is not a complete security boundary.
 *
 * This hook complements the SessionStart context injection (worktree-context.ts)
 * by actively enforcing the path boundary at the tool level.
 *
 * Matcher: Read|Grep|Glob|Edit|Write|MultiEdit
 *
 * Exit codes:
 *   0 = pass through (not a worktree, or path is safe)
 *   0 with JSON deny output = path blocked (deny response written to stdout)
 *   2 = unexpected error — tool call blocked as a security precaution
 */

import { isAbsolute, normalize, resolve } from 'node:path'
import process from 'node:process'
import { detectWorktree, resolveCwd } from './worktree-context'

interface PreToolUseInput {
  tool_name?: string
  tool_input?: {
    file_path?: string
    path?: string
    edits?: Array<{ old_string?: string; new_string?: string }>
    [key: string]: unknown
  }
  cwd?: string
  [key: string]: unknown
}

/**
 * Extract the file path from the tool input based on the tool name.
 * - Read, Edit, Write use `file_path`
 * - Grep and Glob use `path`
 */
export function extractPath(input: PreToolUseInput): string | null {
  const toolInput = input.tool_input
  if (!toolInput) {
    return null
  }

  // Read uses file_path
  if (typeof toolInput.file_path === 'string' && toolInput.file_path) {
    return toolInput.file_path
  }

  // Grep and Glob use path
  if (typeof toolInput.path === 'string' && toolInput.path) {
    return toolInput.path
  }

  return null
}

/**
 * Check if the given file path is under the parent project path.
 * Returns true if the path should be denied.
 *
 * Both paths are normalized to resolve `..` and `.` sequences before comparison,
 * preventing path traversal bypasses like `/worktree/../../parent/secret.ts`.
 */
export function isParentPath(filePath: string, parentProjectPath: string): boolean {
  if (!isAbsolute(filePath)) {
    return false
  }
  // Normalize both paths to resolve .. and . segments before string comparison.
  // This prevents traversal bypasses such as /worktree/../../parent/secret.ts.
  const normalizedFile = normalize(filePath)
  const normalizedParent = normalize(parentProjectPath)
  // Ensure we match at directory boundaries (not just prefix)
  const parentWithSlash = normalizedParent.endsWith('/')
    ? normalizedParent
    : `${normalizedParent}/`
  return normalizedFile.startsWith(parentWithSlash) || normalizedFile === normalizedParent
}

/**
 * Build the deny response for PreToolUse hooks.
 */
export function buildDenyResponse(worktreePath: string, parentProjectPath: string, filePath: string): object {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Cannot access parent project path '${filePath}'. You must use the worktree path instead.`,
    },
    systemMessage: `Worktree path (USE THIS): ${worktreePath}\nDo NOT access: ${parentProjectPath}\nRequested path '${filePath}' is under the parent project. Use the worktree path instead.`,
  }
}

async function main(): Promise<void> {
  try {
    const input = await Bun.stdin.text()
    if (!input.trim()) {
      process.exit(0)
    }

    let hookInput: PreToolUseInput
    try {
      hookInput = JSON.parse(input)
    }
    catch (error) {
      // Non-empty input that cannot be parsed is suspicious — block the tool call.
      process.stderr.write(
        `[deny-parent-access] Failed to parse PreToolUse input — blocking tool call as a precaution: ${error instanceof Error ? error.message : String(error)}\n`,
      )
      process.exit(2)
    }

    const cwd = resolveCwd(hookInput.cwd, 'deny-parent-access')

    // Check if we're in a worktree
    const worktreeInfo = detectWorktree(cwd)
    if (!worktreeInfo) {
      // Not a worktree — allow everything
      process.exit(0)
    }

    // Extract the path being accessed
    const rawPath = extractPath(hookInput)
    if (!rawPath) {
      // No path found — allow (tool might not have a path argument)
      process.exit(0)
    }

    // Resolve relative paths against cwd to prevent bypass via paths like ../../secret.ts
    const filePath = isAbsolute(rawPath) ? rawPath : resolve(cwd, rawPath)

    // Check if the path is under the parent project
    if (!isParentPath(filePath, worktreeInfo.parentProjectPath)) {
      // Safe path — allow
      process.exit(0)
    }

    // Allow access to paths within the worktree itself
    // (worktree is nested under parent project, so we must check this first)
    if (isParentPath(filePath, worktreeInfo.worktreePath) || filePath === worktreeInfo.worktreePath) {
      process.exit(0)
    }

    // Deny access to parent project path
    const denyResponse = buildDenyResponse(
      worktreeInfo.worktreePath,
      worktreeInfo.parentProjectPath,
      filePath,
    )

    process.stdout.write(`${JSON.stringify(denyResponse)}\n`)
    process.exit(0)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[deny-parent-access] Unexpected error — blocking tool call as a precaution: ${errorMessage}\n`)
    process.exit(2)
  }
}

if (import.meta.main) {
  await main()
}
