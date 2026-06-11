# Common Errors

Six concrete failure modes that account for the majority of runtime problems. Each entry lists the symptom, the root cause (traced to the file it originates in), and the canonical fix.

When a symptom is not listed here, resolve the source and grep the error string:

```bash
rg -n "error string fragment" "$(ask src better-auth)/packages/better-auth/src"
```

---

## 1. Missing or weak `BETTER_AUTH_SECRET`

**Symptom** — one of:

- Warning at startup: `BETTER_AUTH_SECRET is missing. Set it in your environment or pass secret to betterAuth({ secret })`
- Warning: `You are using the default secret. Please set BETTER_AUTH_SECRET in your environment variables or pass secret in your auth config.`
- Warning: `your BETTER_AUTH_SECRET should be at least 32 characters long for adequate security`
- In production: all sessions invalidate on every restart.

**Cause** — `packages/better-auth/src/context/create-context.ts` falls back to a default secret when `options.secret || env.BETTER_AUTH_SECRET || env.AUTH_SECRET` is empty. The default changes between process lifetimes, which is why cookies signed before a restart fail to verify afterwards.

**Fix** — set a strong secret:

```bash
# .env
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

Or generate with the built-in CLI:

```bash
npx auth secret
```

For rotation without invalidating existing sessions, use the plural form:

```bash
BETTER_AUTH_SECRETS=new-secret,previous-secret,older-secret
```

---

## 2. Wrong `baseURL` — redirect loops, broken callbacks

**Symptom** — OAuth callback 404s, `Base URL could not be determined` warning, social sign-in redirects back to the sign-in page, or cookies are scoped to the wrong domain.

**Cause** — `packages/better-auth/src/utils/url.ts` resolves `baseURL` from (in order) `options.baseURL`, `env.BETTER_AUTH_URL`, `env.NEXT_PUBLIC_BETTER_AUTH_URL`, `env.PUBLIC_BETTER_AUTH_URL`, `env.NUXT_PUBLIC_BETTER_AUTH_URL`, then the incoming request headers. When none match the real origin (HTTPS vs HTTP, missing port, behind a proxy), callback URLs get generated with the wrong host.

**Fix** — set `BETTER_AUTH_URL` to the real origin per environment:

```bash
# .env.development
BETTER_AUTH_URL=http://localhost:3000

