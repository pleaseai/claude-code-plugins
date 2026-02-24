/**
 * Unified quote-aware command parser for the Gatekeeper Layer 1.
 *
 * Replaces the former splitChainedCommands + hasUnquotedChainOps pair with a
 * single deterministic state machine, eliminating the code duplication that
 * caused the two functions to diverge and produce inconsistent security decisions.
 */

export type ParseResult
  /**
   * Reject and send to AI review. Covers: subshell, backtick, newline,
   *  process substitution, redirect, pipe, ||, lone &, unclosed quote, malformed chain.
   */
  = | { kind: 'unparseable' }
  /** No unquoted chain operators: evaluate as a single command. */
    | { kind: 'single' }
  /** Successfully split on ; or && only: evaluate each part independently. */
    | { kind: 'chain', parts: string[] }

/**
 * Parse a shell command string and classify it as unparseable, single, or a
 * safe chain of commands that can be evaluated per-part.
 *
 * Security invariants guaranteed by this function:
 * - $(), backtick, newline, <(), >() → unparseable  (subshell / process substitution)
 * - Unquoted < or >               → unparseable  (file redirect: arbitrary write/read)
 * - ||                            → unparseable  (right side runs on LEFT failure; semantics differ)
 * - single |                      → unparseable  (pipe: stdout→stdin, context-dependent)
 * - Lone &                        → unparseable  (background execution; different semantics)
 * - Unclosed quote                → unparseable  (malformed)
 * - Empty parts after split       → unparseable  (malformed)
 * - Only ; and && produce splits  (sequential execution; safe to evaluate per-part)
 *
 * IMPORTANT: Callers MUST trim the command before calling this function.
 * The function assumes the input has no leading/trailing whitespace.
 */
export function parseChainedCommand(cmd: string): ParseResult {
  // Reject subshell substitution, backticks, newlines, and process substitution
  if (/\$\(|`|\n|<\(|>\(/.test(cmd)) {
    return { kind: 'unparseable' }
  }

  // Quick exit: no special characters at all (include backslash to detect trailing escape)
  if (!/[;&|<>\\]/.test(cmd)) {
    return { kind: 'single' }
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

      // Redirect operators outside quotes → potential arbitrary file write/read
      if (ch === '<' || ch === '>') {
        return { kind: 'unparseable' }
      }

      const next = cmd[i + 1]

      // && → sequential AND (safe to split per-part)
      if (ch === '&' && next === '&') {
        parts.push(current)
        current = ''
        hasChainOp = true
        i++ // consume second &
        continue
      }

      // || → conditional OR: right side runs only when left FAILS → reject
      if (ch === '|' && next === '|') {
        return { kind: 'unparseable' }
      }

      // ; → sequential separator (safe to split per-part)
      if (ch === ';') {
        parts.push(current)
        current = ''
        hasChainOp = true
        continue
      }

      // | → pipe: stdout→stdin connection, semantics depend on both sides → reject
      if (ch === '|') {
        return { kind: 'unparseable' }
      }

      // Lone & → background execution → reject
      if (ch === '&') {
        return { kind: 'unparseable' }
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

  // Unclosed quote or trailing backslash → malformed
  if (state !== 'normal' || escaped) {
    return { kind: 'unparseable' }
  }

  parts.push(current)

  // No chain operators found in unquoted context → single command
  if (!hasChainOp) {
    return { kind: 'single' }
  }

  // Trim parts and reject if any are empty → malformed chain
  const trimmed = parts.map(p => p.trim())
  if (trimmed.includes('')) {
    return { kind: 'unparseable' }
  }

  return { kind: 'chain', parts: trimmed }
}
