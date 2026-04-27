/// <reference types="node" />
/**
 * Agent - 툴 에이전트 런타임
 * cli.ts에서 분리: 에이전트 루프 + 컨텍스트 압축 + 가드레일
 */
import type {
  IModelProvider,
  Message,
  StreamChunk,
  ToolSchema,
} from '../interfaces/IModelProvider';
import { toolRegistry } from '../registry/ToolRegistry';
import { Guardrails, classifyError, recommendedAction } from './Guardrails';
import type { ExecutionMetrics } from './Guardrails';

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: string;
}

export interface AgentOptions {
  maxToolLoops?: number;
  maxTokensEstimate?: number;
  /** 가드레일 옵션 (Sprint 4) */
  guardrails?: {
    maxIterations?: number;
    warnAtIteration?: number;
    abortAtIteration?: number;
    maxTimeMs?: number;
  };
}

/** 기본값 */
const DEFAULT_MAX_TOOL_LOOPS = 5;
const DEFAULT_MAX_TOKENS = 6000;

/**
 * ITool 메시지 포맷 → OpenAI function calling 포맷 변환
 */
export function toolToOpenAiSchema(tools: { name: string; description: string; schema: { properties: Record<string, unknown>; required?: string[] } }[]): ToolSchema[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.schema.properties,
        required: tool.schema.required,
      },
    },
  }));
}

/**
 * messages 배열의 대략적 토큰 수 추정
 * content + tool_calls.arguments 길이를 반영
 */
export function estimateTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => {
    let size = Math.ceil(m.content.length * 1.5);
    if (m.tool_calls) {
      for (const tc of m.tool_calls) {
        size += Math.ceil((tc.function.arguments?.length || 0) * 1.5);
      }
    }
    return sum + size;
  }, 0);
}

/**
 * 오래된 대화를 압축하여 컨텍스트 크기 줄이기
 * 최근 N개 메시지 + 이전 대화 요약으로 대체
 */
export function compressContext(messages: Message[]): Message[] {
  const system = messages.filter((m) => m.role === 'system');
  const nonSystem = messages.filter((m) => m.role !== 'system');

  if (nonSystem.length <= 4) {
    return messages; // 압축 불필요
  }

  // 마지막 4개 메시지 보존
  const recent = nonSystem.slice(-4);
  const older = nonSystem.slice(0, -4);

  // 요약 대상: tool_calls가 있으면 tool 이름만, content는 앞부분만
  const summaryParts: string[] = [];
  for (const msg of older) {
    if (msg.role === 'tool') {
      summaryParts.push(`[${msg.name} 결과: ${msg.content.slice(0, 60)}${msg.content.length > 60 ? '...' : ''}]`);
    } else {
      summaryParts.push(`[${msg.role}: ${msg.content.slice(0, 80)}${msg.content.length > 80 ? '...' : ''}]`);
    }
  }

  const summary = {
    role: 'system' as const,
    content: `이전 대화 요약 (${older.length}개 메시지): ${summaryParts.join(' | ')}`,
  };

  return [...system, summary, ...recent];
}

/**
 * 툴 에이전트 메시지 전송 (tool calling 포함)
 */
export async function agentChat(
  provider: IModelProvider,
  model: string,
  messages: Message[],
  options: { signal?: AbortSignal } = {},
): Promise<{
  content: string;
  toolCalls: ToolCallResult[];
  error?: string;
}> {
  const tools = toolRegistry.all();
  const openAiTools = toolToOpenAiSchema(tools);

  let fullResponse = '';
  // 다중 툴 콜 지원: index별 Map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingCalls: Map<number, any> = new Map();
  let hasError: string | null = null;

  await provider.chat(messages, {
    model,
    signal: options.signal,
    tools: openAiTools.length > 0 ? openAiTools : undefined,
    onChunk: (chunk: StreamChunk) => {
      switch (chunk.type) {
        case 'content':
          if (chunk.content) fullResponse += chunk.content;
          break;
        case 'tool_call': {
          const deltas = chunk.toolCallDelta
            ? [chunk.toolCallDelta]
            : chunk.toolCallDeltas || [];

          for (const delta of deltas) {
            const idx = delta.index ?? 0;
            if (!pendingCalls.has(idx)) {
              pendingCalls.set(idx, { id: delta.id || '', name: '', arguments: '' });
            }
            const call = pendingCalls.get(idx)!;
            if (delta.id) call.id = delta.id;
            if (delta.function?.name) call.name = delta.function.name;
            if (delta.function?.arguments) call.arguments += delta.function.arguments;
          }
          break;
        }
        case 'error':
          hasError = chunk.error ?? 'unknown error';
          break;
        case 'done':
        case 'thinking':
          break;
      }
    },
  });

  if (hasError) {
    return { content: fullResponse, toolCalls: [], error: hasError };
  }

  const toolCalls: ToolCallResult[] = Array.from(pendingCalls.values())
    .filter((call) => call.name)
    .map((call) => ({
      id: call.id || `call_${Date.now()}`,
      name: call.name,
      arguments: call.arguments,
    }));

  return { content: fullResponse, toolCalls };
}

