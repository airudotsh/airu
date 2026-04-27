# airu

The personalized harness layer for AI coding agents — swap methods, swap tools, keep your flow.

## Quick Start

### Linux / macOS / WSL

```bash
bun install -g @airu/cli
airu chat
```

### Windows (Native)

```powershell
bun install -g @airu/cli
airu chat
```

### From Source (Development)

```bash
git clone https://github.com/airudotsh/airu.git
cd airu
bun install
bun run build
bun run chat
```

## Prerequisites

- [Bun](https://bun.sh) >= 1.3 (install: `curl -fsSL https://bun.sh/install | bash`)
- ZAI GLM API key **or** [Ollama](https://ollama.com) running locally

## Configure

airu stores all config in `~/.airu/`. First run creates it automatically.

### API Key

Create `~/.airu/.env`:

```bash
ZAI_GLM_KEY=your_key_here
```

```bash
chmod 600 ~/.airu/.env   # Linux/macOS only
```

### Model Configuration

Edit `~/.airu/airu.config.yaml`:

```yaml
# Default provider
provider: glm
model: glm-5.1

# Switch between models with /model <name>
models:
  glm:
    provider: glm
    model: glm-5.1
  openai:
    provider: openai
    model: gpt-4o
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

### Interactive Chat

```bash
airu chat
```

### Pipe Mode

```bash
echo "list files in src/" | airu chat
cat code.ts | airu chat
```

### In-Chat Commands

| Command | Description |
|---------|-------------|
| `/model <name>` | Switch model (from config) |
| `/provider <name>` | Switch provider (glm, openai, ollama) |
| `/clear` | Clear conversation history |
| `/tools` | List registered tools |
| `/methods` | List active methods |
| `/patterns` | Show pattern classification |
| `/reflect` | Show recent reflection reports |
| `/growth` | Show growth tracking status |
| `/exit` | Exit |

## Architecture

```
airu/
├── packages/
│   ├── core/        # Zero-dependency core
│   │   ├── interfaces/  # IModelProvider, ITool, IMethod, IPattern
│   │   ├── registry/    # ModelRegistry, MethodRegistry, PatternRegistry
│   │   └── engine/      # Agent, Orchestrator, Guardrails, SessionStore
│   ├── plugins/     # All implementations
│   │   ├── models/  # GLM, OpenAI, Ollama
│   │   ├── methods/ # M1~M11 (Perception, Reasoning, Judgment...)
│   │   ├── patterns/ # P1~P18 (18 reactive patterns)
│   │   └── tools/   # terminal, file, web
│   └── cli/         # Command-line interface
└── config/
    └── default.yaml
```

**Pipeline:** User Input → Pattern Classification (P1~P18) → Method Selection (M1~M11) → Tool Agent Loop → Guardrails → Reflection + Growth Tracking

## Requirements

- Bun >= 1.3 or Node >= 18
- ZAI GLM API key **or** Ollama at `localhost:11434`

## License

MIT
