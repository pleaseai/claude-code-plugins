import type {
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from '@anthropic-ai/claude-agent-sdk'
import process from 'node:process'
import { parseChainedCommand } from './chain-parser'

export type Decision = 'hard_deny' | 'soft_deny' | 'allow'

export interface Rule {
  pattern: RegExp
  reason: string
}

// NOTE: All patterns must NOT use the `g` flag. RegExp.test() with `g` mutates
// lastIndex and produces incorrect results on subsequent calls within the same process.

// ─── Bash: Hard deny rules (absolute blocks, never passthrough) ─────────────

export const HARD_DENY_RULES: Rule[] = [
  { pattern: /^rm\s+-rf\s+\/(?:\s|$)/i, reason: 'Filesystem root deletion blocked' },
  { pattern: /^rm\s+-rf\s+\/\*(?:\s|$)/i, reason: 'Destructive wildcard deletion from root blocked' },
  { pattern: /^rm\s+-rf\s+~(?:\/|$)/i, reason: 'Home directory deletion blocked' },
  { pattern: /^mkfs\./i, reason: 'Disk format command blocked' },
  {
    pattern: /^dd\s+if=\/dev\/zero\s+of=\/dev\//i,
    reason: 'Disk zeroing blocked',
  },
  // Block inline code execution in interpreter commands
  // node/tsx: -p means --print (evaluates code); npx: -p means --package (safe)
  {
    pattern: /^(node|tsx)\s+(-e|-p|-c|--eval|--print)\b/i,
    reason: 'Inline interpreter code execution blocked',
  },
  {
    pattern: /^(python3?|ruby|perl)\s+(-e|-c|--eval|--print)\b/i,
    reason: 'Inline interpreter code execution blocked',
  },
  {
    pattern: /^(npx)\s+(-c|--call)\b/i,
    reason: 'Inline interpreter code execution blocked',
  },
  // Block find -exec which enables arbitrary command execution
  {
    pattern: /^find\b.*\s(-exec|-execdir|-delete)\b/i,
    reason: 'find -exec/-execdir/-delete blocked: potential arbitrary command execution or recursive deletion',
  },
]

// ─── Bash: Soft deny rules (passthrough to AI for intent judgment) ──────────

export const SOFT_DENY_RULES: Rule[] = [
  // Git destructive operations
  { pattern: /^git\s+push\s+--force(?:-with-lease)?\b/i, reason: 'Force push needs user intent verification' },
  { pattern: /^git\s+push\s+.*\s-(?!-)\S*f/i, reason: 'Force push (short flag) needs user intent verification' },
  { pattern: /^git\s+push\s+(?:.*\s)?(?:origin\s+)?(main|master)\s*$/i, reason: 'Push to default branch needs user intent verification' },
  { pattern: /^git\s+reset\s+--hard\b/i, reason: 'Hard reset needs user intent verification' },
  { pattern: /^git\s+clean\s+-[a-z]*f/i, reason: 'Git clean needs user intent verification' },
  { pattern: /^git\s+branch\s+-[a-zA-Z]*D/i, reason: 'Force branch delete needs user intent verification' },

  // Deploy/publish
  { pattern: /^npm\s+publish\b/i, reason: 'Package publish needs user intent verification' },
  { pattern: /^(terraform|pulumi)\s+apply\b/i, reason: 'Infrastructure apply needs user intent verification' },
  { pattern: /^(terraform|pulumi)\s+destroy\b/i, reason: 'Infrastructure destroy needs user intent verification' },
  { pattern: /^kubectl\s+(apply|delete)\b/i, reason: 'Kubernetes mutation needs user intent verification' },

  // Self-modification — split into two patterns because \b doesn't match before `.` (non-word char)
  { pattern: /(?:^|\s)\.claude\/settings/i, reason: 'Agent self-modification needs user intent verification' },
  { pattern: /\bCLAUDE\.md\b/i, reason: 'Agent self-modification needs user intent verification' },

  // Security weakening — only match --no-verify on commit (not push, which just skips pre-push hook)
  { pattern: /^git\s+commit\s+.*--no-verify\b/i, reason: 'Skipping commit verification needs user intent verification' },
  { pattern: /\bchmod\s+777\b/i, reason: 'Broad permission change needs user intent verification' },

  // Expose local services
  { pattern: /\b(nc|ncat|socat)\s+-l/i, reason: 'Exposing local service needs user intent verification' },
  { pattern: /\bpython3?\s+-m\s+http\.server/i, reason: 'Exposing HTTP server needs user intent verification' },

  // Unauthorized persistence
  { pattern: /\b(crontab|systemctl\s+enable|ssh-keygen|ssh-copy-id)\b/i, reason: 'Unauthorized persistence needs user intent verification' },

  // Permission grants (IAM/RBAC)
  { pattern: /\b(gcloud\s+.*add-iam|aws\s+iam|az\s+role\s+assignment)\b/i, reason: 'Permission grant needs user intent verification' },

  // Logging/audit tampering
  { pattern: /\bsystemctl\s+stop\s+.*log/i, reason: 'Logging tampering needs user intent verification' },
]

// ─── Bash: Allow rules (safe commands, instant approve) ─────────────────────

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

// ─── Write/Edit: Path-based classification ──────────────────────────────────

const WRITE_EDIT_SOFT_DENY_PATTERNS: Rule[] = [
  { pattern: /(?:^|[/\\])\.env(?:\.|$)/i, reason: 'Writing to .env file needs user intent verification' },
  { pattern: /(?:^|[/\\])\.claude[/\\]settings/i, reason: 'Writing to .claude/settings needs user intent verification' },
  { pattern: /(?:^|[/\\])CLAUDE\.md$/i, reason: 'Writing to CLAUDE.md needs user intent verification' },
  { pattern: /(?:^|[/\\])\.github[/\\]workflows[/\\]/i, reason: 'Writing to CI/CD config needs user intent verification' },
  { pattern: /(?:^|[/\\])\.gitlab-ci\.yml$/i, reason: 'Writing to CI/CD config needs user intent verification' },
  { pattern: /(?:^|[/\\])Jenkinsfile$/i, reason: 'Writing to CI/CD config needs user intent verification' },
  { pattern: /(?:^|[/\\])\.circleci[/\\]/i, reason: 'Writing to CI/CD config needs user intent verification' },
]

export function classifyWriteEdit(filePath: string): { decision: Decision, reason: string } | null {
  if (!filePath) {
    return null
  }

  for (const rule of WRITE_EDIT_SOFT_DENY_PATTERNS) {
    if (rule.pattern.test(filePath)) {
      return { decision: 'soft_deny', reason: rule.reason }
    }
  }

  // Project-relative paths are generally safe
  if (!filePath.startsWith('/') || filePath.includes('/node_modules/')) {
    return { decision: 'allow', reason: 'Safe project file write' }
  }

  // Absolute paths outside project — passthrough to AI
  return null
}

// ─── WebFetch: URL-based classification ─────────────────────────────────────

const WEBFETCH_SOFT_DENY_PATTERNS: Rule[] = [
  { pattern: /\b(pastebin\.com|paste\.ee|hastebin\.com|dpaste\.org|ghostbin\.com|rentry\.co)\b/i, reason: 'Paste service needs user intent verification' },
  { pattern: /\b(transfer\.sh|file\.io|0x0\.st|tmpfiles\.org)\b/i, reason: 'File sharing service needs user intent verification' },
  { pattern: /\.(sh|bash|ps1|bat|cmd)(\?|$)/i, reason: 'Script download needs user intent verification' },
  { pattern: /\braw\.githubusercontent\.com\/.*\.(sh|py|rb|js)$/i, reason: 'Raw script download needs user intent verification' },
]

export function classifyWebFetch(url: string): { decision: Decision, reason: string } | null {
  if (!url) {
    return null
  }

  for (const rule of WEBFETCH_SOFT_DENY_PATTERNS) {
    if (rule.pattern.test(url)) {
      return { decision: 'soft_deny', reason: rule.reason }
    }
  }

  // Localhost and known dev services are safe
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url)) {
    return { decision: 'allow', reason: 'Safe localhost request' }
  }

  // All other URLs — passthrough to AI
  return null
}

