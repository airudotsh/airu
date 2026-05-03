import { describe, test, expect, mock } from 'bun:test';
import { estimateTokens, compressContext, runAgentLoop, toolToOpenAiSchema } from '../packages/core/engine/Agent';

describe('estimateTokens', () => {
  test('calculates tokens for simple messages', () => {
    const messages = [
      { role: 'system' as const, content: 'You are helpful.' },
      { role: 'user' as const, content: 'Hello' },
    ];
    const tokens = estimateTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  test('includes tool_calls arguments in estimate', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: 'Running tool',
        tool_calls: [
          { id: 'c1', type: 'function' as const, function: { name: 'terminal', arguments: '{"command":"ls -la /very/long/path/to/directory"}' } },
        ],
      },
    ];
    const tokens = estimateTokens(messages);
    expect(tokens).toBeGreaterThan(20);
  });
});

describe('compressContext', () => {
  test('returns unchanged if 4 or fewer non-system messages', () => {
    const messages = [
      { role: 'system' as const, content: 'sys' },
      { role: 'user' as const, content: 'a' },
      { role: 'assistant' as const, content: 'b' },
      { role: 'user' as const, content: 'c' },
    ];
    const result = compressContext(messages);
    expect(result).toEqual(messages);
  });

  test('compresses older messages into summary', () => {
    const messages = [
      { role: 'system' as const, content: 'sys' },
      { role: 'user' as const, content: 'first question' },
      { role: 'assistant' as const, content: 'first answer' },
      { role: 'user' as const, content: 'second question' },
      { role: 'assistant' as const, content: 'second answer' },
      { role: 'user' as const, content: 'current question' },
    ];
    const result = compressContext(messages);
    // system + summary + last 4 = 6
    expect(result.length).toBe(6);
    // summary message should contain "이전 대화 요약"
    const summary = result.find((m) => m.content.includes('이전 대화 요약'));
    expect(summary).toBeDefined();
    expect(summary!.role).toBe('system');
  });

  test('preserves tool results in summary', () => {
    const messages = [
      { role: 'system' as const, content: 'sys' },
      { role: 'user' as const, content: 'question 1' },
      { role: 'assistant' as const, content: 'answer 1' },
      { role: 'tool' as const, content: 'file1.txt', tool_call_id: 'c1', name: 'terminal' },
      { role: 'user' as const, content: 'question 2' },
      { role: 'assistant' as const, content: 'answer 2' },
      { role: 'user' as const, content: 'now' },
      { role: 'assistant' as const, content: 'current' },
      { role: 'user' as const, content: 'final' },
    ];
    const result = compressContext(messages);
    const summary = result.find((m) => m.content.includes('이전 대화 요약'));
    expect(summary).toBeDefined();
    expect(summary!.content).toContain('terminal 결과');
  });
});

describe('toolToOpenAiSchema', () => {
  test('converts tool definitions to OpenAI format', () => {
    const tools = [
      {
        name: 'terminal',
        description: 'Execute commands',
        schema: { properties: { command: { type: 'string' } }, required: ['command'] },
      },
    ];
    const schema = toolToOpenAiSchema(tools);
    expect(schema).toHaveLength(1);
    expect(schema[0].type).toBe('function');
    expect(schema[0].function.name).toBe('terminal');
  });
});

describe('runAgentLoop integration', () => {
  test('returns assistant content without stdout pollution', async () => {
    const mockProvider = {
      chat: mock(async (_messages: unknown, opts: { onChunk: (chunk: unknown) => void }) => {
        opts.onChunk({ type: 'content', content: 'Hello response' });
        opts.onChunk({ type: 'done' });
      }),
    };

    const messages = [
      { role: 'system' as const, content: 'You are helpful.' },
      { role: 'user' as const, content: 'Hello' },
    ];

    const result = await runAgentLoop(
      mockProvider as never,
      'test-model',
      messages,
      { silent: true },
    );

    expect(result.content).toBe('Hello response');
    expect(result.hadError).toBeFalsy();
  });

  test('handles tool calls and returns final response', async () => {
    let callCount = 0;
    const mockProvider = {
      chat: mock(async (_messages: unknown, opts: { onChunk: (chunk: unknown) => void }) => {
        callCount++;
        if (callCount === 1) {
          opts.onChunk({ type: 'tool_call', toolCallDelta: { index: 0, id: 'c1', function: { name: 'terminal', arguments: '{"command":"echo hi"}' } } });
          opts.onChunk({ type: 'done' });
        } else {
          opts.onChunk({ type: 'content', content: 'Done!' });
          opts.onChunk({ type: 'done' });
        }
      }),
    };

    const messages = [
      { role: 'user' as const, content: 'Run echo hi' },
    ];

    const result = await runAgentLoop(
      mockProvider as never,
      'test-model',
      messages,
      { silent: true },
    );

    expect(callCount).toBe(2);
    expect(result.content).toBe('Done!');
  });

  test('respects maxTokensEstimate and compresses', async () => {
    const mockProvider = {
      chat: mock(async (_messages: unknown, opts: { onChunk: (chunk: unknown) => void }) => {
        opts.onChunk({ type: 'content', content: 'Short' });
        opts.onChunk({ type: 'done' });
      }),
    };

    const longMessages = [
      { role: 'system' as const, content: 'sys' },
      { role: 'user' as const, content: 'a'.repeat(500) },
      { role: 'assistant' as const, content: 'b'.repeat(500) },
      { role: 'user' as const, content: 'c'.repeat(500) },
      { role: 'assistant' as const, content: 'd'.repeat(500) },
      { role: 'user' as const, content: 'e'.repeat(500) },
      { role: 'assistant' as const, content: 'f'.repeat(500) },
      { role: 'user' as const, content: 'current' },
    ];

    const result = await runAgentLoop(
      mockProvider as never,
      'test-model',
      longMessages,
      { silent: true, maxTokensEstimate: 100 },
    );

    expect(result.content).toBe('Short');
    // compression happened - messages were modified in place
    const summaryMsg = longMessages.find((m) => m.content.includes('이전 대화 요약'));
    expect(summaryMsg).toBeDefined();
  });
});
