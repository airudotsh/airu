# airu-cli v0.2 설계안

## 핵심 변화 3가지

### 1. 사용자 친화적 패턴 시각화

현재: `[P3 Debug 85%] → M2 Reasoning + M5 Execution + M9 Tools` (개발자만 이해 가능)

변경:

```
> 이 코드 버그 잡아줘

  분석: 버그 수정 요청 (85%)
  계획: 원인 분석 → 관련 파일 탐색 → 수정 실행 → 검증

  [1/4] 원인 분석 중...
  [2/4] 관련 파일 탐색 중...  → src/parser.ts
  [3/4] 수정 실행 중...
  [4/4] 검증 중... ✓
```

**구현 방식:**
- 각 메서드에 `userLabel` 필드 추가 (한국어)
  - M1 인식 → "상황 파악"
  - M2 추론 → "원인 분석"
  - M3 판단 → "방향 결정"
  - M4 계획 → "계획 수립"
  - M5 실행 → "실행"
  - M6 모니터링 → "상태 확인"
  - M7 검증 → "검증"
  - M8 소통 → "정보 전달"
  - M9 툴 → "도구 사용"
  - M10 창의 → "아이디어 탐색"
  - M11 지식 → "지식 활용"
- 각 패턴에 `steps` 필드 추가 — 어떤 순서로 무슨 일을 하는지
  ```typescript
  steps: [
    { label: '원인 분석', methodIds: ['M1', 'M2'] },
    { label: '관련 파일 탐색', methodIds: ['M9'] },
    { label: '수정 실행', methodIds: ['M5'] },
    { label: '검증', methodIds: ['M7'] },
  ]
  ```
- Orchestrator가 단계별로 상태 출력


### 2. 지식 영속화 (월넛 + Graphify)

**구조:**
```
~/.airu/
  config.yaml
  knowledge/
    project-{name}/
      sessions/
        {session-id}.md      # 세션 대화 요약
      patterns/
        {pattern-id}.md      # 이 프로젝트에서 학습한 패턴 정보
      skills/
        {name}.md            # 커스텀 메서드 오버라이드
      graph.json             # Graphify가 생성한 지식 그래프
```

**동작 흐름:**
1. 세션 시작 → 프로젝트 감지 (git remote, package.json name 등)
2. Graphify에서 관련 지식 검색 → system prompt에 자동 주입
3. 대화 중 학습한 내용 → knowledge/ 에 마크다운으로 자동 저장
4. 세션 종료 → Graphify가 그래프 업데이트

**Graphify 자동 연동:**
- Orchestrator.execute() 시작 시:
  1. 사용자 입력에서 키워드 추출
  2. Graphify 그래프에서 관련 노드 검색
  3. 관련 지식을 system prompt에 추가
- 세션 종료 / `/save` 명령 시:
  1. 대화 요약 생성
  2. 마크다운으로 knowledge/ 에 저장
  3. Graphify로 그래프 갱신

**지식 파일 예시:**
```markdown
---
type: session-summary
project: airu-cli
date: 2026-05-03
patterns: [P7 Debug, P5 Modify]
tags: [typescript, bun, ink]
---

## 세션 요약
- TerminalTool에 rtk 자동 래핑 추가
- Ink TUI 스캐폴딩 완료
- npm 배포 준비 완료

## 학습한 내용
- Bun 모노레포에서 workspace 이름 변경 시 lockfile 업데이트 필요
- Ink 빌드 시 react-devtools-core 필요
```


### 3. 커스텀 스킬 (메서드 오버라이드)

**개념: 기본 메서드는 그대로, 사용자가 특정 부분만 교체**

**스킬 파일 예시:**
```markdown
---
type: skill
name: 항상 테스트 먼저
target:
  pattern: P7          # 디버그 패턴에 적용
  overrides: steps     # steps를 교체
---

## 커스텀 계획
1. 테스트 먼저 실행해서 실패 확인
2. 원인 분석
3. 수정
4. 테스트 재실행해서 통과 확인
```

**적용 방식:**
1. 세션 시작 시 `.airu/knowledge/project-{name}/skills/` 스캔
2. 패턴 매칭 시 스킬 파일이 있으면 steps를 덮어씀
3. 사용자가 "디버그할 때 항상 테스트 먼저 실행해"라고 말하면:
   - 해당 스킬 파일 자동 생성
   - P7 패턴의 steps가 자동 교체됨

**CLI에서의 사용자 경험:**
```
> 디버그할 때마다 테스트 먼저 실행하게 해줘

  스킬 생성됨: "항상 테스트 먼저"
  적용 대상: 버그 수정 (P7)
  이제부터 디버그 요청 시 테스트 우선 실행합니다.

> 이 에러 잡아줘

  분석: 버그 수정 요청 (85%)
  계획: 테스트 실행 → 원인 분석 → 수정 → 테스트 재실행  [커스텀 스킬 적용됨]

  [1/4] 테스트 실행 중... ✗ (3 failed)
  [2/4] 원인 분석 중...
```

**스킬 관리 명령어:**
```
/skills              # 등록된 커스텀 스킬 목록
/skill create <설명>  # 대화로 스킬 생성
/skill edit <name>    # 스킬 수정
/skill remove <name>  # 스킬 삭제
```


## 구현 순서

### Phase 1: 패턴 시각화 개선
1. IMethod에 `userLabel` 추가
2. IPattern에 `steps` 추가 (label + methodIds 배열)
3. 18개 패턴에 steps 정의
4. Orchestrator에서 단계별 상태 출력
5. CLI/TUI에 반영

### Phase 2: 지식 영속화
1. `.airu/knowledge/` 디렉토리 구조 설계
2. KnowledgeStore 클래스 구현
3. 세션 요약 자동 저장
4. Graphify 연동 (그래프 생성/검색/갱신)
5. 세션 시작 시 자동 지식 로드

### Phase 3: 커스텀 스킬
1. 스킬 파일 파서 (YAML frontmatter + 마크다운)
2. SkillRegistry 구현
3. 패턴 steps 오버라이드 로직
4. 대화로 스킬 생성 기능
5. /skills 명령어 구현


## 기존 코드에 미치는 영향

| 파일 | 변경 |
|------|------|
| `IMethod` | `userLabel` 필드 추가 |
| `IPattern` | `steps` 필드 추가 |
| `KeywordPattern` | `steps` 기본값 제공 |
| 18개 패턴 | 각각 steps 정의 |
| `Orchestrator` | 단계별 시각화 + 지식 로드 + 스킬 오버라이드 |
| `Agent` | 변경 없음 |
| `Guardrails` | 변경 없음 |
| `TerminalTool` | 변경 없음 (rtk 이미 통합됨) |
