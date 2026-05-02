import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SkillRegistry } from '@airu/core';

const SKILLS_DIR = path.join(os.homedir(), '.airu', 'knowledge', 'project-test-skill', 'skills');

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    fs.rmSync(path.dirname(SKILLS_DIR), { recursive: true, force: true });
    registry = new SkillRegistry('test-skill');
  });

  afterEach(() => {
    fs.rmSync(path.dirname(SKILLS_DIR), { recursive: true, force: true });
  });

  test('returns null for non-existent skill', () => {
    const result = registry.getSkillLabel('P1');
    expect(result).toBeNull();
  });

  test('returns empty list when no skills', () => {
    const skills = registry.list();
    expect(skills).toEqual([]);
  });

  test('creates and reads skill', () => {
    const filepath = registry.createSkill({
      name: 'custom-debug',
      targetPattern: 'P7',
      steps: ['원인 파악', '수정 실행'],
    });
    expect(filepath).toBeTruthy();
    expect(fs.existsSync(filepath)).toBe(true);

    // Reload by creating new instance
    const reloaded = new SkillRegistry('test-skill');
    const skills = reloaded.list();
    expect(skills.length).toBe(1);
    expect(skills[0].targetPattern).toBe('P7');
    expect(skills[0].steps).toBeTruthy();
    expect(skills[0].steps!.length).toBe(2);
    expect(skills[0].steps![0].label).toBe('원인 파악');
  });

  test('overrides steps for pattern', () => {
    registry.createSkill({
      name: 'custom-explain',
      targetPattern: 'P1',
      steps: ['간단 설명', '상세 설명'],
    });

    const reloaded = new SkillRegistry('test-skill');
    const defaultSteps = [{ label: '기본 단계', methodIds: ['M8'] }];
    const overridden = reloaded.overrideSteps('P1', defaultSteps);
    expect(overridden.length).toBe(2);
    expect(overridden[0].label).toBe('간단 설명');
  });

  test('falls back to default when no skill', () => {
    const defaultSteps = [{ label: '기본', methodIds: ['M1'] }];
    const result = registry.overrideSteps('P1', defaultSteps);
    expect(result).toBe(defaultSteps);
  });

  test('gets skill label for pattern', () => {
    registry.createSkill({
      name: 'custom-explain',
      targetPattern: 'P1',
      steps: ['설명'],
    });

    const reloaded = new SkillRegistry('test-skill');
    const label = reloaded.getSkillLabel('P1');
    expect(label).toBe('custom-explain');
  });

  test('deletes skill', () => {
    registry.createSkill({
      name: 'to-delete',
      targetPattern: 'P3',
      steps: ['단계'],
    });

    const reloaded = new SkillRegistry('test-skill');
    expect(reloaded.list().length).toBe(1);

    const removed = reloaded.removeSkill('to-delete');
    expect(removed).toBe(true);
    expect(reloaded.list().length).toBe(0);
  });

  test('removeSkill returns false for non-existent', () => {
    const removed = registry.removeSkill('nonexistent');
    expect(removed).toBe(false);
  });
});
