import { execFileSync, execSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { vendors } from "./meta.ts"

vi.mock("node:child_process")
vi.mock("node:fs")

// Import after mocks so cli.ts gets mocked modules
const {
  SKILL_TO_PLUGIN,
  exec,
  execFile,
  execFileSafe,
  execSafe,
  ensurePlugin,
  getGitSha,
  getRegisteredSubmodulePaths,
  hasGitChanges,
  isSubmoduleRegistered,
  commitChanges,
  checkUpdates,
  cleanup,
  initSubmodules,
  syncSubmodules,
} = await import("./cli.ts")

// ---------------------------------------------------------------------------
// SKILL_TO_PLUGIN mapping consistency
// ---------------------------------------------------------------------------
describe("SKILL_TO_PLUGIN", () => {
  it("has an entry for every vendor output skill name", () => {
    for (const [vendorName, config] of Object.entries(vendors)) {
      for (const outSkill of Object.values(config.skills)) {
        expect(SKILL_TO_PLUGIN, `vendor "${vendorName}" skill "${outSkill}" is missing from SKILL_TO_PLUGIN`).toHaveProperty(outSkill)
      }
    }
  })

  it("maps every entry to a non-empty plugin name", () => {
    for (const [skill, plugin] of Object.entries(SKILL_TO_PLUGIN)) {
      expect(plugin, `SKILL_TO_PLUGIN["${skill}"] must not be empty`).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// getRegisteredSubmodulePaths / isSubmoduleRegistered
// ---------------------------------------------------------------------------
describe("getRegisteredSubmodulePaths", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("returns [] when .gitmodules does not exist", () => {
    expect(getRegisteredSubmodulePaths()).toEqual([])
  })

  it("parses single path entry from .gitmodules", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(`[submodule "vendor/foo"]\n\tpath = vendor/foo\n\turl = https://example.com/foo\n`)
    expect(getRegisteredSubmodulePaths()).toEqual(["vendor/foo"])
  })

  it("parses multiple path entries", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      `[submodule "vendor/foo"]\n\tpath = vendor/foo\n\turl = https://a.com\n` +
      `[submodule "vendor/bar"]\n\tpath = vendor/bar\n\turl = https://b.com\n`,
    )
    expect(getRegisteredSubmodulePaths()).toEqual(["vendor/foo", "vendor/bar"])
  })

  it("trims whitespace from parsed paths", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue("path =   sources/vue  \n")
    expect(getRegisteredSubmodulePaths()).toEqual(["sources/vue"])
  })
})

describe("isSubmoduleRegistered", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("returns true when the path is listed in .gitmodules", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue("path = vendor/foo\n")
    expect(isSubmoduleRegistered("vendor/foo")).toBe(true)
  })

  it("returns false when the path is not listed", () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue("path = vendor/foo\n")
    expect(isSubmoduleRegistered("vendor/bar")).toBe(false)
  })

  it("returns false when .gitmodules does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false)
    expect(isSubmoduleRegistered("vendor/anything")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// exec / execSafe
// ---------------------------------------------------------------------------
describe("exec", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("calls execSync with the command and utf-8 encoding, returns trimmed output", () => {
    vi.mocked(execSync).mockReturnValue("  hello world  " as any)
    const result = exec("echo hello")
    expect(execSync).toHaveBeenCalledWith("echo hello", expect.objectContaining({ encoding: "utf-8" }))
    expect(result).toBe("hello world")
  })

  it("uses provided cwd", () => {
    vi.mocked(execSync).mockReturnValue("" as any)
    exec("git status", "/some/dir")
    expect(execSync).toHaveBeenCalledWith("git status", expect.objectContaining({ cwd: "/some/dir" }))
  })

  it("propagates errors from execSync", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("command not found")
    })
    expect(() => exec("bad-cmd")).toThrow("command not found")
  })
})

