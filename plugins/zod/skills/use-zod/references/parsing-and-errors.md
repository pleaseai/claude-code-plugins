# Parsing & Error Handling

Purpose: choose the right parse method, read `ZodError` correctly, format errors for users, and customize messages — with v3 ↔ v4 differences flagged inline.

## Parse methods

```ts
schema.parse(input);              // throws ZodError on failure; returns typed deep clone
schema.safeParse(input);          // returns { success: true, data } | { success: false, error }
schema.parseAsync(input);         // required when schema has async refinements/transforms/codecs
schema.safeParseAsync(input);     // safe variant of the async path
```

In v4, codec schemas also expose:

```ts
schema.decode(input);             // strongly-typed input; same runtime behavior as .parse
schema.encode(value);             // reverse direction (output → input)
schema.safeDecode(input);
schema.safeEncode(value);
schema.decodeAsync(input);
schema.encodeAsync(value);
```

Pick `parse` when an exception path is acceptable (e.g. server controllers with framework-level error handlers). Pick `safeParse` for code that must branch on success without exceptions (e.g. form handlers, RPC).

### When to use the async variants

If **any** node in the schema graph is async, you must use `parseAsync` / `safeParseAsync`:

- `.refine(async (val) => ...)` — async refinement
- `.transform(async (val) => ...)` — async transform
- `z.codec(..., { decode: async (...) => ..., encode: async (...) => ... })` — async codec

Calling sync `.parse()` on a schema with async checks throws `Synchronous parsing not supported`. The fix is the call site, not the schema.

## Reading `ZodError`

```ts
import * as z from "zod"; // v4

const schema = z.strictObject({
  username: z.string(),
  favoriteNumbers: z.array(z.number()),
});

const result = schema.safeParse({
  username: 1234,
  favoriteNumbers: [1234, "4567"],
  extraKey: 1234,
});

if (!result.success) {
  result.error.issues;
  // [
  //   { expected: "string", code: "invalid_type", path: ["username"],
  //     message: "Invalid input: expected string, received number" },
  //   { expected: "number", code: "invalid_type", path: ["favoriteNumbers", 1],
  //     message: "Invalid input: expected number, received string" },
  //   { code: "unrecognized_keys", keys: ["extraKey"], path: [],
  //     message: 'Unrecognized key: "extraKey"' },
  // ]
}
```

`result.error` is a `z.ZodError` (subclass of `z.core.$ZodError`). Each issue has at least `code`, `path`, and `message`; additional fields depend on the issue code (`expected`, `received`, `keys`, `minimum`, `maximum`, etc.).

> **`zod/mini` users**: parse errors are `z.core.$ZodError`, not `z.ZodError`. Adjust your `instanceof` checks.

## Formatting errors

### v4 — top-level functions

```ts
import * as z from "zod";

const result = schema.safeParse(input);
if (!result.success) {
  z.treeifyError(result.error);    // nested object mirroring schema shape
  z.flattenError(result.error);    // { formErrors, fieldErrors } — flat one-level shape
  z.prettifyError(result.error);   // human-readable string with bullets and paths
}
```

`z.treeifyError(result.error)` for the example above returns:

```ts
{
  errors: ["Unrecognized key: \"extraKey\""],
  properties: {
    username: { errors: ["Invalid input: expected string, received number"] },
    favoriteNumbers: {
      errors: [],
      items: [
        undefined,
        { errors: ["Invalid input: expected number, received string"] },
      ],
    },
  },
}
```

Access nested errors with optional chaining: `tree.properties?.username?.errors`.

`z.prettifyError(result.error)` returns:

```
✖ Unrecognized key: "extraKey"
✖ Invalid input: expected string, received number
  → at username
✖ Invalid input: expected number, received string
  → at favoriteNumbers[1]
```