# .env.production
BETTER_AUTH_URL=https://app.example.com
```

Behind a reverse proxy, also add the proxied origins to `trustedOrigins`:

```ts
betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: ["https://app.example.com", "https://preview.example.com"],
});
```

For preview deployments (Vercel previews, tunnels) that can't have a stable public URL, use the `oauth-proxy` plugin to route the OAuth callback through a fixed production URL.

---

## 3. CORS / credentials — cookies never round-trip cross-origin

**Symptom** — `authClient.signIn.email(...)` returns a user but `authClient.useSession()` on the next page reports `null`. Request shows `200 OK` and a `Set-Cookie` header, but the browser does not store it. Only happens when the client and server are on different origins (e.g. `localhost:5173` calling `localhost:3000`).

**Cause** — a cross-origin response with `Access-Control-Allow-Origin: *` cannot set cookies, and a client fetch without `credentials: "include"` never sends them.

**Fix** — three things must line up:

1. Server CORS allows the specific origin and sets `Access-Control-Allow-Credentials: true`.
   ```ts
   // Hono example
   app.use("/api/auth/*", cors({
     origin: "http://localhost:5173",  // NOT "*"
     credentials: true,
     allowMethods: ["GET", "POST", "OPTIONS"],
     allowHeaders: ["Content-Type", "Authorization"],
   }));
   ```
2. The client sends credentials — `createAuthClient` does this by default, but custom `fetchOptions` must preserve `credentials: "include"`.
3. Cookies have the right `sameSite`. Same-site can rely on `"lax"`; cross-site requires `"none"` + `secure: true`.
   ```ts
   betterAuth({
     advanced: {
       defaultCookieAttributes: { sameSite: "none", secure: true, partitioned: true },
     },
   });
   ```

---

## 4. Session cookie not set in production (sameSite / secure mismatch)

**Symptom** — local development works, production sign-in succeeds but the session cookie is missing from the browser. DevTools shows `Set-Cookie` was blocked with reason `secure`, `samesite`, or `this set-cookie was blocked because it had the "secure" attribute but was not received over a secure connection`.

**Cause** — browsers silently drop cookies that have `secure: true` on HTTP origins, or `sameSite: "none"` without `secure: true`. When the production app sits behind a proxy that terminates TLS but forwards HTTP, the server sees HTTP and emits inconsistent cookie flags.

**Fix** —

- Ensure the production origin really is HTTPS end-to-end, or that `trustProxy` / forwarded headers are honored.
- Set consistent cookie attributes:
  ```ts
  betterAuth({
    advanced: {
      defaultCookieAttributes: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",            // same-site apps
        httpOnly: true,
      },
    },
  });
  ```
- For cross-subdomain sessions (`app.example.com` + `api.example.com`), pin the cookie domain: `defaultCookieAttributes.domain: ".example.com"`.

---

## 5. Schema drift — runtime errors after enabling a plugin

**Symptom** — SQL errors like `column "two_factor_enabled" does not exist`, `no such table: organization`, `P2022: The column ... does not exist in the current database`, or a silent 500 on `/get-session` after adding a plugin.

**Cause** — plugins frequently add columns or whole tables (`organization`, `two-factor`, `passkey`, `username`, `phone-number`, `email-otp`, `admin`). Without regenerating the schema, the DB is missing the columns the plugin reads.

**Fix** — regenerate after every plugin change:

```bash
npx auth generate    # updates schema snippets for the configured adapter
npx auth migrate     # applies (built-in Kysely only)
```

With Prisma:

```bash
npx auth generate
npx prisma migrate dev
```

With Drizzle:

```bash
npx auth generate
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Mongo needs no migration, but the `admin` / `organization` plugins still expect new collections — writes create them lazily, reads before the first write return `null`.

---

## 6. Edge-runtime incompatibility

**Symptom** — dev server works, but `vercel build` or `wrangler deploy` fails with `Module not found: Can't resolve 'pg-native'`, `crypto.randomUUID is not a function`, `unsupported module 'fs'`, or the app deploys but `/api/auth/*` 500s with `Cannot find module`.

**Cause** — the default Kysely dialect loads Node-native drivers (`pg`, `mysql2`, `better-sqlite3`, `node:crypto` in some paths) that aren't available in V8 / Workers / edge runtimes. Also, `betterAuth` from `better-auth` (the full build) ships Kysely — the minimal build skips it.

**Fix** —

- Use the minimal build plus an edge-safe adapter:
  ```ts
  import { betterAuth } from "better-auth/minimal";
  import { drizzleAdapter } from "better-auth/adapters/drizzle";
  import { drizzle } from "drizzle-orm/libsql";  // or d1, planetscale-serverless, neon-http
  ```
- Confirm every adapter / DB driver advertises edge support. `pg` does not — use `@neondatabase/serverless` or `postgres` (postgres.js) with HTTP transport instead.
- Move the auth handler out of the edge runtime when a Node-only driver is unavoidable:
  ```ts
  export const runtime = "nodejs"; // Next.js route handler
  ```
- When crypto APIs diverge (Node vs V8), audit `packages/better-auth/src/crypto/` for the helpers used and confirm they fall back to `globalThis.crypto.subtle`.

---

## Escalation

If a failure does not match any entry above:

```bash
SRC=$(ask src better-auth)

# Search for the error message
rg -n "exact error string" "$SRC/packages"

# Check create-context.ts for startup validations
rg -n "throw|logger.(warn|error)" "$SRC/packages/better-auth/src/context/create-context.ts"

# Check error-codes files for the stable error code emitted by the API
rg -rn "error-codes.ts" "$SRC/packages/better-auth/src/plugins"
```

Every plugin ships an `error-codes.ts` file — grep those to map an API response's `error.code` to the originating plugin.
