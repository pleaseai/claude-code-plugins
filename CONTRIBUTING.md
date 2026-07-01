# Contributing

Thanks for your interest in contributing! This guide covers how to get from a clone to a merged pull request.

By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). All documentation, code, comments, and commit messages in this repository are written in **English**.

## Getting started

This repository uses [bun](https://bun.sh) as its package manager, pins Node via `.nvmrc` (v22), and vendors all plugins as git submodules.

```bash
git clone https://github.com/pleaseai/claude-code-plugins.git
cd claude-code-plugins
git submodule update --init --recursive   # fetch plugin submodules
bun install                               # install dependencies
```

Make sure your Node version matches `.nvmrc` (e.g. via `nvm use`).

## Development workflow

1. Create a branch from `main` (e.g. `feat/short-description` or `fix/issue-123`).
2. Make focused changes — keep each pull request to one logical change.
3. Run the checks below and make sure they pass.
4. Open a pull request and fill out the template.

```bash
bun run lint        # lint and format
bun run test        # run the test suite
bun run build       # ensure it builds
```

When you add, remove, or modify a plugin entry in `.claude-plugin/marketplace.json`,
regenerate the Codex/Cursor/Antigravity artifacts in the same change:

```bash
bun scripts/cli.ts multi-format
```

See [CLAUDE.md](./CLAUDE.md) for the full plugin development guide.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, where `type` is one of `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, etc. Breaking changes include a `BREAKING CHANGE:` footer. Versioning and the changelog are generated automatically from these messages, so accurate types matter.

## Pull requests

- Reference the issue your PR addresses (e.g. `Closes #123`).
- Use a Conventional-Commit-style PR title — it becomes the squash-merge commit.
- Make sure CI is green before requesting review.

## Reporting bugs and requesting features

Open an issue using the bug report or feature request template. For security
vulnerabilities, **do not** open a public issue — follow [SECURITY.md](./SECURITY.md).
