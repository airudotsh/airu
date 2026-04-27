# airu

AI agent harness CLI. Pattern recognition, guardrails, tool execution, and reflection — in your terminal.

## Install

### From npm (coming soon)

```bash
bun add -g airu
airu chat
```

### From source (development)

```bash
git clone https://github.com/airouz/airu.git
cd airu
bun install
bun run chat
```

## Configure

Create `~/.airu/airu.config.yaml`:

```yaml
provider: glm          # glm or ollama
model: glm-5.1         # model name
systemPrompt: ""       # optional system prompt
```

Set your API key in `~/.airu/.env`:

```
ZAI_API_KEY=your_key_here
```

For local models (Ollama):

```yaml
provider: ollama
model: qwen3.6:35b-a3b  # or gemma4:26b
ollamaUrl: http://localhost:11434
```

See `.env.example` for reference.

## Usage

### Interactive Chat

```bash
airu chat
# or in development:
bun run chat
```

### Pipe Mode

```bash
echo "list files in src/" | airu chat
cat code.ts | airu chat
```

### Commands (inside chat)

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/model <name>` | Switch model |
| `/provider <name>` | Switch provider (glm, ollama) |
| `/clear` | Clear conversation history |
| `/tools` | List registered tools |
| `/methods` | List active methods |
| `/patterns` | Show pattern classification results |
| `/reflect` | Show recent reflection reports |
| `/growth` | Show growth tracking status |
| `/exit` | Exit |

## Architecture

```
User Input
  -> Pattern Classification (18 patterns)
  -> Method Selection (11 methods)
  -> Tool Agent Loop (terminal, file, web)
  -> Guardrails (iteration/time limits, error handling)
  -> Reflection + Growth Tracking
```

**Sessions** are stored as JSON in `~/.airu/sessions/`. Each session preserves full message history with automatic trimming (100 messages max, trimmed to 80).

**Dependencies** are minimal by design: only `commander` as external dependency. YAML parsing, SSE streaming, and HTTP calls use native implementations (Bun/Node built-ins).

## Security

- API keys are stored in `~/.airu/.env` with `0600` file permissions
- Sensitive data is automatically masked in error messages
- Tool execution (terminal commands) requires user confirmation in interactive mode
- `.env` is excluded from version control via `.gitignore`

## Requirements

- Bun >= 1.0
- API key (GLM) or Ollama running locally

## License

MIT
