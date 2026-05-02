/**
 * M1: Perception (perception)
 * 사용자 입력에서 핵심 의도, 감정, 맥락을 추출한다.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class PerceptionMethod implements IMethod {
  readonly id = 'M1';
  readonly userLabel = '상황 파악';
  readonly name = 'perception';
  readonly description = '사용자 입력에서 핵심 의도, 감정, 맥락을 추출한다.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Perception 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'perception', implemented: false },
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
