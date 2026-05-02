/**
 * M4: Planning (planning)
 * 목표 분해, 작업 순서 계획, 마일스톤 설정.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class PlanningMethod implements IMethod {
  readonly id = 'M4';
  readonly userLabel = '계획 수립';
  readonly name = 'planning';
  readonly description = '목표 분해, 작업 순서 계획, 마일스톤 설정.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Planning 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'planning', implemented: false },
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
