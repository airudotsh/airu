/**
 * M8: Communication (communication)
 * 사용자에게 명확하고 적절한 방식으로 결과 전달.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class CommunicationMethod implements IMethod {
  readonly id = 'M8';
  readonly userLabel = '정보 전달';
  readonly name = 'communication';
  readonly description = '사용자에게 명확하고 적절한 방식으로 결과 전달.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Communication 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'communication', implemented: false },
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
