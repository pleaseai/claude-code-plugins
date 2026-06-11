# Built-in Plugins

Every row below was verified against `$(ask src better-auth)/packages/better-auth/src/plugins/` and each plugin's `index.ts` exports. Re-run this before trusting any import path for the version in use:

```bash
SRC=$(ask src better-auth)
ls "$SRC/packages/better-auth/src/plugins"
rg "^export (const|function) " "$SRC/packages/better-auth/src/plugins/*/index.ts"
```

Plugins live in the main `better-auth` package unless marked otherwise. Each server plugin is added to `betterAuth({ plugins: [...] })`; each matching client plugin is added to `createAuthClient({ plugins: [...] })` so the client SDK surfaces the new endpoints with types.

## Multi-tenant / teams

### `organization`

Server: `import { organization } from "better-auth/plugins/organization"`
Client: `import { organizationClient } from "better-auth/client/plugins"`

Adds orgs, members, roles, invitations, and team-scoped sessions. Ships a companion access-control module (`access` — see below) for defining role statements.

Use when the app has multiple tenants, workspaces, or teams. Skip for single-tenant apps with a flat user list.

## Authentication factors

### `two-factor`

Server: `import { twoFactor } from "better-auth/plugins/two-factor"`
Client: `import { twoFactorClient } from "better-auth/client/plugins"`

TOTP + backup codes + optional OTP. Adds `/two-factor/*` endpoints.

### `passkey` *(separate package `@better-auth/passkey`)*

Server: `import { passkey } from "@better-auth/passkey"`
Client: `import { passkeyClient } from "@better-auth/passkey/client"`

WebAuthn passkey registration and sign-in. Not in `better-auth/plugins/` — it ships as its own package. Confirm with `ls $(ask src better-auth)/packages/passkey`.

### `magic-link`

Server: `import { magicLink } from "better-auth/plugins/magic-link"`
Client: `import { magicLinkClient } from "better-auth/client/plugins"`

Passwordless email links. Requires providing `sendMagicLink({ email, url, token })` — mail delivery is owned by the caller.

### `email-otp`

Server: `import { emailOTP } from "better-auth/plugins/email-otp"`
Client: `import { emailOTPClient } from "better-auth/client/plugins"`

Email OTP for verification / sign-in / password reset. Requires a `sendVerificationOTP` callback.

### `phone-number`

Server: `import { phoneNumber } from "better-auth/plugins/phone-number"`
Client: `import { phoneNumberClient } from "better-auth/client/plugins"`

Phone + OTP sign-in. Requires a `sendOTP` callback — pair with Twilio, Vonage, etc.

### `siwe`

Server: `import { siwe } from "better-auth/plugins/siwe"`
Client: `import { siweClient } from "better-auth/client/plugins"`

Sign-In With Ethereum (EIP-4361). Needs `getNonce` / `verifyMessage` callbacks.

### `one-tap`

Server: `import { oneTap } from "better-auth/plugins/one-tap"`
Client: `import { oneTapClient } from "better-auth/client/plugins"`

Google One Tap sign-in.

### `anonymous`

Server: `import { anonymous } from "better-auth/plugins/anonymous"`
Client: `import { anonymousClient } from "better-auth/client/plugins"`

Creates throw-away users before sign-up; upgrades them to real accounts on credential linking.

### `username`

Server: `import { username } from "better-auth/plugins/username"`
Client: `import { usernameClient } from "better-auth/client/plugins"`

Adds username field + username-based sign-in alongside email.

## OAuth / OIDC

### `generic-oauth`

Server: `import { genericOAuth } from "better-auth/plugins/generic-oauth"`
Client: `import { genericOAuthClient } from "better-auth/client/plugins"`

Catch-all for OAuth 2 / OIDC providers not in `social-providers/`. Ships pre-built configs for Auth0, Slack, and more under `plugins/generic-oauth/providers/` — enumerate with `ls $(ask src better-auth)/packages/better-auth/src/plugins/generic-oauth/providers`.

### `oauth-proxy`

Server: `import { oAuthProxy } from "better-auth/plugins/oauth-proxy"`

Proxies OAuth callbacks through a stable production URL so preview deployments (Vercel previews, tunnels, etc.) can complete OAuth flows that require a fixed redirect URI. Reads `productionURL` or falls back to `BETTER_AUTH_URL`.

### `oidc-provider`

Server: `import { oidcProvider } from "better-auth/plugins/oidc-provider"`

Turns better-auth into an OIDC **provider** (the app hands out tokens to other apps). The inverse of social-providers.

