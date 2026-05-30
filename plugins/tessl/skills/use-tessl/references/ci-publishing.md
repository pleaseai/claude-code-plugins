# CI Publishing & Review (GitHub Actions)

Two official Tessl actions wire the CLI into CI:

- [`tesslio/setup-tessl`](https://github.com/tesslio/setup-tessl) — installs and authenticates the Tessl
  CLI on the runner so subsequent steps can call `tessl …`. Works on Linux, macOS, and Alpine.
- [`tesslio/skill-review`](https://github.com/tesslio/skill-review) — a turnkey action that finds changed
  `SKILL.md` files in a PR, runs `tessl skill review`, and posts scores as PR comments.

## Authentication

Both rely on a Tessl API token stored as a repository/organization secret named `TESSL_TOKEN`. Create one
locally with `tessl api-key create` and add it under **Settings → Secrets and variables → Actions**.

## `setup-tessl` inputs

| Input | Description |
|-------|-------------|
| `token` | Tessl API token (e.g. `${{ secrets.TESSL_TOKEN }}`) — authenticates the CLI |
| `version` | Pin a specific CLI version (e.g. `"0.73.0"`); omit to use the latest |

## Publish a plugin on push

Publish to the registry whenever `main` advances. `id-token: write` enables OIDC trusted publishing.

```yaml
name: Publish
on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v6
      - uses: tesslio/setup-tessl@v2
        with:
          token: ${{ secrets.TESSL_TOKEN }}
      - run: tessl plugin publish
```

> The `setup-tessl` README's example still uses the legacy `tessl tile publish` (and `tessl tile lint`).
> `tile` is the old name for a plugin — prefer `tessl plugin publish` / `tessl plugin lint`. If you inherit
> a repo on the old surface, `tessl tile migrate` rewrites `tile.json` to `.tessl-plugin/plugin.json`.

Add a lint gate before publishing if you want CI to fail fast on a malformed plugin:

```yaml
      - run: tessl plugin lint
      - run: tessl plugin publish --bump patch
```

## Review skills on every PR

Run the review inline via `setup-tessl`:

```yaml
name: Review
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: tesslio/setup-tessl@v2
        with:
          token: ${{ secrets.TESSL_TOKEN }}
      - run: tessl skill review path/to/SKILL.md
```

Or use the dedicated `skill-review` action, which auto-detects changed `SKILL.md` files and comments on
the PR:

```yaml
name: Skill Review
on: pull_request

jobs:
  skill-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: tesslio/skill-review@v1
        with:
          token: ${{ secrets.TESSL_TOKEN }}
          path: .                # root to search for SKILL.md files (default ".")
          comment: true          # post review comments on the PR (default true)
          fail-threshold: 0      # minimum quality score 0–100; fail the check below it (default 0)
```

## Recommended pipeline

1. **PR** → `tesslio/skill-review` gates skill quality (set `fail-threshold` to enforce a bar).
2. **Merge to `main`** → publish-on-push workflow runs `tessl plugin lint` then
   `tessl plugin publish`, keeping the registry in sync with the default branch.

Always confirm the exact action versions (`@v2`, `@v1`) and the current CLI command surface against the
upstream READMEs and `tessl --help`, since both evolve.
