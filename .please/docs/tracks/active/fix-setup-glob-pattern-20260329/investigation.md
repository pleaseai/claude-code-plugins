## Bug Investigation Report

### 1. Reproduction Status

[Reproduced — Always reproducible]

**Reproduction Path:**
1. `plugins/please-plugins/commands/setup.md:12` — Ambiguous instruction "Read `package.json` in the current working directory"
2. Claude selects `Glob` tool with pattern `package.json`
3. In projects with `node_modules/`, 250+ results returned sorted by mtime
4. Root `package.json` truncated beyond Glob's `head_limit` (250)
5. **Failure point**: Command reports file not found or reads wrong nested `package.json`

### 2. Root Cause Analysis

**Problem Location:**
- File: `plugins/please-plugins/commands/setup.md`
- Section: Step 1: Scan Dependencies
- Line: 12

**Root Cause:**
The instruction "Read `package.json` in the current working directory" is ambiguous — it doesn't specify which tool to use or constrain the path. Claude may use Glob before Read, and in projects with `node_modules/`, the Glob results are overwhelmed by nested `package.json` files sorted by modification time, truncating the root file from results.

**Code Context:**
```markdown
## Step 1: Scan Dependencies

Read `package.json` in the current working directory. If it doesn't exist, inform the user and stop.
```

The TypeScript hook `check-dependencies.ts:223-233` handles this correctly:
```typescript
function loadPackageJson(cwd: string): Record<string, unknown> | null {
  const pkgPath = join(cwd, 'package.json')   // direct path construction
  try {
    if (!existsSync(pkgPath)) return null
    const content = readFileSync(pkgPath, 'utf-8')
    return JSON.parse(content)
  } catch { return null }
}
```

### 3. Proposed Solutions

#### Solution 1: Script Delegation (Recommended)

Refactor `setup.md` to delegate dependency scanning to `check-dependencies.ts` via a CLI mode, outputting structured JSON for the command to display. Eliminates the problem class entirely.

**Pros:** Reliable, tested, no LLM interpretation ambiguity, DRY with existing hook
**Cons:** Requires adding a CLI entry point to `check-dependencies.ts`

#### Solution 2: Explicit Tool Instructions

Replace ambiguous prose with explicit tool instructions:
> Use the `Read` tool with path `./package.json`. Do not use Glob.

**Pros:** Minimal change, quick fix
**Cons:** Still relies on LLM following instructions, fragile, duplicates logic

### 4. Testing Requirements

1. **Bug Scenario:** Run setup in a project with `node_modules/` — must find root `package.json`
2. **Edge Cases:** Project without `package.json`, project without `node_modules/`
3. **Regression:** Existing `check-dependencies.test.ts` tests must pass

### 5. Similar Code Patterns

- `setup.md:27` — Step 2 reads `.claude/settings.json` with same ambiguous pattern (lower risk but same class of bug)
- No other command files in `plugins/*/commands/` have this pattern