describe("execSafe", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("returns trimmed output on success", () => {
    vi.mocked(execSync).mockReturnValue("  output  " as any)
    expect(execSafe("git log")).toBe("output")
  })

  it("returns null and writes to stderr on error", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("oops")
    })
    expect(execSafe("bad-cmd")).toBeNull()
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("[warn]"))
  })
})

// ---------------------------------------------------------------------------
// execFile / execFileSafe
// ---------------------------------------------------------------------------
describe("execFile", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("calls execFileSync with cmd + args and utf-8 encoding, returns trimmed output", () => {
    vi.mocked(execFileSync).mockReturnValue("  result  " as any)
    const result = execFile("git", ["status", "--short"])
    expect(execFileSync).toHaveBeenCalledWith("git", ["status", "--short"], expect.objectContaining({ encoding: "utf-8" }))
    expect(result).toBe("result")
  })

  it("uses provided cwd", () => {
    vi.mocked(execFileSync).mockReturnValue("" as any)
    execFile("git", ["fetch"], "/repo")
    expect(execFileSync).toHaveBeenCalledWith("git", ["fetch"], expect.objectContaining({ cwd: "/repo" }))
  })

  it("propagates errors from execFileSync", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("ENOENT")
    })
    expect(() => execFile("git", ["bad"])).toThrow("ENOENT")
  })
})

describe("execFileSafe", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("returns output on success", () => {
    vi.mocked(execFileSync).mockReturnValue("abc" as any)
    expect(execFileSafe("git", ["status"])).toBe("abc")
  })

  it("returns null and writes to stderr on error", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("fail")
    })
    expect(execFileSafe("git", ["bad-arg"])).toBeNull()
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("[warn]"))
  })
})

// ---------------------------------------------------------------------------
// getGitSha
// ---------------------------------------------------------------------------
describe("getGitSha", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("returns the HEAD sha for the given directory", () => {
    vi.mocked(execSync).mockReturnValue("abc1234567890" as any)
    const result = getGitSha("/some/repo")
    expect(execSync).toHaveBeenCalledWith("git rev-parse HEAD", expect.objectContaining({ cwd: "/some/repo" }))
    expect(result).toBe("abc1234567890")
  })

  it("returns null when git rev-parse fails", () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("not a git repo")
    })
    expect(getGitSha("/not/a/repo")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// hasGitChanges
// ---------------------------------------------------------------------------
describe("hasGitChanges", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("returns false when git status is empty", () => {
    vi.mocked(execFileSync).mockReturnValue("" as any)
    expect(hasGitChanges(["some/path"])).toBe(false)
  })

  it("returns false when git status is whitespace only", () => {
    vi.mocked(execFileSync).mockReturnValue("   " as any)
    expect(hasGitChanges(["some/path"])).toBe(false)
  })

  it("returns true when git status has output", () => {
    vi.mocked(execFileSync).mockReturnValue("M some/path\n" as any)
    expect(hasGitChanges(["some/path"])).toBe(true)
  })

  it("passes all paths to git status --porcelain", () => {
    vi.mocked(execFileSync).mockReturnValue("" as any)
    hasGitChanges(["plugins/foo", "plugins/bar"])
    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["status", "--porcelain", "--", "plugins/foo", "plugins/bar"]),
      expect.any(Object),
    )
  })

  it("throws when execFileSafe returns null (git status fails)", () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("git error")
    })
    expect(() => hasGitChanges(["some/path"])).toThrow("git status failed")
  })
})

// ---------------------------------------------------------------------------
// ensurePlugin
// ---------------------------------------------------------------------------
describe("ensurePlugin", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("creates the plugin/skills directory with recursive: true", () => {
    vi.mocked(mkdirSync).mockReturnValue(undefined)
    ensurePlugin("my-plugin")
    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(`my-plugin/skills`),
      { recursive: true },
    )
  })
})

