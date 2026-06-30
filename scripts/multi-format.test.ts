import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import {
  extractMcpServersFile,
  generateForPlugin,
  readClaudeManifest,
  toAntigravityManifest,
  toCodexManifest,
  toCodexMarketplace,
  toCodexMarketplaceEntry,
  toCodexSource,
  toCursorManifest,
  toCursorMarketplace,
  toCursorSource,
  type ClaudeMarketplace,
  type ClaudePluginManifest,
  type MarketplaceEntry,
} from "./multi-format.ts"

const baseClaude: ClaudePluginManifest = {
  name: "demo-plugin",
  version: "1.2.3",
  description: "Demo plugin for tests. Multiple sentences here.",
  author: { name: "Alice", url: "https://example.com" },
  homepage: "https://example.com/demo",
  repository: "https://github.com/example/demo",
  license: "MIT",
  keywords: ["demo", "test"],
}

describe("toCodexManifest", () => {
  test("maps required fields and synthesises full interface block", () => {
    const result = toCodexManifest(baseClaude, undefined)
    expect(result.name).toBe("demo-plugin")
    expect(result.version).toBe("1.2.3")
    expect(result.interface.displayName).toBe("Demo Plugin")
    expect(result.interface.category).toBe("Productivity")
    expect(result.interface.developerName).toBe("Alice")
    expect(result.interface.websiteURL).toBe("https://example.com/demo")
    expect(result.interface.shortDescription).toBeTypeOf("string")
    expect(result.interface.longDescription).toBe(baseClaude.description)
    expect(result.interface.capabilities).toContain("Skill")
    expect(Array.isArray(result.interface.defaultPrompt)).toBe(true)
    expect(result.interface.defaultPrompt.length).toBeGreaterThan(0)
  })

  test("defaults author to Community when missing (validator requires non-empty)", () => {
    const claude: ClaudePluginManifest = { name: "x" }
    const result = toCodexManifest(claude, undefined)
    expect(result.author.name).toBe("Community")
    expect(result.interface.developerName).toBe("Community")
  })

  test("drops http:// author url (validator requires https://)", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, author: { name: "X", url: "http://insecure" } }
    const result = toCodexManifest(claude, undefined)
    expect(result.author.url).toBeUndefined()
  })

  test("derives Tool capability when mcpServers present", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, mcpServers: { x: {} } }
    const result = toCodexManifest(claude, undefined)
    expect(result.interface.capabilities).toContain("Tool")
  })

  test("coerces non-semver version into 1.0.0", () => {
    const claude: ClaudePluginManifest = { name: "x", version: "2024-01-01" }
    const result = toCodexManifest(claude, undefined)
    expect(result.version).toBe("1.0.0")
  })

  test("defaultPrompt entries respect 128 char cap", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, name: "x".repeat(200) }
    const result = toCodexManifest(claude, undefined)
    for (const p of result.interface.defaultPrompt) {
      expect(p.length).toBeLessThanOrEqual(128)
    }
  })

  test("prefers marketplace displayName and category over derived values", () => {
    const entry: MarketplaceEntry = { name: "demo-plugin", displayName: "Demo!", category: "security" }
    const result = toCodexManifest(baseClaude, entry)
    expect(result.interface.displayName).toBe("Demo!")
    expect(result.interface.category).toBe("Security")
  })

  test("drops hooks field when present (Codex validator rejects it)", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, hooks: "./hooks.json" }
    const result = toCodexManifest(claude, undefined) as unknown as Record<string, unknown>
    expect(result.hooks).toBeUndefined()
  })

  test("converts inline mcpServers into a file reference", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, mcpServers: { foo: { command: "node" } } }
    const result = toCodexManifest(claude, undefined)
    expect(result.mcpServers).toBe("./.mcp.json")
  })

  test("preserves mcpServers string reference unchanged", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, mcpServers: "./custom-mcp.json" as unknown as Record<string, unknown> }
    const result = toCodexManifest(claude, undefined)
    expect(result.mcpServers).toBe("./custom-mcp.json")
  })

  test("omits mcpServers field when manifest has none", () => {
    const result = toCodexManifest(baseClaude, undefined)
    expect(result.mcpServers).toBeUndefined()
  })

  test("falls back to version 1.0.0 when missing", () => {
    const claude: ClaudePluginManifest = { name: "x" }
    const result = toCodexManifest(claude, undefined)
    expect(result.version).toBe("1.0.0")
  })

  test("uses marketplace description as fallback for plugin description", () => {
    const claude: ClaudePluginManifest = { name: "x" }
    const entry: MarketplaceEntry = { name: "x", description: "from market" }
    const result = toCodexManifest(claude, entry)
    expect(result.description).toBe("from market")
  })

  test("omits websiteURL when homepage is not https", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, homepage: "http://insecure.example.com" }
    const result = toCodexManifest(claude, undefined)
    expect(result.interface.websiteURL).toBeUndefined()
  })

  test("truncates shortDescription at sentence boundary", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, description: "First sentence. Second sentence." }
    const result = toCodexManifest(claude, undefined)
    expect(result.interface.shortDescription).toBe("First sentence")
  })

  test("normalises [./skills/] array to ./skills/ (Codex requires string)", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, skills: ["./skills/"] }
    const result = toCodexManifest(claude, undefined)
    expect(result.skills).toBe("./skills/")
  })

  test("omits skills when path is incompatible with Codex (e.g. .agents/skills/)", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, skills: "./.agents/skills/" }
    const result = toCodexManifest(claude, undefined)
    expect(result.skills).toBeUndefined()
  })
})

