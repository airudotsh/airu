/**
 * Ollama Provider - 로컬 Ollama API
 * Tool calling 지원
 */
import type {
  IModelProvider,
  ProviderConfig,
  Message,
  StreamChunk,
  ToolSchema,
} from '@airu/core';
import { parseSSEStream, ollamaSSEParser } from '@airu/core';
import { loadConfig } from '@airu/core';

export class OllamaProvider implements IModelProvider {
  readonly name = 'ollama';
  readonly type = 'local' as const;
  readonly supportedModels: string[] = [];

  private baseUrl = 'http://localhost:11434';
  private availableModels: string[] = [];

  async initialize(config: ProviderConfig): Promise<void> {
    this.baseUrl = config.baseUrl || this.baseUrl;

    if (!config.baseUrl) {
      const yamlConfig = loadConfig();
      this.baseUrl = yamlConfig.ollamaUrl || this.baseUrl;
    }

    await this.refreshModels();
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async refreshModels(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json() as { models?: Array<{ name: string }> };
        this.availableModels = (data.models || []).map((m) => m.name);
        this.supportedModels.length = 0;
        this.supportedModels.push(...this.availableModels);
      }
    } catch {
      this.supportedModels.length = 0;
    }
  }

  async chat(
    messages: Message[],
    options: {
      model?: string;
      signal?: AbortSignal;
      onChunk: (chunk: StreamChunk) => void;
      tools?: ToolSchema[];
    }
  ): Promise<void> {
    const model = options.model || this.availableModels[0] || 'qwen3.6';
    const { signal, onChunk, tools } = options;

    const controller = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
      };

      // Qwen3.6 + Gemma4: thinking 비활성화 (content에 직접 출력)
      if (model.includes('qwen3') || model.includes('gemma4')) {
        (body as Record<string, unknown>).think = false;
      }

      // Ollama tool calling: tools를 tools 파라미터로 전송
      if (tools && tools.length > 0) {
        body.tools = tools;
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
        // SSE 스트리밍이므로 연결 타임아웃만 설정
      });

      // 연결 후 30초간 데이터가 없으면 타임아웃
      const connectTimeout = setTimeout(() => controller.abort(), 30_000);
      response.body?.getReader().closed.then(() => clearTimeout(connectTimeout)).catch(() => {});

      if (!response.ok) {
        const errorText = await response.text();
        onChunk({ type: 'error', error: `Ollama ${response.status}: ${errorText}` });
        return;
      }

      if (!response.body) {
        onChunk({ type: 'error', error: 'No response body' });
        return;
      }

      await parseSSEStream(response.body.getReader(), {
        onParsed: ollamaSSEParser,
        doneSignal: '__ollama_done__',
      }, onChunk);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        onChunk({ type: 'error', error: 'Request aborted' });
      } else {
        onChunk({ type: 'error', error: (error as Error).message });
      }
    }
  }
}
