# Zod Schemas Cookbook

Purpose: copy-pasteable patterns for the most common schema shapes, each tagged with the version it applies to. Verify the chosen import path matches `node_modules/zod/package.json`.

Every example assumes:

```ts
import * as z from "zod"; // v4
// or: import { z } from "zod"; // v3
```

## Primitives & coercion

```ts
// both
z.string();
z.number();
z.bigint();
z.boolean();
z.date();

// coercion (both, identical API in v3 and v4)
z.coerce.string();    // String(input)
z.coerce.number();    // Number(input)
z.coerce.boolean();   // Boolean(input) — note: any truthy value → true (incl. "false")
z.coerce.date();      // new Date(input)
```

When parsing form data or query params, prefer `z.coerce.*` over manual `.transform`. The coerced input type is `unknown`; pin it explicitly when needed:

```ts
const Age = z.coerce.number<number>(); // input: number, output: number
```

## Strings, formats & checks

```ts
// v4 — methods
z.string().min(5).max(20).regex(/^[a-z]+$/);
z.email();
z.uuid();
z.url();
z.iso.datetime();
z.iso.date();

// v4 Mini — functions via .check()
z.string().check(z.minLength(5), z.maxLength(20), z.regex(/^[a-z]+$/));

// v3 — same as regular v4 but z.email() etc. live as methods on z.string()
z.string().email().min(5);
```

The `z.email()` / `z.uuid()` / `z.url()` top-level builders are v4. In v3, write `z.string().email()`.

## Object schemas

```ts
// both
const User = z.object({
  id: z.string().uuid(),         // v4: z.uuid()
  name: z.string().min(1),
  email: z.string().email(),     // v4: z.email()
  age: z.number().int().nonnegative().optional(),
});

type User = z.infer<typeof User>;
```

### Strict, loose, catchall

```ts
// v4
z.strictObject({ id: z.string() });   // throws on unknown keys
z.looseObject({ id: z.string() });    // preserves unknown keys
z.object({ id: z.string() }).catchall(z.string()); // unknown values must satisfy z.string()

// v3
z.object({ id: z.string() }).strict();
z.object({ id: z.string() }).passthrough();
z.object({ id: z.string() }).catchall(z.string());
```

### Pick, omit, partial, required, extend

```ts
// both
const User = z.object({ id: z.string(), name: z.string(), email: z.string() });

User.pick({ id: true, name: true });
User.omit({ email: true });
User.partial();                              // all fields optional
User.partial({ email: true });               // only email optional
User.required();                             // all fields required (drops .optional())

// v4: .extend() works the same, but the underlying generics were redesigned
// to avoid tsc instantiation explosions on chained .extend().omit() chains
const Admin = User.extend({ role: z.literal("admin") });

// alternative: spread syntax (clearer about strictness)
const Admin2 = z.object({ ...User.shape, role: z.literal("admin") });
```

### Optional vs nullable vs nullish

```ts
z.string().optional()   // T | undefined
z.string().nullable()   // T | null
z.string().nullish()    // T | null | undefined
z.string().default("")  // input: T | undefined, output: T

// v4 also has
z.string().nonoptional()
```

## Arrays, tuples, records

```ts
// arrays — both
z.array(z.string());
z.string().array();
z.array(z.string()).min(1).max(10).nonempty();

// tuples — both
z.tuple([z.string(), z.number()]);
z.tuple([z.string()]).rest(z.boolean()); // [string, ...boolean[]]

// records — both
z.record(z.string(), z.number()); // { [k: string]: number }

// v4 only
z.partialRecord(z.string(), z.number()); // values may be undefined
z.looseRecord(z.string(), z.number());   // tolerant of extra keys
```

## Unions & discriminated unions

```ts
// regular union — checks each option in order (slow for many options)
z.union([z.string(), z.number()]);
z.string().or(z.number()); // shorthand

// discriminated union — picks the right option via a literal field
const Result = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  z.object({ status: z.literal("failed"), error: z.string() }),
]);

// v4 supports nesting: an inner discriminatedUnion can itself be an option
const Errors = z.discriminatedUnion("code", [
  z.object({ status: z.literal("failed"), code: z.literal(400), msg: z.string() }),
  z.object({ status: z.literal("failed"), code: z.literal(500), msg: z.string() }),
]);
const Outer = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.string() }),
  Errors,
]);
```

Discriminator must be a literal-bearing key (`z.literal`, `z.enum`, `z.null`, `z.undefined`). Never use `z.string()` as the discriminator.

## Recursive schemas

> **The recursive pattern changed between v3 and v4.** v4 uses **getters**; v3 uses `z.lazy` with an explicit annotation.

### v4 — getter-based

```ts
// v4
const Category = z.object({
  name: z.string(),
  get subcategories() {
    return z.array(Category);
  },
});

type Category = z.infer<typeof Category>;
// { name: string; subcategories: Category[] }
```