// ---------------------------------------------------------------------------
// commitChanges
// ---------------------------------------------------------------------------
describe("commitChanges", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("stages the given paths then commits with the message", () => {
    vi.mocked(execFileSync).mockReturnValue("" as any)
    commitChanges(["plugins/foo/skills/bar"], "chore: test commit")
    expect(execFileSync).toHaveBeenNthCalledWith(
      1,
      "git",
      ["add", "--", "plugins/foo/skills/bar"],
      expect.any(Object),
    )
    expect(execFileSync).toHaveBeenNthCalledWith(
      2,
      "git",
      ["commit", "-m", "chore: test commit"],
      expect.any(Object),
    )
  })
})

// ---------------------------------------------------------------------------
// checkUpdates
// ---------------------------------------------------------------------------
describe("checkUpdates", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("prints 'All submodules are up to date' when nothing is behind", async () => {
    vi.mocked(existsSync).mockReturnValue(false)
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(process.stdout, "write").mockImplementation(() => true)

    await checkUpdates()

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("up to date"))
  })

  it("reports vendors that are behind", async () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(execSync).mockReturnValue("3" as any)

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(process.stdout, "write").mockImplementation(() => true)

    await checkUpdates()

    const calls = logSpy.mock.calls.flat().join("\n")
    expect(calls).toContain("behind")
  })
})

// ---------------------------------------------------------------------------
// cleanup
// ---------------------------------------------------------------------------
describe("cleanup", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("prints 'Everything is clean' when there are no stale items", async () => {
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(readdirSync).mockReturnValue([])

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await cleanup()

    expect(logSpy).toHaveBeenCalledWith("Everything is clean.")
  })

  it("removes a stale skill directory not in SKILL_TO_PLUGIN", async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      return String(p).includes("skills")
    })
    vi.mocked(readdirSync).mockReturnValue([
      { name: "stale-unknown-skill", isDirectory: () => true } as any,
    ])
    vi.mocked(rmSync).mockReturnValue(undefined)
    vi.mocked(readFileSync).mockReturnValue("")

    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(process.stdout, "write").mockImplementation(() => true)

    await cleanup()

    expect(rmSync).toHaveBeenCalledWith(
      expect.stringContaining("stale-unknown-skill"),
      expect.objectContaining({ recursive: true }),
    )
  })
})

// ---------------------------------------------------------------------------
// initSubmodules
// ---------------------------------------------------------------------------
describe("initSubmodules", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("skips sources that are already initialized (.git exists)", async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (String(p).endsWith(".gitmodules")) return true
      if (String(p).endsWith(".git")) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue(
      [...Object.keys(await import("./meta.ts").then(m => m.submodules)).map(n => `path = sources/${n}`),
       ...Object.keys(await import("./meta.ts").then(m => m.vendors)).map(n => `path = vendor/${n}`)].join("\n"),
    )
    vi.mocked(mkdirSync).mockReturnValue(undefined)
    vi.mocked(execFileSync).mockReturnValue("" as any)

    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(process.stdout, "write").mockImplementation(() => true)

    await initSubmodules()

    expect(execFileSync).not.toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["submodule", "add"]),
      expect.any(Object),
    )
  })

  it("runs 'git submodule add' for sources not yet registered", async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (String(p).endsWith(".gitmodules")) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue("")
    vi.mocked(mkdirSync).mockReturnValue(undefined)
    vi.mocked(execFileSync).mockReturnValue("" as any)

    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(process.stdout, "write").mockImplementation(() => true)

    await initSubmodules()

    expect(execFileSync).toHaveBeenCalledWith(
      "git",
      expect.arrayContaining(["submodule", "add"]),
      expect.any(Object),
    )
  })
})

// ---------------------------------------------------------------------------
// syncSubmodules — vendor not initialized
// ---------------------------------------------------------------------------
describe("syncSubmodules", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("warns and skips vendors that are not initialized", async () => {
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(readFileSync).mockReturnValue("")
    vi.mocked(readdirSync).mockReturnValue([])

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(process.stdout, "write").mockImplementation(() => true)

    await syncSubmodules()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("not initialized"))
  })
})
