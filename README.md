# airu

AI agent harness CLI. Pattern recognition, guardrails, tool execution, and reflection — in your terminal.

## Install

```bash
bun install
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
ZAI_API_KEY=your-api-key-here
```

For local models (Ollama):

```yaml
provider: ollama
model: qwen3.6:35b-a3b  # or gemma4:26b
```

## Usage

### Interactive Chat

```bash
bun run src/cli.ts chat
```

### Pipe Mode

```bash
echo "list files in src/" | bun run src/cli.ts chat
cat code.ts | bun run src/cli.ts chat
```

### Commands

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
  → Pattern Classification (18 patterns)
  → Method Selection (11 methods)
  → Tool Agent Loop (terminal, file, web)
  → Guardrails (iteration/time limits, error handling)
  → Reflection + Growth Tracking
```

## Requirements

- Bun >= 1.0
- API key (GLM) or Ollama running locally

## License

MIT
