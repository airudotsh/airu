/**
 * OpenAI Provider - OpenAI API + Codex
 * Sprint 1 산출물
 */
import type { IModelProvider, ProviderConfig, Message, StreamChunk, ToolSchema } from '@airu/core';

export class OpenAIProvider implements IModelProvider {
  readonly name = 'openai';
  readonly type = 'api' as const;
  readonly supportedModels = ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'codex-mini', 'codex'];

  private apiKey = '';
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  async initialize(config: ProviderConfig): Promise<void> {
    this.apiKey = (config.apiKey || process.env.OPENAI_API_KEY || '') as string;
    this.baseUrl = (config.baseUrl || this.baseUrl) as string;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(
    messages: Message[],
    options: {
      model?: string; signal?: AbortSignal;
      onChunk: (chunk: StreamChunk) => void;
      tools?: ToolSchema[];
    }
  ): Promise<void> {
    const model = options.model || 'gpt-4o';

    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.name ? { name: m.name } : {}),
      })),
      stream: true,
    };

    if (options.tools && options.tools.length > 0) body.tools = options.tools;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      options.onChunk({ type: 'error', error: `OpenAI API error ${response.status}: ${errorText}` });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { options.onChunk({ type: 'error', error: 'No response body' }); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') { options.onChunk({ type: 'done' }); continue; }
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0];
            if (chunk?.delta?.content) {
              options.onChunk({ type: 'content', content: chunk.delta.content });
            }
            if (chunk?.delta?.tool_calls) {
              for (const tc of chunk.delta.tool_calls) {
                options.onChunk({ type: 'tool_call', toolCallDelta: {
                  index: tc.index,
                  id: tc.id,
                  function: { name: tc.function?.name, arguments: tc.function?.arguments || '' },
                }});
              }
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } finally {
      reader.releaseLock();
    }

    options.onChunk({ type: 'done' });
  }
}
