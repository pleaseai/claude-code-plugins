# Java Development

Comprehensive collection of skills for Java development including Spring Boot, JUnit, and Javadoc best practices. Imported from GitHub's [awesome-copilot](https://github.com/github/awesome-copilot/tree/main/plugins/java-development) community plugin.

## Installation

```bash
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install java-development@pleaseai
```

## Included skills

| Skill | Description |
|---|---|
| `java-docs` | Ensure Java types are documented with Javadoc and follow documentation best practices. |
| `java-junit` | Best practices for JUnit 5 unit testing, including data-driven tests. |
| `java-springboot` | Best practices for developing Spring Boot applications. |
| `create-spring-boot-java-project` | Create a Spring Boot Java project skeleton. |

## Source & attribution

This plugin is a direct import of the [`java-development`](https://github.com/github/awesome-copilot/tree/main/plugins/java-development) plugin from GitHub's [Awesome Copilot](https://github.com/github/awesome-copilot) community collection. The `skills/*/SKILL.md` files are byte-identical to upstream — only the plugin manifest (`.claude-plugin/plugin.json`) is adapted to Claude Code's schema.

Upstream is MIT-licensed; the original license text is preserved in [`LICENSE`](./LICENSE).

## Notes

- This plugin contains **skills only** — no MCP servers, slash commands, or hooks. Each skill activates contextually when Claude detects relevant Java work (Spring Boot endpoints, JUnit tests, Javadoc comments, etc.).
- To refresh against upstream, re-run the manual copy step from track `awesome-copilot-java-20260528` or open a new track for the refresh.
