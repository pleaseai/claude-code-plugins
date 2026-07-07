# openai-docs

Authoritative, current guidance from official OpenAI developer docs, model selection, and model/prompt migration — backed by the OpenAI Developer Docs MCP server (`https://developers.openai.com/mcp`).

**Install:** `/plugin install openai-docs@pleaseai`

## What's included

- **`openai-docs` skill** — activates on OpenAI docs questions, model-selection and "latest model" queries, and model/prompt upgrade requests. Prefers official OpenAI docs via MCP, with bundled fallback references.
- **`openaiDeveloperDocs` MCP server** — remote HTTP server exposing `search_openai_docs`, `fetch_openai_doc`, `list_openai_docs`, and `get_openapi_spec`.

## Notes

- The skill is adapted from OpenAI's `openai-docs` skill sample (Apache-2.0, see `skills/openai-docs/LICENSE.txt`). Codex-agent-specific content (the Codex manual helper and `codex mcp add` install steps) has been removed for Claude Code; the `openaiDeveloperDocs` MCP server is provided by this plugin, so no manual install is required.