// ─── Safe tools: Instant allow list ─────────────────────────────────────────

const SAFE_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'LS',
  'Search',
  'TaskCreate',
  'TaskUpdate',
  'TaskList',
  'TaskGet',
  'TodoRead',
  'TodoWrite',
  'NotebookRead',
])

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
 * Evaluate a single (unchained) command against HARD_DENY/SOFT_DENY/ALLOW rules.
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
): { decision: Decision, reason: string } | null {
  if (!cmd.trim()) {
    return null
  }

  // 1. Hard deny — absolute blocks
  for (const rule of HARD_DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: 'hard_deny', reason: rule.reason }
    }
  }

  // 2. Soft deny — passthrough to AI for intent judgment
  for (const rule of SOFT_DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: 'soft_deny', reason: rule.reason }
    }
  }

  // 3. Allow — safe commands
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
 * Map 3-tier decision to hook output. soft_deny returns null (passthrough to PermissionRequest AI).
 */
function decisionToOutput(
  decision: Decision,
  reason: string,
  label: string,
): SyncHookJSONOutput | null {
  switch (decision) {
    case 'hard_deny':
      process.stderr.write(`gatekeeper: deny "${label}" — ${reason}\n`)
      return makeDecision('deny', reason)
    case 'soft_deny':
      process.stderr.write(`gatekeeper: soft_deny "${label}" — ${reason}\n`)
      return null // passthrough to PermissionRequest hook
    case 'allow':
      process.stderr.write(`gatekeeper: allow "${label}" — ${reason}\n`)
      return makeDecision('allow', reason)
  }
}

