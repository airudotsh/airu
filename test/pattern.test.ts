import { describe, test, expect } from 'bun:test';
import { PatternRegistry } from '@airu/core';
import { registerAllPatterns } from '@airu/plugins';

describe('PatternRegistry', () => {
  const registry = new PatternRegistry();
  const patterns = registerAllPatterns();
  for (const p of patterns) registry.register(p);

  test('classify: Explain pattern', () => {
    const result = registry.classify('이 코드 설명해줘');
    expect(result).not.toBeNull();
    expect(result!.pattern.id).toBe('P1');
    expect(result!.score).toBeGreaterThanOrEqual(0.3);
  });

  test('classify: Debug pattern', () => {
    const result = registry.classify('이 버그 고쳐줘');
    expect(result).not.toBeNull();
    expect(result!.pattern.id).toBe('P7');
  });

  test('classify: tool-related input gets a match', () => {
    const result = registry.classify('이 코드에 버그가 있는데 디버깅해줘');
    expect(result).not.toBeNull();
  });

  test('classify: no match below threshold', () => {
    const result = registry.classify('ㅎㅎ');
    expect(result).toBeNull();
  });

  test('classifyTop returns sorted results', () => {
    const results = registry.classifyTop('이 코드 설명해주고 버그도 고쳐줘', 3);
    expect(results.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test('list returns all registered patterns', () => {
    const list = registry.list();
    expect(list.length).toBeGreaterThanOrEqual(18);
  });
});
