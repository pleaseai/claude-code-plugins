import type {
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from '@anthropic-ai/claude-agent-sdk'
import { describe, expect, test } from 'bun:test'
import { evaluate, isGitPushNonForce } from './pre-tool-use'

const STUB_BASE = {
  session_id: 'test-session',
  transcript_path: '/tmp/transcript',
  cwd: '/tmp/project',
  hook_event_name: 'PreToolUse' as const,
  tool_use_id: 'test-tool-use-id',
}

function bash(command: string): PreToolUseHookInput {
  return { ...STUB_BASE, tool_name: 'Bash', tool_input: { command } }
}

function hookOutput(
  result: SyncHookJSONOutput,
): PreToolUseHookSpecificOutput {
  return result.hookSpecificOutput as PreToolUseHookSpecificOutput
}

function expectAllow(input: PreToolUseHookInput, expectedReason?: string) {
  const result = evaluate(input)
  expect(result).not.toBeNull()
  const output = hookOutput(result!)
  expect(output.permissionDecision).toBe('allow')
  expect(output.hookEventName).toBe('PreToolUse')
  if (expectedReason) {
    expect(output.permissionDecisionReason).toBe(expectedReason)
  }
}

function expectDeny(input: PreToolUseHookInput, expectedReason?: string) {
  const result = evaluate(input)
  expect(result).not.toBeNull()
  const output = hookOutput(result!)
  expect(output.permissionDecision).toBe('deny')
  if (expectedReason) {
    expect(output.permissionDecisionReason).toBe(expectedReason)
  }
}

function expectPassthrough(input: PreToolUseHookInput) {
  expect(evaluate(input)).toBeNull()
}

// ─── Passthrough (non-Bash, empty) ───────────────────────────────────────────

describe('passthrough', () => {
  test('should passthrough non-Bash tools', () => {
    expectPassthrough({
      ...STUB_BASE,
      tool_name: 'Read',
      tool_input: { command: 'ls' },
    })
    expectPassthrough({
      ...STUB_BASE,
      tool_name: 'Write',
      tool_input: { command: 'echo' },
    })
    expectPassthrough({ ...STUB_BASE, tool_name: 'Edit', tool_input: {} })
  })

  test('should passthrough when command is empty', () => {
    expectPassthrough({
      ...STUB_BASE,
      tool_name: 'Bash',
      tool_input: { command: '' },
    })
    expectPassthrough({ ...STUB_BASE, tool_name: 'Bash', tool_input: {} })
    expectPassthrough({
      ...STUB_BASE,
      tool_name: 'Bash',
      tool_input: undefined as unknown,
    })
  })

  test('should passthrough unknown commands', () => {
    expectPassthrough(bash('curl https://example.com'))
    expectPassthrough(bash('wget http://example.com'))
    expectPassthrough(bash('ssh user@host'))
    expectPassthrough(bash('scp file.txt remote:/tmp/'))
  })
})

// ─── DENY rules ──────────────────────────────────────────────────────────────

describe('deny rules', () => {
  test('should deny rm -rf / (exact root)', () => {
    expectDeny(bash('rm -rf /'), 'Filesystem root deletion blocked')
    expectDeny(bash('rm  -rf  /'), 'Filesystem root deletion blocked')
  })

  test('should deny rm -rf ~ (home directory)', () => {
    expectDeny(bash('rm -rf ~'), 'Home directory deletion blocked')
    expectDeny(bash('rm -rf ~/'), 'Home directory deletion blocked')
    expectDeny(bash('rm -rf ~/Documents'), 'Home directory deletion blocked')
  })

  test('should deny mkfs (anchored to start)', () => {
    expectDeny(bash('mkfs.ext4 /dev/sda'), 'Disk format command blocked')
    expectDeny(bash('mkfs.xfs /dev/sdb1'))
  })

  test('should deny dd disk zeroing (anchored to start)', () => {
    expectDeny(bash('dd if=/dev/zero of=/dev/sda'), 'Disk zeroing blocked')
    expectDeny(bash('dd if=/dev/zero of=/dev/nvme0n1'))
  })

  test('should not deny safe rm commands', () => {
    expectPassthrough(bash('rm -rf ./build'))
    expectPassthrough(bash('rm -rf dist'))
    expectPassthrough(bash('rm file.txt'))
  })

  test('should not deny rm -rf on subdirectories like /var, /tmp', () => {
    expectPassthrough(bash('rm -rf /var/log/old'))
    expectPassthrough(bash('rm -rf /tmp/build'))
    expectPassthrough(bash('rm -rf /home/user/project/dist'))
  })

  test('should deny rm -rf /* (root wildcard)', () => {
    expectDeny(bash('rm -rf /*'), 'Destructive wildcard deletion from root blocked')
  })

  test('should not deny when deny pattern appears in echo or comments', () => {
    expectAllow(bash('echo rm -rf /'))
    expectAllow(bash('echo mkfs.ext4'))
  })

  test('should not deny ~user paths (other users home)', () => {
    expectPassthrough(bash('rm -rf ~ubuntu/tmp'))
    expectPassthrough(bash('rm -rf ~admin/cache'))
  })
})

// ─── ALLOW: Package managers ─────────────────────────────────────────────────

describe('allow: package managers', () => {
  const PM_COMMANDS = [
    'npm test',
    'npm run build',
    'npm install',
    'npm ci',
    'npm add lodash',
    'npm remove lodash',
    'npm ls',
    'npm info react',
    'npm outdated',
    'npm audit',
    'npm why react',
    'yarn test',
    'yarn install',
    'yarn add react',
    'pnpm test',
    'pnpm install',
    'pnpm run lint',
    'bun test',
    'bun install',
    'bun run dev',
    'bun add zod',
  ]

  for (const cmd of PM_COMMANDS) {
    test(`should allow: ${cmd}`, () => {
      expectAllow(bash(cmd), 'Safe package manager command')
    })
  }
  test('should passthrough exec/x subcommands (can run arbitrary code)', () => {
    expectPassthrough(bash('npm exec tsc'))
    expectPassthrough(bash('npm x create-next-app'))
    expectPassthrough(bash('bun x create-next-app'))
  })
})

// ─── ALLOW: Git read operations ──────────────────────────────────────────────

describe('allow: git read operations', () => {
  const GIT_READ_COMMANDS = [
    'git status',
    'git log',
    'git log --oneline -10',
    'git diff',
    'git diff HEAD~1',
    'git branch',
    'git branch -a',
    'git fetch',
    'git fetch origin',
    'git remote -v',
    'git tag',
    'git show HEAD',
    'git stash list',
    'git rev-parse HEAD',
  ]

  for (const cmd of GIT_READ_COMMANDS) {
    test(`should allow: ${cmd}`, () => {
      expectAllow(bash(cmd), 'Safe git read operation')
    })
  }
})

// ─── ALLOW: Git write operations ─────────────────────────────────────────────

describe('allow: git write operations', () => {
  const GIT_WRITE_COMMANDS = [
    'git add .',
    'git add -A',
    'git commit -m \'message\'',
    'git commit -m "feat: add feature"',
    'git checkout main',
    'git checkout -b feature',
    'git switch main',
    'git switch -c feature',
    'git merge feature',
    'git rebase main',
    'git stash',
    'git stash pop',
    'git pull',
    'git pull origin main',
    'git cherry-pick abc123',
  ]

  for (const cmd of GIT_WRITE_COMMANDS) {
    test(`should allow: ${cmd}`, () => {
      expectAllow(bash(cmd), 'Safe git write operation')
    })
  }
})

// ─── ALLOW: Git push ─────────────────────────────────────────────────────────

describe('allow: git push (non-force)', () => {
  test('should allow git push', () => {
    expectAllow(bash('git push'), 'Safe git push (non-force)')
  })

  test('should allow git push origin main', () => {
    expectAllow(bash('git push origin main'), 'Safe git push (non-force)')
  })

  test('should allow git push -u origin feature', () => {
    expectAllow(
      bash('git push -u origin feature'),
      'Safe git push (non-force)',
    )
  })

  test('should passthrough git push --force', () => {
    expectPassthrough(bash('git push --force origin main'))
  })

  test('should passthrough git push -f', () => {
    expectPassthrough(bash('git push -f origin main'))
  })

  test('should passthrough git push with combined short flags containing f', () => {
    expectPassthrough(bash('git push -vf origin feature'))
  })
})

// ─── ALLOW: Build tools and runtimes ─────────────────────────────────────────

describe('allow: build tools and runtimes', () => {
  const BUILD_COMMANDS = [
    'node dist/index.js',
    'node --inspect app.js',
    'npx tsc',
    'npx -y create-next-app',
    'tsx src/index.ts',
    'python main.py',
    'python3 -m pytest',
    'ruby script.rb',
    'go run main.go',
    'cargo build',
    'cargo run',
    'cargo test',
    'cargo check',
    'cargo clippy',
    'make',
    'make build',
    'gradle build',
    'mvn clean install',
  ]

  for (const cmd of BUILD_COMMANDS) {
    test(`should allow: ${cmd}`, () => {
      expectAllow(bash(cmd), 'Safe build/runtime command')
    })
  }
})

// ─── ALLOW: File inspection ──────────────────────────────────────────────────

describe('allow: file inspection commands', () => {
  const INSPECT_COMMANDS = [
    'ls -la',
    'pwd',
    'cat package.json',
    'head -20 file.ts',
    'tail -f logs/app.log',
    'wc -l src/**/*.ts',
    'file image.png',
    'which node',
    'type git',
    'env',
    'echo hello',
    'printf \'%s\\n\' test',
    'grep -r TODO src/',
    'find . -name \'*.ts\'',
    'rg pattern',
    'fd \'*.ts\'',
    'ag TODO',
    'tree src/',
  ]

  for (const cmd of INSPECT_COMMANDS) {
    test(`should allow: ${cmd}`, () => {
      expectAllow(bash(cmd), 'Safe file inspection command')
    })
  }
})

// ─── ALLOW: Docker read ──────────────────────────────────────────────────────

describe('allow: docker read operations', () => {
  const DOCKER_COMMANDS = [
    'docker ps',
    'docker ps -a',
    'docker logs container',
    'docker images',
    'docker inspect container',
    'docker version',
  ]

  for (const cmd of DOCKER_COMMANDS) {
    test(`should allow: ${cmd}`, () => {
      expectAllow(bash(cmd), 'Safe docker read operation')
    })
  }

  test('should passthrough docker run', () => {
    expectPassthrough(bash('docker run nginx'))
  })

  test('should passthrough docker exec', () => {
    expectPassthrough(bash('docker exec -it container bash'))
  })
})

// ─── isGitPushNonForce ───────────────────────────────────────────────────────

describe('isGitPushNonForce', () => {
  test('should return true for non-force push', () => {
    expect(isGitPushNonForce('git push')).toBe(true)
    expect(isGitPushNonForce('git push origin main')).toBe(true)
    expect(isGitPushNonForce('git push -u origin feature')).toBe(true)
  })

  test('should return false for force push', () => {
    expect(isGitPushNonForce('git push --force')).toBe(false)
    expect(isGitPushNonForce('git push -f origin main')).toBe(false)
    expect(isGitPushNonForce('git push --force-with-lease')).toBe(false)
    expect(isGitPushNonForce('git push -vf')).toBe(false)
  })

  test('should return false for non-push commands', () => {
    expect(isGitPushNonForce('git pull')).toBe(false)
    expect(isGitPushNonForce('git status')).toBe(false)
    expect(isGitPushNonForce('echo git push')).toBe(false)
  })
})

// ─── DENY takes priority over ALLOW ──────────────────────────────────────────

describe('deny priority', () => {
  test('deny should take priority when both could match', () => {
    // "rm -rf /" is denied even though the command starts with rm
    expectDeny(bash('rm -rf /'))
    // "mkfs.ext4" is denied even if prefixed by sudo (which could look like a command)
    expectDeny(bash('mkfs.ext4 /dev/sda'))
  })
})

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('edge cases', () => {
  test('should passthrough chained commands to AI review', () => {
    expectPassthrough(bash('npm test && npm run build'))
    expectPassthrough(bash('npm test && rm -rf /'))
    expectPassthrough(bash('ls; rm -rf ~'))
  })

  test('should passthrough piped commands to AI review', () => {
    expectPassthrough(bash('ls -la | grep test'))
    expectPassthrough(bash('cat file | xargs rm -rf'))
  })

  test('should passthrough commands with subshell or backticks', () => {
    expectPassthrough(bash('echo $(whoami)'))
    expectPassthrough(bash('echo `whoami`'))
  })

  test('should handle commands with leading whitespace as passthrough', () => {
    expectPassthrough(bash('  npm test'))
  })
})
