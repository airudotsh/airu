/**
 * M9: Tools (tools)
 * 터미널, 파일, API 등 외부 도구를 활용하여 작업 수행.
 */
import type { IMethod, MethodInput, MethodContext, MethodOutput } from '@airu/core';

export class ToolsMethod implements IMethod {
  readonly id = 'M9';
  readonly name = 'tools';
  readonly description = '터미널, 파일, API 등 외부 도구를 활용하여 작업 수행.';
  readonly category: 'common' | 'project' = 'common';
  readonly defaultEnabled = false;

  async execute(input: MethodInput, context: MethodContext): Promise<MethodOutput> {
    // Sprint 4+에서 구현
    return {
      result: `[Tools 미구현] 입력: "${input.content.slice(0, 50)}..."`,
      tools_used: [],
      metadata: { method: 'tools', implemented: false },
    };
  }

  requiredTools(): string[] {
    return [];
  }

  configSchema() {
    return {
      type: 'object' as const,
      properties: {
        enabled: { type: 'boolean', description: '활성화 여부', default: false },
      },
    };
  }
}
