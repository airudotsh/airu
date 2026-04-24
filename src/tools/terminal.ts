/**
 * Terminal Tool - 쉘 명령어 실행
 */
import type { ITool, ToolResult } from '../core/tools/tool';
import { exec } from 'child_process';

export class TerminalTool implements ITool {
  readonly name = 'terminal';
  readonly description = 'Execute a shell command and return the output';
  readonly schema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string' as const,
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'number' as const,
        description: 'Timeout in seconds (default: 30)',
      },
      workdir: {
        type: 'string' as const,
        description: 'Working directory for the command',
      },
    },
    required: ['command'],
  };

  async run(params: Record<string, unknown>): Promise<ToolResult> {
    const command = params.command as string;
    const timeoutSeconds = (params.timeout as number) || 30;
    const workdir = params.workdir as string | undefined;

    return new Promise((resolve) => {
      exec(
        command,
        {
          timeout: timeoutSeconds * 1000,
          maxBuffer: 1024 * 1024,
          cwd: workdir,
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              output: stdout || '',
              error: stderr || error.message,
            });
            return;
          }

          const output = stdout.toString();
          const errOutput = stderr.toString();

          resolve({
            success: true,
            output: output + (errOutput ? `\n[stderr]\n${errOutput}` : ''),
          });
        }
      );
    });
  }
}