## Sessions / tokens

### `jwt`

Server: `import { jwt } from "better-auth/plugins/jwt"`

Issues signed JWTs alongside the session cookie — useful when other services need to verify sessions without a round-trip.

### `bearer`

Server: `import { bearer } from "better-auth/plugins/bearer"`

Accepts `Authorization: Bearer <token>` in addition to cookies. Wire it up for API clients and mobile apps that can't carry cookies.

### `multi-session`

Server: `import { multiSession } from "better-auth/plugins/multi-session"`
Client: `import { multiSessionClient } from "better-auth/client/plugins"`

Lets a browser keep several concurrent sessions (switch between accounts without signing out).

### `custom-session`

Server: `import { customSession } from "better-auth/plugins/custom-session"`
Client: `import { customSessionClient } from "better-auth/client/plugins"`

Extend the shape returned by `useSession()` / `getSession()` — commonly used to embed the current `organization` on the session object.

### `one-time-token`

Server: `import { oneTimeToken } from "better-auth/plugins/one-time-token"`
Client: `import { oneTimeTokenClient } from "better-auth/client/plugins"`

Short-lived single-use tokens (e.g. for invite links or password-less device linking).

### `device-authorization`

Server: `import { deviceAuthorization } from "better-auth/plugins/device-authorization"`
Client: `import { deviceAuthorizationClient } from "better-auth/client/plugins"`

RFC 8628 device flow — pair a TV / CLI with a browser session.

### `last-login-method`

Server: `import { lastLoginMethod } from "better-auth/plugins/last-login-method"`
Client: `import { lastLoginMethodClient } from "better-auth/client/plugins"`

Remembers the last auth method per user and exposes it so the UI can highlight it on the sign-in form.

## Admin / governance

### `admin`

Server: `import { admin } from "better-auth/plugins/admin"`
Client: `import { adminClient } from "better-auth/client/plugins"`

Role-based user management: list, ban, impersonate, set role. Pair with `access` for fine-grained statements.

### `access`

`import { createAccessControl, role } from "better-auth/plugins/access"`

Not a plugin itself — the access-control primitive used by `organization` and `admin` to define role statements (resource × action).

### `additional-fields`

Client-only type helper: `import { inferAdditionalFields } from "better-auth/client/plugins"`

Propagates extra columns added to the user / session / account tables through the client SDK's types.

### `haveibeenpwned`

Server: `import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned"`

Rejects sign-ups / password changes when the password appears in the HIBP k-anonymity API.

### `captcha`

Server: `import { captcha } from "better-auth/plugins/captcha"`

Gates sensitive endpoints behind Turnstile / hCaptcha / reCAPTCHA / Arkose verification.

## Tooling

### `open-api`

Server: `import { openAPI } from "better-auth/plugins/open-api"`

Exposes an OpenAPI 3 schema for every mounted endpoint (including plugin endpoints) — useful for client-SDK codegen.

### `mcp`

Server: `import { mcp } from "better-auth/plugins/mcp"`

Model Context Protocol integration — lets an MCP client authenticate against better-auth. Ships MCP-specific adapters: `mcpAuthHono`, `mcpAuthOfficial`, `mcpAuthMcpUse`.

## Decision matrix

| User-visible need | Pick |
|-------------------|------|
| Teams, orgs, workspaces | `organization` (+ `customSession` to surface active org) |
| TOTP / backup codes | `two-factor` |
| Passkeys / WebAuthn | `@better-auth/passkey` |
| Email magic link | `magic-link` |
| Email or SMS OTP | `email-otp`, `phone-number` |
| Remember Ethereum wallet | `siwe` |
| Admin panel for user management | `admin` (+ `access`) |
| API clients / mobile (no cookies) | `bearer` |
| Preview deploys / tunnels break OAuth | `oauth-proxy` |
| App acts as IdP | `oidc-provider` |
| Other services need signed claims | `jwt` |
| User switches between accounts | `multi-session` |
| Pwned-password blocklist | `haveibeenpwned` |
| Bot protection on sensitive endpoints | `captcha` |
| Auto-generated SDK / docs | `open-api` |

## Schema impact

Most plugins add columns or tables. After enabling one, regenerate the schema:

```bash
npx auth generate    # prints schema diff / writes files
npx auth migrate     # applies (Kysely built-in only)
```

Forgetting this step is the top cause of `no such column` / `invalid input syntax` errors at runtime. See `references/common-errors.md` ("schema drift").
