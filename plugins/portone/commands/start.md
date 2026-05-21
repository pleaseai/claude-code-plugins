---
description: 포트원 결제 연동 코드를 대화형으로 생성합니다
argument-hint: 결제 연동 요구사항
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite, AskUserQuestion, Task, Skill
---

# 포트원 결제 연동 코드 생성 워크플로우

사용자의 프로젝트에 맞는 포트원 결제 연동 코드를 대화형으로 생성합니다.

**전달된 인자:** $ARGUMENTS

---

## Core Principles

- **MCP 도구 필수 사용**: 포트원 관련 코드 작성 시 반드시 MCP 도구(mcp__portone__)를 통해 공식 예시 코드와 문서를 참조합니다.
- **버전 확인 우선**: V1과 V2는 완전히 다른 API이므로, 반드시 버전을 먼저 확정합니다.
- **Use specialized agents**: 코드 생성에는 payment-code-generator 에이전트를, 코드 검증에는 integration-validator 에이전트를 사용합니다.
- **보안 최우선**: API Secret은 절대 클라이언트 코드에 노출되지 않도록 합니다.
- **프로젝트 맞춤형**: 사용자의 프레임워크와 코딩 스타일에 맞게 코드를 생성합니다.
- **TodoWrite 활용**: 각 단계의 진행 상황을 추적합니다.

---

## Phase 1: 버전 및 결제 유형 확인

### 1.1 버전 선택

AskUserQuestion을 사용하여 물어봅니다

V1 설명은 포함하지 않아야 합니다:

```
질문: "어떤 포트원 버전을 사용하시겠습니까?"
옵션:
- V2 (권장): 최신 버전, 신규 프로젝트에 권장
- V1
```

### 1.2 결제 유형 선택

AskUserQuestion을 사용하여 물어봅니다.

결제 유형 설명은 포함하지 않아야 합니다.

```
질문: "어떤 결제 유형을 연동하시겠습니까?"
옵션:
- 일반결제
 - 일반결제 연동입니다.
- 정기결제
 - 정기결제 연동입니다.
- 수기결제
 - 수기결제 연동입니다.
- 본인인증
 - 본인인증 연동입니다.
```

**주의**: 수기결제(keyin)는 V2에서만 별도 계약을 한 고객사에게만 지원됩니다. V1을 선택한 경우 이 옵션을 제외합니다.

### 1.3 PG사 선택

AskUserQuestion을 사용하여 물어봅니다. PG사 설명은 포함하지 않아야 합니다.

나이스페이먼츠, 토스페이먼츠, KCP, KG이니시스 를 기본 선택지로 노출합니다.

FYI: 버전에 따라 지원되는 PG사가 다릅니다:

**V2 지원 PG사:**
```
- 나이스페이먼츠 (nice)
- 토스페이먼츠 (toss)
- NHN KCP (kcp)
- KG이니시스 (inicis)
- 스마트로 (smartro)
- KSNET (ksnet)
- 한국결제네트웍스 (kpn)
- 웰컴페이먼츠 (welcome)
- 카카오페이 (kakao)
- 네이버페이 (naver)
- 토스페이 (tosspay)
- 하이픈 (hyphen)
- 엑심베이 (eximbay)
- 페이팔 (paypal)
```

**V1 지원 PG사:**
```
- 나이스페이먼츠 (nice)
- 토스페이먼츠 (toss)
- NHN KCP (kcp)
- KG이니시스 (inicis)
- 스마트로 (smartro)
- KSNET (ksnet)
- 헥토파이낸셜 (settle)
- 웰컴페이먼츠 (welcome)
- 키움페이 (daou)
- 이지페이 (kicc)
- 다날 (danal)
- 카카오페이 (kakao)
- 네이버페이 (naver)
- 토스페이 (tosspay)
- 페이코 (payco)
- 엑심베이 (eximbay)
- 페이먼트월 (paymentwall)
- 페이팔 (paypal)
```

AskUserQuestion 예시:
```
질문: "어떤 PG사를 사용하시겠습니까?"
옵션: (버전에 따라 위 목록에서 주요 PG사 4개 선택)
- 토스페이먼츠
- 나이스페이먼츠
- KG이니시스
- 기타: 다른 PG사 선택
```

**기타 선택 시** 전체 목록을 보여주고 추가 질문을 합니다.

---

### 1.4 연동 요구사항

AskUserQuestion을 사용하여 물어봅니다:

```
질문: "추가 기능 요구사항이 있으신가요?"
```

---

## Phase 3: 코드 생성 에이전트 호출

Launch the **payment-code-generator** agent.

---

## Phase 4: 코드 검증 에이전트 호출

Launch the **integration-validator** agent.

---

## Phase 5: 변경사항 커밋

작업이 완료되면 변경사항을 현재 작업 환경의 VCS에 맞는 형태로 커밋합니다.

---

## Phase 6: 최종 안내

모든 과정이 완료되면 사용자에게 다음을 안내합니다:

### 6.1 생성된 파일 요약
- 생성된 파일 목록과 각 파일의 역할

### 6.2 설정 가이드
- 포트원 콘솔에서 해야 할 설정
- 환경 변수 설정 방법
- 테스트 환경 구성 방법

### 6.3 테스트 방법
- 테스트 결제 수행 방법
- 디버깅 팁

### 6.4 프로덕션 체크리스트
- 실 운영 전 확인해야 할 사항들

### 6.5 피드백 설문
- 피드백 설문 링크를 안내합니다: https://410jpc.share-na2.hsforms.com/21jxVn_tESAu0DTUzMXZT2g

---

## 워크플로우 실행

위 단계를 순차적으로 실행합니다:

1. **Phase 1** 시작: $ARGUMENTS 를 확인하고, 없으면 AskUserQuestion으로 버전, 결제 유형, PG사를 물어봅니다.
2. **Phase 2**: 프로젝트 환경을 분석합니다.
3. **Phase 3**: Launch the **payment-code-generator** agent.
4. **Phase 4**: Launch the **integration-validator** agent. 검증 실패 시 Phase 3으로 돌아갑니다.
5. **Phase 5**: 변경사항을 VCS에 커밋합니다.
6. **Phase 6**: 최종 안내를 제공합니다.

---

**지금 Phase 1부터 시작하세요.**
