#!/usr/bin/env bash
# Read Graphite merge-queue configuration from .please/config.yml.
#
# Outputs three KEY=VALUE lines that the caller can `eval`:
#   GRAPHITE_DISABLED=0|1   1 iff `graphite.enabled: false` is set at the
#                            immediate child of `graphite:`.
#   MERGE_MODE=<value>       The `graphite.merge-queue.mode` value, or empty.
#   MERGE_LABEL=<value>      The `graphite.merge-queue.label` value, or empty.
#
# Depth-tracked: only direct children of `graphite:` and `graphite.merge-queue:`
# are matched, so nested `enabled` / `mode` / `label` at deeper levels do not
# trigger false reads. Mirrors the conventions used in
# hooks/graphite-context.sh.
#
# Single source of truth for both the `graphite-merge-queue` skill and the
# `/graphite:merge-queue` slash command — avoids the awk duplication flagged
# in PR review (gemini-code-assist).
#
# Known limitation: the comment-stripping regex (`[[:space:]]+#.*$`) is
# fragile for values containing an embedded `#`. Workaround for affected
# users: set MERGE_QUEUE_LABEL or GRAPHITE_MERGE_QUEUE_MODE in the
# environment, which callers should resolve before calling this script.

set -euo pipefail

CONFIG_FILE="${1:-.please/config.yml}"

if [ ! -f "$CONFIG_FILE" ]; then
  printf 'GRAPHITE_DISABLED=0\nMERGE_MODE=\nMERGE_LABEL=\n'
  exit 0
fi

awk '
  BEGIN {
    in_graphite = 0; in_mq = 0
    child_indent = 0; mq_child_indent = 0
    disabled = 0; mode = ""; label = ""
  }

  # Top-level key other than `graphite:` resets state.
  /^[^[:space:]#]/ && !/^graphite:[[:space:]]*(#.*)?$/ {
    in_graphite = 0; in_mq = 0; child_indent = 0; mq_child_indent = 0
  }

  /^graphite:[[:space:]]*(#.*)?$/ {
    in_graphite = 1; in_mq = 0; child_indent = 0; mq_child_indent = 0; next
  }

  # Blank / comment-only lines.
  /^[[:space:]]*($|#)/ { next }

  in_graphite {
    match($0, /^[[:space:]]*/); indent = RLENGTH

    if (child_indent == 0) child_indent = indent

    if (indent < child_indent) {
      in_graphite = 0; in_mq = 0
      next
    }

    if (indent == child_indent) {
      if ($0 ~ /^[[:space:]]+enabled:[[:space:]]*false([[:space:]]|#|$)/) {
        disabled = 1
      }
      if ($0 ~ /^[[:space:]]+merge-queue:[[:space:]]*(#.*)?$/) {
        in_mq = 1; mq_child_indent = 0; next
      }
      # Any other direct child means we are no longer inside merge-queue.
      in_mq = 0
    }

    if (in_mq && indent > child_indent) {
      if (mq_child_indent == 0) mq_child_indent = indent
      if (indent < mq_child_indent) { in_mq = 0; next }

      if (indent == mq_child_indent) {
        if ($0 ~ /^[[:space:]]+mode:[[:space:]]*/) {
          raw = $0
          sub(/^[[:space:]]+mode:[[:space:]]*/, "", raw)
          mode = strip_value(raw)
        }
        if ($0 ~ /^[[:space:]]+label:[[:space:]]*/) {
          raw = $0
          sub(/^[[:space:]]+label:[[:space:]]*/, "", raw)
          label = strip_value(raw)
        }
      }
    }
  }

  function strip_value(s) {
    sub(/[[:space:]]+#.*$/, "", s)
    sub(/[[:space:]]+$/, "", s)
    gsub(/^["'\'']|["'\'']$/, "", s)
    return s
  }

  # Single-quote a value so that `eval` of the emitted KEY=VALUE line is safe
  # regardless of whether the YAML value contains shell metacharacters
  # ($ ` ; & | < > ( ) space etc.). Replaces every embedded single quote with
  # the standard '\'' close-escape-reopen sequence.
  #
  # Built using sprintf("%c", 39) to avoid nested single-quote escaping
  # inside this awk program (which is itself wrapped in shell single
  # quotes).
  function shell_quote(s,    q, esc) {
    q   = sprintf("%c", 39)         # one literal single quote
    esc = q "\\" q q                # the '\'' sequence
    gsub(q, esc, s)
    return q s q
  }

  END {
    printf "GRAPHITE_DISABLED=%d\nMERGE_MODE=%s\nMERGE_LABEL=%s\n", disabled, shell_quote(mode), shell_quote(label)
  }
' "$CONFIG_FILE"
