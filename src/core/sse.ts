/**
 * 공통 SSE 스트림 파서
 * GLM, Ollama 등 OpenAI 호환 SSE 포맷 파싱
 */
import type { StreamChunk, ToolCallDelta } from './provider';

export interface SSEParserOptions {
  /** data: 라인을 JSON으로 파싱 후 처리할 콜백 */
  onParsed: (data: Record<string, unknown>) => StreamChunk | null;
  /** 스트림 종료 신호 */
  doneSignal?: string;
}

/**
 * ReadableStream에서 SSE 데이터를 읽어 StreamChunk로 변환
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: SSEParserOptions,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';
  const doneSignal = options.doneSignal || '[DONE]';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === doneSignal) {
          onChunk({ type: 'done' });
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const chunk = options.onParsed(parsed);
          if (chunk) onChunk(chunk);
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

/**
 * OpenAI 호환 SSE 파서 (GLM, Codex 등)
 * content, thinking, tool_calls delta 지원
 */
export function openaiSSEParser(parsed: Record<string, unknown>): StreamChunk | null {
  const choices = parsed.choices as Array<{
    delta?: {
      content?: string;
      thinking?: string;
      tool_calls?: ToolCallDelta[];
    };
    finish_reason?: string;
  }> | undefined;

  const delta = choices?.[0]?.delta;
  if (!delta) return null;

  // tool_calls delta: 모든 delta를 전달 (index별 구분)
  if (delta.tool_calls && delta.tool_calls.length > 0) {
    return { type: 'tool_call', toolCallDeltas: delta.tool_calls };
  }

  // thinking (GLM 독자 필드)
  if (delta.thinking) {
    return { type: 'thinking', thinking: delta.thinking };
  }

  // content
  if (delta.content) {
    return { type: 'content', content: delta.content };
  }

  return null;
}

/**
 * Ollama SSE 파서
 */
export function ollamaSSEParser(parsed: Record<string, unknown>): StreamChunk | null {
  const message = parsed.message as {
    content?: string;
    tool_calls?: ToolCallDelta[];
  } | undefined;

  if (parsed.done) {
    return { type: 'done' };
  }

  if (message?.tool_calls && message.tool_calls.length > 0) {
    return { type: 'tool_call', toolCallDeltas: message.tool_calls };
  }

  if (message?.content) {
    return { type: 'content', content: message.content };
  }

  return null;
}
