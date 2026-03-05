// ---------------------------------------------------------------------------
// Extension helpers
// ---------------------------------------------------------------------------

/**
 * Replace ${extensionPath} references in MCP server configs with ${CLAUDE_PLUGIN_ROOT}.
 * Operates on the JSON string representation to cover all nested string values.
 */
export function convertMcpServerPaths(mcpServers: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(mcpServers)
  const converted = json
    .replace(/\$\{extensionPath\}\$\{\/\}/g, "${CLAUDE_PLUGIN_ROOT}/")
    .replace(/\$\{extensionPath\}\//g, "${CLAUDE_PLUGIN_ROOT}/")
    .replace(/\$\{extensionPath\}/g, "${CLAUDE_PLUGIN_ROOT}")
  return JSON.parse(converted) as Record<string, unknown>
}

/**
 * Parse a simple Gemini extension TOML command file.
 * Supports:
 *   description = "single line"
 *   prompt = """multiline"""
 *   prompt = "single line"
 */
export function parseToml(content: string): { description?: string; prompt: string } | null {
  const descMatch = content.match(/^description\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/m)
  const description = descMatch?.[1]

  // Triple-quoted multiline string
  const tripleMatch = content.match(/^prompt\s*=\s*"""([\s\S]*?)"""/m)
  if (tripleMatch) {
    const prompt = (tripleMatch[1] ?? "").replace(/^\n/, "")
    return { description, prompt }
  }

  // Double-quoted single line
  const singleMatch = content.match(/^prompt\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/m)
  if (singleMatch) {
    return { description, prompt: singleMatch[1] ?? "" }
  }

  return null
}
