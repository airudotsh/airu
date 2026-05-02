/**
 * M3: Judgment (judgment)
 * 정보 기반 판단, 리스크 평가, 옵션 비교.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class JudgmentMethod implements IMethod {
  readonly id = 'M3';
  readonly userLabel = '방향 결정';
  readonly name = 'judgment';
  readonly description = '정보 기반 판단, 리스크 평가, 옵션 비교.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Judgment 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'judgment', implemented: false },
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
