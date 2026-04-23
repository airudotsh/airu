/**
 * Ollama Provider - 로컬 Ollama API
 */
import type { IModelProvider, ProviderConfig, ChatMessage, StreamChunk } from '../core/provider';
import { loadConfig } from '../core/config';

export class OllamaProvider implements IModelProvider {
  readonly name = 'ollama';
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
    messages: ChatMessage[],
    options: {
      model?: string;
      signal?: AbortSignal;
      onChunk: (chunk: StreamChunk) => void;
    }
  ): Promise<void> {
    const model = options.model || this.availableModels[0] || 'qwen3.6';
    const { signal, onChunk } = options;

    const controller = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        onChunk({ type: 'error', error: `Ollama ${response.status}: ${errorText}` });
        return;
      }

      if (!response.body) {
        onChunk({ type: 'error', error: 'No response body' });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              onChunk({ type: 'content', content: parsed.message.content });
            }
            if (parsed.done) {
              onChunk({ type: 'done' });
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      onChunk({ type: 'done' });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        onChunk({ type: 'error', error: 'Request aborted' });
      } else {
        onChunk({ type: 'error', error: (error as Error).message });
      }
    }
  }
}
