/**
 * ITool - 툴 인터페이스
 * 에이전트가 사용하는 모든 툴은 이 인터페이스를 구현
 */
export interface ToolSchema {
  type: 'object';
  properties: Record<string, ToolPropertySchema>;
  required?: string[];
}

export interface ToolPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolPropertySchema;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly schema: ToolSchema;

  run(params: Record<string, unknown>): Promise<ToolResult>;
}
