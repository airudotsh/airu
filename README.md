# airu

AI 에이전트 하네스. 로컬 LLM + 툴 호출 + 지식 영속화 + 메서드/패턴 시스템.

## 설치

```bash
npm install -g airu
```

## 사용법

```bash
# 대화형 모드
airu

# 파이프 모드 (stdin → stdout)
echo "현재 디렉토리 파일 목록" | airu

# TUI 모드 (ink 기반)
airu --tui
```

## 명령어 (대화형 모드)

| 명령 | 설명 |
|------|------|
| `/save` | 현재 세션 요약을 지식에 저장 |
| `/remember <내용>` | 특정 내용을 지식에 저장 |
| `/knowledge` | 저장된 지식 목록 조회 |
| `/skills` | 등록된 스킬 목록 조회 |
| `/methods` | 사용 가능한 메서드 조회 |
| `/patterns` | 패턴 목록과 단계 조회 |

## `~/.airu/` 디렉토리 구조

```
~/.airu/
├── .env                    # API 키 (GLM_API_KEY 등)
├── knowledge/              # 지식 베이스 (Obsidian 호환 마크다운)
│   └── project-{name}/
│       ├── session-{id}.md # 세션 요약
│       └── learned-{id}.md # 학습한 내용
└── skills/                 # 커스텀 스킬
    └── {skill-name}.md     # 패턴 steps 오버라이드
```

## 설정

`~/.airu/.env` 파일에 API 키를 설정합니다:

```env
GLM_API_KEY=your-key-here
```

## 라이선스

ISC
