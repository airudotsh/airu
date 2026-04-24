/**
 * IMethod - AI 에이전트의 행동 패턴/기능 단위 인터페이스
 * Sprint 3: 11개 메서드 스켈레톤
 */

/** 메서드 입력 */
export interface MethodInput {
  content: string;
  metadata?: Record<string, unknown>;
}

/** 메서드 실행 컨텍스트 */
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

/** 툴 콜 포맷 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** 메서드 출력 */
export interface MethodOutput {
  result: string;
  tools_used: string[];
  metadata?: Record<string, unknown>;
}

/** 메서드 설정 스키마 (OpenAI function calling 스타일) */
export interface MethodConfigSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    default?: unknown;
  }>;
  required?: string[];
}

/** IMethod 인터페이스 */
export interface IMethod {
  readonly id: string;               // "M1", "M2", ...
  readonly name: string;             // "perception", "reasoning", ...
  readonly description: string;
  readonly category: 'common' | 'project';

  /** 기본 활성화 여부 (없으면 true) */
  readonly defaultEnabled?: boolean;

  /** 메서드 실행 */
  execute(input: MethodInput, context: MethodContext): Promise<MethodOutput>;

  /** 이 메서드가 필요한 툴 목록 */
  requiredTools(): string[];

  /** 설정 스키마 */
  configSchema(): MethodConfigSchema;
}
