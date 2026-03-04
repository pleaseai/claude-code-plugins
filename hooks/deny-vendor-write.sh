#!/bin/bash
# PreToolUse hook: vendor 디렉토리 쓰기 금지
# Write, Edit, NotebookEdit 도구가 vendor/ 경로를 대상으로 할 때 차단

set -euo pipefail

input=$(cat)

# 도구별 파일 경로 필드 추출
tool_name=$(echo "$input" | jq -r '.tool_name // empty')

case "$tool_name" in
  Write|Edit|MultiEdit)
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

# 절대 경로 정규화 (상대 경로 처리, .. 세그먼트 canonicalize)
case "$file_path" in
  /*)
    abs_path="$file_path"
    ;;
  *)
    abs_path="${CLAUDE_PROJECT_DIR}/${file_path}"
    ;;
esac

# .. 세그먼트를 정규화하여 경로 우회 방지
# realpath -m은 GNU 전용이므로 python3로 크로스 플랫폼 폴백
# fail-closed: 두 방법 모두 실패 시 요청 차단
if ! abs_path="$(realpath -m "$abs_path" 2>/dev/null || python3 -c "import os.path, sys; print(os.path.normpath(sys.argv[1]))" "$abs_path" 2>/dev/null)"; then
  echo '{
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "permissionDecisionReason": "경로 정규화에 실패하여 요청을 차단했습니다."
  }
}' >&2
  exit 2
fi

# 쓰기 금지 디렉토리 목록 확인 (프로젝트 루트에 앵커링)
project_dir="${CLAUDE_PROJECT_DIR%/}"

if [[ "$abs_path" == "${project_dir}/vendor/"* ]]; then
  echo '{
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "permissionDecisionReason": "vendor 디렉토리는 외부 의존성 보관 용도로, 직접 수정이 금지되어 있습니다. 패키지 매니저를 통해 업데이트하세요."
  }
}' >&2
  exit 2
fi

if [[ "$abs_path" == "${project_dir}/sources/"* ]]; then
  echo '{
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "permissionDecisionReason": "sources 디렉토리는 읽기 전용입니다. 직접 수정이 금지되어 있습니다."
  }
}' >&2
  exit 2
fi

exit 0
