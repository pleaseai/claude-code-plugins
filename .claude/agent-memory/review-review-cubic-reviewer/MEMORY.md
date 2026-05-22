# Agent Memory — review-review-cubic-reviewer

- [Mastra skill review (PR #161)](pr161-mastra-skill.md) — cubic found no issues after correctness fixes were applied
- [Graphite commands review (PR #170)](pr170-graphite-commands.md) — cubic P1 flagging `gt create` positional arg was a false positive (CLI confirms `gt create [name]` is valid)
- [Graphite session-start hook review (PR #171)](pr171-graphite-session-start-hook.md) — cubic clean pass (0 issues); full diff vs main reviewed with `-b` flag
- [Release-please + author fix review (PR #172)](pr172-release-please-graphite.md) — cubic clean pass (0 issues); release-please config for plugins/graphite + plugin.json author correction
- [Release-please bun plugin review (PR #176)](pr176-release-please-bun.md) — cubic clean pass (0 issues); release-please config wiring for plugins/bun (manifest, config, version field)
- [Graphite awk state-reset fix (PR #189)](pr189-graphite-awk-state-reset.md) — cubic clean pass (0 issues); state-leakage fix in graphite-context.sh awk parser
