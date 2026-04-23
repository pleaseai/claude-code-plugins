---
name: use-better-auth
description: 'Answer questions about better-auth and help build authentication features. Use when developers: (1) ask about better-auth APIs like `betterAuth`, `auth.api.*`, `authClient.*`; (2) wire up sign-in / sign-up / sessions; (3) integrate framework adapters (Next.js, Nuxt, SvelteKit, Hono, Astro, Bun, Express); (4) add plugins (organization, two-factor, magic-link, passkey, oauth-proxy); (5) configure DB adapters (Prisma, Drizzle, Kysely, Mongoose). Triggers on: "better-auth", "betterAuth", "authClient", "sign in flow", "auth session", "social login", "magic link", "passkey", "organization plugin".'
---

## Prerequisites

Before writing code, verify `better-auth` is in the project's lockfile (`bun.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or `package.json`). If not installed, install with the project's package manager:

```bash
bun add better-auth    # or: pnpm add better-auth / npm i better-auth / yarn add better-auth
```

Verify the `ask` CLI is available (`which ask`). It is the primary tool for reading the exact version installed in this project. If `ask` is not installed, fall back to `node_modules/better-auth/` and the official site `https://better-auth.com/docs`.

## Critical: Do Not Trust Internal Knowledge

Everything known about better-auth from training data is suspect. The library's public API, plugin surface, framework adapters, and DB-adapter shapes shift between minor versions. Ship code against the current source, not memory.

When working with better-auth:

1. Resolve the installed version against the local checkout with `ask`
2. Verify plugin names, adapter imports, and option shapes before generating code
3. Run typecheck after changes to surface silent breakage early
4. Never invent plugin names, adapter import paths, or function signatures — enumerate them first
5. Surface deprecations or conflicts to the user rather than silently picking one pattern

If documentation cannot be found to support an answer, state that explicitly.

## Finding Documentation

Resolve the source checkout once; reuse the path across reads:

```bash
SRC=$(ask src better-auth)           # checkout root
DOCS=$(ask docs better-auth | head -n1)  # candidate docs dir
```

### Read the README and docs content

```bash
cat "$DOCS/README.md"
ls "$SRC/docs/content/docs"
cat "$SRC/docs/content/docs/installation.mdx"
cat "$SRC/docs/content/docs/basic-usage.mdx"
```

### Enumerate plugins (authoritative list)

```bash
ls "$SRC/packages/better-auth/src/plugins"
```

### Enumerate framework integrations

```bash
ls "$SRC/packages/better-auth/src/integrations"
ls "$SRC/docs/content/docs/integrations"
```

Note: the source-level `integrations/` directory only contains helper functions (Next.js cookies, SvelteKit handler, Node handler, etc.). Most frameworks (Hono, Astro, Express, Nuxt) mount the generic `auth.handler` directly — check `references/adapters.md` for the per-framework pattern.

### Enumerate DB adapters

```bash
ls "$SRC/packages/better-auth/src/adapters"
ls "$SRC/packages" | grep adapter
```

### Enumerate social providers

```bash
ls "$SRC/packages/core/src/social-providers"
```

### Grep for exported API

```bash
rg "^export " "$SRC/packages/better-auth/src/index.ts"
rg "^export " "$SRC/packages/better-auth/src/client/index.ts"
rg "^export (const|function) createAuthClient" "$SRC/packages/better-auth/src/client/"
```

### Fallback when `ask` is unavailable

```bash
SRC=./node_modules/better-auth
ls $SRC/dist
rg "betterAuth\\(" $SRC/dist
```

Use the official site `https://better-auth.com/docs` only to cross-reference — it tracks `main`, not the installed version.

## Environment Variables

Two env vars are resolved inside `create-context.ts` and `utils/url.ts`:

- `BETTER_AUTH_SECRET` — required. At least 32 chars, high entropy. Generate with `openssl rand -base64 32` or `npx auth secret`. Also accepts `AUTH_SECRET`. For secret rotation without invalidating sessions, use `BETTER_AUTH_SECRETS` (plural, comma-separated).
- `BETTER_AUTH_URL` — base URL of the app (e.g. `http://localhost:3000`). Public variants honored on clients: `NEXT_PUBLIC_BETTER_AUTH_URL`, `PUBLIC_BETTER_AUTH_URL`, `NUXT_PUBLIC_BETTER_AUTH_URL`.

Missing or misconfigured values are the single most common source of runtime errors — see `references/common-errors.md`.

## Server Setup (Canonical Pattern)

Create `auth.ts` (project root, `lib/`, `utils/`, or a `src/`/`app/`/`server/`-nested equivalent) and export a named or default `auth`:

```ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: /* DB adapter or Kysely dialect — see references/databases.md */,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    // github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
  },
  plugins: [
    // see references/plugins.md
  ],
});
```

The default export `betterAuth` lives in `packages/better-auth/src/auth/full.ts` and ships the full Kysely runtime. For environments where Kysely is not desired, import from `better-auth/minimal` and pass a custom adapter (e.g. `drizzleAdapter`) via `database`.

## Client Setup (Canonical Pattern)

