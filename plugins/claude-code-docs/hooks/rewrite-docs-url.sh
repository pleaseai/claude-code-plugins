#!/bin/bash
# PreToolUse hook for WebFetch: rewrite Claude Code docs page URLs to their
# markdown source (https://code.claude.com/docs/en/agents -> .../agents.md).
# Every docs page serves a clean markdown twin at <page>.md; fetching it skips
# the HTML app shell entirely. Silent exit 0 = no opinion, normal flow.

input=$(cat)
url=$(jq -r '.tool_input.url // empty' <<<"$input")
[ -z "$url" ] && exit 0

case "$url" in
  https://code.claude.com/docs/*) ;;
  *) exit 0 ;;
esac

# Drop fragment and query: hooks#pretooluse-decision-control -> hooks
path="${url%%#*}"
path="${path%%\?*}"
path="${path%/}"

# Already a raw file (page .md, llms.txt, images, ...) - leave untouched.
# Check the last path segment only; the domain always contains dots.
case "${path##*/}" in
  *.*) exit 0 ;;
esac

# Only rewrite real pages under a locale segment (/docs/<locale>/<page...>),
# not the docs root itself
rest="${path#https://code.claude.com/docs/}"
case "$rest" in
  */*) ;;
  *) exit 0 ;;
esac

jq --arg url "${path}.md" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    permissionDecisionReason: ("Rewrote Claude Code docs URL to markdown source: " + $url),
    updatedInput: (.tool_input | .url = $url)
  }
}' <<<"$input"
