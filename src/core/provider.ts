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

export interface StreamChunk {
  type: 'content' | 'thinking' | 'done' | 'error';
  content?: string;
  thinking?: string;
  error?: string;
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
    }
  ): Promise<void>;
  
  isAvailable(): Promise<boolean>;
  initialize(config: ProviderConfig): Promise<void>;
}