/**
 * 툴 실행
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; output: string; error?: string }> {
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    return { success: false, output: '', error: `Unknown tool: ${toolName}` };
  }
  try {
    const result = await tool.run(args);
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, output: '', error: message };
  }
}

/**
 * 전체 툴 에이전트 루프: 메시지 전송 → 툴 감지 → 실행 → 재호출
 * Sprint 4: Guardrails 통합 (시간/반복 한도, 에러 분류, 자동 재시도)
 * @returns 최종 assistant 응답 content + 메트릭
 */
export async function runAgentLoop(
  provider: IModelProvider,
  model: string,
  messages: Message[],
  options: AgentOptions & { signal?: AbortSignal; confirmTool?: (toolName: string, args: Record<string, unknown>) => Promise<boolean> } = {},
): Promise<{ content: string; hadError?: boolean; metrics?: ExecutionMetrics }> {
  const maxTokens = options.maxTokensEstimate ?? DEFAULT_MAX_TOKENS;
  const guardrails = new Guardrails(options.guardrails ?? {});

  // 컨텍스트 압축 체크
  if (estimateTokens(messages) > maxTokens) {
    const compressed = compressContext(messages);
    messages.length = 0;
    messages.push(...compressed);
    process.stdout.write('\x1b[2m[대화가 압축되었습니다]\x1b[0m ');
  }

  let assistantContent = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Guardrails 반복 체크
    const { continue: shouldContinue, reason } = await guardrails.next();

    if (reason) {
      if (reason.includes('초과')) {
        process.stdout.write(`\r\x1b[31m${reason}\x1b[0m\n`);
        return { content: '', hadError: true, metrics: guardrails.logger.getMetrics() };
      } else {
        process.stdout.write(`\r\x1b[33m${reason}\x1b[0m `);
      }
    }

    if (!shouldContinue) {
      process.stdout.write(`\r\x1b[31m${reason || '가드레일 중단'}\x1b[0m\n`);
      return { content: '', hadError: true, metrics: guardrails.logger.getMetrics() };
    }

    const { content, toolCalls, error } = await agentChat(provider, model, messages, {
      signal: options.signal,
    });

    // provider/network error → Guardrails 에러 분류 + 자동 재시도
    if (error) {
      const { shouldRetry, delayMs, message } = await guardrails.handleError(error);
      if (shouldRetry) {
        process.stdout.write(`\r\x1b[33m${message}\x1b[0m `);
        if (delayMs > 0) await sleep(delayMs);
        continue;
      } else {
        process.stdout.write(`\r\x1b[31m${message}\x1b[0m\n`);
        return { content: '', hadError: true, metrics: guardrails.logger.getMetrics() };
      }
    }

    // 빈 응답 → 종료
    if (!content && toolCalls.length === 0) {
      assistantContent = '';
      break;
    }

    assistantContent = content;

    // 툴 콜 없으면 종료
    if (toolCalls.length === 0) {
      process.stdout.write(assistantContent);
      process.stdout.write('\n');
      break;
    }

    // assistant + tool_calls 메시지를 툴 결과보다 먼저 추가
    messages.push({
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    });

    // 각 툴 실행
    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(tc.arguments || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        args = {};
      }

      process.stdout.write('\r\x1b[K');
      console.log(`\x1b[33m[툴 실행 중: ${tc.name}]${tc.name === 'terminal' ? ` → ${String(args.command || '').slice(0, 80)}` : ''}\x1b[0m`);

      // 툴 실행 승인 (대화형 모드에서만)
      if (options.confirmTool) {
        const approved = await options.confirmTool(tc.name, args);
        if (!approved) {
          messages.push({
            role: 'tool',
            content: 'Error: 사용자가 실행을 거부했습니다.',
            tool_call_id: tc.id,
            name: tc.name,
          });
          continue;
        }
      }

      const result = await executeToolCall(tc.name, args);

      // 툴 실행 실패 → Guardrails 에러 분류
      let finalResult = result;
      if (!result.success && result.error) {
        const { shouldRetry, delayMs, message } = await guardrails.handleError(result.error);
        if (shouldRetry) {
          process.stdout.write(`\r\x1b[33m${message}\x1b[0m `);
          if (delayMs > 0) await sleep(delayMs);
          // 재시도: 같은 툴 한 번 더 — 성공하면 그 결과 사용
          const retryResult = await executeToolCall(tc.name, args);
          if (retryResult.success) {
            finalResult = retryResult;
          } else {
            guardrails.logger.log({ type: 'error_classified', error: retryResult.error || '', category: 'tool', action: 'fallback' });
          }
        }
      }

      messages.push({
        role: 'tool',
        content: finalResult.success ? finalResult.output : `Error: ${finalResult.error || 'unknown'}`,
        tool_call_id: tc.id,
        name: tc.name,
      });
    }

    process.stdout.write('\x1b[35m...\x1b[0m ');
  }

  if (assistantContent) {
    messages.push({ role: 'assistant', content: assistantContent });
  }

  return { content: assistantContent, metrics: guardrails.logger.getMetrics() };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
