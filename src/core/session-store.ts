/**
 * SessionStore - 세션 간 컨텍스트 유지
 * Sprint 6: 대화 히스토리, 회고, 성장 데이터를 파일에 저장/복원
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ChatMessage } from './provider';
import type { ReflectionReport, GrowthEntry } from './orchestrator';

export interface SessionData {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  reflections: ReflectionReport[];
  growth: GrowthEntry[];
}

const SESSION_DIR = path.join(os.homedir(), '.airu', 'sessions');

export class SessionStore {
  private readonly sessionDir: string;

  constructor(dir?: string) {
    this.sessionDir = dir || SESSION_DIR;
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /** 새 세션 생성 */
  create(id?: string): SessionData {
    const sessionId = id || `session_${Date.now()}`;
    const data: SessionData = {
      id: sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      reflections: [],
      growth: [],
    };
    this.save(data);
    return data;
  }

  /** 세션 로드 */
  load(id: string): SessionData | null {
    const filePath = path.join(this.sessionDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  }

  /** 세션 저장 */
  save(data: SessionData): void {
    data.updatedAt = Date.now();
    const filePath = path.join(this.sessionDir, `${data.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** 최근 세션 목록 */
  list(limit = 10): Array<{ id: string; updatedAt: number; messageCount: number }> {
    if (!fs.existsSync(this.sessionDir)) return [];

    const files = fs.readdirSync(this.sessionDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(this.sessionDir, f);
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw) as SessionData;
          return { id: data.id, updatedAt: data.updatedAt, messageCount: data.messages.length };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ id: string; updatedAt: number; messageCount: number }>;

    return files
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /** 세션 삭제 */
  delete(id: string): boolean {
    const filePath = path.join(this.sessionDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /** 메시지 추가 (자동 저장) */
  appendMessage(data: SessionData, message: ChatMessage): SessionData {
    data.messages.push(message);
    // 최대 100개 메시지 유지
    if (data.messages.length > 100) {
      data.messages = data.messages.slice(-80);
    }
    this.save(data);
    return data;
  }

  /** 회고 추가 */
  appendReflection(data: SessionData, report: ReflectionReport): SessionData {
    data.reflections.push(report);
    // 최대 50개 회고 유지
    if (data.reflections.length > 50) {
      data.reflections = data.reflections.slice(-30);
    }
    this.save(data);
    return data;
  }
}
