# Framework Adapters

Per-framework wiring for mounting `auth.handler` and instantiating the matching client. Verify every import path against `$(ask src better-auth)/packages/better-auth/src/integrations/` and `$(ask src better-auth)/docs/content/docs/integrations/` before pasting — exports are renamed between minor releases.

Source-level helpers (shipped in `packages/better-auth/src/integrations/`):

```
next-js.ts   node.ts   solid-start.ts   svelte-kit.ts
tanstack-start.ts   tanstack-start-solid.ts
```

All other frameworks (Nuxt, Hono, Astro, Fastify, Elysia, Express, Bun) mount the generic `auth.handler` directly — no source-level helper is required.

---

## Next.js — App Router

File: `app/api/auth/[...all]/route.ts`

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

Enable the cookie bridge so server components read fresh session data:

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  plugins: [nextCookies()], // must be LAST in the plugin array
});
```

Client:

```ts
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
```

## Next.js — Pages Router

File: `pages/api/auth/[...all].ts`

```ts
import { toNodeHandler } from "better-auth/node";
import { auth } from "@/lib/auth";

export const config = { api: { bodyParser: false } };

export default toNodeHandler(auth.handler);
```

`bodyParser: false` is required — Next.js's default JSON parser will swallow the auth request body.

---

## Nuxt

File: `server/api/auth/[...all].ts`

```ts
import { auth } from "~~/lib/auth";

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
```

Client (Nuxt uses the Vue client):

```ts
// lib/auth-client.ts
import { createAuthClient } from "better-auth/vue";

export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
```

Call `authClient.useSession(useFetch)` from inside a page `setup()` — passing `useFetch` is what forwards cookies server-side during SSR.

---

## SvelteKit

File: `src/hooks.server.ts`

```ts
import { auth } from "$lib/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";

export async function handle({ event, resolve }) {
  return svelteKitHandler({ event, resolve, auth, building });
}
```

`svelteKitHandler` does **not** populate `event.locals.session` on its own. To expose the session inside `+layout.server.ts` / actions / endpoints, fetch it in `handle`:

```ts
const session = await auth.api.getSession({ headers: event.request.headers });
if (session) {
  event.locals.session = session.session;
  event.locals.user = session.user;
}
```

Enable the cookie plugin so form actions / server endpoints persist cookies:

```ts
import { sveltekitCookies } from "better-auth/svelte-kit";
betterAuth({ plugins: [sveltekitCookies()] });
```

Client:

```ts
import { createAuthClient } from "better-auth/svelte";
export const authClient = createAuthClient();
```

---

## TanStack Start

File: `src/routes/api/auth/$.ts`

```ts
import { auth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET:  async ({ request }: { request: Request }) => auth.handler(request),
      POST: async ({ request }: { request: Request }) => auth.handler(request),
    },
  },
});
```

Add the cookie plugin (must be the **last** plugin):

```ts
// React variant
import { tanstackStartCookies } from "better-auth/tanstack-start";
// Solid variant
import { tanstackStartCookies } from "better-auth/tanstack-start-solid";

betterAuth({ plugins: [tanstackStartCookies()] });
```

Prefer the `authClient` for sign-in flows over calling `auth.api.*` from server functions — the client handles cookie propagation via the plugin.

---

## Solid Start

File: `src/routes/api/auth/[...auth].ts`

```ts
import { auth } from "~/lib/auth";
import { toSolidStartHandler } from "better-auth/solid-start";

export const { GET, POST } = toSolidStartHandler(auth);
```

Client:

```ts
import { createAuthClient } from "better-auth/solid";
export const authClient = createAuthClient();
```

---

## Hono

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";

const app = new Hono();

app.use(
  "/api/auth/*",
  cors({
    origin: "http://localhost:3001",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true, // required so cookies survive cross-origin
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

Without `credentials: true` on CORS **and** `credentials: "include"` on the client fetch, the session cookie will not round-trip.

---

## Astro

File: `src/pages/api/auth/[...all].ts`

```ts
import type { APIRoute } from "astro";
import { auth } from "~/auth";

export const ALL: APIRoute = async (ctx) => {
  // For rate-limiting: ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
  return auth.handler(ctx.request);
};
```

Client: pick the import that matches the island framework — `better-auth/react`, `better-auth/vue`, `better-auth/svelte`, `better-auth/solid`, or `better-auth/client` for vanilla.

---

## Express

```ts
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const app = express();

// Express 4:
app.all("/api/auth/*", toNodeHandler(auth));
// Express 5:
// app.all("/api/auth/*splat", toNodeHandler(auth));

// Mount express.json() AFTER auth — never before, or the client will hang on "pending".
app.use(express.json());
```

CommonJS is not supported — set `"type": "module"` in `package.json`, or use a tsconfig `"module"` setting that emits ESM.

---

## Bun

```ts
import { auth } from "./auth";

Bun.serve({
  port: 3000,
  fetch: (req) => {
    if (new URL(req.url).pathname.startsWith("/api/auth")) return auth.handler(req);
    return new Response("OK");
  },
});
```

Bun's fetch signature matches the Web `Request` / `Response` shape `auth.handler` expects — no adapter needed.

---

## Nitro (standalone)

Nitro uses the same pattern as Nuxt:

```ts
// routes/api/auth/[...all].ts
import { auth } from "~/lib/auth";

export default defineEventHandler((event) => auth.handler(toWebRequest(event)));
```

---

## CORS & cookie invariants (every framework)

- Server response `Access-Control-Allow-Origin` must be the specific origin — not `*` — when `credentials: "include"` is used client-side.
- Set cookies with `sameSite: "lax"` (or `"none"` + `secure: true` for cross-site) via `advanced.defaultCookieAttributes` in `betterAuth({})`.
- Behind a reverse proxy, trust the forwarded host headers so callback URLs resolve correctly (`trustedOrigins` option).

See `references/common-errors.md` for concrete cookie/CORS misconfig symptoms.
