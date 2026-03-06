import { describe, expect, test } from 'bun:test'
import { buildDenyResponse, extractPath, isParentPath } from './deny-parent-access'

describe('extractPath', () => {
  test('extracts file_path for Read tool', () => {
    const input = {
      tool_name: 'Read',
      tool_input: { file_path: '/home/user/project/src/index.ts' },
    }
    expect(extractPath(input)).toBe('/home/user/project/src/index.ts')
  })

  test('extracts path for Grep tool', () => {
    const input = {
      tool_name: 'Grep',
      tool_input: { path: '/home/user/project/src', pattern: 'something' },
    }
    expect(extractPath(input)).toBe('/home/user/project/src')
  })

  test('extracts path for Glob tool', () => {
    const input = {
      tool_name: 'Glob',
      tool_input: { path: '/home/user/project', pattern: '**/*.ts' },
    }
    expect(extractPath(input)).toBe('/home/user/project')
  })

  test('returns null when tool_input is missing', () => {
    const input = { tool_name: 'Read' }
    expect(extractPath(input)).toBeNull()
  })

  test('returns null when both file_path and path are absent', () => {
    const input = { tool_name: 'Read', tool_input: { content: 'something' } }
    expect(extractPath(input)).toBeNull()
  })

  test('prefers file_path over path when both present', () => {
    const input = {
      tool_input: { file_path: '/path/via/file_path', path: '/path/via/path' },
    }
    expect(extractPath(input)).toBe('/path/via/file_path')
  })

  test('returns null for empty string file_path', () => {
    const input = { tool_input: { file_path: '' } }
    expect(extractPath(input)).toBeNull()
  })

  test('returns null for empty string path', () => {
    const input = { tool_input: { path: '' } }
    expect(extractPath(input)).toBeNull()
  })

  test('extracts file_path for Edit tool', () => {
    const input = {
      tool_name: 'Edit',
      tool_input: { file_path: '/home/user/project/src/index.ts', old_string: 'a', new_string: 'b' },
    }
    expect(extractPath(input)).toBe('/home/user/project/src/index.ts')
  })

  test('extracts file_path for Write tool', () => {
    const input = {
      tool_name: 'Write',
      tool_input: { file_path: '/home/user/project/src/index.ts', content: 'hello' },
    }
    expect(extractPath(input)).toBe('/home/user/project/src/index.ts')
  })

  test('extracts file_path for MultiEdit tool', () => {
    const input = {
      tool_name: 'MultiEdit',
      tool_input: {
        file_path: '/home/user/project/src/index.ts',
        edits: [{ old_string: 'a', new_string: 'b' }],
      },
    }
    expect(extractPath(input)).toBe('/home/user/project/src/index.ts')
  })
})

describe('isParentPath', () => {
  const parentPath = '/home/user/myproject'

  test('returns true for path directly under parent', () => {
    expect(isParentPath('/home/user/myproject/src/index.ts', parentPath)).toBe(true)
  })

  test('returns true for the parent path itself', () => {
    expect(isParentPath('/home/user/myproject', parentPath)).toBe(true)
  })

  test('returns true for nested path under parent', () => {
    expect(isParentPath('/home/user/myproject/a/b/c/d.ts', parentPath)).toBe(true)
  })

  test('returns true for worktree path nested under parent (allow/deny decided by combined check in main)', () => {
    const worktreePath = '/home/user/myproject/.claude/worktrees/my-branch/src/index.ts'
    // Worktree IS under the parent project — isParentPath returns true here.
    // The caller (main) must also check isParentPath(path, worktreePath) to allow worktree-internal access.
    expect(isParentPath(worktreePath, parentPath)).toBe(true)
  })

  test('returns false for unrelated path', () => {
    expect(isParentPath('/home/user/otherproject/src', parentPath)).toBe(false)
  })

  test('returns false for relative path', () => {
    expect(isParentPath('src/index.ts', parentPath)).toBe(false)
  })

  test('does not false-positive on path prefix without boundary', () => {
    // /home/user/myproject-extra should NOT match /home/user/myproject
    expect(isParentPath('/home/user/myproject-extra/src', parentPath)).toBe(false)
  })

  test('handles parent path with trailing slash', () => {
    expect(isParentPath('/home/user/myproject/file.ts', '/home/user/myproject/')).toBe(true)
  })

  test('normalizes .. sequences to prevent path traversal bypass', () => {
    // /home/user/myproject/.claude/worktrees/wt/../../src/secret.ts
    // normalizes to /home/user/myproject/.claude/src/secret.ts — under parent, should be true
    const traversalPath = '/home/user/myproject/.claude/worktrees/wt/../../src/secret.ts'
    expect(isParentPath(traversalPath, parentPath)).toBe(true)
  })

  test('normalizes .. to correctly identify worktree-escaping path as under parent', () => {
    // This path escapes the worktree dir and lands in the parent project
    const worktreePath = '/home/user/myproject/.claude/worktrees/feature-xyz'
    const escapingPath = `${worktreePath}/../../src/secret.ts`
    // After normalization: /home/user/myproject/.claude/src/secret.ts
    // It is under the parent (true) but NOT under the worktree (false) → should be denied
    expect(isParentPath(escapingPath, parentPath)).toBe(true)
    expect(isParentPath(escapingPath, worktreePath)).toBe(false)
  })
})

