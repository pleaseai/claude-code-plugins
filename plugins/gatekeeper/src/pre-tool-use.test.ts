import type {
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from '@anthropic-ai/claude-agent-sdk'
import { describe, expect, test } from 'bun:test'
import { evaluate, evaluateSingleCommand, isGitPushNonForce, splitChainedCommands } from './pre-tool-use'

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

// ─── splitChainedCommands ─────────────────────────────────────────────────────

describe('splitChainedCommands', () => {
  test('should return null for subshell $() substitution', () => {
    expect(splitChainedCommands('echo $(whoami)')).toBeNull()
    expect(splitChainedCommands('ls $(pwd)')).toBeNull()
  })

  test('should return null for backtick substitution', () => {
    expect(splitChainedCommands('echo `whoami`')).toBeNull()
    expect(splitChainedCommands('ls `pwd`')).toBeNull()
  })

  test('should return null for newline in command', () => {
    expect(splitChainedCommands('ls\npwd')).toBeNull()
  })

  test('should return null when no chain operators present', () => {
    expect(splitChainedCommands('npm test')).toBeNull()
    expect(splitChainedCommands('git status')).toBeNull()
    expect(splitChainedCommands('ls -la')).toBeNull()
  })

  test('should return null for operators inside single quotes', () => {
    expect(splitChainedCommands("grep 'a|b' file.txt")).toBeNull()
    expect(splitChainedCommands("git commit -m 'a && b'")).toBeNull()
    expect(splitChainedCommands("echo 'a; b; c'")).toBeNull()
  })

  test('should return null for operators inside double quotes', () => {
    expect(splitChainedCommands('git commit -m "a && b"')).toBeNull()
    expect(splitChainedCommands('echo "a | b"')).toBeNull()
    expect(splitChainedCommands('grep "a;b" file.txt')).toBeNull()
  })

  test('should return null for unclosed single quote', () => {
    expect(splitChainedCommands("echo 'test && rm -rf /")).toBeNull()
    expect(splitChainedCommands("git commit -m 'feat")).toBeNull()
  })

  test('should return null for unclosed double quote', () => {
    expect(splitChainedCommands('echo "test && rm -rf /')).toBeNull()
  })

  test('should return null for empty parts (malformed chains)', () => {
    expect(splitChainedCommands('ls ;; pwd')).toBeNull()
    expect(splitChainedCommands('ls &&')).toBeNull()
    expect(splitChainedCommands('&& ls')).toBeNull()
    expect(splitChainedCommands('ls || || pwd')).toBeNull()
  })

  test('should split on && operator', () => {
    expect(splitChainedCommands('npm test && npm run build')).toEqual([
      'npm test',
      'npm run build',
    ])
  })

  test('should split on || operator', () => {
    expect(splitChainedCommands('git status || git init')).toEqual([
      'git status',
      'git init',
    ])
  })

  test('should split on ; operator', () => {
    expect(splitChainedCommands('ls; pwd')).toEqual(['ls', 'pwd'])
    expect(splitChainedCommands('ls ; pwd')).toEqual(['ls', 'pwd'])
  })

  test('should split on | (pipe) operator', () => {
    expect(splitChainedCommands('ls -la | grep test')).toEqual([
      'ls -la',
      'grep test',
    ])
  })

  test('should split 3+ chained commands', () => {
    expect(
      splitChainedCommands('npm test && npm run build && npm run lint'),
    ).toEqual(['npm test', 'npm run build', 'npm run lint'])
  })

  test('should trim whitespace from each part', () => {
    expect(splitChainedCommands('  ls  &&  pwd  ')).toEqual(['ls', 'pwd'])
  })

  test('should not split on lone & (background execution)', () => {
    expect(splitChainedCommands('ls &')).toBeNull()
    expect(splitChainedCommands('sleep 5 & echo done')).toBeNull()
  })
})

// ─── evaluateSingleCommand ────────────────────────────────────────────────────

describe('evaluateSingleCommand', () => {
  test('should return null for empty string', () => {
    expect(evaluateSingleCommand('')).toBeNull()
  })

  test('should return null for whitespace-only string', () => {
    expect(evaluateSingleCommand('   ')).toBeNull()
    expect(evaluateSingleCommand('\t')).toBeNull()
  })

  test('should return deny for DENY rule matches', () => {
    const result = evaluateSingleCommand('rm -rf /')
    expect(result).not.toBeNull()
    expect(result!.decision).toBe('deny')
    expect(result!.reason).toBe('Filesystem root deletion blocked')
  })

  test('should return deny for rm -rf ~ (home directory)', () => {
    const result = evaluateSingleCommand('rm -rf ~')
    expect(result).not.toBeNull()
    expect(result!.decision).toBe('deny')
    expect(result!.reason).toBe('Home directory deletion blocked')
  })

  test('should return allow for ALLOW rule matches', () => {
    const result = evaluateSingleCommand('npm test')
    expect(result).not.toBeNull()
    expect(result!.decision).toBe('allow')
    expect(result!.reason).toBe('Safe package manager command')
  })

  test('should return allow for git operations', () => {
    const result = evaluateSingleCommand('git status')
    expect(result).not.toBeNull()
    expect(result!.decision).toBe('allow')
    expect(result!.reason).toBe('Safe git read operation')
  })

  test('should return allow for safe git push', () => {
    const result = evaluateSingleCommand('git push')
    expect(result).not.toBeNull()
    expect(result!.decision).toBe('allow')
    expect(result!.reason).toBe('Safe git push (non-force)')
  })

  test('should return null for unknown commands', () => {
    expect(evaluateSingleCommand('curl https://example.com')).toBeNull()
    expect(evaluateSingleCommand('xargs rm -rf')).toBeNull()
    expect(evaluateSingleCommand('ssh user@host')).toBeNull()
  })

  test('should not trim input for pattern matching (preserves leading whitespace behavior)', () => {
    // Leading whitespace means patterns with ^ don't match → null
    expect(evaluateSingleCommand('  npm test')).toBeNull()
  })
})

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

  test('should allow git push with --follow-tags (not force)', () => {
    expectAllow(bash('git push --follow-tags'), 'Safe git push (non-force)')
  })

  test('should allow git push with --no-verify (not force)', () => {
    expectAllow(bash('git push --no-verify'), 'Safe git push (non-force)')
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
    expect(isGitPushNonForce('git push --follow-tags')).toBe(true)
    expect(isGitPushNonForce('git push --no-verify')).toBe(true)
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

  test('deny should take priority over chaining passthrough', () => {
    expectDeny(bash('rm -rf / ; echo done'))
    expectDeny(bash('rm -rf / && ls'))
    expectDeny(bash('rm -rf / | cat'))
    expectDeny(bash('rm -rf ~/ ; true'))
  })
})

// ─── Chain parsing: integration tests ────────────────────────────────────────

describe('chain parsing: safe chains are allowed in Layer 1', () => {
  test('should allow chain where all parts are safe', () => {
    expectAllow(bash('npm test && npm run build'))
    expectAllow(bash('ls -la | grep test'))
  })

  test('should allow 3+ chained safe commands', () => {
    expectAllow(bash('npm test && npm run build && npm run lint'))
  })

  test('should deny chain where any part is denied', () => {
    expectDeny(bash('npm test && rm -rf /'))
    expectDeny(bash('ls; rm -rf ~'))
    expectDeny(bash('ls && rm -rf /'))
  })

  test('should passthrough chain where any part is unknown', () => {
    expectPassthrough(bash('cat file | xargs rm -rf'))
    expectPassthrough(bash('npm test && curl example.com'))
  })

  test('should allow single command with operators inside single quotes', () => {
    // Pipe inside single quotes: not a chain operator
    expectAllow(bash("grep 'a|b' file.txt"))
  })

  test('should allow single command with operators inside double quotes', () => {
    // Chain operators inside double quotes: not chain operators
    expectAllow(bash('git commit -m "a && b"'))
  })

  test('should passthrough unparseable: subshell $() substitution', () => {
    expectPassthrough(bash('echo $(whoami)'))
  })

  test('should passthrough unparseable: backtick substitution', () => {
    expectPassthrough(bash('echo `whoami`'))
  })

  test('should passthrough malformed chain: empty parts', () => {
    expectPassthrough(bash('ls ;; pwd'))
  })

  test('should passthrough malformed chain: trailing operator', () => {
    expectPassthrough(bash('ls &&'))
  })

  test('should passthrough background execution (lone &)', () => {
    expectPassthrough(bash('sleep 5 & echo done'))
  })
})

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('edge cases', () => {
  test('should passthrough commands with subshell or backticks', () => {
    expectPassthrough(bash('echo $(whoami)'))
    expectPassthrough(bash('echo `whoami`'))
  })

  test('should handle commands with leading whitespace as passthrough', () => {
    expectPassthrough(bash('  npm test'))
  })
})
