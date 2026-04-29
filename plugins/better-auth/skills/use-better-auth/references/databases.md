# Database Adapters

Verified against `$(ask src better-auth)/packages/better-auth/src/adapters/` and `$(ask src better-auth)/docs/content/docs/adapters/`. Confirm the current list before writing imports:

```bash
SRC=$(ask src better-auth)
ls "$SRC/packages/better-auth/src/adapters"      # drizzle-adapter, kysely-adapter, memory-adapter, mongodb-adapter, prisma-adapter
ls "$SRC/packages" | grep adapter                 # authoritative package list
```

Two routes are supported:

1. **Built-in Kysely dialect** — pass a raw database pool / driver directly via `database:`. Only for SQLite / Postgres / MySQL / MSSQL. No external package required. Migrations run with `npx auth migrate`.
2. **External ORM adapter** — wrap an ORM instance (Prisma / Drizzle / Mongo) in the matching `Adapter` function. Migrations are owned by the ORM; better-auth only generates the schema snippet.

## Option 1 — Built-in Kysely (zero-ORM)

### Postgres

```ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
});
```

### MySQL / MSSQL

Follow the same pattern with `mysql2/promise` or `tedious`. See `docs/content/docs/adapters/{mysql,mssql}.mdx` for the exact dialect import.

### SQLite

```ts
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("database.sqlite"),
});
```

Also supports `libsql`, `node:sqlite` (Node 22+ native), and `bun:sqlite` — see the SQLite adapter doc for the dialect shim per driver.

Apply migrations after config changes:

```bash
npx auth migrate
```

## Option 2 — Prisma

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }), // "postgresql" | "mysql" | "mongodb" | ...
});
```

**Prisma 7 caveat**: if `schema.prisma` sets a custom `output` path, import `PrismaClient` from that path, not `@prisma/client`. The adapter cannot introspect a mis-aimed client.

### Schema flow

Prisma owns migrations. Better-auth generates the schema snippet:

```bash
npx auth generate       # writes / updates prisma schema fragments
npx prisma migrate dev  # prisma owns the actual migration
```

## Option 3 — Drizzle

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./database";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }), // "pg" | "mysql" | "sqlite"
});
```

Provider values are `pg` / `mysql` / `sqlite` — different from Prisma's `postgresql`. The generator remaps automatically; match whichever value appears in the Drizzle config.

### Schema flow

```bash
npx auth generate                # writes / updates drizzle schema files
pnpm drizzle-kit generate        # drizzle owns the migration step
pnpm drizzle-kit migrate
```

## Option 4 — Kysely

```ts
import { kyselyAdapter } from "better-auth/adapters/kysely";

export const auth = betterAuth({
  database: kyselyAdapter(db, { type: "postgres" }),
});
```

Useful when an existing Kysely instance is already shared across the app. Otherwise the built-in Kysely dialect in Option 1 is simpler.

## Option 5 — MongoDB

```ts
import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const client = new MongoClient("mongodb://localhost:27017/app");
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }), // client is optional but required for transactions
});
```

MongoDB does not have a migration step — collections are created lazily. Since v1.4.0, the adapter supports joins via `experimental.joins: true`, which speeds up `/get-session` and `/get-full-organization` by 2–3×.

## Option 6 — Memory (tests only)

```ts
import { memoryAdapter } from "better-auth/adapters/memory";

const store = {};
export const auth = betterAuth({ database: memoryAdapter(store) });
```

Never for production — the store is process-local and cleared on restart. Useful as a Vitest fixture.

## Schema generation cheatsheet

```bash
npx auth generate       # diff / write schema for configured adapter
npx auth migrate        # apply (built-in Kysely only)
```

Every time a plugin is added or removed, rerun `generate`. Common symptoms of skipping this step: `column "twoFactorEnabled" does not exist`, `no such table: organization`, `P2022: The column ... does not exist` — see `references/common-errors.md`.

## Extending the user / session / account models

Add columns through the `user` / `session` / `account` options on `betterAuth({...})`:

```ts
betterAuth({
  user: {
    additionalFields: {
      displayName: { type: "string", required: false },
      role: { type: "string", defaultValue: "member" },
    },
  },
});
```

Propagate the extra fields to the client SDK's types with the `inferAdditionalFields` helper:

```ts
// auth-client.ts
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
```

Without `inferAdditionalFields`, `authClient.useSession()` will type the user as the built-in shape and the extra columns will be silently dropped from intellisense.

## Picking between built-in Kysely and an ORM adapter

| Situation | Pick |
|-----------|------|
| Greenfield app, no ORM yet | Built-in Kysely (simplest) |
| App already uses Prisma | `prismaAdapter` |
| App already uses Drizzle | `drizzleAdapter` |
| App uses Mongo | `mongodbAdapter` |
| Cloudflare / edge runtime | Drizzle + `better-sqlite3` replacement (e.g. `libsql`, `d1`) — Kysely built-in `pg`/`mysql2` are Node-only |
| High-volume reads on sessions / orgs | Mongo with `experimental.joins` or SQL with proper indexes |

Edge-runtime compatibility is the most common source of silent failures. See `references/common-errors.md` ("edge runtime").
