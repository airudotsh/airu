# airu-cli Sprint 1 Ralph Loop

## Goal
Sprint 1: CLI 채팅 인터페이스 (Commander.js + GLM/Ollama 전환 가능 구조)

## Sprint 1 핵심 원칙
"코어는 인터페이스+레지스트리만, 구현체는 전부 플러그인"

## 구현 구조
packages/
  core/           # 인터페이스, Registry, Config
    src/
      interfaces/ # IModelProvider, IChannel, IContext
      registry.ts # ModelRegistry
      config.ts   # Config 파서
  plugins/
    glm/          # GLM Provider Plugin
    ollama/       # Ollama Provider Plugin
  cli/            # Commander.js CLI + 메인 진입점

## 완료 조건
1. `npx airu chat --model glm-5.1` → GLM 응답
2. `npx airu chat --model ollama:qwen3.6` → Ollama 응답
3. `/model glm-5.1` → 런타임 모델 전환
4. 멀티턴 대화 정상 동작
5. `/help`, `/exit` 커맨드 동작
6. `npx airu chat < prompt.txt` → 파이프 모드
7. airu.config.yaml → 모델/키 설정 가능

## 검증
Claude Code CLI로 각 기능 테스트 후 다음 Sprint로