Pick the framework-specific import path. Each one re-exports `createAuthClient` from `packages/better-auth/src/client/<framework>/index.ts`:

```ts
import { createAuthClient } from "better-auth/react";   // React
import { createAuthClient } from "better-auth/vue";     // Vue / Nuxt
import { createAuthClient } from "better-auth/svelte";  // Svelte / SvelteKit
import { createAuthClient } from "better-auth/solid";   // Solid / Solid Start
import { createAuthClient } from "better-auth/client";  // vanilla (framework-agnostic)

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL, // or equivalent per framework
  plugins: [
    // mirror any server-side plugins that expose a client plugin
  ],
});
```

Export the methods the app actually uses (`signIn`, `signUp`, `signOut`, `useSession`) from the client module rather than re-importing the whole `authClient` in every component.

## Picking the Framework Adapter

| Framework | Import | Mount |
|-----------|--------|-------|
| Next.js App Router | `better-auth/next-js` | `toNextJsHandler(auth)` at `app/api/auth/[...all]/route.ts` |
| Next.js Pages Router | `better-auth/node` | `toNodeHandler(auth.handler)` + disable `bodyParser` |
| SvelteKit | `better-auth/svelte-kit` | `svelteKitHandler({ event, resolve, auth, building })` in `hooks.server.ts` |
| Solid Start | `better-auth/solid-start` | `toSolidStartHandler(auth)` |
| TanStack Start | `better-auth/tanstack-start` | Mount `auth.handler`; use `tanstackStartCookies` plugin |
| Nuxt / Nitro | (no source-level helper) | `auth.handler(toWebRequest(event))` in `server/api/auth/[...all].ts` |
| Hono | (no source-level helper) | `auth.handler(c.req.raw)` at `/api/auth/*` |
| Astro | (no source-level helper) | `auth.handler(ctx.request)` at `pages/api/auth/[...all].ts` |
| Express | `better-auth/node` | `app.all("/api/auth/*", toNodeHandler(auth))` |
| Bun | `better-auth/node` or native `Bun.serve` | Forward to `auth.handler` |

Full wiring, cookie handling, and CORS gotchas per framework: `references/adapters.md`.

## Picking Plugins

Server plugins live under `packages/better-auth/src/plugins/`. Enumerate them before writing imports. Common picks:

| Need | Plugin | Server import | Client import |
|------|--------|---------------|---------------|
| Multi-tenant / teams | `organization` | `better-auth/plugins/organization` | `better-auth/client/plugins` |
| 2FA (TOTP / OTP / backup codes) | `two-factor` | `better-auth/plugins/two-factor` | same |
| Passwordless magic link | `magic-link` | `better-auth/plugins/magic-link` | same |
| WebAuthn / Passkeys | `passkey` (shipped in `@better-auth/passkey`) | `@better-auth/passkey` | `@better-auth/passkey/client` |
| Dev-friendly OAuth over tunnels | `oauth-proxy` | `better-auth/plugins/oauth-proxy` | — |
| JWT session tokens | `jwt` | `better-auth/plugins/jwt` | — |
| OTP over email / SMS | `email-otp`, `phone-number` | `better-auth/plugins/email-otp` | same |
| Admin / user management UI | `admin` | `better-auth/plugins/admin` | same |

Full matrix with decision notes: `references/plugins.md`.

## Picking the DB Adapter

| Choice | Adapter | Import |
|--------|---------|--------|
| Prisma | `prismaAdapter(prisma, { provider })` | `better-auth/adapters/prisma` |
| Drizzle | `drizzleAdapter(db, { provider })` | `better-auth/adapters/drizzle` |
| Kysely | `kyselyAdapter(db, { type })` | `better-auth/adapters/kysely` |
| MongoDB | `mongodbAdapter(client)` | `better-auth/adapters/mongodb` |
| Memory (tests only) | `memoryAdapter(store)` | `better-auth/adapters/memory` |
| Built-in Kysely dialect | pass dialect directly via `database` | — |

After adding a plugin or changing the schema, regenerate:

```bash
npx auth generate     # dumps schema changes
npx auth migrate      # applies them (Kysely built-in only)
```

Full init snippets and the schema-extension pattern: `references/databases.md`.

## When Typecheck or Runtime Fails

Before searching source code, grep `references/common-errors.md` for the failing symptom (missing secret, redirect loop, CORS, session not persisted, schema drift, edge-runtime incompatibility). Most runtime failures fall into one of six known categories with a canonical fix.

If the symptom is not listed, resolve the source and grep the error string:

```bash
rg -n "error string fragment" "$SRC/packages/better-auth/src"
```

## References

- [`references/adapters.md`](references/adapters.md) — framework-by-framework wiring (Next.js, Nuxt, SvelteKit, Hono, Astro, Express, Bun, TanStack Start, Solid Start)
- [`references/plugins.md`](references/plugins.md) — every built-in plugin with when-to-use, server import, client import
- [`references/databases.md`](references/databases.md) — Prisma / Drizzle / Kysely / Mongo init, schema generation, model extension
- [`references/common-errors.md`](references/common-errors.md) — six concrete error → cause → fix entries
