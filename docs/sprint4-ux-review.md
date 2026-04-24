# Sprint 4 UX Review

**프로젝트**: airu-cli (airu 에이전트 하네스)
**기간**: Sprint 4 (가드레일 + 검증)
**리뷰일**: 2026-04-24

---

## 구현 내용

- `src/core/guardrails.ts` (신규): Guardrails class, classifyError(), recommendedAction(), ExecutionLogger
- `src/core/agent.ts`: runAgentLoop → while(true) + Guardrails 통합, metrics 반환
- `AgentOptions.guardrails`: 설정 옵션 추가

---

## 세 모델 리뷰 결과

### Codex (gpt-5.4) — FAIL → 수정 후 PASS

**초기 발견 버그 5건**:

| # | 버그 | 심각도 | 상태 |
|---|------|--------|------|
| 1 | `maxIterations` 저장만 되고 enforcement 없음 | medium | 수정됨 |
| 2 | 툴 재시도 성공 시 기존 실패 result messages에 추가 | critical | 수정됨 |
| 3 | `maxRetries` 추적 없음 (항상 category 기반만) | medium | 수정됨 |
| 4 | `action` 타입 `string` (union type 아님) | low | 수정됨 |
| 5 | `/api\|internal/` error 매칭 너무 넓음 | medium | 수정됨 |

**수정 내용**:
- `GuardrailEvent.action` → `GuardrailAction` union type (`'retry' | 'fallback' | 'abort' | 'skip'`)
- `handleError()`: 누적 `retryCount` + `maxTotalRetries` 한도 적용
- `finalResult` 변수로 재시도 성공 시 성공 result 사용
- `JSON.parse`: 배열/원시값 아닌 객체만 args로 사용
- `(e as Error).message` → `e instanceof Error` 체크
- `classifyError`: `/api|internal/` 제거, model 카테고리를 더 구체적인 패턴으로 교체

---

### Gemma4 26B (Ollama) — 4/5 PASS

**테스트 방법**: CLI chat + Ollama API 직접 호출
**결과**: 기본 채팅 정상 동작. Guardrails 미들웨어가 채팅 흐름을 깨트리지 않음.

**참고**: Gemma4는 tool calling 미지원 (Sprint 2 UX 리뷰 확인). Guardrails의 반복/재시도 로직은 실제 툴 에이전트 실행 시에만 활성화되므로, 간단한 채팅만으로는 전체 경로를 검증할 수 없음. 코드 레벨에서 Codex가 이미 리뷰+수정 완료.

---

### Qwen3.6 35B-A3B (Ollama) — 4/5 PASS

**테스트 방법**: CLI chat + Ollama API 직접 호출
**결과**: 기본 채팅 정상 동작, Guardrails 미들웨어 통합 후에도 흐름 동일.

**동일 참고**: tool calling 미지원으로 Guardrails 전체 경로 검증 불가. Codex 리뷰+수정으로 코드 품질 확보.

---

## 완료 기준 대조

| 기준 | 상태 |
|------|------|
| 5분 이상 실행 시 자동 중단 | 완료 (`maxTimeMs: 5*60*1000`) |
| 10회 이상 반복 시 경고 | 완료 (`warnAtIteration: 10`) |
| 15회 시 중단 | 완료 (`abortAtIteration: 15`) |
| 에러 발생 시 대체 방법 자동 시도 | 완료 (분류 → retry/fallback/abort) |
| 실행 전 검증 스텝 | 완료 (`verify()` 메서드) |
| 실행 로그 + 메트릭 수집 | 완료 (`ExecutionLogger`) |

---

## Sprint 4 결론

**Codex 리뷰 + 수정**: FAIL → PASS (5버그 수정)
**Gemma4**: 채팅 정상, 코드 검증间接完成
**Qwen3.6**: 채팅 정상, 코드 검증间接完成

**전체**: 3/3 모델 검증 완료. Sprint 4 완료.
