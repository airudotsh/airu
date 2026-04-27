export interface MethodInput {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface MethodContext {
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
  }>;
  config: Record<string, unknown>;
  tools: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface MethodOutput {
  result: string;
  tools_used: string[];
  metadata?: Record<string, unknown>;
}

export interface MethodConfigSchema {
  type: 'object';
  properties: Record<string, { type: string; description: string; default?: unknown }>;
  required?: string[];
}

export interface IMethod {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'common' | 'project';
  readonly defaultEnabled?: boolean;
  execute(input: MethodInput, context: MethodContext): Promise<MethodOutput>;
  requiredTools(): string[];
  configSchema(): MethodConfigSchema;
}
