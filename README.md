# airu

AI agent harness CLI. Pattern recognition, guardrails, tool execution, and reflection — in your terminal.

## Install

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- ZAI GLM API key **or** [Ollama](https://ollama.com) running locally

### From source

```bash
git clone https://github.com/airudotsh/airu.git
cd airu
bun install
bun run build
bun run chat
```

That's it — no global install needed.

## Configure

airu stores config in `~/.airu/`. Create it automatically by running:

```bash
bun run chat
```

### Environment variables

Create `~/.airu/.env`:

```bash
ZAI_GLM_KEY=your_zai_glm_key_here
# Optional:
# OPENAI_API_KEY=your_openai_key_here
```

```bash
chmod 600 ~/.airu/.env
```

### Model configuration

Edit `~/.airu/airu.config.yaml`:

```yaml
# Default provider (glm, openai, ollama)
provider: glm
model: glm-5.1

# Optional: define multiple models, switch with /model <name>
models:
  glm:
    provider: glm
    model: glm-5.1
  ollama-qwen:
    provider: ollama
    model: qwen3.6:35b-a3b
    ollamaUrl: http://localhost:11434
  ollama-gemma:
    provider: ollama
    model: gemma4:26b
    ollamaUrl: http://localhost:11434
```

## Usage

### Interactive chat

```bash
bun run chat          # from repo root
```

### Pipe mode

```bash
echo "list files in src/" | bun run chat
cat code.ts | bun run chat
```

### Commands (inside chat)

| Command | Description |
|---------|-------------|
| `/model <name>` | Switch model (from config models list) |
| `/provider <name>` | Switch provider (glm, openai, ollama) |
| `/clear` | Clear conversation history |
| `/tools` | List registered tools |
| `/methods` | List active methods |
| `/patterns` | Show pattern classification |
| `/reflect` | Show recent reflection reports |
| `/growth` | Show growth tracking status |
| `/exit` | Exit |

## Architecture

**Plugin-based monorepo** — core knows nothing about implementations. Adding a new model = adding one plugin file + two config lines.

```
airu/                          # Bun workspace root
├── packages/
│   ├── core/                  # Zero-dependency core
│   │   ├── interfaces/        # IModelProvider, ITool, IMethod, IPattern
│   │   ├── registry/          # ModelRegistry, MethodRegistry, PatternRegistry
│   │   └── engine/            # Agent, Orchestrator, Guardrails, SessionStore
│   ├── plugins/               # Model + Method + Pattern + Tool implementations
│   │   ├── models/            # GLM, OpenAI, Ollama (one file per provider)
│   │   ├── methods/           # M1~M11 (Perception, Reasoning, Judgment...)
│   │   ├── patterns/          # P1~P18 (18 reactive patterns)
│   │   └── tools/             # terminal, file, web
│   └── cli/                   # Command-line interface
└── config/
    └── default.yaml           # Default config
```

**Pipeline:**

```
User Input
  -> Pattern Classification (P1~P18)
  -> Method Selection (M1~M11)
  -> Tool Agent Loop (terminal, file, web)
  -> Guardrails (iteration/time limits)
  -> Reflection + Growth Tracking
```

**Sessions** — stored as JSON in `~/.airu/sessions/`, auto-trimmed to 100 messages.

**Growth** — repeated patterns are tracked; saved as skill files to `~/.airu/skills/`.

## Security

- API keys stored in `~/.airu/.env` with `0600` permissions
- Sensitive values masked in error messages
- Tool execution requires user confirmation in interactive mode
- `.env` excluded from version control

## Requirements

- Bun >= 1.3
- ZAI GLM API key **or** Ollama at `localhost:11434`