If TypeScript reports `'subcategories' implicitly has return type 'any'`, add an explicit return annotation:

```ts
const Activity = z.object({
  name: z.string(),
  get subactivities(): z.ZodNullable<z.ZodArray<typeof Activity>> {
    return z.nullable(z.array(Activity));
  },
});
```

Mutually recursive types are supported the same way:

```ts
const User = z.object({
  email: z.email(),
  get posts() { return z.array(Post); },
});
const Post = z.object({
  title: z.string(),
  get author() { return User; },
});
```

### v3 — `z.lazy` with annotation

```ts
// v3
type Category = { name: string; subcategories: Category[] };

const Category: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(Category),
  }),
);
```

The `z.ZodType<Category>` annotation is required in v3 to break the recursion in TypeScript's inference.

> Passing cyclical data (an object that references itself) into a recursive schema causes an infinite loop in **both** versions. Cycle-detect upstream of `parse()`.

## Refinements & transforms

### Simple refinement (both)

```ts
z.string().refine((val) => val.includes("@"), "Must contain @");
z.string().refine((val) => val.includes("@"), {
  message: "Must contain @",
  path: ["email"],
});
```

### Multi-issue refinement

```ts
// v4 — preferred: .check()
const UniqueStringArray = z.array(z.string()).check((ctx) => {
  if (ctx.value.length > 3) {
    ctx.issues.push({
      code: "too_big",
      maximum: 3,
      origin: "array",
      inclusive: true,
      message: "Too many items",
      input: ctx.value,
    });
  }
  if (ctx.value.length !== new Set(ctx.value).size) {
    ctx.issues.push({
      code: "custom",
      message: "No duplicates allowed",
      input: ctx.value,
    });
  }
});

// v3 — .superRefine() (also still works in v4 but is deprecated)
const UniqueStringArrayV3 = z.array(z.string()).superRefine((val, ctx) => {
  if (val.length !== new Set(val).size) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "No duplicates" });
  }
});
```

### Async refinement

Any async refinement forces async parsing. The schema's `parse` will throw `Synchronous parsing not supported`; switch to `parseAsync` / `safeParseAsync`.

```ts
// both
const Username = z.string().refine(
  async (val) => !(await usernameTaken(val)),
  "Username already taken",
);

await Username.parseAsync("alice");
```

### Transforms

```ts
// both — input ≠ output
const Length = z.string().transform((val) => val.length);
type Input = z.input<typeof Length>;   // string
type Output = z.output<typeof Length>; // number
```

### `.overwrite()` (v4 only)

`.transform` changes the inferred output type. `.overwrite` preserves the type — use it when you want to normalize a value without a type change:

```ts
// v4
const TrimmedString = z.string().overwrite((val) => val.trim());
type T = z.infer<typeof TrimmedString>; // string (unchanged)
```

## Codecs (v4.1+)

Bidirectional transformation between two schemas. Useful at network boundaries (e.g. ISO date string ↔ `Date` object).

```ts
// v4.1+
const stringToDate = z.codec(
  z.iso.datetime(),
  z.date(),
  {
    decode: (isoString) => new Date(isoString),
    encode: (date) => date.toISOString(),
  },
);

stringToDate.decode("2024-01-15T10:30:00.000Z"); // => Date
stringToDate.encode(new Date());                 // => string
stringToDate.parse("2024-01-15T10:30:00.000Z");  // identical to .decode at runtime; types differ
```

`.parse` accepts `unknown`; `.decode` and `.encode` are strongly typed at the input end. Codecs do not exist in v3 — do not suggest them on a v3 install.

## Type inference patterns

```ts
const User = z.object({ id: z.string(), age: z.coerce.number() });

type User = z.infer<typeof User>;        // { id: string; age: number }
type UserIn = z.input<typeof User>;      // { id: string; age: unknown }
type UserOut = z.output<typeof User>;    // same as z.infer

// brand a primitive into a nominal type
const UserId = z.string().uuid().brand<"UserId">();
type UserId = z.infer<typeof UserId>;    // string & { [BRAND]: "UserId" }
```

## What to avoid

- `z.lazy(() => ...)` in v4 — use a getter instead. `z.lazy` still exists for non-object recursion but the getter pattern is the canonical solution.
- `.superRefine()` in v4 — deprecated; use `.check()`.
- `z.string({ message, errorMap })` separate options — use unified `error` (v4) or stick with v3 syntax.
- `err.format()` on v4 — use `z.treeifyError(err)`.
- Mixing `zod` and `zod/mini` schemas in the same parse path — pick one.

<!--
Source references:
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/api.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/codecs.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/basics.mdx
- https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/packages/mini.mdx
- https://github.com/colinhacks/zod/tree/v3.25.76/packages/docs/content
-->