describe('buildDenyResponse', () => {
  const worktreePath = '/home/user/myproject/.claude/worktrees/my-branch'
  const parentProjectPath = '/home/user/myproject'
  const filePath = '/home/user/myproject/src/secret.ts'

  test('returns object with hookSpecificOutput', () => {
    const response = buildDenyResponse(worktreePath, parentProjectPath, filePath)
    expect(response).toHaveProperty('hookSpecificOutput')
  })

  test('sets hookEventName to PreToolUse', () => {
    const response = buildDenyResponse(worktreePath, parentProjectPath, filePath) as any
    expect(response.hookSpecificOutput.hookEventName).toBe('PreToolUse')
  })

  test('sets permissionDecision to deny', () => {
    const response = buildDenyResponse(worktreePath, parentProjectPath, filePath) as any
    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  test('includes the blocked file path in the reason', () => {
    const response = buildDenyResponse(worktreePath, parentProjectPath, filePath) as any
    expect(response.hookSpecificOutput.permissionDecisionReason).toContain(filePath)
  })

  test('includes worktree path in systemMessage', () => {
    const response = buildDenyResponse(worktreePath, parentProjectPath, filePath) as any
    expect(response.systemMessage).toContain(worktreePath)
  })

  test('includes parent project path in systemMessage', () => {
    const response = buildDenyResponse(worktreePath, parentProjectPath, filePath) as any
    expect(response.systemMessage).toContain(parentProjectPath)
  })
})

describe('combined allow/deny decision (simulating main() logic)', () => {
  // These tests verify the combined isParentPath checks that determine the
  // allow/deny decision in main(). The decision is:
  //   deny = underParent && !underWorktree
  //   allow = !underParent || underWorktree

  const worktreePath = '/home/user/myproject/.claude/worktrees/feature-xyz'
  const parentProjectPath = '/home/user/myproject'

  test('denies parent-only file (not in worktree)', () => {
    const filePath = `${parentProjectPath}/src/index.ts`
    const underParent = isParentPath(filePath, parentProjectPath)
    const underWorktree = isParentPath(filePath, worktreePath)
    expect(underParent && !underWorktree).toBe(true) // should deny
  })

  test('allows worktree-internal file even though it is under parent', () => {
    const filePath = `${worktreePath}/src/index.ts`
    const underParent = isParentPath(filePath, parentProjectPath)
    const underWorktree = isParentPath(filePath, worktreePath)
    expect(underParent && !underWorktree).toBe(false) // should allow
  })

  test('denies path traversal that escapes worktree into parent', () => {
    // /worktree/../../src/secret.ts normalizes to /parent/.claude/src/secret.ts
    const traversalPath = `${worktreePath}/../../src/secret.ts`
    const underParent = isParentPath(traversalPath, parentProjectPath)
    const underWorktree = isParentPath(traversalPath, worktreePath)
    expect(underParent && !underWorktree).toBe(true) // should deny
  })

  test('allows unrelated path outside parent', () => {
    const filePath = '/home/user/completely-different/project/file.ts'
    const underParent = isParentPath(filePath, parentProjectPath)
    expect(underParent).toBe(false) // should allow (not under parent at all)
  })
})

describe('deny-parent-access integration scenarios', () => {
  // These tests verify the logic that would be applied in the main() function.
  // They use extractPath and isParentPath together to simulate the hook behavior.

  const worktreeCwd = '/home/user/myproject/.claude/worktrees/feature-xyz'
  const parentProjectPath = '/home/user/myproject'

  test('blocks Read of parent project file', () => {
    const toolInput = { tool_name: 'Read', tool_input: { file_path: `${parentProjectPath}/src/index.ts` } }
    const filePath = extractPath(toolInput)
    expect(filePath).not.toBeNull()
    expect(isParentPath(filePath!, parentProjectPath)).toBe(true)
  })

  test('allows Read of worktree file (worktree is under parent, but explicitly allowed)', () => {
    // worktree path starts with parent, but the hook allows worktree paths through
    const worktreeFilePath = `${worktreeCwd}/src/index.ts`
    // The file is under parent (would normally be denied)
    expect(isParentPath(worktreeFilePath, parentProjectPath)).toBe(true)
    // But it's also under the worktree path, so it should be allowed
    expect(isParentPath(worktreeFilePath, worktreeCwd)).toBe(true)
  })

  test('allows Read of unrelated path in non-worktree context', () => {
    // When detectWorktree returns null, all paths are allowed
    const filePath = '/home/user/completely-different/project/file.ts'
    // Not a worktree → no check needed
    expect(isParentPath(filePath, parentProjectPath)).toBe(false)
  })

  test('blocks Grep with parent project path', () => {
    const toolInput = { tool_name: 'Grep', tool_input: { path: parentProjectPath, pattern: 'secret' } }
    const filePath = extractPath(toolInput)
    expect(filePath).not.toBeNull()
    expect(isParentPath(filePath!, parentProjectPath)).toBe(true)
  })

  test('blocks Glob with parent project path', () => {
    const toolInput = { tool_name: 'Glob', tool_input: { path: parentProjectPath, pattern: '**/*.ts' } }
    const filePath = extractPath(toolInput)
    expect(filePath).not.toBeNull()
    expect(isParentPath(filePath!, parentProjectPath)).toBe(true)
  })
})
