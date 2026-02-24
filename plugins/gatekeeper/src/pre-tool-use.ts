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
 * Split a command string on unquoted chain operators (&&, ||, ;, |).
 *
 * Returns null when:
 * - The command contains $(), backticks, or newlines (unparseable)
 * - No chain operators exist in an unquoted context (single command)
 * - The command has unclosed quotes (malformed)
 * - Any split part is empty (malformed)
 * - A lone & is present (background execution, not a chain operator)
 *
 * Returns a trimmed, non-empty string[] when the command is a valid chain.
 */
export function splitChainedCommands(cmd: string): string[] | null {
  // Reject subshell substitution, backticks, and newlines — unparseable
  if (/\$\(|`|\n/.test(cmd)) {
    return null
  }

  // Quick exit: no chain characters at all
  if (!/[;&|]/.test(cmd)) {
    return null
  }

  type State = 'normal' | 'single' | 'double'
  let state: State = 'normal'
  let escaped = false
  const parts: string[] = []
  let current = ''
  let hasChainOp = false

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]

    if (escaped) {
      current += ch
      escaped = false
      continue
    }

    if (state === 'normal') {
      if (ch === '\\') {
        escaped = true
        current += ch
        continue
      }
      if (ch === '\'') {
        state = 'single'
        current += ch
        continue
      }
      if (ch === '"') {
        state = 'double'
        current += ch
        continue
      }

      const next = cmd[i + 1]

      // 2-char operators take priority
      if (ch === '&' && next === '&') {
        parts.push(current)
        current = ''
        hasChainOp = true
        i++ // skip second &
        continue
      }
      if (ch === '|' && next === '|') {
        parts.push(current)
        current = ''
        hasChainOp = true
        i++ // skip second |
        continue
      }

      // Single-char chain operators
      if (ch === ';') {
        parts.push(current)
        current = ''
        hasChainOp = true
        continue
      }
      if (ch === '|') {
        parts.push(current)
        current = ''
        hasChainOp = true
        continue
      }

      // Lone & means background execution — treat as unparseable
      if (ch === '&') {
        return null
      }

      current += ch
    }
    else if (state === 'single') {
      if (ch === '\'') {
        state = 'normal'
      }
      current += ch
    }
    else if (state === 'double') {
      if (ch === '\\') {
        escaped = true
        current += ch
        continue
      }
      if (ch === '"') {
        state = 'normal'
      }
      current += ch
    }
  }

  // Unclosed quote — malformed
  if (state !== 'normal') {
    return null
  }

  parts.push(current)

  // No chain operators found in unquoted context — single command
  if (!hasChainOp) {
    return null
  }

  // Trim parts and reject if any are empty — malformed
  const trimmed = parts.map(p => p.trim())
  if (trimmed.some(p => p === '')) {
    return null
  }

  return trimmed
}

/**
 * Check whether a command has unquoted chain operators or dangerous chars.
 *
 * Used to distinguish "no unquoted operators" (→ single command) from
 * "has unquoted operators but unparseable/malformed" (→ passthrough).
 */
function hasUnquotedChainOps(cmd: string): boolean {
  // Subshell substitution, backticks, and newlines are always suspicious
  if (/\$\(|`|\n/.test(cmd)) {
    return true
  }

  // Quick exit: no chain characters at all
  if (!/[;&|]/.test(cmd)) {
    return false
  }

  type State = 'normal' | 'single' | 'double'
  let state: State = 'normal'
  let escaped = false

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (state === 'normal') {
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === '\'') {
        state = 'single'
        continue
      }
      if (ch === '"') {
        state = 'double'
        continue
      }
      if (ch === ';' || ch === '&' || ch === '|') {
        return true
      }
    }
    else if (state === 'single') {
      if (ch === '\'') {
        state = 'normal'
      }
    }
    else if (state === 'double') {
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === '"') {
        state = 'normal'
      }
    }
  }

  // Unclosed quote is suspicious
  if (state !== 'normal') {
    return true
  }

  return false
}

/**
 * Evaluate a single (unchained) command against DENY/ALLOW rules.
 *
 * Returns null when:
 * - The trimmed command is empty
 * - No rule matches and it is not a safe git push
 *
 * Note: does NOT trim the command for pattern matching — patterns use ^ anchors
 * and leading whitespace is intentionally treated as unknown/passthrough.
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

  // 1. DENY check on full command (fast path: catches dangerous commands at start)
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return makeDecision('deny', rule.reason)
    }
  }

  // 2. Try to split chained commands
  const parts = splitChainedCommands(cmd)

  if (parts === null) {
    // Distinguish "no unquoted chain operators" from "has chain ops but unparseable"
    if (hasUnquotedChainOps(cmd)) {
      // Unquoted chain operators exist but we couldn't cleanly split → AI review
      return null
    }

    // Single command: evaluate directly
    const result = evaluateSingleCommand(cmd)
    if (result) {
      return makeDecision(result.decision, result.reason)
    }
    return null
  }

  // 3. Chain evaluation: all parts must be safe to auto-approve
  for (const part of parts) {
    const result = evaluateSingleCommand(part)
    if (result?.decision === 'deny') {
      return makeDecision('deny', result.reason)
    }
    if (result === null) {
      // Unknown command in chain → conservative: let AI review
      return null
    }
  }

  // All parts are explicitly allowed — use first part's reason
  const firstResult = evaluateSingleCommand(parts[0])!
  return makeDecision('allow', firstResult.reason)
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
