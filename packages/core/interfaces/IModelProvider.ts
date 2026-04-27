/**
 * IModelProvider - AI 모델 제공자 인터페이스
 * 코어는 구현체를 모른다. 인터페이스만 정의.
 */

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolCallDelta {
  index?: number;
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

export interface Response {
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number };
}

export interface StreamChunk {
  type: 'content' | 'thinking' | 'done' | 'error' | 'tool_call';
  content?: string;
  thinking?: string;
  error?: string;
  toolCallDelta?: ToolCallDelta;
  toolCallDeltas?: ToolCallDelta[];
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  [key: string]: unknown;
}

export interface IModelProvider {
  readonly name: string;
  readonly type: 'api' | 'local';
  readonly supportedModels: string[];

  chat(messages: Message[], options: {
    model?: string; signal?: AbortSignal;
    onChunk: (chunk: StreamChunk) => void;
    tools?: ToolSchema[];
  }): Promise<void>;

  isAvailable(): Promise<boolean>;
  initialize(config: ProviderConfig): Promise<void>;
  embed?(text: string): Promise<number[]>;
}
