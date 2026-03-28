#!/bin/bash
# Tests for check-vue-components.sh hook
# Run: bash plugins/nuxt-ui/hooks/check-vue-components.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$SCRIPT_DIR/check-vue-components.sh"
PASS=0
FAIL=0

assert_output() {
  local desc="$1"
  local input="$2"
  local expected_pattern="$3"

  local output
  output=$(echo "$input" | bash "$HOOK" 2>/dev/null) || true

  if echo "$output" | grep -qE "$expected_pattern"; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc"
    echo "    Input: $input"
    echo "    Expected pattern: $expected_pattern"
    echo "    Got: $output"
    FAIL=$((FAIL + 1))
  fi
}

assert_empty() {
  local desc="$1"
  local input="$2"

  local output
  local exit_code=0
  output=$(echo "$input" | bash "$HOOK" 2>/dev/null) || exit_code=$?

  if [ "$exit_code" -ne 0 ]; then
    echo "  FAIL: $desc (hook exited with code $exit_code)"
    echo "    Input: $input"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ -z "$output" ]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (expected empty output)"
    echo "    Input: $input"
    echo "    Got: $output"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== check-vue-components.sh Tests ==="
echo ""

echo "--- Write tool with .vue file containing UButton ---"
assert_output \
  "T1: Write .vue with UButton triggers guidance" \
  '{"tool_name":"Write","tool_input":{"file_path":"app.vue","content":"<template><UButton label=\"Click\" /></template>"}}' \
  "get_component"

echo ""
echo "--- Write tool with .vue file without U* components ---"
assert_empty \
  "T2: Write .vue without U* components is silent" \
  '{"tool_name":"Write","tool_input":{"file_path":"app.vue","content":"<template><div>Hello</div></template>"}}'

echo ""
echo "--- Edit tool with .vue file containing UModal ---"
assert_output \
  "T3: Edit .vue with UModal triggers guidance" \
  '{"tool_name":"Edit","tool_input":{"file_path":"components/Dialog.vue","old_string":"<div>","new_string":"<UModal v-model:open=\"isOpen\" title=\"Edit\">"}}' \
  "UModal"

echo ""
echo "--- Write tool with .ts file (non-vue) ---"
assert_empty \
  "T4: Write .ts file is silent" \
  '{"tool_name":"Write","tool_input":{"file_path":"utils.ts","content":"export const foo = 1"}}'

echo ""
echo "--- Write tool with multiple U* components ---"
assert_output \
  "T5: Multiple U* components listed in guidance" \
  '{"tool_name":"Write","tool_input":{"file_path":"page.vue","content":"<template><UCard><UButton /><UInput /></UCard></template>"}}' \
  "UCard.*UButton|UButton.*UCard"

echo ""
echo "--- Guidance includes MCP tool suggestion ---"
assert_output \
  "T6: Guidance includes mcp tool name" \
  '{"tool_name":"Write","tool_input":{"file_path":"page.vue","content":"<template><UButton /></template>"}}' \
  "mcp__nuxt-ui"

echo ""
echo "--- Non Write/Edit tool is silent ---"
assert_empty \
  "T7: Read tool is silent" \
  '{"tool_name":"Read","tool_input":{"file_path":"page.vue"}}'

echo ""
echo "--- Edit with U* only in old_string (removal) should still be silent ---"
assert_empty \
  "T8: Edit removing U* component (only in old_string) is silent" \
  '{"tool_name":"Edit","tool_input":{"file_path":"page.vue","old_string":"<UButton />","new_string":"<button>Click</button>"}}'

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
