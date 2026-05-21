import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
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
  test("filters out non-local plugin entries (github/object sources)", () => {
    const input: ClaudeMarketplace = {
      name: "test-market",
      plugins: [
        { name: "local-one", source: "./plugins/local-one" as unknown as object },
        { name: "from-github", source: { source: "github", repo: "org/repo" } as unknown as object },
        { name: "local-two", source: "./plugins/local-two" as unknown as object },
      ],
    }
    const result = toCodexMarketplace(input)
    expect(result.plugins.map(p => p.name)).toEqual(["local-one", "local-two"])
  })

  test("extracts directory name from local source path", () => {
    const input: ClaudeMarketplace = {
      name: "m",
      plugins: [{ name: "alias", source: "./plugins/real-dir" as unknown as object }],
    }
    const result = toCodexMarketplace(input)
    expect(result.plugins[0]!.source.path).toBe("./plugins/real-dir")
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

  test("writes Codex and Antigravity manifests when only nested manifest exists", () => {
    writeNestedClaude({ name: "x", version: "1.0.0", description: "d", author: { name: "A" } })
    const result = generateForPlugin(tempDir, undefined)
    expect(result.written.some(p => p.endsWith(".codex-plugin/plugin.json"))).toBe(true)
    expect(result.written.some(p => p.endsWith("plugin.json") && !p.includes(".codex-plugin"))).toBe(true)
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
    expect(result.written.some(p => p.endsWith("/hooks.json") && !p.includes("/hooks/"))).toBe(true)
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
