---
name: TossPayments Integration Guide
description: TossPayments payment integration documentation access via MCP. Use when integrating TossPayments payment widget, checkout flow, payment approval API, or when user mentions 토스페이먼츠, 결제, 결제위젯, 결제 승인, payment widget, TossPayments SDK, payment approval.
allowed-tools: mcp__plugin_tosspayments_tosspayments-integration-guide__*
---

# TossPayments Integration Guide

Access official TossPayments documentation through MCP tools for accurate payment integration guidance.

## Available Tools

- **get-v2-documents**: Search TossPayments V2 documentation (default). Use unless user explicitly asks for V1.
- **get-v1-documents**: Search TossPayments V1 documentation. Use only when user explicitly requests V1.
- **document-by-id**: Retrieve full document content by ID. Use to get detailed information after searching.

## When to Use

- Integrating TossPayments payment widget into a checkout page
- Implementing payment approval (결제 승인) API calls
- Setting up TossPayments V2 SDK
- Configuring payment methods (카드, 계좌이체, 가상계좌, etc.)
- Handling payment webhooks and callbacks
- Understanding TossPayments API error codes

## Workflow

1. Use `get-v2-documents` to search for relevant documentation
2. Use `document-by-id` to retrieve full content of matching documents
3. Apply the documentation to generate accurate integration code

## Prompt Examples

- "V2 SDK로 주문서 내에 결제위젯을 삽입하는 코드를 작성해줘"
- "결제 승인 요청하는 코드를 작성해줘"
- "TossPayments 결제 위젯 연동 방법 알려줘"
- "Write payment approval code using TossPayments API"

## Reference

- [LLM Guide](https://docs.tosspayments.com/guides/v2/get-started/llms-guide)
- [llms.txt](https://docs.tosspayments.com/llms.txt)
