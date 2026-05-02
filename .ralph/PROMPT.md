# Ralph Loop — v0.2 전체 구현 + 프로덕션 출시

## Goal
airu-cli v0.2 설계안(DESIGN-v0.2.md)을 전부 구현하고, 로컬 LLM 검증을 반복하며 프로덕션 출시 가능한 단계까지 개선.

## Requirements
- [x] npm 배포 준비 (package.json 메타데이터, README)
- [x] rtk 통합 (TerminalTool 자동 래핑)
- [x] TUI 스캐폴딩 (--tui 플래그)
- [ ] Phase 1: 패턴 시각화 — IMethod.userLabel, IPattern.steps, Orchestrator 단계별 출력
- [ ] Phase 2: 지식 영속화 — KnowledgeStore, 세션 요약 저장, Graphify 자동 연동
- [ ] Phase 3: 커스텀 스킬 — 스킬 파일 파서, SkillRegistry, 패턴 steps 오버라이드
- [ ] Phase 4: 로컬 LLM 프로덕션 검증 (cli-production-readiness-review 스킬)
- [ ] Phase 5: 검증 피드백 반영 + 재검증

## Constraints
- Language: TypeScript (strict)
- Runtime: Bun
- Type-check: bun run typecheck
- Build: bun run build
- Test: bun test
- Verification gate: typecheck + build + test 모두 통과해야 커밋

## Completion Criteria
- v0.2 기능 전부 구현
- 로컬 LLM 2개 모델 이상 프로덕션 검증 PASS
- npm publish 가능 상태

## Cost Budget
- Max iterations: 20
- Safety: stuck 3회 시 중단
