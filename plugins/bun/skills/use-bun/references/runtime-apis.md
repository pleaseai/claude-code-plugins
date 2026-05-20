# Bun Runtime APIs

The "Bun-native" surface — APIs on the `Bun` global and the `bun:*` built-in modules. Prefer these over `node:*` equivalents when writing Bun-first code, but fall back to Node when Bun parity is incomplete.

## HTTP Server — `Bun.serve`

```ts
const server = Bun.serve({
  // Static + dynamic routes — requires Bun 1.2.3+
  routes: {
    "/api/status": new Response("OK"),
    "/users/:id": req => new Response(`Hello ${req.params.id}`),
    "/api/posts": {
      GET: () => new Response("List"),
      POST: async req => Response.json(await req.json()),
    },
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
    "/favicon.ico": Bun.file("./favicon.ico"),
  },
  // Fallback for unmatched routes (required pre-1.2.3, optional after)
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
  port: 3000,
  hostname: "0.0.0.0",
  // TLS via tls: { cert, key } — see docs/runtime/http/tls.mdx
});

console.log(`Listening on ${server.url}`);
```

- **WebSockets**: pass `websocket: { open, message, close, drain }` and call `server.upgrade(req)` in `fetch`.
- **Hot reload**: run with `bun --hot run server.ts` — keeps the socket open across edits.
- **Graceful shutdown**: `await server.stop()` waits for in-flight requests.

## File I/O — `Bun.file` / `Bun.write`

```ts
// Lazy file reference — opening is deferred until you await content
const file = Bun.file("./data.json");
file.size;                       // bytes (0 if file does not exist)
file.type;                       // MIME (sniffed from extension)
await file.exists();             // boolean

// Reading — Blob interface
await file.text();               // string
await file.json();               // parsed JSON
await file.arrayBuffer();
await file.bytes();              // Uint8Array
file.stream();                   // ReadableStream

// Writing — destination can be path, URL, BunFile, or fd
await Bun.write("./out.txt", "hello");
await Bun.write("./copy.bin", Bun.file("./src.bin"));
await Bun.write("./remote.html", await fetch("https://example.com"));

// Deleting
await Bun.file("./logs.json").delete();

// Built-in streams
Bun.stdin;  Bun.stdout;  Bun.stderr;   // all BunFile-compatible
```

`Bun.file()` does not throw on missing files — check `.exists()` first when that matters.

## Process Spawning — `Bun.spawn` / `Bun.spawnSync`

```ts
const proc = Bun.spawn(["ls", "-la"], {
  cwd: "./some/dir",
  env: { ...process.env, FOO: "bar" },
  stdin: "pipe" | "inherit" | Bun.file("input.txt") | request,
  stdout: "pipe" | "inherit" | "ignore",
  onExit(proc, exitCode, signalCode, error) { /* … */ },
});

await proc.exited;               // exit code (Promise<number>)
await proc.stdout.text();        // capture stdout
proc.stdin.write("data\n");      // when stdin: "pipe"
proc.stdin.end();

// Synchronous variant for scripts
const { stdout, stderr, exitCode } = Bun.spawnSync(["git", "rev-parse", "HEAD"]);
```

## Shell — `Bun.$`

```ts
import { $ } from "bun";

// Safe interpolation — args are auto-quoted
const name = "untrusted; rm -rf /";
await $`echo ${name}`;                     // prints the literal string, not executed

// Capture stdout
const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();

// Chain & pipe
await $`cat large.log | grep ERROR | wc -l`;

// JSON parsing helper
const pkg = await $`cat package.json`.json();

// Iterate line by line
for await (const line of $`tail -f app.log`.lines()) {
  if (line.includes("FATAL")) break;
}

// Suppress error throw on non-zero exit
const { exitCode } = await $`grep foo file`.nothrow();
```

## SQLite — `bun:sqlite`

```ts
import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");           // file
const mem = new Database(":memory:");             // in-memory
const ro = new Database("mydb.sqlite", { readonly: true, create: false, strict: true });

// strict: true → named bindings without leading $/@/:
const stmt = db.prepare("SELECT * FROM users WHERE id = $id");
stmt.get({ id: 1 });                              // first row or null
stmt.all({ id: 1 });                              // all rows
stmt.iterate({ id: 1 });                          // iterator (1.1+)

db.run("INSERT INTO users (name) VALUES (?)", "Alice");
db.transaction(() => { /* multiple stmts */ })();

db.close();
```

Synchronous, zero-config, ships with Bun. For Postgres use `Bun.SQL`. For Redis/Valkey use `Bun.RedisClient`.

