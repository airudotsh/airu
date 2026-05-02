# airu Coding Principles

이 프로젝트에 기여하는 모든 에이전트(Claude Code, Codex, OpenCode, airu 내장)가 따라야 할 코딩 원칙.

Source: [Karpathy LLM Coding Principles](https://x.com/karpathy/status/1758098364552315070) / [claudemd](https://github.com/jiayuanjiayuan/claudemd)

## 1. Think Before Coding

코드를 작성하기 전에 반드시:

- **계획을 먼저 제시** — 어떤 파일을, 왜, 어떻게 변경할지 작성 전에 설명
- **가정을 명시** — "아마 이렇게 되어 있을 것 같은데"라면 먼저 확인
- **모호하면 질문** — 추측하지 않음
- **트레이드오프 제시** — 여러 방법이 있으면 장단점을 정리

## 2. Simplicity First

- **최소 코드** — 목표를 달성하는 가장 짧은 코드를 작성
- **과도한 추상화 금지** — "나중에 확장할 수 있게"라는 이유로 미리 복잡하게 만들지 않음
- **불필요한 리팩토링 금지** — 작동하는 코드를 "더 깔끔하게"라는 이유로 재작성하지 않음
- **데드 코드 정리** — 사용하지 않는 코드, 주석처리된 블록은 과감히 제거

## 3. Surgical Changes

- **필요한 부분만 변경** — 작업과 무관한 코드, 포맷, 주석은 건드리지 않음
- **이해 못하면 건드리지 않음** — 코드를 충분히 이해하지 못했으면 변경하지 않고 질문
- **사이드 이펙트 최소화** — 하나의 변경이 다른 부분에 영향을 주지 않게
- **의도치 않은 삭제 금지** — 주석, 빈 줄, 포맷을 "정리"한다고 삭제하지 않음

## 4. Goal-Driven Execution

- **완료 기준을 먼저 정의** — "이 작업이 끝나면 어떤 상태여야 하는가"를 시작 전에 명확히
- **테스트로 검증** — 가능하면 테스트를 먼저 작성하고, 코드가 테스트를 통과하는지 확인
- **달성하면 멈춤** — 목표를 달성했으면 추가 작업하지 않음. "이것도 해두면 좋을 것 같은데" 금지

## 프로젝트 컨벤션

- TypeScript + Bun 모노레포 (packages/core, packages/plugins, packages/cli)
- 인터페이스는 packages/core/interfaces/에, 구현은 packages/plugins/에
- 패키지 간 의존성: cli → core, plugins → core. plugins와 cli는 서로 의존하지 않음
- 빌드: `bun run build`, 실행: `bun run chat`
- 테스트: `bun test`

## 금지 사항

- any 타입 사용 (명시적 타입 필수)
- console.log 디버깅 방치 (디버깅 후 제거)
- 미사용 import 방치
- 거대한 단일 파일 (200줄 이상이면 분리 고려)
