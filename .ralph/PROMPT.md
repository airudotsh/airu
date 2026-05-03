# Ralph Loop — airu-cli v0.2 전체 테스트

## Goal
DESIGN-v0.2.md에 정의된 Phase 1-3 기능이 실제로 동작하는지 검증.

## Requirements (전부 PASS)
- [x] R1: --version → 0.2.0
- [x] R2: --help → Commander 도움말
- [x] R3: status → 설정/툴/메서드
- [x] R4: 파이프 단순 질문 → 응답 stdout
- [x] R5: 파이프 툴 호출 → 응답 stdout
- [x] R7: /help → 대화형 명령어 목록
- [x] R8: /tools → 툴 목록
- [x] R9: /models → 모델 목록
- [x] R10: /methods → 한국어 userLabel
- [x] R11: /patterns → steps 한국어
- [x] R14: /save → 세션 지식 저장
- [x] R15: /remember → 지식 저장
- [x] R16: /knowledge → 지식 목록
- [x] R17: /skills → 스킬 목록

## Done Criteria
- [x] 14/14 테스트 통과
- [x] 단위 테스트 49/49
- [x] typecheck 0 에러
- [x] 번들 176KB
- [x] 지식 파일 실제 생성 확인
