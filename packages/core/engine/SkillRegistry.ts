/**
 * SkillRegistry — 사용자 커스텀 스킬 관리
 * .airu/knowledge/project-{name}/skills/ 에 저장된 스킬을 로드하여
 * 패턴의 steps를 오버라이드
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { PatternStep } from '../interfaces/IPattern';

export interface SkillDefinition {
  name: string;
  targetPattern: string;
  overrides: 'steps' | 'methods' | 'keywords';
  steps?: PatternStep[];
  content: string;
  filePath: string;
}

export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map(); // patternId → skill
  private readonly skillsDir: string;

  constructor(projectName: string) {
    this.skillsDir = path.join(os.homedir(), '.airu', 'knowledge', `project-${projectName}`, 'skills');
    this.loadAll();
  }

  /** 스킬 디렉토리에서 모든 스킬 로드 */
  private loadAll(): void {
    this.skills.clear();
    if (!fs.existsSync(this.skillsDir)) return;

    const files = fs.readdirSync(this.skillsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const skill = this.parseSkillFile(path.join(this.skillsDir, file));
        if (skill) {
          this.skills.set(skill.targetPattern, skill);
        }
      } catch {
        // 파싱 실패 시 스킵
      }
    }
  }

  /** 스킬 파일 파싱 */
  private parseSkillFile(filepath: string): SkillDefinition | null {
    const content = fs.readFileSync(filepath, 'utf-8');

    // YAML frontmatter 파싱
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (!fmMatch) return null;

    const fm = fmMatch[1];
    const body = fmMatch[2];

    const getString = (key: string): string => {
      const m = fm.match(new RegExp(`${key}:\\s*([^\\n]+`));
      return m ? m[1].trim() : '';
    };

    const targetPattern = getString('pattern');
    const overrides = getString('overrides') || 'steps';

    if (!targetPattern) return null;

    // body에서 steps 파싱 (번호 매긴 리스트)
    const steps: PatternStep[] = [];
    const stepRegex = /^\d+\.\s+(.+)$/gm;
    let match;
    while ((match = stepRegex.exec(body)) !== null) {
      steps.push({
        label: match[1].trim(),
        methodIds: [], // 사용자 정의 스텝은 메서드 매핑 없음 — 라벨만 표시
      });
    }

    const filename = path.basename(filepath, '.md');
    return {
      name: filename,
      targetPattern,
      overrides: overrides as SkillDefinition['overrides'],
      steps: steps.length > 0 ? steps : undefined,
      content: body,
      filePath: filepath,
    };
  }

  /** 특정 패턴에 대한 스킬 조회 */
  getForPattern(patternId: string): SkillDefinition | undefined {
    return this.skills.get(patternId);
  }

  /** 스킬의 steps가 있으면 기본 steps를 오버라이드 */
  overrideSteps(patternId: string, defaultSteps: PatternStep[]): PatternStep[] {
    const skill = this.skills.get(patternId);
    if (skill && skill.steps && skill.steps.length > 0) {
      return skill.steps;
    }
    return defaultSteps;
  }

  /** 전체 스킬 목록 */
  list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /** 스킬이 적용되었는지 표시 */
  getSkillLabel(patternId: string): string | null {
    const skill = this.skills.get(patternId);
    return skill ? skill.name : null;
  }

  /** 새 스킬 파일 생성 */
  createSkill(data: {
    name: string;
    targetPattern: string;
    steps: string[];
  }): string {
    const filepath = path.join(this.skillsDir, `${data.name}.md`);
    const frontmatter = [
      '---',
      `type: skill`,
      `target:`,
      `  pattern: ${data.targetPattern}`,
      `  overrides: steps`,
      '---',
      '',
    ].join('\n');

    const stepsText = data.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

    fs.writeFileSync(filepath, frontmatter + stepsText, 'utf-8');

    // 리로드
    this.loadAll();
    return filepath;
  }

  /** 스킬 삭제 */
  removeSkill(name: string): boolean {
    const skill = Array.from(this.skills.values()).find(s => s.name === name);
    if (!skill) return false;

    if (fs.existsSync(skill.filePath)) {
      fs.unlinkSync(skill.filePath);
    }
    this.skills.delete(skill.targetPattern);
    return true;
  }
}
