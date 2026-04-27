/**
 * M11: Knowledge (knowledge)
 * 외부 지식/문서 검색, 사실 검증, 정보 조립.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class KnowledgeMethod implements IMethod {
  readonly id = 'M11';
  readonly name = 'knowledge';
  readonly description = '외부 지식/문서 검색, 사실 검증, 정보 조립.';
  readonly category: 'common' | 'project' = 'common';

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Knowledge 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'knowledge', implemented: false },
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
