import { describe, expect, test } from "vitest"
import { convertMcpServerPaths, parseToml } from "./extension-helpers.ts"

describe("convertMcpServerPaths", () => {
  test("replaces ${extensionPath}/ with ${CLAUDE_PLUGIN_ROOT}/", () => {
    const input = { server: { command: "${extensionPath}/bin/server" } }
    const result = convertMcpServerPaths(input)
    expect((result.server as { command: string }).command).toBe("${CLAUDE_PLUGIN_ROOT}/bin/server")
  })

  test("replaces bare ${extensionPath} (without trailing slash) with ${CLAUDE_PLUGIN_ROOT}", () => {
    const input = { server: { command: "${extensionPath}" } }
    const result = convertMcpServerPaths(input)
    expect((result.server as { command: string }).command).toBe("${CLAUDE_PLUGIN_ROOT}")
  })

  test("replaces ${extensionPath}${/} pattern with ${CLAUDE_PLUGIN_ROOT}/", () => {
    const input = { server: { command: "${extensionPath}${/}bin/server" } }
    const result = convertMcpServerPaths(input)
    expect((result.server as { command: string }).command).toBe("${CLAUDE_PLUGIN_ROOT}/bin/server")
  })

  test("handles empty object {}", () => {
    const result = convertMcpServerPaths({})
    expect(result).toEqual({})
  })

  test("leaves strings without ${extensionPath} unchanged", () => {
    const input = { server: { command: "node", args: ["/usr/local/bin/server"] } }
    const result = convertMcpServerPaths(input)
    expect(result).toEqual(input)
  })

  test("replaces all occurrences in nested structures", () => {
    const input = {
      serverA: { command: "${extensionPath}/a", env: { PATH: "${extensionPath}/bin" } },
      serverB: { args: ["${extensionPath}/c", "${extensionPath}${/}d"] },
    }
    const result = convertMcpServerPaths(input)
    expect((result.serverA as { command: string }).command).toBe("${CLAUDE_PLUGIN_ROOT}/a")
    expect(
      ((result.serverA as { env: { PATH: string } }).env).PATH
    ).toBe("${CLAUDE_PLUGIN_ROOT}/bin")
    expect((result.serverB as { args: string[] }).args[0]).toBe("${CLAUDE_PLUGIN_ROOT}/c")
    expect((result.serverB as { args: string[] }).args[1]).toBe("${CLAUDE_PLUGIN_ROOT}/d")
  })
})

describe("parseToml", () => {
  test("parses triple-quoted multiline prompt", () => {
    const content = `prompt = """\ncontent line 1\ncontent line 2\n"""`
    const result = parseToml(content)
    expect(result).not.toBeNull()
    expect(result!.prompt).toBe("content line 1\ncontent line 2\n")
  })

  test("strips leading newline from triple-quoted prompt", () => {
    const content = `prompt = """\nsome content\n"""`
    const result = parseToml(content)
    expect(result).not.toBeNull()
    // The leading \n after """ should be stripped
    expect(result!.prompt.startsWith("\n")).toBe(false)
    expect(result!.prompt).toBe("some content\n")
  })

  test("parses double-quoted single-line prompt", () => {
    const content = `prompt = "do this"`
    const result = parseToml(content)
    expect(result).not.toBeNull()
    expect(result!.prompt).toBe("do this")
  })

  test("parses description + prompt together", () => {
    const content = `description = "A helpful tool"\nprompt = "do this"`
    const result = parseToml(content)
    expect(result).not.toBeNull()
    expect(result!.description).toBe("A helpful tool")
    expect(result!.prompt).toBe("do this")
  })

  test("returns null when no prompt key exists", () => {
    const content = `description = "A helpful tool"\ntitle = "Some title"`
    const result = parseToml(content)
    expect(result).toBeNull()
  })

  test("returns null when prompt key is in unsupported format", () => {
    // Single-quoted strings are not supported
    const content = `prompt = 'unsupported format'`
    const result = parseToml(content)
    expect(result).toBeNull()
  })

  test("{{args}} placeholder is preserved unchanged", () => {
    const content = `prompt = "Please process {{args}} carefully"`
    const result = parseToml(content)
    expect(result).not.toBeNull()
    expect(result!.prompt).toBe("Please process {{args}} carefully")
  })
})
