/**
 * M10: Creativity (creativity)
 * 새로운 아이디어 생성, 대체안 Brainstorming.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '../core/interfaces/IMethod';

export class CreativityMethod implements IMethod {
  readonly id = 'M10';
  readonly name = 'creativity';
  readonly description = '새로운 아이디어 생성, 대체안 Brainstorming.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Creativity 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'creativity', implemented: false },
    };
  }

  requiredTools(): string[] {
    return [];
  }

  configSchema() {
    return {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean', description: '활성화 여부', default: true },
      },
    };
  }
}
