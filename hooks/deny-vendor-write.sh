#!/bin/bash
# PreToolUse hook: vendor 디렉토리 쓰기 금지
# Write, Edit, NotebookEdit 도구가 vendor/ 경로를 대상으로 할 때 차단

set -euo pipefail

input=$(cat)

# 도구별 파일 경로 필드 추출
tool_name=$(echo "$input" | jq -r '.tool_name // empty')

case "$tool_name" in
  Write|Edit)
    file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
    ;;
  NotebookEdit)
    file_path=$(echo "$input" | jq -r '.tool_input.notebook_path // empty')
    ;;
  *)
    exit 0
    ;;
esac

if [ -z "$file_path" ]; then
  exit 0
fi

# 절대 경로 정규화 (상대 경로 처리)
case "$file_path" in
  /*)
    abs_path="$file_path"
    ;;
  *)
    abs_path="${CLAUDE_PROJECT_DIR}/${file_path}"
    ;;
esac

# 쓰기 금지 디렉토리 목록 확인
if echo "$abs_path" | grep -qE '(^|/)vendor(/|$)'; then
  echo '{
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "permissionDecisionReason": "vendor 디렉토리는 외부 의존성 보관 용도로, 직접 수정이 금지되어 있습니다. 패키지 매니저를 통해 업데이트하세요."
  }
}' >&2
  exit 2
fi

if echo "$abs_path" | grep -qE '(^|/)sources(/|$)'; then
  echo '{
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "permissionDecisionReason": "sources 디렉토리는 읽기 전용입니다. 직접 수정이 금지되어 있습니다."
  }
}' >&2
  exit 2
fi

exit 0