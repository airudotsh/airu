/**
 * IModelProvider - AI 모델 제공자 인터페이스
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** SSE 파싱 중 수집되는 툴 콜 delta */
export interface ToolCallDelta {
  index?: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface StreamChunk {
  type: 'content' | 'thinking' | 'done' | 'error' | 'tool_call';
  content?: string;
  thinking?: string;
  error?: string;
  toolCallDelta?: ToolCallDelta;
  /** 다중 tool_calls delta (index별 구분, SSE 파서가 모든 delta를 전달) */
  toolCallDeltas?: ToolCallDelta[];
}

export interface IModelProvider {
  readonly name: string;
  readonly supportedModels: string[];

  chat(
    messages: ChatMessage[],
    options: {
      model?: string;
      signal?: AbortSignal;
      onChunk: (chunk: StreamChunk) => void;
      /** 툴 스키마 (OpenAI function_calling 포맷) */
      tools?: ToolSchema[];
    }
  ): Promise<void>;

  isAvailable(): Promise<boolean>;
  initialize(config: ProviderConfig): Promise<void>;
}

/** OpenAI function calling 포맷 */
export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}
