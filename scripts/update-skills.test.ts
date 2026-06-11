import { describe, expect, test } from "vitest"
import { buildAddArgs, buildUpdateArgs, parseLock, planForLock } from "./update-skills.ts"

describe("parseLock", () => {
  test("flattens the skills map into named entries", () => {
    const content = JSON.stringify({
      version: 1,
      skills: {
        vue: { source: "antfu/skills", sourceType: "github", computedHash: "abc" },
        "vue-router-best-practices": { source: "vuejs-ai/skills", sourceType: "github", computedHash: "def" },
      },
    })
    const entries = parseLock(content)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({ name: "vue", source: "antfu/skills", sourceType: "github", computedHash: "abc" })
    expect(entries[1]!.name).toBe("vue-router-best-practices")
    expect(entries[1]!.source).toBe("vuejs-ai/skills")
  })

  test("preserves skillPath and ref when present", () => {
    const content = JSON.stringify({
      version: 1,
      skills: {
        "plugin-creator": {
          source: "openai/codex",
          ref: "main",
          sourceType: "github",
          skillPath: "codex-rs/skills/src/assets/samples/plugin-creator/SKILL.md",
          computedHash: "hash",
        },
      },
    })
    const [entry] = parseLock(content)
    expect(entry!.skillPath).toBe("codex-rs/skills/src/assets/samples/plugin-creator/SKILL.md")
    expect(entry!.ref).toBe("main")
  })

  test("returns an empty list when there are no skills", () => {
    expect(parseLock(JSON.stringify({ version: 1 }))).toEqual([])
    expect(parseLock(JSON.stringify({ version: 1, skills: {} }))).toEqual([])
  })
})

describe("planForLock", () => {
  test("re-adds every entry that lacks skillPath and skips in-place update", () => {
    const content = JSON.stringify({
      version: 1,
      skills: {
        vue: { source: "antfu/skills", sourceType: "github", computedHash: "abc" },
      },
    })
    const plan = planForLock(content)
    expect(plan.runUpdate).toBe(false)
    expect(plan.adds.map((e) => e.name)).toEqual(["vue"])
  })

  test("runs in-place update and skips re-add when every entry is tracked", () => {
    const content = JSON.stringify({
      version: 1,
      skills: {
        "plugin-creator": {
          source: "openai/codex",
          ref: "main",
          skillPath: "path/SKILL.md",
          computedHash: "hash",
        },
      },
    })
    const plan = planForLock(content)
    expect(plan.runUpdate).toBe(true)
    expect(plan.adds).toEqual([])
  })

  test("mixes both strategies when tracked and legacy entries coexist", () => {
    const content = JSON.stringify({
      version: 1,
      skills: {
        tracked: { source: "a/b", skillPath: "x/SKILL.md", computedHash: "1" },
        legacy: { source: "c/d", computedHash: "2" },
      },
    })
    const plan = planForLock(content)
    expect(plan.runUpdate).toBe(true)
    expect(plan.adds.map((e) => e.name)).toEqual(["legacy"])
  })
})

describe("buildAddArgs", () => {
  test("targets the entry's source, name, the universal agent, and auto-confirms", () => {
    const args = buildAddArgs({ name: "vue", source: "antfu/skills" })
    expect(args).toEqual(["skills", "add", "antfu/skills", "--skill", "vue", "--agent", "universal", "-y"])
  })
})

describe("buildUpdateArgs", () => {
  test("updates project skills non-interactively", () => {
    expect(buildUpdateArgs()).toEqual(["skills", "update", "--project", "--yes"])
  })
})
