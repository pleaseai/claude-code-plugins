# Bun Bundler — `Bun.build` / `bun build`

Fast native bundler for JS, TS, JSX, CSS, and HTML. Two surfaces — CLI and JS API — share the same options.

## CLI

```bash
bun build ./src/index.tsx --outdir ./dist
bun build ./src/index.ts --target=browser --format=esm --minify --sourcemap=linked
bun build ./cli.ts --compile --outfile mycli           # single-file executable
bun build ./src/server.ts --target=bun --outfile=server.js
bun build ./entry.html --outdir=./public                # HTML import bundles linked assets
bun build --watch ./src/index.ts --outdir ./dist        # incremental rebuilds
```

## JS API

```ts
const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "browser",              // "browser" | "bun" | "node"
  format: "esm",                  // "esm" | "cjs" (experimental) | "iife" (experimental)
  minify: true,                   // or { whitespace, identifiers, syntax }
  sourcemap: "linked",            // "none" | "inline" | "external" | "linked"
  splitting: true,                // code-splitting for ESM
  publicPath: "/static/",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  external: ["react", "react-dom"],
  loader: { ".svg": "file", ".graphql": "text" },
  plugins: [/* ... */],
  banner: "/* bundled with bun */",
  footer: "",
  // Single-file executable (compile mode)
  compile: { outfile: "./mycli", target: "bun-linux-x64", bytecode: true },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
```

The result includes `outputs: BuildArtifact[]` — each is a Blob with `.path`, `.type`, `.kind`, `.hash`, `.sourcemap`.

## Targets

| `target` | Use for | Notes |
|---------|---------|-------|
| `browser` | Web bundles | Excludes Node built-ins; polyfills where reasonable |
| `bun` | Server code targeting the Bun runtime | Keeps `bun:*` and `node:*` imports unbundled |
| `node` | Node.js compatible output | Excludes Bun-specific APIs; CJS interop |

## Single-file executables — `--compile`

```bash
bun build ./cli.ts --compile --outfile mycli
./mycli                                                # runs anywhere with same OS/arch
```

Cross-compile:

```bash
bun build ./cli.ts --compile --target=bun-linux-x64        --outfile mycli-linux
bun build ./cli.ts --compile --target=bun-linux-arm64      --outfile mycli-linux-arm64
bun build ./cli.ts --compile --target=bun-windows-x64      --outfile mycli.exe
bun build ./cli.ts --compile --target=bun-darwin-x64       --outfile mycli-mac
bun build ./cli.ts --compile --target=bun-darwin-arm64     --outfile mycli-mac-arm64
bun build ./cli.ts --compile --target=bun-linux-x64-baseline --outfile mycli-legacy-cpu

# Bytecode preprocessing (faster startup, larger binary)
bun build ./cli.ts --compile --bytecode --outfile mycli
```

The binary contains a copy of the Bun runtime plus your bundled code (typically 50–80MB). Suitable for CLIs and self-contained services; not suitable for plugin systems that rely on dynamic `import()` of external user code at runtime.

## Loaders

Built-in loaders by extension:

| Extension | Loader | Output |
|-----------|--------|--------|
| `.js`, `.jsx`, `.ts`, `.tsx` | `js`/`jsx`/`ts`/`tsx` | JS |
| `.json` | `json` | JS module exporting parsed JSON |
| `.toml` | `toml` | JS module exporting parsed TOML |
| `.txt` | `text` | string |
| `.css` | `css` | bundled CSS (with `@import`, url rebasing) |
| `.html` | `html` | entry point — bundles linked `<script>`/`<link>` |
| `.node` | `napi` | Native Node-API addon |
| `.wasm` | `wasm` | streaming-compiled WebAssembly |
| `.sqlite` (via `import db from "./x.sqlite" with { type: "sqlite" }`) | `sqlite` | SQLite db import — only with `target=bun`, requires the explicit `with { type: "sqlite" }` import attribute. Set `embed: "true"` on the attribute to embed the db file in the bundle. |

Override per extension with `loader: { ".svg": "file" }`. Available loaders: `js`, `jsx`, `ts`, `tsx`, `json`, `toml`, `text`, `file`, `napi`, `wasm`, `css`, `html`.

## Plugins — `Bun.plugin`

```ts
import { plugin, type BunPlugin } from "bun";

const yamlPlugin: BunPlugin = {
  name: "yaml",
  setup(build) {
    build.onLoad({ filter: /\.ya?ml$/ }, async args => {
      const text = await Bun.file(args.path).text();
      const yaml = await import("yaml");
      return { exports: yaml.parse(text), loader: "object" };
    });

    build.onResolve({ filter: /^virtual:/, namespace: "file" }, args => {
      return { path: args.path, namespace: "virtual" };
    });

    build.onLoad({ filter: /.*/, namespace: "virtual" }, args => {
      return { contents: `export default ${JSON.stringify(args.path)}`, loader: "js" };
    });
  },
};

// Register globally for the runtime (affects import resolution)
plugin(yamlPlugin);

// Or pass to a build
await Bun.build({
  entrypoints: ["./index.ts"],
  plugins: [yamlPlugin],
});
```

API is close to esbuild's plugin API but not identical — `onLoad` can return `exports` directly (skipping codegen) and `loader: "object"` is Bun-specific.

## Macros (build-time evaluation)

```ts
// release-info.ts
export function gitSha() {
  const proc = Bun.spawnSync(["git", "rev-parse", "HEAD"]);
  return proc.stdout.toString().trim();
}
```

```ts
// index.ts
import { gitSha } from "./release-info.ts" with { type: "macro" };
console.log("Built from", gitSha());            // gitSha() runs at build time; the string is inlined
```

Macros run during bundling (and during `bun run` in JIT mode if enabled). Use for compile-time configuration, code generation, or asset inlining — never for anything that should happen at runtime.

## HTML imports & fullstack

```ts
const server = Bun.serve({
  routes: {
    "/": (await import("./index.html") as any).default,
  },
});
```

Importing an `.html` entrypoint causes Bun to bundle every linked `<script src>` and `<link rel="stylesheet">`. Combined with `Bun.serve`, this gives a fullstack dev server with hot reload (`bun --hot run server.ts`).

## bunfig.toml — bundler / runtime keys

```toml
[run]
bun = true                          # rewrite `node` script invocations to `bun`

[loader]
".graphql" = "text"                  # global loader overrides for `bun run`
```

(Most bundler config lives in `Bun.build()` options — `bunfig.toml` is for runtime-level overrides.)

## When NOT to use `Bun.build`

- **Library output for npm**: the bundler does not yet produce `.d.ts` type declarations. Use `tsc --emitDeclarationOnly` (or `tsdown`/`tsup`/`rollup`) alongside.
- **Production web with complex asset pipelines**: Vite/Webpack still have richer plugin ecosystems for image optimisation, PWA manifests, etc. Use Bun for dev speed if you wish, but verify production output.
- **Tree-shaking edge cases**: Bun's tree-shaking is good but not as battle-tested as Rollup's for library code. If shipped bundle size matters, compare outputs.

## Common gotchas

- **`process.env.X` is not statically replaced by default** — pass `define: { "process.env.X": JSON.stringify(value) }` to inline at build time.
- **`splitting: true` requires `format: "esm"`** — splitting in CJS is not supported.
- **`--target=node` keeps `node:` imports unbundled**; for a portable single file use `--target=bun --compile`.
- **CJS output is experimental** — for stable npm-library publishing, prefer a Rollup/tsdown pipeline.
- **`--watch` does not run your server** — pair with `bun --hot run` for a hot-reloading dev experience.
