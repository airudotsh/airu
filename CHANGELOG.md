# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
