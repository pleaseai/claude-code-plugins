# semble

Semantic code search — find code by description or symbol name instead of grep, powered by the [Semble](https://github.com/MinishLab/semble) MCP server.

**Install:** `/plugin install semble@pleaseai`

## What it does

Semble finds code by **meaning**, not literal text. Describe what code does (or name a symbol) and it returns the most relevant chunks ranked by semantic similarity. The index is built and cached automatically on first use and refreshes when files change.

This plugin ships:

- An **MCP server** (`semble`) exposing two tools — `search` and `find_related`.
- A **skill** (`semble`) that activates automatically when you explore an unfamiliar codebase, search by intent, or ask how a feature works — driving the Semble MCP tools for you.

## Requirements

The MCP server runs via [`uv`](https://docs.astral.sh/uv/) (`uvx --from "semble[mcp]" semble`). Install `uv` if it is not already available:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

No API key is required.

## Usage

Once installed, just ask exploratory questions and the skill will use Semble automatically — for example "where is authentication handled?" or "find the code that retries failed requests".

The MCP tools:

- `search(query, repo, top_k)` — find relevant code by description or symbol. Pass the project root (or an explicit `https://` git URL) as `repo`.
- `find_related(file_path, line, repo, top_k)` — given a result location, find semantically similar code elsewhere.

### Content scope

By default the MCP server indexes only code files. To also index documentation, config, or everything, append `--content docs`, `--content config`, or `--content all` to the server command.

The plugin bundles the server in code-only mode. To run it with a wider scope, register it manually instead — for example, in Claude Code:

```sh
claude mcp add semble -s user -- uvx --from "semble[mcp]" semble --content all
```

## Links

- Repository: https://github.com/MinishLab/semble
- Installation docs: https://github.com/MinishLab/semble/blob/main/docs/installation.md
