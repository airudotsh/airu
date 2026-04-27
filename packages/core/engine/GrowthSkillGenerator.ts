/// <reference types="node" />
/**
 * GrowthSkillGenerator — 반복 패턴 감지 시 자동 스킬 파일 생성
 * Sprint 6: 성장 → ~/.airu/skills/에 실제 SKILL.md 파일写入
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SKILLS_DIR = path.join(os.homedir(), '.airu', 'skills');

export interface SkillTemplate {
  name: string;
  pattern: string;
  description: string;
  trigger: string[];
  steps: string[];
  examples: string[];
  methodIds: string[];
}

/** 스킬 디렉토리 생성 */
function ensureSkillsDir(): void {
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }
}

/** 패턴 ID → 스킬 파일명 */
function patternToSkillFile(patternId: string, patternName: string): string {
  const safe = patternName.replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 20);
  return path.join(SKILLS_DIR, `skill-${patternId}-${safe}.md`);
}

/** SKILL.md 템플릿 생성 */
function buildSkillMarkdown(template: SkillTemplate): string {
  const date = new Date().toISOString().slice(0, 10);
  return `---
name: ${template.name}
pattern: ${template.pattern}
created: ${date}
trigger: ${template.trigger.join(' | ')}
methods: ${template.methodIds.join(', ')}
---

## ${template.name}

${template.description}

## Trigger
${template.trigger.map((t) => `- ${t}`).join('\n')}

## Steps
${template.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Examples
${template.examples.map((e) => `- \`${e}\``).join('\n')}
`;
}

/** 패턴 정보 → 스킬 템플릿 변환 */
export function patternToSkillTemplate(
  patternId: string,
  patternName: string,
  description: string,
  methodIds: string[],
  examples: string[],
): SkillTemplate {
  return {
    name: `${patternName} 자동 스킬`,
    pattern: patternId,
    description,
    trigger: [`${patternId} 패턴 ${examples[0] ? examples[0].slice(0, 30) : patternName} 입력 시`],
    steps: [
      '입력 수신 후 패턴 매칭',
      `방법论: ${methodIds.map((m) => `M${m}`).join(' → ')}`,
      '결과 생성 및 회고',
    ],
    examples,
    methodIds,
  };
}

/** 성장 엔트리 → 스킬 파일 생성 */
export async function createSkillFromGrowth(
  patternId: string,
  patternName: string,
  description: string,
  methodIds: string[],
  examples: string[] = [],
): Promise<string> {
  ensureSkillsDir();

  const template = patternToSkillTemplate(
    patternId,
    patternName,
    description,
    methodIds,
    examples.length > 0 ? examples : [`${patternName} 관련 질문`],
  );

  const filePath = patternToSkillFile(patternId, patternName);
  const markdown = buildSkillMarkdown(template);

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, markdown, 'utf8', (err) => {
      if (err) reject(err);
      else resolve(filePath);
    });
  });
}

/** 생성済み 스킬 목록 */
export function listGeneratedSkills(): string[] {
  ensureSkillsDir();
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md'));
}

/** 스킬 파일 삭제 */
export function deleteSkill(patternId: string, patternName: string): boolean {
  const filePath = patternToSkillFile(patternId, patternName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
