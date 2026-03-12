# ast-grep Plugin

Guide for writing ast-grep rules to perform structural code search and analysis.

## Simple Prompting in CLAUDE.md

For everyday development, you can instruct your AI agent to use ast-grep for code searching and analysis. This method is straightforward but requires a model with up-to-date knowledge of ast-grep to be effective. If the model is not familiar with the tool, it may not utilize it as instructed.

You can set a system-level prompt for your AI agent to prioritize ast-grep for syntax-aware searches. Here is an example prompt comes from this [social post](https://x.com/hd_nvim/status/1927342026085843240).

Example Prompt:

> You are operating in an environment where ast-grep is installed. For any code search that requires understanding of syntax or code structure, you should default to using ast-grep --lang [language] -p '<pattern>'. Adjust the --lang flag as needed for the specific programming language. Avoid using text-only search tools unless a plain-text search is explicitly requested.

This approach is best suited for general code queries and explorations within your projects.

## Installation

```sh
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install ast-grep@pleaseai
```

## Source

This plugin installs the [ast-grep agent skill](https://github.com/ast-grep/agent-skill) by [Herrington Darkholme](https://github.com/HerringtonDarkholme).