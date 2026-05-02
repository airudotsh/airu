/**
 * Terminal Tool - 쉘 명령어 실행
 * rtk(Rust Token Killer)가 설치되어 있으면 자동으로 토큰 절약 모드 적용
 */
import type { ITool, ToolResult } from '@airu/core';
import { exec, execSync } from 'child_process';

/** rtk 지원 명령어 목록 (rtk가 필터링하는 명령어) */
const RTK_SUPPORTED = [
  'git', 'gh', 'gt',
  'cargo', 'rustc', 'rustup',
  'npm', 'pnpm', 'npx', 'yarn', 'bun',
  'go',
  'python', 'python3', 'pytest', 'pip', 'ruff', 'mypy',
  'docker', 'kubectl', 'aws',
  'dotnet',
  'rspec', 'rubocop', 'rake',
  'ls', 'tree', 'cat', 'head', 'tail', 'grep', 'rg', 'find',
  'playwright', 'vitest', 'jest',
];

/** rtk 사용 가능 여부 캐시 */
let rtkAvailable: boolean | null = null;

function isRtkAvailable(): boolean {
  if (rtkAvailable !== null) return rtkAvailable;
  try {
    execSync('which rtk 2>/dev/null', { timeout: 2000, stdio: 'pipe' });
    rtkAvailable = true;
  } catch {
    rtkAvailable = false;
  }
  return rtkAvailable;
}

/** 명령어가 rtk 지원인지 확인 */
function isRtkSupported(command: string): boolean {
  const base = command.trim().split(/\s+/)[0];
  return RTK_SUPPORTED.includes(base);
}

/** rtk로 명령어 래핑 */
function wrapWithRtk(command: string): string {
  return `rtk ${command}`;
}

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
    let command = params.command as string;
    const timeoutSeconds = (params.timeout as number) || 30;
    const workdir = params.workdir as string | undefined;

    // rtk 자동 적용: 설치되어 있고 지원 명령어면 래핑
    if (isRtkAvailable() && isRtkSupported(command)) {
      command = wrapWithRtk(command);
    }

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
