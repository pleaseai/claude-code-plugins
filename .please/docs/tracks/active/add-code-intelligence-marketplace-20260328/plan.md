# Plan: Add code-intelligence Marketplace to Web App

> Track: add-code-intelligence-marketplace-20260328
> Spec: [spec.md](./spec.md)

## Architecture

Single-file change to `apps/web/server/marketplace-sources.json`. Add a new source entry for the `code-intelligence` marketplace alongside the existing `pleaseai` source.

## Tasks

### Phase 1: Add Marketplace Source

- [ ] T-1: Add `code-intelligence` entry to `apps/web/server/marketplace-sources.json`
  - name: `code-intelligence`
  - description: `LSP plugins for 30+ languages from PleaseAI Code Intelligence`
  - url: `https://raw.githubusercontent.com/pleaseai/code-intelligence/main/.claude-plugin/marketplace.json`
  - repo: `pleaseai/code-intelligence`
  - enabled: `true`
  - priority: `2`

## Progress

_(Updated as tasks are completed)_
