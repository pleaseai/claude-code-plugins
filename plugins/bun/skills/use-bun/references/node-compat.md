# Node.js Compatibility

Bun targets drop-in compatibility with Node.js. Most production Node apps run on Bun with no changes. This reference summarises what's supported, what's gappy, and how to verify before relying on a specific API.

## Engine

Bun uses **JavaScriptCore** (Apple's engine, used by Safari), not V8. This means:

- **Faster startup** in most cases (4× faster on Linux for hello-world).
- **Different perf characteristics** for tight numeric loops, GC patterns, and JIT warmup. Benchmarks that work in V8 may behave differently.
- **No V8-specific globals**: `%OptimizeFunctionOnNextCall`, `%DebugPrint`, `--allow-natives-syntax` flags — these do not exist.
- **No `v8` module APIs that depend on V8 internals**: `v8.serialize`/`deserialize` is implemented, but heap snapshot formats differ.

For most application code this is invisible. For libraries that use `--allow-natives-syntax` (rare), it matters.

## Built-in module status

| Module | Status |
|--------|--------|
| `node:fs`, `node:fs/promises` | Near-complete; some edge-case flags differ |
| `node:path` | Complete |
| `node:os` | Complete |
| `node:crypto` | High coverage; some legacy ciphers differ |
| `node:http`, `node:https`, `node:http2` | Implemented; prefer `Bun.serve` for new code |
| `node:net`, `node:tls`, `node:dgram` | Implemented |
| `node:stream`, `node:buffer`, `node:events` | Complete |
| `node:url`, `node:querystring` | Complete |
| `node:zlib` | Complete |
| `node:child_process` | Implemented; `Bun.spawn` is more ergonomic |
| `node:cluster` | **Partial** — IPC limited |
| `node:worker_threads` | Implemented |
| `node:assert` | Complete |
| `node:util` | High coverage |
| `node:vm` | **Partial** — most APIs work; some isolation edge cases differ |
| `node:perf_hooks` | Implemented |
| `node:async_hooks` | Implemented (AsyncLocalStorage works) |
| `node:dns` | Implemented |
| `node:test` | Implemented (alongside `bun:test`) |
| `node:wasi` | **Partial** |
| `node:inspector` | **Partial** |

For the authoritative list, read at the installed version:

```bash
BUN_REF="bun-v$(${CLAUDE_SKILL_DIR}/scripts/resolve-bun-version.sh)"
BUN_SRC=$(ask src "github:oven-sh/bun@${BUN_REF}")
cat "${BUN_SRC}/docs/runtime/nodejs-compat.mdx"
```

## Globals and process

| API | Notes |
|-----|-------|
| `process.env`, `process.argv`, `process.platform`, `process.cwd()` | Work identically |
| `process.versions.bun` | Bun-specific; use to detect runtime |
| `process.versions.node` | Returns a Node.js version string for compat (currently emulates a recent LTS) |
| `process.binding(…)` | Limited — many internal bindings unavailable |
| `process.dlopen` | Works for N-API addons (`.node` files) |
| `__dirname`, `__filename` | Work in CJS; in ESM use `import.meta.dir` / `import.meta.file` (or `fileURLToPath(import.meta.url)`) |
| `require` | Works for CJS; also works **inside ESM files** (Bun-specific convenience) |
| `Buffer` | Global; full Node compat |
| `global` | Aliased to `globalThis` |

## Detecting the runtime

```ts
if (typeof Bun !== "undefined") {
  // Bun-only code path
} else if (process.versions.node) {
  // Node-only code path
}
```

Or via `process.versions.bun`:

```ts
const isBun = !!(process as any).versions.bun;
```

## ESM and CJS interop

Bun supports:
- **CJS importing ESM**: via `require()` — works (unlike Node, which restricts this).
- **ESM importing CJS**: via `import` — default import gets `module.exports`, named imports work for static analysis.
- **Top-level `await`** in both formats.
- **`require()` from ESM files** — Bun-specific convenience; portable code should not rely on this.

## TypeScript without compilation

Bun runs `.ts` and `.tsx` natively. `tsconfig.json` is read for path mapping and JSX configuration. `tsc` is still needed for **type-checking** and **emitting `.d.ts`** — Bun does not run the type checker at runtime.

Recommended `tsconfig.json` excerpt for Bun-only projects:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": ["bun"],
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

Install Bun types: `bun add -d @types/bun` (provides `Bun.*`, `bun:*` ambient declarations).

## Common compatibility issues

- **Native modules requiring node-gyp** — Bun supports N-API; modules using V8 internals (rare) will not load. Most popular native modules (sharp, better-sqlite3, bcrypt) work.
- **`process.binding` consumers** — internal-binding-based libraries (e.g. some ancient ones) may break. These are usually deprecated upstream too.
- **`Worker` differences** — `node:worker_threads` works, but `transferList` semantics for some types differ subtly. Verify with a smoke test.
- **`fetch` is global in both** — but Bun uses its own implementation; behaviour for streaming bodies and HTTP/2 push may differ. Same is true for Node 18+.
- **Some `node:crypto` ciphers** — algorithms that depend on OpenSSL provider configs may behave differently. Check the error message and verify with `openssl` directly.

## Verifying a specific API

```bash
BUN_REF="bun-v$(${CLAUDE_SKILL_DIR}/scripts/resolve-bun-version.sh)"
BUN_SRC=$(ask src "github:oven-sh/bun@${BUN_REF}")

# Find Bun's implementation of a Node module
rg -l "function createServer" "${BUN_SRC}/src/js/node"

# Read the test cases — these prove what is supported
ls "${BUN_SRC}/test/js/node/"
rg "test\(" "${BUN_SRC}/test/js/node/http/" | head
```

If a Node test file exists for the area you care about, the API is at least intended to work and has regression coverage.
