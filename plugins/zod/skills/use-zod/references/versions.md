# Zod Versions & Entry Points

Purpose: pick the right import path for the installed version, and translate v3 APIs to their v4 equivalents (or vice versa).

## Detection

```bash
node -e "const v=require('zod/package.json').version; console.log(v)"
```

Or read the file directly:

```bash
cat node_modules/zod/package.json | jq '{ version, exports: (.exports | keys) }'
```

## Entry points by installed version

### Installed `zod@4.x`

| Import | Resolves to | Use when |
| --- | --- | --- |
| `import * as z from "zod"` | v4 (default since 4.0.0) | Default. Most projects. |
| `import * as z from "zod/mini"` | v4 Mini (functional, tree-shakable) | Bundle-size-sensitive frontend code. |
| `import * as z from "zod/v3"` | v3 back-compat | Legacy modules in a project that has otherwise migrated to v4. |
| `import * as z from "zod/v4"` | v4 (explicit) | Same as default. Use when both v3 and v4 imports coexist in the same file for clarity. |

### Installed `zod@3.25.x` (the bridge release)

| Import | Resolves to |
| --- | --- |
| `import { z } from "zod"` or `import * as z from "zod"` | v3 (default while pinned to 3.x) |
| `import * as z from "zod/v4"` | v4 (opt-in, alongside v3) |
| `import * as z from "zod/v4-mini"` | v4 Mini (opt-in) |

`zod@3.25` shipped both v3 (default root export) and v4 (under `zod/v4`) in a single package to ease migration. From `zod@4.0.0` onward the root export flipped to v4.

### Installed `zod@<3.25`

Only the v3 default export exists:

```ts
import { z } from "zod";
// or
import * as z from "zod";
```

There is no `zod/v4` subpath. To use v4, upgrade to `zod@^4`.

## v3 ↔ v4 API cheatsheet

Surface the relevant row whenever rewriting code between versions.

### Error formatting & customization

| Topic | v3 | v4 |
| --- | --- | --- |
| Tree of issues | `err.format()` (instance method) | `z.treeifyError(err)` (top-level fn). `z.formatError(err)` exists but is deprecated. |
| Flat object | `err.flatten()` → `{ formErrors, fieldErrors }` | `z.flattenError(err)` → `{ formErrors, fieldErrors }` (same shape). |
| Pretty string | — (DIY) | `z.prettifyError(err)` |
| Error class | `z.ZodError` | `z.ZodError` (extends `z.core.$ZodError`). For `zod/mini`, parse errors are `z.core.$ZodError`. |
| Schema-level custom message | `z.string({ message: "..." })` | `z.string({ error: "..." })` |
| Schema-level error map | `z.string({ errorMap: (iss, ctx) => ... })` | `z.string({ error: (iss) => "..." })` |
| Per-parse error map | `schema.parse(input, { errorMap })` | `schema.parse(input, { error })` |
| Global error map | `z.setErrorMap(fn)` | `z.config({ customError: fn })` |
| Async issue ctx in v3 | `(iss, ctx) => ctx.defaultError` | `(iss) => undefined` falls through to next map in precedence chain |

### Refinements & checks

| Topic | v3 | v4 |
| --- | --- | --- |
| Simple refinement | `.refine(fn, "msg")` | `.refine(fn, "msg")` (unchanged) |
| Async refinement | `.refine(async fn, "msg")` + `parseAsync` | `.refine(async fn, "msg")` + `parseAsync` (unchanged) |
| Multi-issue refinement | `.superRefine((val, ctx) => { ctx.addIssue(...) })` (canonical v3 API) | `.superRefine` remains the recommended high-level API; `.check(({ value, issues }) => { issues.push(...) })` is a lower-level alternative for perf-sensitive paths |
| Replace value during validation | `.transform(fn)` (changes inferred type) | `.transform(fn)` or `.overwrite(fn)` (overwrite preserves the type) |

### Schema methods

