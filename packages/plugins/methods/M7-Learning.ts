/**
 * M7: Learning (learning)
 * 실행 결과에서 학습, 패턴 발견, 개선점 도출.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class LearningMethod implements IMethod {
  readonly id = 'M7';
  readonly userLabel = '검증';
  readonly name = 'learning';
  readonly description = '실행 결과에서 학습, 패턴 발견, 개선점 도출.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Learning 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'learning', implemented: false },
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
