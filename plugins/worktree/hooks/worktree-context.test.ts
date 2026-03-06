import { describe, expect, test } from 'bun:test'
import { buildWorktreeContext, detectWorktree } from './worktree-context'

describe('detectWorktree', () => {
  describe('primary strategy: .claude/worktrees/ path detection', () => {
    test('detects Claude Code worktree path', () => {
      const cwd = '/home/user/myproject/.claude/worktrees/feature-branch'
      const result = detectWorktree(cwd)
      expect(result).not.toBeNull()
      expect(result!.worktreePath).toBe(cwd)
      expect(result!.parentProjectPath).toBe('/home/user/myproject')
    })

    test('detects nested worktree path', () => {
      const cwd = '/home/user/org/myproject/.claude/worktrees/fix-123'
      const result = detectWorktree(cwd)
      expect(result).not.toBeNull()
      expect(result!.parentProjectPath).toBe('/home/user/org/myproject')
      expect(result!.worktreePath).toBe(cwd)
    })

    test('extracts parent project correctly when path has subdirectory suffix', () => {
      // cwd might include a subdirectory within the worktree
      const cwd = '/projects/app/.claude/worktrees/my-branch'
      const result = detectWorktree(cwd)
      expect(result).not.toBeNull()
      expect(result!.parentProjectPath).toBe('/projects/app')
    })

    test('returns null for normal (non-worktree) project path', () => {
      // Path that doesn't exist as a git repo — git fails, returns null
      const result = detectWorktree('/tmp/definitely-not-a-worktree-or-git-repo-xyz')
      expect(result).toBeNull()
    })

    test('returns null for path containing worktrees in project name (not a marker)', () => {
      // Should not false-positive on project names that happen to contain "worktrees"
      const cwd = '/home/user/my-worktrees-project/src'
      const result = detectWorktree(cwd)
      // The marker is /.claude/worktrees/ so this should not match
      expect(result).toBeNull()
    })

    test('handles path where project name contains .claude but is not worktree', () => {
      const cwd = '/home/user/dot-claude-demo/src'
      const result = detectWorktree(cwd)
      expect(result).toBeNull()
    })
  })

  describe('worktree info structure', () => {
    test('worktreePath matches the input cwd', () => {
      const cwd = '/projects/myapp/.claude/worktrees/task-42'
      const result = detectWorktree(cwd)
      expect(result?.worktreePath).toBe(cwd)
    })

    test('parentProjectPath does not include the worktrees suffix', () => {
      const cwd = '/projects/myapp/.claude/worktrees/task-42'
      const result = detectWorktree(cwd)
      expect(result?.parentProjectPath).not.toContain('worktrees')
      expect(result?.parentProjectPath).not.toContain('.claude')
    })
  })
})

describe('detectWorktree — git fallback strategy (detectWorktreeViaGit)', () => {
  // These tests exercise the git fallback path: paths that do NOT contain
  // '/.claude/worktrees/' so the primary check is bypassed.

  test('returns null for non-existent directory', () => {
    // spawnSync cwd doesn't exist → spawn error → runGit returns null → null
    const result = detectWorktree('/nonexistent/path/to/nowhere-abc123')
    expect(result).toBeNull()
  })

  test('returns null for non-git directory', () => {
    // /tmp exists but is not a git repo → git exits non-zero → null
    const result = detectWorktree('/tmp')
    expect(result).toBeNull()
  })

  test('returns null for main git repository root (not a linked worktree)', () => {
    // The project root is a real git repo but NOT a linked worktree.
    // git rev-parse --git-common-dir equals <toplevel>/.git → not a worktree.
    // Navigate up from hooks/ → worktree/ → plugins/ → repo root (claude-code-plugins)
    const { resolve: pathResolve } = require('node:path')
    const projectRoot = pathResolve(import.meta.dir, '../../..')
    const result = detectWorktree(projectRoot)
    expect(result).toBeNull()
  })

  test('returns null when path has no git ancestor', () => {
    // Root directory has no .git → git fails → null
    const result = detectWorktree('/')
    expect(result).toBeNull()
  })
})

describe('buildWorktreeContext', () => {
  const sampleInfo = {
    worktreePath: '/projects/myapp/.claude/worktrees/feature-login',
    parentProjectPath: '/projects/myapp',
  }

  test('includes the worktree path in output', () => {
    const ctx = buildWorktreeContext(sampleInfo)
    expect(ctx).toContain(sampleInfo.worktreePath)
  })

  test('includes the parent project path in output', () => {
    const ctx = buildWorktreeContext(sampleInfo)
    expect(ctx).toContain(sampleInfo.parentProjectPath)
  })

  test('contains IMPORTANT warning', () => {
    const ctx = buildWorktreeContext(sampleInfo)
    expect(ctx).toContain('IMPORTANT')
  })

  test('instructs to use worktree path, not parent', () => {
    const ctx = buildWorktreeContext(sampleInfo)
    expect(ctx).toContain('USE THIS')
    expect(ctx).toContain('DO NOT ACCESS')
  })

  test('includes path boundary rules', () => {
    const ctx = buildWorktreeContext(sampleInfo)
    expect(ctx).toContain('MUST use the worktree path')
    expect(ctx).toContain('NEVER access')
  })

  test('format is stable — context lines are present', () => {
    const ctx = buildWorktreeContext(sampleInfo)
    const lines = ctx.split('\n')
    expect(lines.length).toBeGreaterThan(3)
    // First line should be the IMPORTANT header
    expect(lines[0]).toContain('IMPORTANT')
  })
})