describe("author sanitisation", () => {
  test("strips author.email from Codex manifest (privacy: no personal addresses in generated artifacts)", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, author: { name: "A", email: "a@example.com", url: "https://example.com" } }
    const result = toCodexManifest(claude, undefined) as unknown as Record<string, unknown>
    const author = result.author as Record<string, unknown>
    expect(author.email).toBeUndefined()
    expect(author.name).toBe("A")
  })

  test("strips author.email from Antigravity manifest", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, author: { name: "A", email: "a@example.com" } }
    const result = toAntigravityManifest(claude) as unknown as Record<string, unknown>
    const author = result.author as Record<string, unknown>
    expect(author.email).toBeUndefined()
  })
})

describe("toAntigravityManifest", () => {
  test("produces flat manifest with only present fields", () => {
    const claude: ClaudePluginManifest = { name: "x" }
    const result = toAntigravityManifest(claude) as unknown as Record<string, unknown>
    expect(result).toEqual({ name: "x" })
  })

  test("preserves common metadata fields", () => {
    const result = toAntigravityManifest(baseClaude)
    expect(result.name).toBe("demo-plugin")
    expect(result.version).toBe("1.2.3")
    expect(result.author?.name).toBe("Alice")
    expect(result.keywords).toEqual(["demo", "test"])
  })

  test("does not include skills or hooks paths (Antigravity discovers by directory)", () => {
    const claude: ClaudePluginManifest = { ...baseClaude, skills: "./skills/", hooks: "./hooks.json" }
    const result = toAntigravityManifest(claude) as unknown as Record<string, unknown>
    expect(result.skills).toBeUndefined()
    expect(result.hooks).toBeUndefined()
  })
})

describe("extractMcpServersFile", () => {
  test("returns null when no inline mcpServers", () => {
    expect(extractMcpServersFile({ name: "x" })).toBeNull()
  })

  test("returns null when mcpServers is a string reference", () => {
    expect(extractMcpServersFile({ name: "x", mcpServers: "./mcp.json" as unknown as Record<string, unknown> })).toBeNull()
  })

  test("wraps inline servers in { mcpServers: ... } envelope", () => {
    const claude: ClaudePluginManifest = { name: "x", mcpServers: { foo: { command: "node" } } }
    const result = extractMcpServersFile(claude)
    expect(result).toEqual({ mcpServers: { foo: { command: "node" } } })
  })

  test("returns null for empty mcpServers object (avoid writing empty .mcp.json)", () => {
    const claude: ClaudePluginManifest = { name: "x", mcpServers: {} }
    expect(extractMcpServersFile(claude)).toBeNull()
  })

  test("returns null when mcpServers is mistakenly an array", () => {
    const claude: ClaudePluginManifest = { name: "x", mcpServers: [] as unknown as Record<string, unknown> }
    expect(extractMcpServersFile(claude)).toBeNull()
  })
})