/**
 * Evaluate a Bash command through the 3-tier system.
 */
function evaluateBash(cmd: string): SyncHookJSONOutput | null {
  if (!cmd) {
    return null
  }

  // 1. Hard deny check on full command (fast path: catches dangerous commands immediately)
  for (const rule of HARD_DENY_RULES) {
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
      return decisionToOutput(result.decision, result.reason, cmd)
    }
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — no matching rule\n`)
    return null
  }

  // 3. Chain evaluation (;/&& only): every part must be explicitly safe to auto-approve
  const reasons: string[] = []
  let firstAllowedResult: { decision: Decision, reason: string } | null = null

  for (const part of parsed.parts) {
    const result = evaluateSingleCommand(part)
    if (result?.decision === 'hard_deny') {
      process.stderr.write(`gatekeeper: deny "${cmd}" — part "${part}": ${result.reason}\n`)
      return makeDecision('deny', result.reason)
    }
    if (result?.decision === 'soft_deny' || result === null) {
      // Soft deny or unknown in chain → conservative: let AI review the full chain
      process.stderr.write(`gatekeeper: passthrough "${cmd}" — ${result ? 'soft_deny' : 'unknown'} part "${part}"\n`)
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

/**
 * Evaluate a tool input and return a decision or null (passthrough to AI).
 * Dispatches to per-tool classifiers based on tool_name.
 */
export function evaluate(
  input: PreToolUseHookInput,
): SyncHookJSONOutput | null {
  const toolName = input.tool_name
  const toolInput = input.tool_input as Record<string, unknown> | undefined

  // Safe tools — instant allow
  if (SAFE_TOOLS.has(toolName)) {
    process.stderr.write(`gatekeeper: allow "${toolName}" — safe tool\n`)
    return makeDecision('allow', `Safe tool: ${toolName}`)
  }

  // Bash commands
  if (toolName === 'Bash') {
    const cmd = ((toolInput as { command?: string } | undefined)?.command ?? '').trim()
    return evaluateBash(cmd)
  }

  // Write/Edit — path-based classification
  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = (toolInput?.file_path as string) ?? ''
    const result = classifyWriteEdit(filePath)
    if (result) {
      return decisionToOutput(result.decision, result.reason, `${toolName}:${filePath}`)
    }
    process.stderr.write(`gatekeeper: passthrough "${toolName}:${filePath}" — no matching rule\n`)
    return null
  }

  // WebFetch — URL-based classification
  if (toolName === 'WebFetch') {
    const url = (toolInput?.url as string) ?? ''
    const result = classifyWebFetch(url)
    if (result) {
      return decisionToOutput(result.decision, result.reason, `WebFetch:${url}`)
    }
    process.stderr.write(`gatekeeper: passthrough "WebFetch:${url}" — no matching rule\n`)
    return null
  }

  // Unknown tools — passthrough to AI (fail-open)
  process.stderr.write(`gatekeeper: passthrough "${toolName}" — unknown tool\n`)
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
