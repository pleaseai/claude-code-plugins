# Add code-intelligence Marketplace to Web App

> Track: add-code-intelligence-marketplace-20260328

## Overview

Add the `pleaseai/code-intelligence` marketplace as a source in the web app (`apps/web/server/marketplace-sources.json`). This marketplace provides LSP (Language Server Protocol) plugins for 30+ languages including TypeScript, Python, Rust, Go, Vue, and more.

## Scope

- Add a new entry to `apps/web/server/marketplace-sources.json` for `code-intelligence`
- The marketplace URL: `https://raw.githubusercontent.com/pleaseai/code-intelligence/main/.claude-plugin/marketplace.json`
- Repo: `pleaseai/code-intelligence`

## Success Criteria

- [ ] SC-1: `marketplace-sources.json` contains the `code-intelligence` source entry
- [ ] SC-2: Web app fetches and displays code-intelligence plugins alongside existing pleaseai plugins
- [ ] SC-3: No schema validation errors from the marketplace Zod schema

## Constraints

- Must follow the existing `MarketplaceSource` interface
- Priority should be set appropriately (after pleaseai which is priority 1)

## Out of Scope

- Modifying `.claude/settings.json` extraKnownMarketplaces
- Enabling specific LSP plugins by default