describe("readClaudeManifest", () => {
  let tempDir: string
  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "claude-plugins-test-")) })
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }) })

  test("returns null when no manifest file exists", () => {
    expect(readClaudeManifest(tempDir)).toBeNull()
  })

  test("reads .claude-plugin/plugin.json when present", () => {
    mkdirSync(join(tempDir, ".claude-plugin"))
    writeFileSync(join(tempDir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "x" }))
    expect(readClaudeManifest(tempDir)).toEqual({ name: "x" })
  })

  test("falls back to root plugin.json when .claude-plugin/ absent", () => {
    writeFileSync(join(tempDir, "plugin.json"), JSON.stringify({ name: "y" }))
    expect(readClaudeManifest(tempDir)).toEqual({ name: "y" })
  })

  test("throws (does not swallow) when manifest JSON is malformed", () => {
    mkdirSync(join(tempDir, ".claude-plugin"))
    writeFileSync(join(tempDir, ".claude-plugin", "plugin.json"), "{ broken json")
    expect(() => readClaudeManifest(tempDir)).toThrow(/plugin\.json/)
  })
})

describe("toCodexMarketplace", () => {
  test("includes both local and external plugin entries (in order)", () => {
    const input: ClaudeMarketplace = {
      name: "test-market",
      plugins: [
        { name: "local-one", source: "./plugins/local-one" as unknown as object },
        { name: "from-github", source: { source: "github", repo: "org/repo" } as unknown as object },
        { name: "local-two", source: "./plugins/local-two" as unknown as object },
      ],
    }
    const result = toCodexMarketplace(input)
    expect(result.plugins.map(p => p.name)).toEqual(["local-one", "from-github", "local-two"])
  })

  test("maps an external github source to a Codex url source", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      plugins: [{ name: "from-github", source: { source: "github", repo: "org/repo" } as unknown as object }],
    }
    const result = toCodexMarketplace(input)
    expect(result.plugins[0]!.source).toEqual({ source: "url", url: "https://github.com/org/repo.git" })
  })

  test("skips a plugin whose source Codex cannot express", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      plugins: [
        { name: "ok", source: "./plugins/ok" as unknown as object },
        { name: "weird", source: { source: "mystery" } as unknown as object },
      ],
    }
    const result = toCodexMarketplace(input)
    expect(result.plugins.map(p => p.name)).toEqual(["ok"])
  })

  test("extracts directory name from local source path", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      plugins: [{ name: "alias", source: "./plugins/real-dir" as unknown as object }],
    }
    const result = toCodexMarketplace(input)
    const source = result.plugins[0]!.source
    expect(source).toEqual({ source: "local", path: "./plugins/real-dir" })
  })

  test("inherits marketplace name and seeds interface.displayName", () => {
    const input: ClaudeMarketplace = { name: "vendor-xyz", plugins: [] }
    const result = toCodexMarketplace(input)
    expect(result.name).toBe("vendor-xyz")
    expect(result.interface.displayName).toBe("vendor-xyz")
  })

  test("defaults name to 'personal' when marketplace lacks one", () => {
    const result = toCodexMarketplace({ plugins: [] })
    expect(result.name).toBe("personal")
  })

  test("deduplicates plugin entries by name (defensive — keeps first occurrence)", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      plugins: [
        { name: "dup", source: "./plugins/dir-a" as unknown as object },
        { name: "dup", source: "./plugins/dir-b" as unknown as object },
      ],
    }
    const result = toCodexMarketplace(input)
    expect(result.plugins).toHaveLength(1)
    expect(result.plugins[0]!.source).toEqual({ source: "local", path: "./plugins/dir-a" })
  })
})

