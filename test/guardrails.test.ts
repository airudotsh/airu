import { describe, test, expect } from 'bun:test';
import { classifyError } from '@airu/core';

describe('classifyError', () => {
  test('network: ECONNREFUSED', () => {
    expect(classifyError('ECONNREFUSED connection refused')).toBe('network');
  });

  test('network: network error', () => {
    expect(classifyError('network error')).toBe('network');
  });

  test('timeout', () => {
    expect(classifyError('timeout of 5000ms exceeded')).toBe('timeout');
  });

  test('auth: 401', () => {
    expect(classifyError('401 Unauthorized access')).toBe('auth');
  });

  test('rate limit: 429', () => {
    expect(classifyError('429 Too Many Requests')).toBe('rate_limit');
  });

  test('validation: malformed', () => {
    expect(classifyError('malformed request body')).toBe('validation');
  });

  test('tool: execute failed', () => {
    expect(classifyError('execute command failed')).toBe('tool');
  });

  test('unknown', () => {
    expect(classifyError('something completely unexpected')).toBe('unknown');
  });
});
