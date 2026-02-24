import type {
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from '@anthropic-ai/claude-agent-sdk'
import process from 'node:process'
import { parseChainedCommand } from './chain-parser'

export interface Rule {
  pattern: RegExp
  reason: string
}

// NOTE: All patterns must NOT use the `g` flag. RegExp.test() with `g` mutates
// lastIndex and produces incorrect results on subsequent calls within the same process.
export const DENY_RULES: Rule[] = [
  { pattern: /^rm\s+-rf\s+\/(?:\s|$)/i, reason: 'Filesystem root deletion blocked' },
  { pattern: /^rm\s+-rf\s+\/\*(?:\s|$)/i, reason: 'Destructive wildcard deletion from root blocked' },
  { pattern: /^rm\s+-rf\s+~(?:\/|$)/i, reason: 'Home directory deletion blocked' },
  { pattern: /^mkfs\./i, reason: 'Disk format command blocked' },
  {
    pattern: /^dd\s+if=\/dev\/zero\s+of=\/dev\//i,
    reason: 'Disk zeroing blocked',
  },
  // Block inline code execution in interpreter commands
  {
    pattern: /^(node|npx|tsx|python3?|ruby|perl)\s+(-e|-p|-c|--eval|--print)\b/i,
    reason: 'Inline interpreter code execution blocked',
  },
  // Block find -exec which enables arbitrary command execution
  {
    pattern: /^find\b.*\s(-exec|-execdir|-delete)\b/i,
    reason: 'find -exec/-execdir/-delete blocked: potential arbitrary command execution or recursive deletion',
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
  return /^git\s+push\b/i.test(cmd) && !/--force(?:-with-lease)?\b|\s-(?!-)\S*f/i.test(cmd)
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
 * Compatibility wrapper around parseChainedCommand.
 *
 * Returns the split parts when the command is a valid chain (;/&& only),
 * or null for single commands, unparseable input, pipe, ||, redirects, etc.
 *
 * NOTE: Callers must pre-trim the command. Patterns use ^ anchors and leading
 * whitespace bypasses them.
 */
export function splitChainedCommands(cmd: string): string[] | null {
  const result = parseChainedCommand(cmd)
  return result.kind === 'chain' ? result.parts : null
}

/**
 * Evaluate a single (unchained) command against DENY/ALLOW rules.
 *
 * Returns null when:
 * - The trimmed command is empty
 * - No rule matches and it is not a safe git push
 *
 * Note: does NOT trim the command for pattern matching — patterns use ^ anchors.
 * Callers (such as evaluate()) are responsible for trimming before calling.
 */
export function evaluateSingleCommand(
  cmd: string,
): { decision: 'allow' | 'deny', reason: string } | null {
  if (!cmd.trim()) {
    return null
  }

  for (const rule of DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: 'deny', reason: rule.reason }
    }
  }

  for (const rule of ALLOW_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: 'allow', reason: rule.reason }
    }
  }

  if (isGitPushNonForce(cmd)) {
    return { decision: 'allow', reason: 'Safe git push (non-force)' }
  }

  return null
}

/**
 * Evaluate a tool input and return a decision or null (passthrough to AI).
 */
export function evaluate(
  input: PreToolUseHookInput,
): SyncHookJSONOutput | null {
  if (input.tool_name !== 'Bash') {
    return null
  }

  // Trim at entry point: prevents leading-whitespace bypass of ^ anchored DENY patterns
  const cmd = ((input.tool_input as { command?: string } | undefined)?.command ?? '').trim()
  if (!cmd) {
    return null
  }

  // 1. DENY check on full command (fast path: catches dangerous commands immediately)
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      process.stderr.write(`gatekeeper: deny "${cmd}" — ${rule.reason}\n`)
      return makeDecision('deny', rule.reason)
    }
  }

  // 2. Parse the command structure
  const parsed = parseChainedCommand(cmd)

  if (parsed.kind === 'unparseable') {
    // Has pipes, redirects, ||, process substitution, or other complex constructs → AI review
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — unparseable structure\n`)
    return null
  }

  if (parsed.kind === 'single') {
    // Single command: evaluate directly
    const result = evaluateSingleCommand(cmd)
    if (result) {
      process.stderr.write(`gatekeeper: ${result.decision} "${cmd}" — ${result.reason}\n`)
      return makeDecision(result.decision, result.reason)
    }
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — no matching rule\n`)
    return null
  }

  // 3. Chain evaluation (;/&& only): every part must be explicitly safe to auto-approve
  const reasons: string[] = []
  let firstAllowedResult: { decision: 'allow' | 'deny', reason: string } | null = null

  for (const part of parsed.parts) {
    const result = evaluateSingleCommand(part)
    if (result?.decision === 'deny') {
      process.stderr.write(`gatekeeper: deny "${cmd}" — part "${part}": ${result.reason}\n`)
      return makeDecision('deny', result.reason)
    }
    if (result === null) {
      // Unknown command in chain → conservative: let AI review the full chain
      process.stderr.write(`gatekeeper: passthrough "${cmd}" — unknown part "${part}"\n`)
      return null
    }
    reasons.push(`[${part}]: ${result.reason}`)
    if (firstAllowedResult === null) {
      firstAllowedResult = result
    }
  }

  // Defensive guard: should be unreachable since parsed.parts is non-empty
  // and every part returned a non-null allow result above.
  if (firstAllowedResult === null) {
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — unexpected empty chain result\n`)
    return null
  }

  const compositeReason = `Chain allowed — ${reasons.join('; ')}`
  process.stderr.write(`gatekeeper: allow "${cmd}" — ${compositeReason}\n`)
  return makeDecision('allow', compositeReason)
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
