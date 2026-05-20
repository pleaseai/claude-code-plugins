---
name: use-bun
description: 'Answer questions about Bun — the all-in-one JavaScript/TypeScript toolkit — and help write code using its runtime, package manager, test runner, and bundler. Use when developers: (1) call Bun-native APIs like `Bun.serve`, `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.$` (shell), `Bun.SQL`, `Bun.RedisClient`, `Bun.Glob`, `Bun.password`, `Bun.build`, `Bun.Cookie`, `HTMLRewriter`; (2) import from `bun:test`, `bun:sqlite`, `bun:ffi`, `bun:jsc`; (3) run CLI commands `bun install`, `bun add`, `bun remove`, `bun update`, `bun outdated`, `bun pm`, `bun run`, `bun test`, `bun build`, `bunx`, `bun create`, `bun x`, `bun init`, `bun upgrade`, `bun audit`; (4) configure `bunfig.toml`, `bun.lock`, workspaces, catalogs, overrides, isolated installs, trusted dependencies, lifecycle scripts; (5) work with the bundler — loaders, plugins, macros, `--compile` executables, bytecode, HTML imports, fullstack dev server, hot reloading; (6) write tests with `bun:test` — `mock`, `spyOn`, `mock.module`, snapshots, `setSystemTime`, coverage; (7) need Node.js compat info, JSC vs V8 differences, or migration from npm/yarn/pnpm/jest/vitest. Triggers on: "bun", "Bun.serve", "Bun.file", "Bun.spawn", "Bun.SQL", "Bun.build", "bun install", "bun add", "bun test", "bun run", "bunx", "bun create", "bun.lock", "bunfig.toml", "bun:test", "bun:sqlite", "bun:ffi", "bun shell", "bun bundler", "bun macro", "bun workspace", "bun catalog", "bun --compile", "trustedDependencies", "isolated installs", "JavaScriptCore", "JSC".'
---

## Prerequisites

Verify the `ask` CLI is available (`which ask`). It is the primary tool for reading the exact Bun version installed in the project — it fetches the version-tagged source from GitHub once and caches it at `~/.ask/`. If `ask` is not installed, fall back to the local `bun` binary's built-in help and the official docs at https://bun.com/docs (which always tracks the latest release).

Before writing Bun-specific code, detect the project's Bun version:

```bash
# 1. Installed runtime — drives every API surface check
bun --version

# 2. Project pin (if any) — overrides the global runtime
cat .bun-version 2>/dev/null
cat package.json 2>/dev/null | jq -r '.packageManager // empty'   # e.g. "bun@1.3.14"
cat package.json 2>/dev/null | jq -r '.engines.bun // empty'

# 3. Lockfile format — Bun migrated from binary bun.lockb to text bun.lock at 1.1.21
ls bun.lock bun.lockb 2>/dev/null
```

If Bun is not installed, install it once:

```bash
# Recommended — official installer
curl -fsSL https://bun.sh/install | bash

# Or via npm / brew / proto / asdf — see https://bun.com/docs/installation
```

## Critical: Do Not Trust Internal Knowledge

Bun ships fast — APIs land, change shape, or move modules between minor releases. Common pitfalls from outdated training data:

- **`Bun.serve` routes (`routes: { "/users/:id": handler }`)** — requires **Bun 1.2.3+**. Before that you wrote `fetch(req)` with manual URL parsing. Do not suggest `routes` on older versions.
- **`bun.lock` (text JSONC)** vs **`bun.lockb` (binary)** — Bun **1.1.21+** writes `bun.lock` by default. The binary `bun.lockb` is still readable but no longer produced. If you see both, the text one wins.
- **Catalogs (`catalog:` / `catalogs:` in `package.json` / `bunfig.toml`)** — added in **Bun 1.2+**. Not available earlier.
- **Isolated installs (`linker = "isolated"`)** — added in **Bun 1.2.x**. Earlier versions only support `hoisted`.
- **`bun:sql` / `Bun.SQL`** — Postgres client landed in **Bun 1.2+**; native MySQL/SQLite are different surfaces (`bun:sqlite` has always existed).
- **`Bun.RedisClient` / `Bun.redis`** — Valkey/Redis client is recent (**Bun 1.2.x**). Older code uses third-party libs.
- **`bun build --compile`** — single-file executables stabilised in **1.1+**; flags like `--bytecode`, `--target=bun-linux-x64-baseline`, and Windows cross-compile are newer.
- **`mock.module()`** — module mocking in `bun:test` was added in **1.1+**. Earlier code uses `mock()` only.
- **`Bun.$` (shell)** — promoted from experimental in **Bun 1.0.24+**. API stabilised since.
- **`trustedDependencies` in `package.json`** — Bun does **not** run installed dependencies' lifecycle scripts by default for security; you must allowlist via this field. Different default than npm/yarn.

When working with Bun:

1. Resolve the installed version against the project (`bun --version`, then check `package.json.packageManager` and `.bun-version`).
2. Verify every API name, method signature, and CLI flag against the version-tagged source via `ask` before generating code. **Do not invent flag names** — Bun's CLI has many short forms and aliases, but only the documented ones are stable.
3. Cross-reference the upstream docs **at the matching version tag** ([`references/versions.md`](references/versions.md) for the `ask` pin recipe) — not `main`, which tracks unreleased changes.
4. Use `bun --print '<expr>'` or a quick REPL (`bun repl`) to confirm behaviour before committing complex API uses.
5. Surface meaningful trade-offs to the user instead of silently picking a side (e.g. `Bun.serve` static routes vs `fetch` handler; `bun:sqlite` vs `Bun.SQL`; `bun test` vs `vitest` for projects that already use Vitest).

If documentation cannot be found locally or remotely to back an answer, say so explicitly.

## Finding Documentation

Bun's source and docs live in one repo: `github:oven-sh/bun`. Use `ask` with the matching tag:

```bash
# Pin the installed runtime — replace 1.3.14 with `bun --version` output
BUN_VER="v$(bun --version)"

# Source tree (single line — pass to rg/fd/cat)
ask src "github:oven-sh/bun@${BUN_VER}"

# Doc candidates (one per line; the docs/ folder will be first)
ask docs "github:oven-sh/bun@${BUN_VER}"

# Convenience
BUN_SRC=$(ask src "github:oven-sh/bun@${BUN_VER}")
ls "${BUN_SRC}/docs"                                   # MDX docs by topic
rg "Bun\.serve" "${BUN_SRC}/docs/runtime/http/server.mdx"
rg "fn serve" "${BUN_SRC}/src/bun.js"                  # implementation
```

When the version is unknown or the user is reading reference material:

```bash
ask docs github:oven-sh/bun@main                       # latest unreleased
ask src github:oven-sh/bun@main
```

See [`references/versions.md`](references/versions.md) for the version pinning recipe and known-stable tag list.

## Topic Map

Load the focused reference for the area you're touching — do not read all of them upfront.

| Topic | Reference | When |
|-------|-----------|------|
| Runtime APIs (`Bun.*`, `bun:*` modules) | [`references/runtime-apis.md`](references/runtime-apis.md) | Writing server code, file I/O, child processes, SQL/SQLite/Redis, FFI, shell |
| Package manager (`bun install`, workspaces, catalogs) | [`references/package-manager.md`](references/package-manager.md) | Setting up deps, monorepos, `bunfig.toml` install settings, lockfile, registries |
| Test runner (`bun:test`) | [`references/test-runner.md`](references/test-runner.md) | Writing tests, mocks, snapshots, coverage, migrating from Jest/Vitest |
| Bundler (`Bun.build`, `bun build`) | [`references/bundler.md`](references/bundler.md) | Bundling, executables (`--compile`), plugins, macros, fullstack dev server |
| Node.js compatibility | [`references/node-compat.md`](references/node-compat.md) | Migrating Node apps, checking `node:*` module support, JSC vs V8 differences |
| Version pinning recipe | [`references/versions.md`](references/versions.md) | `ask` spec to use, known-stable Bun versions, lockfile format history |

