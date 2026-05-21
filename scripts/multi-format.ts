import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

/**
 * Multi-format plugin manifest generator.
 *
 * Reads the Claude Code plugin manifest (`.claude-plugin/plugin.json`) and a
 * marketplace entry, then emits equivalent manifests for two additional
 * runtimes so the same plugin directory loads in all three:
 *
 *   - Claude Code (source of truth):  plugins/<name>/.claude-plugin/plugin.json
 *   - Codex:                          plugins/<name>/.codex-plugin/plugin.json + .mcp.json
 *   - Antigravity:                    plugins/<name>/plugin.json + mcp_config.json + hooks.json
 *
 * Shared assets (`skills/`, `commands/`, `hooks/`) live once and are referenced
 * by each manifest. Only manifest-level fields differ across runtimes.
 *
 * Mapping rules (see also: scripts/multi-format.test.ts):
 *
 *   Claude → Codex
 *     - `mcpServers` inline → written to `.mcp.json`, manifest field becomes "./.mcp.json"
 *     - `hooks` field is dropped (Codex validation rejects it; hooks/ dir still works)
 *     - `interface` block synthesised from marketplace entry (displayName/category/etc.)
 *
 *   Claude → Antigravity
 *     - Flat root manifest: only `name` is required; other fields preserved when present
 *     - `mcpServers` inline → written to `mcp_config.json`
 *     - `hooks/hooks.json` (if present) → mirrored to root `hooks.json`
 *     - skills/ reused as-is (same SKILL.md format)
 *
 * Antigravity collision: plugins that already use a root-level `plugin.json`
 * (currently `bun`, `plugin-dev`) are treated as Antigravity-compatible
 * already — generator only writes the file when content actually changes,
 * and Claude Code itself can read root-level `plugin.json`.
 */

export interface ClaudePluginManifest {
  name: string
  version?: string
  description?: string
  author?: { name?: string; email?: string; url?: string }
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  skills?: string | string[]
  hooks?: string | unknown
  mcpServers?: Record<string, unknown> | string
  commands?: string | string[]
  agents?: string | string[]
  [key: string]: unknown
}

export interface MarketplaceEntry {
  name: string
  description?: string
  displayName?: string
  category?: string
  keywords?: string[]
  tags?: string[]
  source?: unknown
}

export interface CodexInterface {
  displayName: string
  shortDescription: string
  longDescription: string
  developerName: string
  category: string
  capabilities: string[]
  defaultPrompt: string[]
  websiteURL?: string
}

export interface CodexAuthor {
  name: string
  email?: string
  url?: string
}

export interface CodexManifest {
  name: string
  version: string
  description: string
  author: CodexAuthor
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  skills?: string
  mcpServers?: string
  interface: CodexInterface
}

export interface AntigravityManifest {
  name: string
  version?: string
  description?: string
  author?: ClaudePluginManifest["author"]
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
}

const DEFAULT_CATEGORY = "Productivity"

function isHttpsUrl(value: string | undefined): value is string {
  return !!value && /^https:\/\/[^\s]+$/.test(value)
}

function pickDisplayName(claude: ClaudePluginManifest, entry: MarketplaceEntry | undefined): string {
  if (entry?.displayName) return entry.displayName
  const fromName = claude.name
    .split("-")
    .filter(Boolean)
    .map(part => part[0]!.toUpperCase() + part.slice(1))
    .join(" ")
  return fromName || claude.name
}

function pickCategory(entry: MarketplaceEntry | undefined): string {
  const raw = entry?.category
  if (!raw) return DEFAULT_CATEGORY
  return raw[0]!.toUpperCase() + raw.slice(1)
}

/**
 * Codex expects `skills` as a single string path that normalises to "skills"
 * (the validator literally requires `./skills/` at plugin root). Plugins that
 * source skills from `./.agents/skills/` (Antfu convention) cannot satisfy
 * Codex via the manifest field — return null so the caller omits it. In that
 * case the skills won't auto-load under Codex, but the plugin still installs.
 */
