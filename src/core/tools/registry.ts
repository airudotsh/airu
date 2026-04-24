/**
 * ToolRegistry - 툴 등록/조회
 */
import type { ITool } from './tool';

export class ToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  all(): ITool[] {
    return Array.from(this.tools.values());
  }

  /** OpenAI function calling 포맷으로 변환 */
  toOpenAiTools(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.all().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema as unknown as Record<string, unknown>,
      },
    }));
  }
}

export const toolRegistry = new ToolRegistry();
