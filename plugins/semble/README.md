# semble

Semantic code search — find code by description or symbol name instead of grep, powered by the [Semble](https://github.com/MinishLab/semble) CLI.

**Install:** `/plugin install semble@pleaseai`

## What it does

Semble finds code by **meaning**, not literal text. Describe what code does (or name a symbol) and it returns the most relevant chunks ranked by semantic similarity. The index is built and cached automatically on first run and refreshes when files change.

This plugin ships a **skill** (`semble`) that activates automatically when you explore an unfamiliar codebase, search by intent, or ask how a feature works — driving the `semble` CLI for you.

## Requirements

Semble runs via [`uv`](https://docs.astral.sh/uv/) (`uvx`). Install `uv` if `semble` is not already on your `$PATH`:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

No API key is required.

## Usage

Once installed, just ask exploratory questions and the skill will use Semble automatically — for example "where is authentication handled?" or "find the code that retries failed requests".

By default Semble searches code. It can also search documentation (`docs`), config files (`config`), or everything (`all`).

### CLI

The same capabilities are available directly on the command line:

```sh
semble search "authentication flow" ./my-project
semble search "save model to disk" --content all
semble find-related src/auth.py 42 ./my-project
```

If `semble` is not on `$PATH`, use `uvx --from "semble[mcp]" semble` in its place.

## Links

- Repository: https://github.com/MinishLab/semble
- Installation docs: https://github.com/MinishLab/semble/blob/main/docs/installation.md
