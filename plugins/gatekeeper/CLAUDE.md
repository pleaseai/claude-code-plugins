# Gatekeeper Plugin

PreToolUse hook that auto-approves safe Bash commands and blocks destructive ones.

## ⚠️ Rebuild Required After Source Changes

Whenever you modify files under `src/`, you **must** rebuild the dist bundle.
**Changes will not take effect in the hook until you rebuild.**

```bash
cd plugins/gatekeeper
bun run build
```

Output: `dist/pre-tool-use.js` (single bundled file)

## Structure

```
plugins/gatekeeper/
├── src/
│   ├── chain-parser.ts       # Shell command parser (classifies as single/chain/unparseable)
│   ├── pre-tool-use.ts       # DENY/ALLOW rule evaluation and hook entry point
│   └── pre-tool-use.test.ts  # Tests
└── dist/
    └── pre-tool-use.js       # ← Build output (do not edit directly)
```

## Development Commands

```bash
bun run build    # Build src → dist
bun test         # Run tests
bun run lint     # Lint check
bun run lint:fix # Auto-fix lint issues
```

## Important Notes

- **Never edit `dist/pre-tool-use.js` directly** — it is generated from source
- Review security impact and add tests when modifying DENY_RULES
- Do not use the `g` flag on RegExp patterns — `RegExp.test()` with `g` mutates `lastIndex`, causing incorrect results on repeated calls within the same process