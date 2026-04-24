/**
 * Web Tool - 웹 검색 (간이 구현)
 */
import type { ITool, ToolResult } from '../core/tools/tool';

export class WebSearchTool implements ITool {
  readonly name = 'web_search';
  readonly description = 'Search the web for information (requires external search API)';
  readonly schema = {
    type: 'object' as const,
    properties: {
      query: { type: 'string' as const, description: 'Search query' },
      limit: { type: 'number' as const, description: 'Max results (default: 5)' },
    },
    required: ['query'],
  };

  async run(params: Record<string, unknown>): Promise<ToolResult> {
    const query = params.query as string;

    // TODO: 실제 검색 API 연동
    return {
      success: false,
      output: '',
      error: 'Web search not yet implemented. Requires search API key.',
    };
  }
}

export class WebFetchTool implements ITool {
  readonly name = 'web_fetch';
  readonly description = 'Fetch content from a URL';
  readonly schema = {
    type: 'object' as const,
    properties: {
      url: { type: 'string' as const, description: 'URL to fetch' },
      format: { type: 'string' as const, description: 'Output format: "text" or "json"', enum: ['text', 'json'] },
    },
    required: ['url'],
  };

  async run(params: Record<string, unknown>): Promise<ToolResult> {
    const url = params.url as string;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'airu-cli/1.0',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          output: '',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let output: string;

      if (contentType.includes('json') || params.format === 'json') {
        const data = await response.json();
        output = JSON.stringify(data, null, 2);
      } else {
        output = await response.text();
      }

      // 50KB 제한
      if (output.length > 50000) {
        output = output.slice(0, 50000) + '\n... (truncated)';
      }

      return { success: true, output };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  }
}