| Topic | v3 | v4 |
| --- | --- | --- |
| Reject extra object keys | `z.object({...}).strict()` | `z.strictObject({...})` or `z.object({...}).strict()` |
| Preserve extra object keys | `z.object({...}).passthrough()` | `z.object({...}).loose()` (also: `z.looseObject({...})`) |
| Pick / omit / partial / required | `.pick`, `.omit`, `.partial`, `.required` | same — but `ZodObject` generics were redesigned, so chained `.extend().omit()` is much cheaper for `tsc` |
| Recursive schemas | `const Tree: z.ZodType<Node> = z.lazy(() => z.object({...}))` (`z.lazy` + explicit annotation) | Getter pattern: `const Tree = z.object({ name: z.string(), get children() { return z.array(Tree); } })` — schema variable references itself; annotation only needed for inference edge cases |
| Coercion | `z.coerce.number()` | `z.coerce.number()` (unchanged) |
| Branded types | `.brand<"Id">()` | `.brand<"Id">()` (unchanged) |

### Parsing

| Topic | v3 | v4 |
| --- | --- | --- |
| Sync parse | `.parse`, `.safeParse` | `.parse`, `.safeParse` |
| Async parse | `.parseAsync`, `.safeParseAsync` | `.parseAsync`, `.safeParseAsync` |
| Encode/decode | — | `.decode`, `.encode`, `.safeDecode`, `.safeEncode` (with `z.codec`, 4.1+) |

### New in v4 (no v3 equivalent)

- `z.codec(input, output, { decode, encode })` — bidirectional transformation between two schemas. Introduced in `zod@4.1`.
- `z.prettifyError(err)` — human-readable error string.
- `z.treeifyError(err)` — replaces deprecated `z.formatError(err)`.
- `.overwrite(fn)` — like `.transform` but preserves the inferred type.
- `.check(...)` (chainable on schemas; lower-level alternative to `.superRefine` for full control over generated issue objects).
- `z.config({ customError })` — global error map registration.
- `zod/mini` — functional, tree-shakable variant.

### Removed or restricted in v4

- `z.string({ message, errorMap })` separate params — collapsed into `error`.
- `z.setErrorMap` — replaced by `z.config({ customError })`.
- `nonstrict()` (rare; v3 had it as the inverse of `strict()`) — gone; use `.loose()` instead.

## Upstream documentation pins

Always link the user to docs at the version that matches their installed package, not `main`.

- v4.3.6 (latest as of 2026-01-22): https://github.com/colinhacks/zod/tree/v4.3.6/packages/docs/content
  - Live site: https://zod.dev (tracks the latest published v4)
- v3.25.76 (last v3 release, includes `zod/v4` bridge): https://github.com/colinhacks/zod/tree/v3.25.76/packages/docs/content
- v3 archive (pre-bridge, frozen): https://github.com/colinhacks/zod/tree/main/packages/docs-v3

## When in doubt

Prefer `ask` over `node_modules/` — it resolves the project's lockfile-pinned version and gives you full source (with comments and tests), not just the compiled output.

```bash
SRC=$(ask src zod)
cat "$SRC/packages/zod/package.json" | jq .version           # actual installed version
cat "$SRC/packages/zod/package.json" | jq '.exports | keys'  # available subpaths
rg -n "<symbol>" "$SRC/packages/zod/src"                     # verify symbol exists
```

Pin to a specific version regardless of the project:

```bash
ask src zod@4.3.6   # latest v4
ask src zod@3.25.76 # latest v3 (with v4 bridge)
```

Fallback when `ask` is unavailable:

1. `cat node_modules/zod/package.json | jq .version`
2. `cat node_modules/zod/package.json | jq '.exports | keys'`
3. `rg -n "<symbol>" node_modules/zod/dist`

<!--
Source references:
- https://github.com/colinhacks/zod/tree/v4.3.6/packages/docs/content
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/v4/index.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/error-customization.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/error-formatting.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/packages/mini.mdx
- https://github.com/colinhacks/zod/tree/v3.25.76/packages/docs/content
-->
