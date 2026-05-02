/**
 * KnowledgeStore — 프로젝트별 지식 영속화
 * ~/.airu/knowledge/ 에 마크다운으로 저장
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface KnowledgeEntry {
  id: string;
  type: 'session-summary' | 'pattern-learned' | 'skill';
  project: string;
  title: string;
  tags: string[];
  patterns: string[];
  content: string;
  createdAt: number;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  relevance: number;
}

export class KnowledgeStore {
  private readonly baseDir: string;
  private readonly projectName: string;
  private graph: Map<string, Set<string>> = new Map();

  constructor(projectName: string) {
    this.baseDir = path.join(os.homedir(), '.airu', 'knowledge');
    this.projectName = projectName;
    this.ensureDir();
  }

  private get projectDir(): string {
    return path.join(this.baseDir, `project-${this.projectName}`);
  }

  private get sessionsDir(): string {
    return path.join(this.projectDir, 'sessions');
  }

  private get skillsDir(): string {
    return path.join(this.projectDir, 'skills');
  }

  private ensureDir(): void {
    const dirs = [this.baseDir, this.projectDir, this.sessionsDir, this.skillsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /** 세션 요약 저장 */
  saveSessionSummary(sessionId: string, data: {
    summary: string;
    learned: string[];
    patterns: string[];
    tags: string[];
  }): string {
    const entry: KnowledgeEntry = {
      id: `session-${sessionId.slice(-8)}`,
      type: 'session-summary',
      project: this.projectName,
      title: `세션 ${sessionId.slice(-8)} 요약`,
      tags: data.tags,
      patterns: data.patterns,
      content: data.summary + (data.learned.length > 0 ? '\n\n## 학습한 내용\n' + data.learned.map(l => `- ${l}`).join('\n') : ''),
      createdAt: Date.now(),
    };
    return this.writeEntry(entry);
  }

  /** 학습 내용 저장 */
  saveLearned(data: {
    topic: string;
    content: string;
    patterns: string[];
    tags: string[];
  }): string {
    const id = `learned-${crypto.randomUUID().slice(0, 8)}`;
    const entry: KnowledgeEntry = {
      id,
      type: 'pattern-learned',
      project: this.projectName,
      title: data.topic,
      tags: data.tags,
      patterns: data.patterns,
      content: data.content,
      createdAt: Date.now(),
    };
    return this.writeEntry(entry);
  }

  /** 스킬 저장 */
  saveSkill(data: {
    name: string;
    targetPattern: string;
    overrides: string;
    content: string;
  }): string {
    const entry: KnowledgeEntry = {
      id: `skill-${data.name}`,
      type: 'skill',
      project: this.projectName,
      title: data.name,
      tags: ['skill', data.targetPattern],
      patterns: [data.targetPattern],
      content: `---\ntarget:\n  pattern: ${data.targetPattern}\n  overrides: ${data.overrides}\n---\n\n${data.content}`,
      createdAt: Date.now(),
    };
    return this.writeEntry(entry);
  }

  /** 키워드 기반 지식 검색 */
  search(query: string, limit = 5): KnowledgeSearchResult[] {
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
    if (keywords.length === 0) return [];

    const entries = this.readAllEntries();
    const scored: KnowledgeSearchResult[] = [];

    for (const entry of entries) {
      const text = `${entry.title} ${entry.content} ${entry.tags.join(' ')} ${entry.patterns.join(' ')}`.toLowerCase();
      let matches = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) matches++;
      }
      if (matches > 0) {
        scored.push({ entry, relevance: matches / keywords.length });
      }
    }

    return scored
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /** 관련 지식을 system prompt에 주입할 형태로 반환 */
  getRelevantContext(query: string, maxChars = 1000): string {
    const results = this.search(query);
    if (results.length === 0) return '';

    let context = '[이전 학습 내용]\n';
    for (const r of results) {
      const snippet = r.entry.content.slice(0, 300);
      context += `\n## ${r.entry.title} (관련도: ${(r.relevance * 100).toFixed(0)}%)\n${snippet}\n`;
      if (context.length > maxChars) break;
    }

    return context.slice(0, maxChars);
  }

  /** 그래프 업데이트 (키워드 간 연관) */
  updateGraph(): void {
    const entries = this.readAllEntries();
    this.graph.clear();

    for (const entry of entries) {
      const words = entry.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const tag of [...entry.tags, ...entry.patterns]) {
        const tagLower = tag.toLowerCase();
        if (!this.graph.has(tagLower)) {
          this.graph.set(tagLower, new Set());
        }
        for (const word of words.slice(0, 50)) {
          if (word !== tagLower) {
            this.graph.get(tagLower)!.add(word);
          }
        }
      }
    }
  }

  /** 그래프에서 연관 키워드 검색 */
  getRelatedKeywords(keyword: string): string[] {
    const related = this.graph.get(keyword.toLowerCase());
    return related ? Array.from(related).slice(0, 10) : [];
  }

  /** 스킬 로드 — 특정 패턴에 대한 오버라이드 스킬 */
  loadSkillsForPattern(patternId: string): KnowledgeEntry[] {
    const entries = this.readAllEntries();
    return entries.filter(e => e.type === 'skill' && e.patterns.includes(patternId));
  }

  private writeEntry(entry: KnowledgeEntry): string {
    const dir = entry.type === 'skill' ? this.skillsDir : this.sessionsDir;
    const filename = `${entry.id}.md`;
    const filepath = path.join(dir, filename);

    const frontmatter = [
      '---',
      `type: ${entry.type}`,
      `project: ${entry.project}`,
      `title: "${entry.title}"`,
      `date: ${new Date(entry.createdAt).toISOString().slice(0, 10)}`,
      `patterns: [${entry.patterns.map(p => `"${p}"`).join(', ')}]`,
      `tags: [${entry.tags.map(t => `"${t}"`).join(', ')}]`,
      '---',
      '',
    ].join('\n');

    fs.writeFileSync(filepath, frontmatter + entry.content, 'utf-8');
    return filepath;
  }

  private readAllEntries(): KnowledgeEntry[] {
    const entries: KnowledgeEntry[] = [];

    for (const dir of [this.sessionsDir, this.skillsDir]) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        try {
          const entry = this.parseEntry(path.join(dir, file));
          if (entry) entries.push(entry);
        } catch {
          // 파싱 실패한 파일은 스킵
        }
      }
    }

    return entries;
  }

  private parseEntry(filepath: string): KnowledgeEntry | null {
    const content = fs.readFileSync(filepath, 'utf-8');

    // YAML frontmatter 파싱 (간단한 정규식)
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (!fmMatch) return null;

    const fm = fmMatch[1];
    const body = fmMatch[2];

    const getArray = (key: string): string[] => {
      const m = fm.match(new RegExp(`${key}: \\[([\\s\\S]*?)\\]`));
      if (!m) return [];
      return m[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
    };

    const getString = (key: string): string => {
      const m = fm.match(new RegExp(`${key}: "?([^"\\n]+)"?`));
      return m ? m[1].trim() : '';
    };

    const filename = path.basename(filepath, '.md');

    return {
      id: filename,
      type: getString('type') as KnowledgeEntry['type'],
      project: getString('project'),
      title: getString('title'),
      tags: getArray('tags'),
      patterns: getArray('patterns'),
      content: body,
      createdAt: fs.statSync(filepath).mtimeMs,
    };
  }
}
