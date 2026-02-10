import type {
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from '@anthropic-ai/claude-agent-sdk'
import process from 'node:process'

export interface Rule {
  pattern: RegExp
  reason: string
}

export const DENY_RULES: Rule[] = [
  { pattern: /^rm\s+-rf\s+\/(?:\s|$)/i, reason: 'Filesystem root deletion blocked' },
  { pattern: /^rm\s+-rf\s+\/\*(?:\s|$)/i, reason: 'Destructive wildcard deletion from root blocked' },
  { pattern: /^rm\s+-rf\s+~(?:\/|$)/i, reason: 'Home directory deletion blocked' },
  { pattern: /^mkfs\./i, reason: 'Disk format command blocked' },
  {
    pattern: /^dd\s+if=\/dev\/zero\s+of=\/dev\//i,
    reason: 'Disk zeroing blocked',
  },
]

export const ALLOW_RULES: Rule[] = [
  // Package managers
  {
    pattern:
      /^(npm|yarn|pnpm|bun)\s+(test|run|install|ci|add|remove|ls|info|outdated|audit|why)\b/i,
    reason: 'Safe package manager command',
  },
  // Git read operations
  {
    pattern:
      /^git\s+(status|log|diff|branch|fetch|remote|tag|show|stash\s+list|rev-parse)\b/i,
    reason: 'Safe git read operation',
  },
  // Git write operations
  {
    pattern:
      /^git\s+(add|commit|checkout|switch|merge|rebase|stash|pull|cherry-pick)\b/i,
    reason: 'Safe git write operation',
  },
  // Build tools and runtimes
  {
    pattern:
      /^(node|npx|tsx|python3?|ruby|go\s+run|cargo\s+(build|run|test|check|clippy)|make|gradle|mvn)\b/i,
    reason: 'Safe build/runtime command',
  },
  // File inspection commands
  {
    pattern:
      /^(ls|pwd|cat|head|tail|wc|file|which|type|env|echo|printf|grep|find|rg|fd|ag|tree)\b/i,
    reason: 'Safe file inspection command',
  },
  // Docker read operations
  {
    pattern: /^docker\s+(ps|logs|images|inspect|version)\b/i,
    reason: 'Safe docker read operation',
  },
]

export function isGitPushNonForce(cmd: string): boolean {
  return /^git\s+push\b/i.test(cmd) && !/--force(?:-with-lease)?\b|\s-\S*f/i.test(cmd)
}

export function makeDecision(
  decision: NonNullable<PreToolUseHookSpecificOutput['permissionDecision']>,
  reason: string,
): SyncHookJSONOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    } satisfies PreToolUseHookSpecificOutput,
  }
}

/**
 * Evaluate a tool input and return a decision or null (passthrough).
 */
export function evaluate(
  input: PreToolUseHookInput,
): SyncHookJSONOutput | null {
  if (input.tool_name !== 'Bash') {
    return null
  }

  const cmd
    = (input.tool_input as { command?: string } | undefined)?.command ?? ''
  if (!cmd) {
    return null
  }

  // 0. Reject command chaining/substitution — let AI review complex commands
  if (/[;&|`\n]|\$\(/.test(cmd)) {
    return null
  }

  // 1. DENY check (destructive commands)
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return makeDecision('deny', rule.reason)
    }
  }

  // 2. ALLOW check (safe commands)
  for (const rule of ALLOW_RULES) {
    if (rule.pattern.test(cmd)) {
      return makeDecision('allow', rule.reason)
    }
  }

  // 3. Git push without --force
  if (isGitPushNonForce(cmd)) {
    return makeDecision('allow', 'Safe git push (non-force)')
  }

  // 4. Passthrough
  return null
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk: string) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

async function main(): Promise<void> {
  const raw = await readStdin()
  // Empty stdin means no hook input; passthrough is correct per Claude Code hook protocol
  if (!raw.trim()) {
    process.exit(0)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch (err) {
    process.stderr.write(`gatekeeper: invalid JSON input: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    process.stderr.write(`gatekeeper: expected JSON object, got ${parsed === null ? 'null' : typeof parsed}\n`)
    process.exit(1)
  }

  const input = parsed as PreToolUseHookInput
  const decision = evaluate(input)
  if (decision) {
    process.stdout.write(JSON.stringify(decision))
  }

  process.exit(0)
}

main().catch((err) => {
  process.stderr.write(`gatekeeper: unexpected error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
