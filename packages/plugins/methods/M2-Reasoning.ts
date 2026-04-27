/**
 * M2: Reasoning (reasoning)
 * 논리적 추론, 연역, 귀납, 인과관계 분석.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class ReasoningMethod implements IMethod {
  readonly id = 'M2';
  readonly name = 'reasoning';
  readonly description = '논리적 추론, 연역, 귀납, 인과관계 분석.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Reasoning 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'reasoning', implemented: false },
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