describe("toCodexSource", () => {
  test("maps a local ./plugins/ string to a local source", () => {
    expect(toCodexSource("./plugins/foo")).toEqual({ source: "local", path: "./plugins/foo" })
  })

  test("returns null for a non-local string source", () => {
    expect(toCodexSource("./something-else")).toBeNull()
  })

  test("maps a github shorthand to a url source with a full git URL", () => {
    expect(toCodexSource({ source: "github", repo: "owner/repo" })).toEqual({
      source: "url",
      url: "https://github.com/owner/repo.git",
    })
  })

  test("maps a url source and preserves ref/sha", () => {
    expect(toCodexSource({ source: "url", url: "https://github.com/org/repo.git", ref: "main" })).toEqual({
      source: "url",
      url: "https://github.com/org/repo.git",
      ref: "main",
    })
  })

  test("maps a git-subdir source, expanding the shorthand URL and ./-prefixing the path", () => {
    expect(toCodexSource({ source: "git-subdir", url: "pleaseai/code-search", path: "plugins/csp", ref: "main" })).toEqual({
      source: "git-subdir",
      url: "https://github.com/pleaseai/code-search.git",
      path: "./plugins/csp",
      ref: "main",
    })
  })

  test("passes through a full git URL untouched", () => {
    expect(toCodexSource({ source: "git-subdir", url: "https://example.com/x.git", path: "./a" })).toEqual({
      source: "git-subdir",
      url: "https://example.com/x.git",
      path: "./a",
    })
  })

  test("returns null for an unknown source kind", () => {
    expect(toCodexSource({ source: "mystery" })).toBeNull()
    expect(toCodexSource(undefined)).toBeNull()
  })
})

describe("generateForPlugin", () => {
  let tempDir: string
  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "gen-test-")) })
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }) })

  function writeNestedClaude(manifest: ClaudePluginManifest) {
    mkdirSync(join(tempDir, ".claude-plugin"))
    writeFileSync(join(tempDir, ".claude-plugin", "plugin.json"), JSON.stringify(manifest))
  }

  test("returns reason when no Claude manifest exists", () => {
    const result = generateForPlugin(tempDir, undefined)
    expect(result.reason).toBeTruthy()
    expect(result.written).toEqual([])
  })

  test("writes Codex, Antigravity, and Cursor manifests when only nested manifest exists", () => {
    writeNestedClaude({ name: "x", version: "1.0.0", description: "d", author: { name: "A" } })
    const result = generateForPlugin(tempDir, undefined)
    expect(result.written.some(p => p.endsWith(".codex-plugin/plugin.json"))).toBe(true)
    expect(result.written.some(p => p.endsWith(".cursor-plugin/plugin.json"))).toBe(true)
    expect(result.written.some(p => p.endsWith("plugin.json") && !p.includes(".codex-plugin") && !p.includes(".cursor-plugin"))).toBe(true)
    const cursor = JSON.parse(readFileSync(join(tempDir, ".cursor-plugin", "plugin.json"), "utf-8"))
    expect(cursor.name).toBe("x")
    expect(cursor.author).toEqual({ name: "A" })
  })

  test("preserves existing root plugin.json when Claude manifest lives at root (no .claude-plugin/)", () => {
    const original = { name: "rootonly", version: "1.0.0", description: "stays", author: { name: "A" } }
    writeFileSync(join(tempDir, "plugin.json"), JSON.stringify(original, null, 2))
    const result = generateForPlugin(tempDir, undefined)
    // The Antigravity write must be skipped — overwriting would clobber the source of truth.
    expect(result.skipped.some(s => s.includes("Claude manifest already at root"))).toBe(true)
    const rootContent = JSON.parse(require("node:fs").readFileSync(join(tempDir, "plugin.json"), "utf-8"))
    expect(rootContent).toEqual(original)
  })

  test("emits .mcp.json and mcp_config.json when manifest has inline mcpServers", () => {
    writeNestedClaude({
      name: "x", version: "1.0.0", description: "d", author: { name: "A" },
      mcpServers: { foo: { command: "node" } },
    })
    const result = generateForPlugin(tempDir, undefined)
    expect(result.written.some(p => p.endsWith(".mcp.json"))).toBe(true)
    expect(result.written.some(p => p.endsWith("mcp_config.json"))).toBe(true)
  })

  test("does not emit MCP files when manifest has no inline mcpServers", () => {
    writeNestedClaude({ name: "x", version: "1.0.0", description: "d", author: { name: "A" } })
    const result = generateForPlugin(tempDir, undefined)
    expect(result.written.some(p => p.endsWith(".mcp.json"))).toBe(false)
    expect(result.written.some(p => p.endsWith("mcp_config.json"))).toBe(false)
  })

  test("mirrors hooks/hooks.json to root hooks.json for Antigravity", () => {
    writeNestedClaude({ name: "x", version: "1.0.0", description: "d", author: { name: "A" } })
    mkdirSync(join(tempDir, "hooks"))
    writeFileSync(join(tempDir, "hooks", "hooks.json"), '{"hooks":{}}')
    const result = generateForPlugin(tempDir, undefined)
    expect(result.written.some(p => p.endsWith("/hooks.json") && p.includes("/hooks/") === false && p.includes(".codex-plugin") === false)).toBe(true)
  })

  test("rewrites CLAUDE_PLUGIN_ROOT to relative path in Antigravity hooks", () => {
    writeNestedClaude({ name: "x", version: "1.0.0", description: "d", author: { name: "A" } })
    mkdirSync(join(tempDir, "hooks"))
    writeFileSync(
      join(tempDir, "hooks", "hooks.json"),
      '{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"${CLAUDE_PLUGIN_ROOT}/hooks/context.sh"}]}]}}',
    )
    generateForPlugin(tempDir, undefined)
    const content = readFileSync(join(tempDir, "hooks.json"), "utf-8")
    expect(content).toContain('"./hooks/context.sh"')
    expect(content).not.toContain("CLAUDE_PLUGIN_ROOT")
  })

  test("does not emit a Codex hooks file (Codex auto-loads hooks/hooks.json via back-compat alias)", () => {
    writeNestedClaude({ name: "x", version: "1.0.0", description: "d", author: { name: "A" } })
    mkdirSync(join(tempDir, "hooks"))
    writeFileSync(
      join(tempDir, "hooks", "hooks.json"),
      '{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"${CLAUDE_PLUGIN_ROOT}/hooks/context.sh"}]}]}}',
    )
    generateForPlugin(tempDir, undefined)
    expect(existsSync(join(tempDir, ".codex-plugin", "hooks.json"))).toBe(false)
    const codexManifest = JSON.parse(readFileSync(join(tempDir, ".codex-plugin", "plugin.json"), "utf-8"))
    expect(codexManifest.hooks).toBeUndefined()
  })

  test("removes a stale .codex-plugin/hooks.json left by an earlier generator", () => {
    writeNestedClaude({ name: "x", version: "1.0.0", description: "d", author: { name: "A" } })
    mkdirSync(join(tempDir, ".codex-plugin"), { recursive: true })
    writeFileSync(join(tempDir, ".codex-plugin", "hooks.json"), '{"hooks":{}}')
    generateForPlugin(tempDir, undefined)
    expect(existsSync(join(tempDir, ".codex-plugin", "hooks.json"))).toBe(false)
  })
})

