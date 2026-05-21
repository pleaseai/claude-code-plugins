# Agent Memory — review-review-cubic-reviewer

- [Mastra skill review (PR #161)](pr161-mastra-skill.md) — cubic found no issues after correctness fixes were applied
- [Graphite commands review (PR #170)](pr170-graphite-commands.md) — cubic P1 flagging `gt create` positional arg was a false positive (CLI confirms `gt create [name]` is valid)
- [Graphite session-start hook review (PR #171)](pr171-graphite-session-start-hook.md) — cubic clean pass (0 issues); full diff vs main reviewed with `-b` flag
- [Release-please + author fix review (PR #172)](pr172-release-please-graphite.md) — cubic clean pass (0 issues); release-please config for plugins/graphite + plugin.json author correction
- [Release-please bun plugin review (PR #176)](pr176-release-please-bun.md) — cubic clean pass (0 issues); release-please config wiring for plugins/bun (manifest, config, version field)
- [Graphite please-config opt-in review (PR #181)](pr181-graphite-please-config-opt-in.md) — cubic clean pass (0 issues); AWK YAML parser tightened to match `enabled: true` only at direct-child indent level of `graphite:`
- [PortOne plugin review (PR #184)](pr184-portone-plugin.md) — initial pass: P1 misleading `express.raw()` note, P2 false positive on named import; follow-up uncommitted edit (Express 4 `next(e)` fix) → cubic clean (0 issues)
