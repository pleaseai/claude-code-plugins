---
name: use-zod
description: 'Answer questions about the Zod schema validation library and help build schemas, parsers, refinements, transforms, codecs, and error formatters. Use when developers: (1) ask about Zod APIs like `z.object`, `z.string`, `z.array`, `z.union`, `z.discriminatedUnion`, `parse`, `safeParse`, `z.infer`; (2) define request/response/form schemas in TypeScript; (3) handle `ZodError` or customize error messages; (4) migrate between Zod v3 and v4 (entry-point split, `formatError` → `treeifyError`/`prettifyError`, unified `error` param replacing `message`/`errorMap`). Triggers on: "zod", "z.object", "z.string", "z.array", "z.union", "z.infer", "z.input", "z.output", "ZodError", "$ZodError", "safeParse", "parseAsync", "z.codec", "treeifyError", "prettifyError", "flattenError", "discriminatedUnion", "zod/v4", "zod/v3", "zod/mini", "z.coerce", "superRefine".'
---

## Prerequisites

Before writing Zod code, verify the installed version and entry points in the current project:

```bash
# installed version (drives everything below)
cat node_modules/zod/package.json 2>/dev/null | jq -r .version

# subpath exports — confirms which import paths resolve
cat node_modules/zod/package.json 2>/dev/null | jq '.exports | keys'
```

If `zod` is missing, install only what the task requires:

```bash
# v4 (current default since zod@4.0.0)
pnpm add zod        # or: bun add zod / npm i zod / yarn add zod

# pin to v3 only when the project explicitly requires it
pnpm add zod@^3
```

Detect the package manager from the lockfile (`pnpm-lock.yaml` → pnpm, `bun.lockb` → bun, `package-lock.json` → npm, `yarn.lock` → yarn).

## Critical: Do Not Trust Internal Knowledge

Zod 4 (released 2026) was a major rewrite. Many APIs that were canonical in v3 are now deprecated, renamed, or removed. Examples that are commonly miswritten from training data:

- `err.format()` / `err.flatten()` (v3 instance methods) — in v4 these are top-level functions: `z.treeifyError(err)` / `z.flattenError(err)`. `z.formatError()` exists but is **deprecated** in favour of `z.treeifyError()`.
- `z.string({ message, errorMap })` (v3) — v4 unifies these into a single `error` param: `z.string({ error: "Bad!" })` or `z.string({ error: (iss) => "..." })`.
- `.superRefine()` — deprecated in v4. Use `.check()` instead.
- `error instanceof z.ZodError` — works for the regular `zod` package; for `zod/mini` use `error instanceof z.core.$ZodError` (the parent class).
- Codecs (`z.codec(...)`) — only exist in `zod@4.1+`. Do not suggest them on v3 or earlier 4.x.

When working with Zod:

1. Resolve the installed version first (`node_modules/zod/package.json`).
2. If unsure whether an API exists in the installed version, grep the bundled `.d.ts`: `rg -n "treeifyError|formatError" node_modules/zod/dist`.
3. Check upstream docs **at the matching version pin** (links below in [`references/versions.md`](references/versions.md)) — not at `main`, which tracks the latest release.
4. Run typecheck after every change. Zod schemas are heavily inferred and silent type drift is rare.
5. Never invent method names. If the user references an API you don't recognise, look it up before answering.
6. Surface deprecations to the user instead of silently emitting either pattern.

If documentation cannot be found locally or remotely to back an answer, say so explicitly.

## Version detection — branch v4 vs v3 paths

```bash
node -e "const v=require('zod/package.json').version; console.log(v.startsWith('4.')?'v4':v.startsWith('3.')?'v3':v)"
```

| Detected | Default import | Errors API | Refinement API | Codecs |
| --- | --- | --- | --- | --- |
| v4 (≥4.0.0) | `import * as z from "zod"` | `z.treeifyError`, `z.prettifyError`, `z.flattenError` | `.refine()`, `.check()` | `z.codec()` (4.1+) |
| v3 (≥3.0, <4.0) | `import { z } from "zod"` | `err.format()`, `err.flatten()` | `.refine()`, `.superRefine()` | — |
| v3.25.x bridge | `import * as z from "zod/v4"` opt-in to v4 alongside v3 | per the chosen path | per the chosen path | — |

`zod@3.25` shipped both v3 (default) and v4 (under `zod/v4`) in the same package to ease migration. From `zod@4.0.0` onward, the root export is v4 and `zod/v3` is the back-compat path. See [`references/versions.md`](references/versions.md).