describe("toCodexMarketplaceEntry", () => {
  test("emits AVAILABLE/ON_INSTALL policy with derived category", () => {
    const entry: MarketplaceEntry = { name: "demo", category: "Database" }
    const result = toCodexMarketplaceEntry(entry, "demo-dir")
    expect(result).toEqual({
      name: "demo",
      source: { source: "local", path: "./plugins/demo-dir" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Database",
    })
  })

  test("defaults category to Productivity when missing", () => {
    const result = toCodexMarketplaceEntry({ name: "x" }, "x")
    expect(result.category).toBe("Productivity")
  })
})

describe("toCursorManifest", () => {
  test("maps core metadata and derives displayName/version", () => {
    const result = toCursorManifest(baseClaude, undefined)
    expect(result.name).toBe("demo-plugin")
    expect(result.displayName).toBe("Demo Plugin")
    expect(result.version).toBe("1.2.3")
    expect(result.description).toBe("Demo plugin for tests. Multiple sentences here.")
    expect(result.category).toBe("Productivity")
  })

  test("author carries only name; email and url are dropped (privacy + schema)", () => {
    const claude: ClaudePluginManifest = { name: "x", author: { name: "Alice", email: "a@b.com", url: "https://example.com" } }
    const result = toCursorManifest(claude, undefined)
    expect(result.author).toEqual({ name: "Alice" })
  })

  test("falls back to Community author when none provided", () => {
    const result = toCursorManifest({ name: "x" }, undefined)
    expect(result.author).toEqual({ name: "Community" })
  })

  test("omits component fields (skills/commands/agents/rules) — Cursor auto-discovers them", () => {
    const claude: ClaudePluginManifest = { name: "x", skills: "skills", commands: "commands", agents: "agents" }
    const result = toCursorManifest(claude, undefined) as unknown as Record<string, unknown>
    expect(result.skills).toBeUndefined()
    expect(result.commands).toBeUndefined()
    expect(result.agents).toBeUndefined()
    expect(result.rules).toBeUndefined()
  })

  test("keeps inline mcpServers in the manifest (no companion file)", () => {
    const claude: ClaudePluginManifest = { name: "x", mcpServers: { foo: { command: "node" } } }
    const result = toCursorManifest(claude, undefined)
    expect(result.mcpServers).toEqual({ foo: { command: "node" } })
  })

  test("omits mcpServers when empty", () => {
    const claude: ClaudePluginManifest = { name: "x", mcpServers: {} }
    const result = toCursorManifest(claude, undefined)
    expect(result.mcpServers).toBeUndefined()
  })

  test("passes through a string mcpServers path instead of silently dropping it", () => {
    const result = toCursorManifest({ name: "x", mcpServers: "./.mcp.json" }, undefined)
    expect(result.mcpServers).toBe("./.mcp.json")
  })

  test("coerces a non-semver version to 1.0.0", () => {
    const result = toCursorManifest({ name: "x", version: "2024-01-01" }, undefined)
    expect(result.version).toBe("1.0.0")
  })

  test("prefers marketplace displayName/tags when present", () => {
    const entry: MarketplaceEntry = { name: "demo-plugin", displayName: "Fancy Name", tags: ["a", "b"] }
    const result = toCursorManifest(baseClaude, entry)
    expect(result.displayName).toBe("Fancy Name")
    expect(result.tags).toEqual(["a", "b"])
  })

  test("falls back to entry description when manifest lacks one", () => {
    const result = toCursorManifest({ name: "x" }, { name: "x", description: "from entry" })
    expect(result.description).toBe("from entry")
  })
})

describe("toCursorSource", () => {
  test("maps a local ./plugins/ string to itself", () => {
    expect(toCursorSource("./plugins/foo")).toBe("./plugins/foo")
  })

  test("returns null for a non-local string source", () => {
    expect(toCursorSource("./something-else")).toBeNull()
  })

  test("returns null for object (remote) sources Cursor's string form cannot express", () => {
    expect(toCursorSource({ source: "github", repo: "org/repo" })).toBeNull()
    expect(toCursorSource({ source: "git-subdir", url: "u", path: "p" })).toBeNull()
    expect(toCursorSource(undefined)).toBeNull()
  })
})

describe("toCursorMarketplace", () => {
  test("includes only local plugins, with name + source + description", () => {
    const input: ClaudeMarketplace = {
      name: "test-market",
      plugins: [
        { name: "local-one", description: "d1", source: "./plugins/local-one" as unknown as object },
        { name: "from-github", source: { source: "github", repo: "org/repo" } as unknown as object },
        { name: "local-two", source: "./plugins/local-two" as unknown as object },
      ],
    }
    const result = toCursorMarketplace(input)
    expect(result.plugins).toEqual([
      { name: "local-one", source: "./plugins/local-one", description: "d1" },
      { name: "local-two", source: "./plugins/local-two" },
    ])
  })

  test("passes through owner and metadata when present", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      owner: { name: "Org", email: "o@x.com" },
      metadata: { version: "0.2.0" },
      plugins: [],
    }
    const result = toCursorMarketplace(input)
    expect(result.owner).toEqual({ name: "Org", email: "o@x.com" })
    expect(result.metadata).toEqual({ version: "0.2.0" })
  })

  test("rebrands a 'Claude Code' metadata description for the Cursor catalog", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      metadata: { version: "0.2.0", description: "Bundled plugins for Claude Code" },
      plugins: [],
    }
    const result = toCursorMarketplace(input)
    expect(result.metadata).toEqual({ version: "0.2.0", description: "Bundled plugins for Cursor" })
  })

  test("defaults name to 'personal' and omits owner/metadata when absent", () => {
    const result = toCursorMarketplace({ plugins: [] })
    expect(result.name).toBe("personal")
    expect(result.owner).toBeUndefined()
    expect(result.metadata).toBeUndefined()
  })

  test("deduplicates plugin entries by name (keeps first occurrence)", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      plugins: [
        { name: "dup", source: "./plugins/dir-a" as unknown as object },
        { name: "dup", source: "./plugins/dir-b" as unknown as object },
      ],
    }
    const result = toCursorMarketplace(input)
    expect(result.plugins).toHaveLength(1)
    expect(result.plugins[0]!.source).toBe("./plugins/dir-a")
  })
})
