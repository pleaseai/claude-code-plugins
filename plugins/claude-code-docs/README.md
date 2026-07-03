# claude-code-docs

Fetch Claude Code docs as markdown. A `PreToolUse` hook rewrites `code.claude.com/docs` page URLs to their `.md` source before WebFetch runs, so Claude reads the clean markdown twin instead of the HTML app shell.

**Install:** `/plugin install claude-code-docs@pleaseai`

## What it does

Every Claude Code docs page serves a markdown twin at `<page>.md`:

| WebFetch input | Rewritten to |
|---|---|
| `https://code.claude.com/docs/en/agents` | `https://code.claude.com/docs/en/agents.md` |
| `https://code.claude.com/docs/en/hooks#pretooluse-decision-control` | `https://code.claude.com/docs/en/hooks.md` |
| `https://code.claude.com/docs/en/agent-sdk/python?x=1` | `https://code.claude.com/docs/en/agent-sdk/python.md` |

Left untouched: URLs already ending in a file extension (`.md`, `llms.txt`, images), the docs root (`/docs`, `/docs/en`), and everything outside `code.claude.com/docs`.

The hook returns [`updatedInput` with `permissionDecision: "allow"`](https://code.claude.com/docs/en/hooks#pretooluse-decision-control), so the rewritten fetch runs without an extra prompt. Fragments and query strings are dropped — the `.md` file always contains the whole page.

## Related

- [pleaseai/claude-code-docs](https://github.com/pleaseai/claude-code-docs) — git mirror of the same docs (`llms.txt` manifest + per-page markdown), synced every 6 hours, usable offline via [ASK](https://github.com/pleaseai/ask).

## Development

```bash
bash hooks/rewrite-docs-url.test.sh
```
