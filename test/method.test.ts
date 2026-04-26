import { describe, test, expect } from 'bun:test';
import { MethodRegistry } from '../src/core/method-registry';
import type { IMethod } from '../src/core/interfaces/IMethod';

describe('MethodRegistry', () => {
  const registry = new MethodRegistry();

  const mockMethod: IMethod = {
    id: 'M1',
    name: 'Perception',
    description: 'Input processing and context awareness',
    category: 'common',
    defaultEnabled: true,
    tools: () => [],
    execute: async () => 'perceived',
  };

  test('register and get by name', () => {
    registry.register(mockMethod);
    expect(registry.get('Perception')).toEqual(mockMethod);
  });

  test('get non-existent returns undefined', () => {
    expect(registry.get('NoMethod')).toBeUndefined();
  });

  test('listEnabled returns only enabled methods', () => {
    const disabled: IMethod = {
      id: 'M2', name: 'Test', description: 'test', category: 'project',
      defaultEnabled: false, tools: () => [], execute: async () => '',
    };
    registry.register(disabled);
    const enabled = registry.listEnabled();
    expect(enabled.some(m => m.id === 'M1')).toBe(true);
    expect(enabled.some(m => m.id === 'M2')).toBe(false);
  });

  test('duplicate registration throws', () => {
    const dup: IMethod = {
      id: 'M1_dup', name: 'Perception', description: 'dup', category: 'common',
      defaultEnabled: true, tools: () => [], execute: async () => '',
    };
    expect(() => registry.register(dup)).toThrow();
  });
});
