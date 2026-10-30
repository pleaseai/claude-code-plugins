#!/bin/bash
# Tests for rewrite-docs-url.sh. Run: bash hooks/rewrite-docs-url.test.sh
set -u
cd "$(dirname "$0")"
pass=0 fail=0

run() {
  echo "$1" | bash ./rewrite-docs-url.sh
}

expect_rewrite() { # input-url expected-url
  out=$(run "{\"tool_name\":\"WebFetch\",\"tool_input\":{\"url\":\"$1\",\"prompt\":\"p\"}}")
  got=$(jq -r '.hookSpecificOutput.updatedInput.url // empty' <<<"$out")
  if [ "$got" = "$2" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $1 -> '$got' (expected $2)"; fi
}

expect_silent() { # input-url
  out=$(run "{\"tool_name\":\"WebFetch\",\"tool_input\":{\"url\":\"$1\",\"prompt\":\"p\"}}")
  if [ -z "$out" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $1 should pass through, got: $out"; fi
}

expect_rewrite "https://code.claude.com/docs/en/agents" "https://code.claude.com/docs/en/agents.md"
expect_rewrite "https://code.claude.com/docs/en/agents/" "https://code.claude.com/docs/en/agents.md"
expect_rewrite "https://code.claude.com/docs/en/hooks#pretooluse-decision-control" "https://code.claude.com/docs/en/hooks.md"
expect_rewrite "https://code.claude.com/docs/en/agent-sdk/python" "https://code.claude.com/docs/en/agent-sdk/python.md"
expect_rewrite "https://code.claude.com/docs/en/hooks?foo=bar" "https://code.claude.com/docs/en/hooks.md"

expect_silent "https://code.claude.com/docs/en/agents.md"
expect_silent "https://code.claude.com/docs/llms.txt"
expect_silent "https://code.claude.com/docs/llms-full.txt"
expect_silent "https://code.claude.com/docs/en"
expect_silent "https://code.claude.com/docs"
expect_silent "https://example.com/docs/en/agents"
expect_silent "https://docs.claude.com/en/api/overview"

# prompt must survive updatedInput (it replaces the whole input object)
out=$(run '{"tool_name":"WebFetch","tool_input":{"url":"https://code.claude.com/docs/en/agents","prompt":"summarize"}}')
got=$(jq -r '.hookSpecificOutput.updatedInput.prompt' <<<"$out")
if [ "$got" = "summarize" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: prompt lost: $got"; fi

echo "passed: $pass, failed: $fail"
[ "$fail" -eq 0 ]
