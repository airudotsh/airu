import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KnowledgeStore } from '@airu/core';

const TEST_DIR_BASE = path.join(os.tmpdir(), 'airu-test-knowledge');

describe('KnowledgeStore', () => {
  let store: KnowledgeStore;

  beforeEach(() => {
    fs.rmSync(TEST_DIR_BASE, { recursive: true, force: true });
    // Use temp dir by overriding homedir behavior — use projectName for isolation
    store = new KnowledgeStore('test-project');
  });

  afterEach(() => {
    // Clean up the actual .airu/knowledge/project-test-project dir
    const actualDir = path.join(os.homedir(), '.airu', 'knowledge', 'project-test-project');
    fs.rmSync(actualDir, { recursive: true, force: true });
  });

  test('saves and searches session summary', () => {
    const id = store.saveSessionSummary('test-session-123', {
      summary: '테스트 세션 요약 내용',
      learned: ['학습 항목 1'],
      patterns: ['P7'],
      tags: ['테스트', '디버그'],
    });
    expect(id).toBeTruthy();

    const results = store.search('테스트', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.content).toContain('테스트 세션 요약');
  });

  test('saves and searches learned content', () => {
    store.saveLearned({
      topic: '버그 수정 방법',
      content: '이 버그는 타입 오류로 인해 발생한다',
      patterns: ['P3'],
      tags: ['버그', '수정'],
    });

    const results = store.search('버그', 10);
    expect(results.length).toBe(1);
    expect(results[0].entry.title).toBe('버그 수정 방법');
  });

  test('searches by content text', () => {
    store.saveLearned({
      topic: '가이드',
      content: '파일 읽기 기능 사용법',
      patterns: [],
      tags: [],
    });

    const results = store.search('파일', 10);
    expect(results.length).toBe(1);
  });

  test('returns empty for no match', () => {
    store.saveLearned({
      topic: '테스트',
      content: '내용',
      patterns: [],
      tags: ['테스트'],
    });

    const results = store.search('존재하지않는키워드', 10);
    expect(results.length).toBe(0);
  });

  test('returns empty for empty query', () => {
    store.saveLearned({
      topic: '테스트',
      content: '내용',
      patterns: [],
      tags: [],
    });

    const results = store.search('', 10);
    expect(results.length).toBe(0);
  });

  test('getRelevantContext returns formatted string', () => {
    store.saveLearned({
      topic: 'React 패턴',
      content: '커스텀 훅 사용법에 대한 가이드',
      patterns: [],
      tags: ['react'],
    });

    const ctx = store.getRelevantContext('React');
    expect(ctx).toContain('이전 학습 내용');
    expect(ctx).toContain('React 패턴');
  });

  test('getRelevantContext returns empty when no match', () => {
    const ctx = store.getRelevantContext('nonexistent');
    expect(ctx).toBe('');
  });
});