## Entry points (v4)

| Import | Use when |
| --- | --- |
| `import * as z from "zod"` | Default. Standard ergonomic API with chainable methods (`z.string().min(5)`). |
| `import * as z from "zod/mini"` | Bundle-size-sensitive frontend code. Functional API: `z.string().check(z.minLength(5))`. ~64% smaller for trivial schemas. |
| `import * as z from "zod/v3"` | Legacy code on v3 that you can't migrate yet, while consuming a `zod@4` package. |
| `import * as z from "zod/v4-mini"` (within `zod@3.25`) | Forward-compat path for projects pinned to v3 that want to start adopting Mini. |

`zod/mini` and `zod` interop: schemas from one cannot be passed to the other's parse functions. Pick one per project unless you have a deliberate reason to mix.

## Authoring schemas

Concise cookbook of common patterns, each tagged with the version it applies to: [`references/schemas.md`](references/schemas.md).

Rules of thumb:

- **`z.object` is non-strict by default** — extra keys are stripped. Use `z.strictObject({...})` to reject extra keys, or `.passthrough()` (v3) / `.loose()` (v4) to preserve them.
- **`.optional()` vs `.nullable()` vs `.nullish()`** — `optional` allows `undefined`, `nullable` allows `null`, `nullish` allows both.
- **Always export the type** with `z.infer<typeof Schema>`. Use `z.input` and `z.output` separately when the schema transforms (input ≠ output, e.g. `z.string().transform(s => s.length)`).
- **Discriminated unions need a literal discriminator** — `z.discriminatedUnion("type", [...])` is dramatically faster and produces better error messages than `z.union(...)` when shapes share a tag field.
- **Recursive schemas** use different patterns per version: v4 uses object property **getters** (`get children() { return z.array(Self); }`); v3 uses `z.lazy(() => Schema)` plus an explicit `z.ZodType<Node>` annotation. See [`references/schemas.md`](references/schemas.md#recursive-schemas).

## Parsing & error handling

Concise reference: [`references/parsing-and-errors.md`](references/parsing-and-errors.md).

Quick map:

- `parse(input)` — throws on invalid; returns typed deep clone.
- `safeParse(input)` — returns `{ success: true, data } | { success: false, error: ZodError }`.
- `parseAsync` / `safeParseAsync` — required when the schema contains async refinements, transforms, or codecs.
- `try { ... } catch (e) { if (e instanceof z.ZodError) e.issues }` — every error has an `.issues` array of `{ code, path, message, expected?, ... }`.

The `formatError` → `treeifyError` rename is the single most common source of broken v3-era examples. Surface it whenever rewriting v3 error-handling code.

## When typecheck or runtime fails

Before searching source code, check the most common Zod failure modes:

1. **`Invalid input: expected X`** with no `path` — top-level shape mismatch; verify the schema matches the expected outer type.
2. **`Cannot read property 'parseAsync' of undefined`** — usually an import-path mismatch (`zod` vs `zod/mini`); methods on Mini schemas live on top-level functions instead.
3. **`Type 'ZodError' is not assignable to type '$ZodError'`** — mixing `zod` and `zod/mini` schemas in the same code path.
4. **Async refinement throws "Synchronous parsing not supported"** — switch the call site from `parse` to `parseAsync` (or `safeParse` to `safeParseAsync`).
5. **`.superRefine` flagged as deprecated** (v4) — replace with `.check()` per [`references/parsing-and-errors.md`](references/parsing-and-errors.md).
6. **Custom error not surfacing** — confirm you're using the unified `error` param (v4) and not the legacy `message`/`errorMap` shape (v3).

If the symptom is not listed:

```bash
# resolve the error string inside installed source
rg -n "error string fragment" node_modules/zod/dist
```

## References

- [`references/versions.md`](references/versions.md) — entry points, version detection, v3 ↔ v4 API rename cheatsheet, links to upstream docs at version pins (v4.3.6, v3.25.76)
- [`references/schemas.md`](references/schemas.md) — primitives, objects, arrays, unions, discriminated unions, recursion, refinements, transforms, codecs (v4.1+) — each example tagged `// v4`, `// v3`, or `// both`
- [`references/parsing-and-errors.md`](references/parsing-and-errors.md) — `parse` vs `safeParse` vs `parseAsync`, `ZodError` shape, `treeifyError`/`prettifyError`/`flattenError` (v4), `format`/`flatten` (v3), error customization
