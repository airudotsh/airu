import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { SessionStore } from '@airu/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SessionStore', () => {
  const testDir = path.join(os.tmpdir(), 'airu-test-sessions-' + Date.now());
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore(testDir);
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('create session with id', () => {
    const session = store.create('test-session');
    expect(session.id).toBe('test-session');
    expect(session.messages).toEqual([]);
  });

  test('create session without id generates one', () => {
    const session = store.create();
    expect(session.id).toMatch(/^session_/);
  });

  test('load returns null for non-existent', () => {
    expect(store.load('nope')).toBeNull();
  });

  test('load returns saved session', () => {
    store.create('load-test');
    const loaded = store.load('load-test');
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('load-test');
  });

  test('appendMessage adds and persists', () => {
    const session = store.create('msg-test');
    store.appendMessage(session, { role: 'user', content: 'hello' });
    const loaded = store.load('msg-test');
    expect(loaded!.messages.length).toBe(1);
    expect(loaded!.messages[0].content).toBe('hello');
  });

  test('appendMessage trims when over 100', () => {
    const session = store.create('trim-test');
    for (let i = 0; i < 120; i++) {
      store.appendMessage(session, { role: 'user', content: `msg ${i}` });
    }
    expect(session.messages.length).toBeLessThanOrEqual(100);
  });

  test('delete removes session file', () => {
    store.create('del-test');
    expect(store.load('del-test')).not.toBeNull();
    expect(store.delete('del-test')).toBe(true);
    expect(store.load('del-test')).toBeNull();
  });
});
