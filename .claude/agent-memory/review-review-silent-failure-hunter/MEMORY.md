# Silent Failure Hunter - Memory

## Project: claude-code-plugins

### Error Handling Conventions
- No Sentry/logError/logForDebugging framework in this project (unlike spec-please)
- No errorIds.ts constants file exists
- Project uses plain `console.error` / `console.warn` / `process.stderr.write`
- TypeScript CLI scripts use `execSync` via Node.js `child_process`

### Key Patterns Found (PR #42)

#### `execSafe` Anti-pattern (scripts/cli.ts)
- Empty catch block `catch { return null }` - swallows ALL errors silently
- Return value of `execSafe` frequently ignored by callers
- `null` return is ambiguous: means both "no output" and "command failed"
- Pattern: `sha?.slice(0, 7) ?? "?"` hides submodule update failures

#### Shell Hook Patterns (hooks/deny-vendor-write.sh)
- Uses `set -euo pipefail` which is good
- `jq` dependency not validated before use - failure causes hook crash
- `CLAUDE_PROJECT_DIR` unset causes unbound variable error (exit 1, no user message)
- Hook crashes (exit 1) block ALL Claude tool use - must handle gracefully

### Common Reviewer Checklist for This Project
1. Check all `execSafe` call sites - is the return value checked?
2. Check all "done" console.log after execSafe - is it conditional?
3. Check git operations for partial-failure states (add succeeds, commit fails)
4. Shell hooks: verify jq and env variable guards exist
5. `null === false` conflation in boolean functions that use execSafe

See: `docs/patterns.md` for detailed code examples

### PR #185 Findings (scripts/multi-format.ts + cli.ts generateMultiFormat)

#### `readClaudeManifest` silent JSON.parse swallow (multi-format.ts:301-311)
- `catch {}` returns null on both "file missing" AND "file corrupted"
- Caller `generateForPlugin` reports same `reason: "no Claude manifest found"` for both cases
- Caller `generateMultiFormat` prints `skipped (no Claude manifest found)` and CONTINUES the loop
- Exit code is 0 even when manifests are silently dropped → CI passes with missing artifacts

#### `extractMcpServersFile` array bug (multi-format.ts:267-270)
- `typeof claude.mcpServers !== "object"` does NOT exclude arrays (typeof [] === "object")
- An array `mcpServers` would produce `{ mcpServers: [...] }` in `.mcp.json` / `mcp_config.json` — malformed for Codex/Antigravity
- No test coverage for this case (confirmed via grep on multi-format.test.ts)
- Lower priority since marketplace tooling typically writes object form, but no validation exists

#### `generateForPlugin` partial-state risk (multi-format.ts:345-398)
- 4 sequential writes with no try/catch
- If write #2 throws EACCES/ENOSPC, writes #1 succeeded and disk is half-updated
- Subsequent re-run would skip already-written files (writeIfChanged compares content) so partial state can persist invisibly

#### `generateMultiFormat` loop doesn't surface errors (cli.ts:700-754)
- No try/catch around `generateForPlugin(pluginDir, entry)` — first throw aborts entire loop, but with exit code from uncaught exception (not 0/1 by intent)
- "Done. Processed N plugins" line always prints even when many plugins were silently skipped via `reason`
- No non-zero exit code when ANY plugin failed to generate

### Generator-style code conventions
- Internal generators are trusted boundaries, so don't flag input-validation gaps unless they cause WRONG OUTPUT
- Do flag silent file-system error swallow that produces inconsistent on-disk state
