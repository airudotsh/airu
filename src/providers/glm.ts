/**
 * GLM Provider - ZAI GLM API
 */
import type { IModelProvider, ProviderConfig, ChatMessage, StreamChunk } from '../core/provider';
import { parseSSEStream, openaiSSEParser } from '../core/sse';
import { loadConfig } from '../core/config';

export class GLMProvider implements IModelProvider {
  readonly name = 'glm';
  readonly supportedModels = [
    'glm-5.1', 'glm-5', 'glm-4-plus', 'glm-4', 'glm-4-flash',
    'glm-4v-plus', 'glm-4v-flash', 'cogview-3', 'cogview-4',
  ];

  private apiKey = '';
  private baseUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  private defaultModel = 'glm-5.1';

  async initialize(config: ProviderConfig): Promise<void> {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || this.baseUrl;

    if (!this.apiKey) {
      const yamlConfig = loadConfig();
      this.apiKey = yamlConfig.glmApiKey || process.env.ZAI_API_KEY || '';
    }

    if (config.model) {
      this.defaultModel = config.model;
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  async chat(
    messages: ChatMessage[],
    options: {
      model?: string;
      signal?: AbortSignal;
      onChunk: (chunk: StreamChunk) => void;
    }
  ): Promise<void> {
    const model = options.model || this.defaultModel;
    const { signal, onChunk } = options;

    const controller = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 8192,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        onChunk({ type: 'error', error: `HTTP ${response.status}: ${errorText}` });
        return;
      }

      if (!response.body) {
        onChunk({ type: 'error', error: 'No response body' });
        return;
      }

      await parseSSEStream(response.body.getReader(), {
        onParsed: openaiSSEParser,
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
