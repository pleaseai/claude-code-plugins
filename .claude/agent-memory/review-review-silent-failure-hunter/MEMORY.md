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
