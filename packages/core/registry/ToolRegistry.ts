import type { ITool } from '../interfaces/ITool';

export class ToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
    if (this.tools.has(tool.name)) throw new Error(`Tool '${tool.name}' already registered`);
    this.tools.set(tool.name, tool);
  }

  get(name: string): ITool | undefined { return this.tools.get(name); }
  all(): ITool[] { return Array.from(this.tools.values()); }
  list(): string[] { return Array.from(this.tools.keys()); }
}

export const toolRegistry = new ToolRegistry();
