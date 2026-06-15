# Graphify

Turn any folder of code, docs, papers, images, or videos into a navigable **knowledge graph** with community detection, an honest audit trail (EXTRACTED / INFERRED / AMBIGUOUS), and three outputs: interactive HTML, GraphRAG-ready JSON, and a plain-language `GRAPH_REPORT.md`.

This plugin bundles the official Graphify Claude skill, so Claude automatically treats questions about a codebase — its architecture, file relationships, or project content — as graph queries, and can build the graph on demand.

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install graphify@pleaseai
```

The skill installs the underlying `graphifyy` CLI on first use (via `uv tool install` or `pip`), so no manual setup is required. To install it yourself ahead of time:

```sh
uv tool install graphifyy   # recommended
# or: pipx install graphifyy
```

## Usage

Once installed, ask Claude natural-language questions about a project, or invoke the pipeline directly:

```
/graphify                      # build a graph for the current directory
/graphify ./docs --update      # re-extract only changed files
/graphify query "describe the auth flow"
/graphify path "UserService" "DatabasePool"
/graphify explain "SwinTransformer"
```

When `graphify-out/graph.json` already exists, plain questions like "How does X work?" are answered straight from the graph.

## Optional environment variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Use Gemini for semantic extraction instead of in-session subagents |
| `GRAPHIFY_GEMINI_MODEL` | Override the default Gemini model |
| `GRAPHIFY_MAX_WORKERS` | AST parallelism thread count |

## Links

- Source: https://github.com/safishamsi/graphify
- License: MIT
