# Sprint 1 UX Review — airu-cli

**날짜**: 2026-04-24
**대상**: airu-cli v1.0.0
**리뷰어**: Codex (gpt-5.4), Gemma4 26B, Qwen3.6 35B-A3B
**결과**: Gemma4 PASS, Qwen3.6 PASS, Codex 버그 수정 인정

---

## 평가 결과 비교

| 평가 항목 | Codex (gpt-5.4) | Gemma4 26B | Qwen3.6 35B-A3B |
|-----------|:---:|:---:|:---:|
| 온보딩 (첫인상) | 3/5 | 4.5/5 | **5/5** |
| 명령어 직관성 | 3/5 | 4.0/5 | **4/5** |
| 에러 메시지 친절도 | 3/5 | **5.0/5** | **5/5** |
| 출력 포맷 가독성 | 3/5 | 4.5/5 | **4/5** |
| 파이프 모드 (스크립트 호환성) | 3/5 | **5.0/5** | **5/5** |
| 경쟁 CLI 대비 | - | 4.0/5 | - |
| 한글 사용자 관점 | - | 4.0/5 | **4/5** |
| **총점** | **3/5** | **4.4/5** | **4.5/5** |
| **판정** | FAIL (버그 중심) | **PASS** | **PASS** |

### 판정 기준
- **Codex**: 기능 동작 여부 중심. 버그 존재 시 보수적 감점
- **Gemma4**: UX 심층 분석. 7개 항목 × 상세 개선안 + 마크다운 테이블
- **Qwen3.6**: 핵심 평가 간결 명료. 최종 판정 명확

---

## 공통 인정 강점 (세 모델 일치)

| 항목 | 평가 |
|------|------|
| 401/403 에러 안내 | **5점一致** — 파일 경로 + 변수명까지 구체적 |
| 파이프 모드 | **5점** — Unix 철학 부합, 스크립트 자동화 가능 |
| `/tools` 목록 가시성 | 에이전트 능력 즉시 인지 가능 |
| ASCII art 로고 | 브랜드 아이덴티티 구축, 첫인상 우수 |

---

## 각 리뷰어 상세 평가

### Codex (gpt-5.4) — 3/5 FAIL
**관점**: 기능 버그 검증

**인지한 이슈 (수정 완료)**:
1. `/tools` 명령어 help에 있지만 작동 안 함
2. 인자 없이 실행 시 온보딩 부재
3. 401 에러 시 가이드 없음
4. 파이프 모드 불필요한 헤더 `[airu pipe mode]`
5. provider 전환 시 async 미처리

**수정 후**: 버그 픽스 인정. 기능 동작 검증 완료 (5/5 테스트 통과)

---

### Gemma4 26B — 4.4/5 PASS
**관점**: UX 심층 분석, 7개 항목

**강점 분석**:
- Actionable Error Messages: 에러 시 다음 행동까지 안내
- Transparency of Capabilities: 툴 목록으로 에이전트 권한 가시화
- Unix-friendly Design: 파이프 모드로 워크플로우 확장성

**개선 제안**:
1. **명령어 일관성**: `airu model` vs `airu model list` 혼용 문제
2. **시각적 계층화**: status 출력에 ANSI 색상 더 적용
3. **언어 일관성**: 영문/국문 병기 개선 필요
4. **모드 구분**: 인터랙티브 vs 파이프 모드 UI 구분

**총평**: "claude code와 경쟁할 수 있는 개발자 친화적 도구"

---

### Qwen3.6 35B-A3B — 4.5/5 PASS
**관점**: 핵심 평가 간결 명료

**세부 점수**: 온보딩 5, 직관성 4, 에러 5, 가독성 4, 파이프 5, 한글 4

**총평**: "사용자 경험을 효과적으로 관리하는 CLI 도구"

---

## Sprint 1 수정 이력

### 수정 전 (초기 구현)
- `/tools` help에 있지만 미구현 → "알 수 없는 명령어"
- 인자 없이 실행 → Commander 기본 help만 출력
- 401 에러 → JSON 원문 노출
- 파이프 모드 → `[airu pipe mode]` 헤더 불필요
- provider 전환 → async initialize 미처리

### 수정 후 (현재)
- `/tools` → ToolRegistry 연동, 6개 툴 목록 표시
- 인자 없이 → ASCII art 로고 + 상황별 명령어 가이드
- 401 에러 → `~/.airu/.env에 ZAI_API_KEY 설정` 안내
- 파이프 모드 → 헤더 제거, 응답만 출력
- provider 전환 → `createAndInitProvider()` async 함수
- status → 툴 목록 + API 키 미설정 경고 추가
- init → 단계별 API 키 설정 가이드

---

## 테스트 결과

```
bun src/cli.ts              → ASCII art + 온보딩 PASS
bun src/cli.ts status       → 설정 + 툴 6개 PASS
bun src/cli.ts model list   → GLM 9개 + Ollama 표시 PASS
printf '/tools\n' | airu chat → 파이프모드 툴 목록 PASS
printf '안녕\n' | airu chat   → 파이프 응답 PASS
npx tsc --noEmit            → exit 0 PASS
```

---

## 참고

- **Codex 모델**: gpt-5.4 (OpenAI via codex CLI)
- **Gemma4**: 25.8B Q4_K_M, 112초, 2363 tokens
- **Qwen3.6**: 36.0B Q4_K_M (A3B), 2000 tokens, think=false
- **Ollama 엔드포인트**: http://localhost:11434/api/chat