## PostgreSQL — `Bun.SQL` (Bun 1.2+)

```ts
import { SQL } from "bun";

const sql = new SQL("postgres://user:pass@localhost/db");

const users = await sql`SELECT * FROM users WHERE id = ${userId}`;   // tagged template, parameterised
await sql`INSERT INTO users ${sql(newUser)}`;                        // object spread

await sql.begin(async tx => {
  await tx`UPDATE accounts SET balance = balance - 100 WHERE id = ${from}`;
  await tx`UPDATE accounts SET balance = balance + 100 WHERE id = ${to}`;
});

await sql.end();
```

## Redis / Valkey — `Bun.RedisClient` (Bun 1.2+)

```ts
import { RedisClient } from "bun";

const redis = new RedisClient(process.env.REDIS_URL ?? "redis://localhost:6379");
await redis.set("key", "value", "EX", 60);
const value = await redis.get("key");
await redis.close();
```

The convenience `Bun.redis` exists for ad-hoc one-off connections via `REDIS_URL`.

## FFI — `bun:ffi`

```ts
import { dlopen, FFIType, suffix } from "bun:ffi";

const { symbols: { add } } = dlopen(`libmath.${suffix}`, {
  add: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
});

add(1, 2);                                        // 3
```

Use for C ABI calls without writing N-API bindings. For Node-API native modules, use `process.dlopen` (Node-compat).

## Other commonly-needed APIs

| API | Purpose |
|-----|---------|
| `Bun.password.hash(pw)` / `.verify(pw, hash)` | Argon2id/bcrypt password hashing |
| `Bun.hash(data)` / `Bun.CryptoHasher` | Fast non-crypto / crypto hashes |
| `Bun.Glob` | Glob matching (sync + async iterators) |
| `Bun.FileSystemRouter` | Next.js-style file routing |
| `HTMLRewriter` | Cloudflare-compatible streaming HTML rewriter |
| `new Worker(url)` | Web Workers |
| `Bun.Cookie` / `Bun.CookieMap` | Cookie parse/serialise |
| `Bun.CSRF.generate` / `.verify` | CSRF tokens |
| `Bun.semver.satisfies(version, range)` | semver checks |
| `Bun.TOML.parse(text)` | Parse TOML |
| `Bun.color(value, format)` | CSS color parser/formatter |
| `Bun.gzipSync` / `gunzipSync` / `deflateSync` / `zstdCompressSync` | Compression |
| `Bun.which("cmd")` | Locate binary in $PATH |
| `Bun.deepEquals(a, b)` | Structural equality (used by `expect().toEqual`) |
| `Bun.inspect(value)` | Stringify like `util.inspect` |
| `Bun.escapeHTML(str)` | HTML entity escaping |
| `Bun.peek(promise)` | Inspect synchronously-settled Promise without await |
| `Bun.nanoseconds()` | Monotonic high-resolution time |

## Environment & secrets

- Bun auto-loads `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test` based on `NODE_ENV`. No `dotenv` needed.
- `Bun.env` is an alias for `process.env` with no behavioural differences.
- For native OS secret storage, `Bun.secrets` (1.2+) wraps Keychain / DPAPI / libsecret — prefer it over plaintext `.env` for credentials.

## bunfig.toml — runtime keys

```toml
# Run-time behaviour
preload = ["./preload.ts"]              # always loaded first
jsx = "react-jsx"                       # override tsconfig for ad-hoc files
smol = false                            # low-memory mode

[run]
silent = false
bun = true                              # auto-rewrite `node` to `bun` for scripts

[install]
optional = true
peer = true
production = false                      # skip devDependencies in CI
exact = false
linker = "hoisted"                      # or "isolated" (1.2+)
```

Place `bunfig.toml` at the project root; `~/.bunfig.toml` is the user-level fallback.

## When to fall back to Node APIs

`node:fs`, `node:path`, `node:crypto`, `node:http`, etc. are implemented at high parity. Use them when:
- Migrating Node code incrementally
- Using libraries that import Node modules
- Touching APIs Bun has not yet wrapped (e.g. `node:cluster`, `node:vm` corners)

For coverage details see [`node-compat.md`](node-compat.md).

## Verification recipe

Before generating non-trivial Bun runtime code, sanity-check the API surface:

```bash
BUN_VER="v$(bun --version)"
BUN_SRC=$(ask src "github:oven-sh/bun@${BUN_VER}")

# Confirm an API exists at this version
rg -n "Bun\.SQL|class SQL" "${BUN_SRC}/packages/bun-types/bun.d.ts"

# Read the docs for that area
cat "${BUN_SRC}/docs/runtime/sql.mdx"
```
