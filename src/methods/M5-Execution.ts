/**
 * M5: Execution (execution)
 * 계획된 작업 실제 수행, 단계별 실행.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '../core/interfaces/IMethod';

export class ExecutionMethod implements IMethod {
  readonly id = 'M5';
  readonly name = 'execution';
  readonly description = '계획된 작업 실제 수행, 단계별 실행.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Execution 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'execution', implemented: false },
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