## Common Decision Points

- **Server**: prefer `Bun.serve` over `node:http` — built-in routing (`routes:` on 1.2.3+), WebSockets, TLS, hot reload via `--hot`.
- **File I/O**: prefer `Bun.file()` / `Bun.write()` over `node:fs/promises` — lazy reads, faster, returns `Blob`-compatible objects.
- **Spawning processes**: prefer `Bun.spawn()` / `Bun.$` over `node:child_process` — better defaults, streaming stdio, async iterators.
- **SQLite**: use `bun:sqlite` — synchronous, built-in, no compile step. For Postgres use `Bun.SQL`.
- **Shell scripts**: prefer `Bun.$\`cmd\`` over `child_process.exec` — safe interpolation, async iteration, JS strings as commands.
- **Package install**: `bun install` is the default; falls back gracefully on `npm`/`yarn` lockfiles but writes `bun.lock` after the first run. Warn the user if they share a repo with other PMs.
- **Tests**: `bun test` is Jest-compatible and runs `*.test.{ts,tsx,js,jsx,mjs,cjs}` by default — no config required. Migrate from `vitest` only if speed is a real bottleneck; APIs are close but not identical.
- **Bundling for browser**: `Bun.build({ target: "browser" })` is fast and adequate; for production web bundles with code splitting and asset pipelines, dedicated tools (Vite/Webpack) may still be more featureful — check the user's actual needs before recommending.
- **Bundling for CLI distribution**: `bun build --compile` produces a single-file native binary including the Bun runtime. Excellent for CLIs; not suitable for plugin systems that need dynamic imports.

## Migration Quick Reference

| From | To | Notes |
|------|----|-------|
| `npm install` / `yarn install` / `pnpm install` | `bun install` | First run writes `bun.lock`; coexists with other lockfiles but they drift |
| `npx <cmd>` | `bunx <cmd>` | Equivalent; faster cold start |
| `node script.ts` (with ts-node/tsx) | `bun script.ts` | Native TS; no config |
| `node --watch script.ts` | `bun --watch run script.ts` | Or `bun --hot run` for in-process hot reload |
| `jest` / `vitest` | `bun test` | API mostly compatible; verify matchers — Bun does not implement every Jest matcher |
| `dotenv` | built-in | Bun auto-loads `.env`, `.env.local`, `.env.{NODE_ENV}` |
| `tsx watch src/index.ts` | `bun --watch run src/index.ts` | |
| `child_process.exec` | `` Bun.$`...` `` | Async iterable output, safe interpolation |
| `fs.readFile` | `await Bun.file(path).text()` | Or `.json()`, `.arrayBuffer()`, `.bytes()`, `.stream()` |
| `crypto.createHash` | `Bun.hash` / `Bun.CryptoHasher` | Faster; check algorithm support |

## Conventions

- **TypeScript by default** — Bun runs `.ts` / `.tsx` natively. Add `@types/bun` if your editor needs types: `bun add -d @types/bun`. In `tsconfig.json` use `"types": ["bun"]` (replaces `@types/node` in pure-Bun projects).
- **ESM by default** — Bun supports CJS interop but new code should be ESM. `"type": "module"` in `package.json` is optional but recommended for clarity.
- **No `dist/` for libraries that ship as-is** — Bun can publish TS directly, but most ecosystems still expect compiled output. Use `bun build` or a dedicated bundler for npm releases.
- **`bunfig.toml`** lives at the project root and configures install, runtime, and test behaviour. Keep it minimal — defaults are good. See [`references/runtime-apis.md`](references/runtime-apis.md) and [`references/package-manager.md`](references/package-manager.md) for the keys that matter most.
