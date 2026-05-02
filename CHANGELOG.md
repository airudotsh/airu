# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-05-03

### Added
- Pattern visualization with user-friendly Korean labels and execution steps
- Knowledge persistence: auto-save sessions, `/save`, `/remember <content>`, `/knowledge` commands
- Custom skill system: override pattern steps via skill files, `/skills` command
- SkillRegistry: auto-load skills from `.airu/knowledge/project-{name}/skills/`
- KnowledgeStore: project-scoped knowledge with keyword search and graph
- rtk (Rust Token Killer) integration: auto-wrap terminal commands when available
- Ink TUI mode: `airu chat --tui` for full-screen terminal UI
- Auto context injection: relevant knowledge injected into system prompt

### Changed
- Package name changed from `@airu/cli` to `airu` for npm global install
- Pattern names now in Korean (P1=설명, P7=디버그, etc.)
- Method user labels: M1=상황 파악, M2=원인 분석, etc.
- README updated for npm install (`npm install -g airu`)

## [0.1.0] - 2026-04-26

### Added
- Chat mode with streaming AI responses
- Pipe mode for shell integration (`echo 'question' | airu chat`)
- Tool execution: terminal commands, file read/write, web search
- 18 pattern recognition (P1-P18) with keyword-based classification
- 11 method skeletons (M1-M11) for agent behavior
- Guardrails: iteration limits, time limits, error classification, auto-retry
- Orchestrator: pattern → method → agent loop → reflection pipeline
- Session persistence: conversation history, reflections, growth tracking
- `/reflect` command: recent reflection reports
- `/growth` command: pattern frequency tracking with suggestions
- Multi-provider support: GLM API, Ollama (local models)
- Onboarding flow for first-time users
- Configuration via YAML + environment variables