function normalizeSkillsPath(value: string | string[]): string | null {
  const first = typeof value === "string" ? value : (value[0] ?? null)
  if (!first) return null
  const trimmed = first.replace(/^\.\//, "").replace(/\/$/, "")
  return trimmed === "skills" ? "./skills/" : null
}

function shortDescription(text: string): string {
  const firstSentence = text.split(/[.!?]\s/)[0] ?? text
  return firstSentence.length > 160 ? `${firstSentence.slice(0, 157).trimEnd()}...` : firstSentence
}

/**
 * Coerce an arbitrary version string into strict semver. Codex validator
 * requires `MAJOR.MINOR.PATCH` (with optional pre-release/build); fall back
 * to "1.0.0" when the source manifest is missing the field or uses a
 * non-semver value like a date stamp.
 */
function normalizeVersion(value: string | undefined): string {
  if (!value) return "1.0.0"
  return /^\d+\.\d+\.\d+(?:[-+].+)?$/.test(value) ? value : "1.0.0"
}

function pickAuthor(claude: ClaudePluginManifest): CodexAuthor {
  const src = claude.author
  if (!src?.name) return { name: "Community" }
  const author: CodexAuthor = { name: src.name }
  if (src.email) author.email = src.email
  if (isHttpsUrl(src.url)) author.url = src.url
  return author
}

/**
 * Derive Codex `capabilities` from what the plugin actually provides:
 * - `Skill` when the manifest references a skills directory
 * - `Tool`  when the manifest references MCP servers
 * - `Interactive` when the plugin has hooks (sessions/commands respond to events)
 * Always returns a non-empty array so the validator is satisfied.
 */
function deriveCapabilities(claude: ClaudePluginManifest): string[] {
  const caps: string[] = []
  if (claude.skills) caps.push("Skill")
  if (claude.mcpServers) caps.push("Tool")
  if (claude.hooks || claude.commands) caps.push("Interactive")
  if (caps.length === 0) caps.push("Skill")
  return caps
}

/**
 * Codex requires `defaultPrompt` to be an array of starter prompts. We do
 * not have hand-written prompts for each plugin, so synthesise a single
 * neutral prompt from the plugin name. Users (and downstream tooling) can
 * override this after the first generation.
 */
function deriveDefaultPrompts(claude: ClaudePluginManifest, displayName: string): string[] {
  const verbHint = claude.mcpServers ? "Use" : "Help me use"
  const prompt = `${verbHint} ${displayName} for my current task.`
  return prompt.length <= 128 ? [prompt] : [prompt.slice(0, 125) + "..."]
}

/**
 * Convert a Claude Code plugin manifest into a Codex manifest.
 *
 * Caller is responsible for writing the returned manifest to
 * `.codex-plugin/plugin.json` and for writing inline mcpServers to `.mcp.json`
 * using {@link extractMcpServersFile}.
 */
export function toCodexManifest(
  claude: ClaudePluginManifest,
  entry: MarketplaceEntry | undefined,
): CodexManifest {
  const hasInlineMcp = claude.mcpServers && typeof claude.mcpServers === "object"
  const hasMcpString = typeof claude.mcpServers === "string"
  const description = claude.description ?? entry?.description ?? claude.name
  const displayName = pickDisplayName(claude, entry)
  const author = pickAuthor(claude)

  const manifest: CodexManifest = {
    name: claude.name,
    version: normalizeVersion(claude.version),
    description,
    author,
    interface: {
      displayName,
      shortDescription: shortDescription(description),
      longDescription: description,
      developerName: author.name,
      category: pickCategory(entry),
      capabilities: deriveCapabilities(claude),
      defaultPrompt: deriveDefaultPrompts(claude, displayName),
    },
  }

  if (claude.homepage) manifest.homepage = claude.homepage
  if (claude.repository) manifest.repository = claude.repository
  if (claude.license) manifest.license = claude.license
  if (claude.keywords && claude.keywords.length > 0) manifest.keywords = claude.keywords
  if (claude.skills) {
    const skillsPath = normalizeSkillsPath(claude.skills)
    if (skillsPath) manifest.skills = skillsPath
  }
  if (hasInlineMcp || hasMcpString) manifest.mcpServers = hasInlineMcp ? "./.mcp.json" : (claude.mcpServers as string)

  if (isHttpsUrl(claude.homepage)) manifest.interface.websiteURL = claude.homepage

  return manifest
}

/**
 * Convert a Claude Code plugin manifest into an Antigravity manifest.
 *
 * Antigravity only requires `name`; other fields are preserved when present
 * so the same file can satisfy both Antigravity and the legacy root-level
 * Claude Code manifest convention used by a few existing plugins.
 */
export function toAntigravityManifest(claude: ClaudePluginManifest): AntigravityManifest {
  const manifest: AntigravityManifest = { name: claude.name }
  if (claude.version) manifest.version = claude.version
  if (claude.description) manifest.description = claude.description
  if (claude.author) manifest.author = claude.author
  if (claude.homepage) manifest.homepage = claude.homepage
  if (claude.repository) manifest.repository = claude.repository
  if (claude.license) manifest.license = claude.license
  if (claude.keywords && claude.keywords.length > 0) manifest.keywords = claude.keywords
  return manifest
}

/**
 * Pull inline `mcpServers` out of a Claude manifest so it can be written to
 * an external file (`.mcp.json` for Codex, `mcp_config.json` for Antigravity).
 * Returns null when the manifest has no inline servers.
 */
export function extractMcpServersFile(claude: ClaudePluginManifest): { mcpServers: Record<string, unknown> } | null {
  if (!claude.mcpServers || typeof claude.mcpServers !== "object") return null
  return { mcpServers: claude.mcpServers as Record<string, unknown> }
}

/**
 * Build a Codex marketplace entry for an existing local plugin.
 * Mirrors the schema documented in plugin-creator (policy + category required).
 */
export interface CodexMarketplaceEntry {
  name: string
  source: { source: "local"; path: string }
  policy: { installation: "AVAILABLE" | "INSTALLED_BY_DEFAULT" | "NOT_AVAILABLE"; authentication: "ON_INSTALL" | "ON_USE" }
  category: string
}

export function toCodexMarketplaceEntry(entry: MarketplaceEntry, pluginDirName: string): CodexMarketplaceEntry {
  return {
    name: entry.name,
    source: { source: "local", path: `./plugins/${pluginDirName}` },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: pickCategory(entry),
  }
}

// ---------------------------------------------------------------------------
// File I/O layer — keeps pure converters above; this section reads/writes disk.
// ---------------------------------------------------------------------------

/**
 * Read the Claude Code manifest for a plugin, checking the standard
 * `.claude-plugin/plugin.json` location first and falling back to a
 * root-level `plugin.json` for the few plugins that use that convention.
 */
export function readClaudeManifest(pluginDir: string): ClaudePluginManifest | null {
  const nested = join(pluginDir, ".claude-plugin", "plugin.json")
  const root = join(pluginDir, "plugin.json")
  const path = existsSync(nested) ? nested : existsSync(root) ? root : null
  if (!path) return null
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ClaudePluginManifest
  } catch {
    return null
  }
}

