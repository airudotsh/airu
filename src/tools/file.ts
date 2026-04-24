/**
 * File Tool - 파일 읽기/쓰기/검색
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { ITool, ToolResult } from '../core/tools/tool';

export class FileReadTool implements ITool {
  readonly name = 'file_read';
  readonly description = 'Read the contents of a file';
  readonly schema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to read' },
      offset: { type: 'number' as const, description: 'Line to start reading from (1-indexed)' },
      limit: { type: 'number' as const, description: 'Maximum number of lines to read' },
    },
    required: ['path'],
  };

  async run(params: Record<string, unknown>): Promise<ToolResult> {
    const filePath = params.path as string;
    const offset = (params.offset as number) || 1;
    const limit = (params.limit as number) || 500;

    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, output: '', error: `File not found: ${filePath}` };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(0, offset - 1);
      const end = Math.min(lines.length, start + limit);
      const selectedLines = lines.slice(start, end);

      const numberedOutput = selectedLines
        .map((line, i) => `${start + i + 1}|${line}`)
        .join('\n');

      return {
        success: true,
        output: numberedOutput,
      };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  }
}

export class FileWriteTool implements ITool {
  readonly name = 'file_write';
  readonly description = 'Write content to a file (creates parent directories)';
  readonly schema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string' as const, description: 'File path to write' },
      content: { type: 'string' as const, description: 'Content to write' },
      append: { type: 'boolean' as const, description: 'Append instead of overwrite' },
    },
    required: ['path', 'content'],
  };

  async run(params: Record<string, unknown>): Promise<ToolResult> {
    const filePath = params.path as string;
    const content = params.content as string;
    const append = params.append as boolean;

    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (append) {
        fs.appendFileSync(filePath, content);
      } else {
        fs.writeFileSync(filePath, content);
      }

      return { success: true, output: `Written ${content.length} bytes to ${filePath}` };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  }
}

export class FileSearchTool implements ITool {
  readonly name = 'file_search';
  readonly description = 'Search for files by name pattern or search file contents by regex';
  readonly schema = {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string' as const, description: 'File glob pattern or regex' },
      directory: { type: 'string' as const, description: 'Directory to search in' },
      mode: {
        type: 'string' as const,
        description: 'Search mode: "files" (by name) or "content" (by regex)',
        enum: ['files', 'content'],
      },
    },
    required: ['pattern'],
  };

  async run(params: Record<string, unknown>): Promise<ToolResult> {
    const pattern = params.pattern as string;
    const directory = (params.directory as string) || '.';
    const mode = (params.mode as string) || 'files';

    try {
      let cmd: string;

      if (mode === 'content') {
        cmd = `grep -rn "${pattern}" "${directory}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" --include="*.md" --include="*.json" --include="*.yaml" --include="*.yml" 2>/dev/null | head -50`;
      } else {
        cmd = `find "${directory}" -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -50`;
      }

      const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
      return { success: true, output: output || 'No results found' };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  }
}
