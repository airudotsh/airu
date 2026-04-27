/**
 * M6: Monitoring (monitoring)
 * 실행 과정 추적, 이상 감지, 진행률 측정.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class MonitoringMethod implements IMethod {
  readonly id = 'M6';
  readonly name = 'monitoring';
  readonly description = '실행 과정 추적, 이상 감지, 진행률 측정.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Monitoring 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'monitoring', implemented: false },
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