`z.formatError(err)` still exists in v4 but is **deprecated** — prefer `z.treeifyError` (the shape changed slightly: `errors`/`properties`/`items` instead of v3's `_errors` underscore convention).

### v3 — instance methods

```ts
// v3
const result = schema.safeParse(input);
if (!result.success) {
  result.error.format();   // { _errors, [field]: { _errors } }
  result.error.flatten();  // { formErrors, fieldErrors }
}
```

The v3 `format()` shape uses `_errors` as the leaf array on every node:

```ts
{
  _errors: ["Unrecognized key: \"extraKey\""],
  username: { _errors: ["Invalid input: expected string, received number"] },
  favoriteNumbers: {
    _errors: [],
    "1": { _errors: ["Invalid input: expected number, received string"] },
  }
}
```

When porting v3 form-handling code to v4, the `_errors` → `errors`/`items` rename is the most common breakage. `flattenError` shape (`{ formErrors, fieldErrors }`) is unchanged.

## Customizing error messages

### v4 — unified `error` param

A single `error` option replaces v3's separate `message` and `errorMap`. It accepts a string or a function.

```ts
// static string
z.string({ error: "Bad!" });
z.string().min(5, { error: "Too short!" });
z.uuid({ error: "Bad UUID!" });
z.array(z.string(), { error: "Not an array!" });

// shorthand: positional string
z.string("Bad!");
z.string().min(5, "Too short!");

// function form (the v4 "error map")
z.string({ error: (iss) => iss.input === undefined ? "Required" : "Invalid" });

// inspect issue context
z.string().min(5, {
  error: (iss) => {
    iss.code;       // issue code
    iss.input;      // the input value
    iss.path;       // the path within the parent schema
    iss.minimum;    // available because we're on .min()
    iss.inclusive;
    return `Must be ≥ ${iss.minimum} chars`;
  },
});

// per-parse override
schema.parse(input, { error: (iss) => "Custom message" });

// global override
z.config({ customError: (iss) => iss.path.length === 0 ? "Top-level error" : undefined });
```

Returning `undefined` from the function falls through to the next map in Zod's precedence chain (schema-level → parse-level → global → default). Use this to selectively override only certain issue codes.

### v3 — separate `message` / `errorMap`

```ts
// v3
z.string({ required_error: "Required", invalid_type_error: "Bad!" });
z.string().min(5, { message: "Too short!" });

// v3 errorMap function
z.string({
  errorMap: (iss, ctx) => {
    if (iss.code === "invalid_type") return { message: "Bad!" };
    return { message: ctx.defaultError };
  },
});

// v3 per-parse
schema.parse(input, { errorMap });

// v3 global
z.setErrorMap(myErrorMap);
```

v3 → v4 cookbook:

| v3 | v4 |
| --- | --- |
| `z.string({ required_error, invalid_type_error })` | `z.string({ error: (iss) => iss.input === undefined ? "Required" : "Bad" })` |
| `z.string({ message: "..." })` | `z.string({ error: "..." })` |
| `z.string({ errorMap: fn })` | `z.string({ error: fn })` (signature simplified to one arg `iss`) |
| `z.setErrorMap(fn)` | `z.config({ customError: fn })` |
| `(iss, ctx) => ({ message: ctx.defaultError })` | `(iss) => undefined` (returning `undefined` defers to default) |

## Common failure modes

1. **`Synchronous parsing not supported`** — schema has async checks; switch caller from `parse` to `parseAsync`.
2. **`error.format` is not a function** — code on v4 still using v3 instance method; replace with `z.treeifyError(error)`.
3. **`z.formatError` is deprecated** — switch to `z.treeifyError`.
4. **`error instanceof z.ZodError === false`** in `zod/mini` — Mini parse errors are `z.core.$ZodError`. Use `error instanceof z.core.$ZodError` or import `ZodError` from the regular package.
5. **Custom message ignored** — passing v3 `{ message: ... }` shape to a v4 schema. Use `error: ...`.
6. **`required_error` / `invalid_type_error` not recognized** in v4 — replace with a function `error: (iss) => iss.input === undefined ? "Required" : "Bad"`.
7. **`ctx.defaultError` undefined in error map** — v4 error maps return `undefined` to defer; there is no `ctx.defaultError`.
8. **Strict object rejecting valid data with extra fields** — using `z.strictObject` (v4) or `.strict()` (v3). Switch to `.loose()` (v4) / `.passthrough()` (v3) or remove the strictness.

## Issue codes (high-level)

Both versions emit the same conceptual codes, with minor renames in v4. Common ones:

`invalid_type`, `unrecognized_keys`, `invalid_union`, `invalid_value` (v4) / `invalid_literal` (v3), `too_small`, `too_big`, `not_multiple_of`, `invalid_string` (v3), `custom`.

In v4, string format violations use `invalid_format` (e.g. failed `z.email`). In v3 they use `invalid_string` with a `validation` field.

<!--
Source references:
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/basics.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/error-formatting.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/error-customization.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/api.mdx
- https://github.com/colinhacks/zod/tree/v3.25.76/packages/docs/content
- https://github.com/colinhacks/zod/blob/v3.25.76/packages/docs/content/error-customization.mdx
-->