/**
 * Write `content` to `path` only when it differs from the existing file (or the
 * file is absent). Returns true when a write happened. Keeps git history quiet.
 */
export function writeIfChanged(path: string, content: string): boolean {
  if (existsSync(path)) {
    const existing = readFileSync(path, "utf-8")
    if (existing === content) return false
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  return true
}

function stringify(obj: unknown): string {
  return JSON.stringify(obj, null, 2) + "\n"
}

export interface GenerateResult {
  pluginDir: string
  written: string[]
  skipped: string[]
  reason?: string
}

/**
 * Generate Codex (`.codex-plugin/plugin.json`, optional `.mcp.json`) and
 * Antigravity (`plugin.json`, optional `mcp_config.json`, optional `hooks.json`)
 * artifacts alongside the existing Claude Code manifest.
 *
 * Returns the list of files written and skipped. Writes are idempotent.
 */
export function generateForPlugin(
  pluginDir: string,
  marketplaceEntry: MarketplaceEntry | undefined,
): GenerateResult {
  const claude = readClaudeManifest(pluginDir)
  if (!claude) {
    return { pluginDir, written: [], skipped: [], reason: "no Claude manifest found" }
  }

  const result: GenerateResult = { pluginDir, written: [], skipped: [] }

  // 1. Codex manifest
  const codex = toCodexManifest(claude, marketplaceEntry)
  const codexPath = join(pluginDir, ".codex-plugin", "plugin.json")
  if (writeIfChanged(codexPath, stringify(codex))) result.written.push(codexPath)
  else result.skipped.push(codexPath)

  // 2. Antigravity manifest (root-level plugin.json)
  // If the Claude manifest already lives at root, skip — that file IS the manifest
  // and both runtimes can read it.
  const rootPath = join(pluginDir, "plugin.json")
  const claudeAtRoot = existsSync(rootPath) && !existsSync(join(pluginDir, ".claude-plugin", "plugin.json"))
  if (!claudeAtRoot) {
    const antigravity = toAntigravityManifest(claude)
    if (writeIfChanged(rootPath, stringify(antigravity))) result.written.push(rootPath)
    else result.skipped.push(rootPath)
  } else {
    result.skipped.push(`${rootPath} (Claude manifest already at root)`)
  }

  // 3. MCP server config files (only when inline servers exist)
  const mcpFile = extractMcpServersFile(claude)
  if (mcpFile) {
    const codexMcp = join(pluginDir, ".mcp.json")
    if (writeIfChanged(codexMcp, stringify(mcpFile))) result.written.push(codexMcp)
    else result.skipped.push(codexMcp)

    const antigravityMcp = join(pluginDir, "mcp_config.json")
    if (writeIfChanged(antigravityMcp, stringify(mcpFile))) result.written.push(antigravityMcp)
    else result.skipped.push(antigravityMcp)
  }

  // 4. Antigravity expects hooks.json at root if hooks exist.
  // Mirror the Claude hooks/hooks.json content (same schema works).
  const claudeHooksPath = join(pluginDir, "hooks", "hooks.json")
  if (existsSync(claudeHooksPath)) {
    const antigravityHooksPath = join(pluginDir, "hooks.json")
    const hooksContent = readFileSync(claudeHooksPath, "utf-8")
    if (writeIfChanged(antigravityHooksPath, hooksContent)) result.written.push(antigravityHooksPath)
    else result.skipped.push(antigravityHooksPath)
  }

  return result
}

/**
 * Build a Codex marketplace document from a Claude Code marketplace.json,
 * filtering down to local plugins (those with `source: "./plugins/..."`).
 */
export interface ClaudeMarketplace {
  name?: string
  plugins: Array<MarketplaceEntry & { source?: unknown }>
}

export function toCodexMarketplace(claudeMarketplace: ClaudeMarketplace): {
  name: string
  interface: { displayName: string }
  plugins: CodexMarketplaceEntry[]
} {
  const localPlugins = claudeMarketplace.plugins.filter(p => typeof p.source === "string" && p.source.startsWith("./plugins/"))
  const entries = localPlugins.map(p => {
    const path = p.source as string
    const dirName = path.replace(/^\.\/plugins\//, "")
    return toCodexMarketplaceEntry(p, dirName)
  })
  return {
    name: claudeMarketplace.name ?? "personal",
    interface: { displayName: claudeMarketplace.name ?? "Personal" },
    plugins: entries,
  }
}

