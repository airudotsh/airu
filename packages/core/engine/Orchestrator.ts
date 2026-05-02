/// <reference types="node" />
/**
 * Orchestrator - 전체 레이어 조립
 * Sprint 6: Layer 1 자율형 — 방향 유지, 회고, 성장
 *
 * 입력 → 패턴 분류 → 메서드 조합 → 툴 에이전트 루프 → 회고 → 성장
 */
import type { IModelProvider, Message } from '../interfaces/IModelProvider';
import { PatternRegistry } from '../registry/PatternRegistry';
import { MethodRegistry } from '../registry/MethodRegistry';
import { Guardrails } from './Guardrails';
import type { ExecutionMetrics } from './Guardrails';
import { runAgentLoop } from './Agent';
import type { IPattern } from '../interfaces/IPattern';
import { createSkillFromGrowth } from './GrowthSkillGenerator';

/** 회고 리포트 */
export interface ReflectionReport {
  timestamp: number;
  input: string;
  pattern: { id: string; name: string; score: number } | null;
  metrics: ExecutionMetrics;
  summary: string;
  improvements: string[];
  durationMs: number;
}

/** 성장 — 반복 패턴 감지 */
export interface GrowthEntry {
  patternId: string;
  count: number;
  lastSeen: number;
  avgScore: number;
  suggestedSkill?: string;
}

/** Orchestrator 옵션 */
export interface OrchestratorOptions {
  maxTimeMs?: number;
  warnAtIteration?: number;
  abortAtIteration?: number;
  /** 방향 관리: N회 이상 같은 패턴 반복 시 경고 */
  directionWarnThreshold?: number;
  /** 회고 활성화 */
  enableReflection?: boolean;
  /** 성장 추적 활성화 */
  enableGrowth?: boolean;
}

export class Orchestrator {
  private readonly patternRegistry: PatternRegistry;
  private readonly methodRegistry: MethodRegistry;
  private readonly guardrailsOptions: OrchestratorOptions;

  // 방향 관리
  private recentPatterns: Array<{ id: string; timestamp: number }> = [];
  private readonly directionWarnThreshold: number;

  // 회고
  private reflections: ReflectionReport[] = [];
  private readonly enableReflection: boolean;

  // 성장
  private growthMap = new Map<string, GrowthEntry>();
  private readonly enableGrowth: boolean;

  constructor(options: {
    patternRegistry: PatternRegistry;
    methodRegistry: MethodRegistry;
    options?: OrchestratorOptions;
  }) {
    this.patternRegistry = options.patternRegistry;
    this.methodRegistry = options.methodRegistry;
    this.guardrailsOptions = options.options ?? {};

    this.directionWarnThreshold = options.options?.directionWarnThreshold ?? 5;
    this.enableReflection = options.options?.enableReflection ?? true;
    this.enableGrowth = options.options?.enableGrowth ?? true;
  }

  /**
   * 메인 실행: 입력 → 패턴 분류 → 에이전트 루프 → 회고
   */
  async execute(
    provider: IModelProvider,
    model: string,
    messages: Message[],
    userInput: string,
    options?: { signal?: AbortSignal; confirmTool?: (toolName: string, args: Record<string, unknown>) => Promise<boolean> },
  ): Promise<{
    content: string;
    pattern: { id: string; name: string; score: number } | null;
    metrics?: ExecutionMetrics;
    reflection?: ReflectionReport;
    directionWarning?: string;
  }> {
    const startTime = Date.now();

    // 패턴 분류
    const classification = this.patternRegistry.classify(userInput);
    const patternInfo = classification
      ? { id: classification.pattern.id, name: classification.pattern.name, score: classification.score }
      : null;

    // 사용자 친화적 실행 계획 출력
    if (classification) {
      const patternSteps = classification.pattern.steps();
      const planLine = patternSteps.map(s => s.label).join(' → ');
      process.stdout.write(`\x1b[36m  분석: ${classification.pattern.name} (${(classification.score * 100).toFixed(0)}%)\x1b[0m\n`);
      process.stdout.write(`\x1b[2m  계획: ${planLine}\x1b[0m\n\n`);
    }

    // 2. 방향 관리 체크
    const directionWarning = this.checkDirection(patternInfo);

    if (directionWarning) {
      process.stdout.write(`\x1b[33m[${directionWarning}]\x1b[0m `);
    }

    // 3. messages 복사본 생성 (원본 불변)
    const workingMessages: Message[] = messages.map((m) => ({ ...m }));

    // 시스템 프롬프트 보장
    if (workingMessages.length === 0 || workingMessages[0].role !== 'system') {
      const toolSystemBase = [
        '당신은 airu CLI 어시스턴트입니다.',
        '파일, 터미널, 웹 검색 등의 작업이 필요하면 반드시 툴을 사용하세요.',
        '직접 방법을 알려주지 말고 툴로 직접 실행하세요.',
      ].join('\n');
      workingMessages.unshift({ role: 'system', content: toolSystemBase });
    }

    // 패턴에 해당하는 메서드 정보를 system prompt에 추가
    if (classification) {
      const methodIds = classification.pattern.methods();
      const methodDescs = methodIds
        .map((id) => this.methodRegistry.get(id))
        .filter(Boolean)
        .map((m: any) => `${m.id} ${m.name}: ${m.description}`)
        .join('\n');

      if (methodDescs) {
        workingMessages[0] = {
          ...workingMessages[0],
          content: workingMessages[0].content + `\n\n[활성 메서드]\n${methodDescs}`,
        };
      }
    }

    // user 메시지가 없으면 추가
    if (!workingMessages.some((m) => m.role === 'user')) {
      workingMessages.push({ role: 'user', content: userInput });
    }

    // 4. 툴 에이전트 루프 실행
    const result = await runAgentLoop(provider, model, workingMessages, {
      signal: options?.signal,
      guardrails: {
        maxTimeMs: this.guardrailsOptions.maxTimeMs,
        warnAtIteration: this.guardrailsOptions.warnAtIteration,
        abortAtIteration: this.guardrailsOptions.abortAtIteration,
      },
      confirmTool: options?.confirmTool,
    });

    const durationMs = Date.now() - startTime;

    // 5. 성장 추적
    if (this.enableGrowth && patternInfo) {
      this.trackGrowth(patternInfo, result.metrics);
    }

    // 6. 회고
    let reflection: ReflectionReport | undefined;
    if (this.enableReflection && result.metrics) {
      reflection = this.generateReflection(userInput, patternInfo, result.metrics, durationMs);
      this.reflections.push(reflection);
    }

    return {
      content: result.content,
      pattern: patternInfo,
      metrics: result.metrics,
      reflection,
      directionWarning,
    };
  }

  /** 방향 관리: 같은 패턴이 너무 연속으로 오면 경고 */
  private checkDirection(pattern: { id: string; name: string } | null): string | undefined {
    if (!pattern) return undefined;

    const now = Date.now();
    this.recentPatterns.push({ id: pattern.id, timestamp: now });

    // 최근 5분 이내 같은 패턴 카운트
    const recentWindow = 5 * 60 * 1000;
    const samePatternCount = this.recentPatterns.filter(
      (p) => p.id === pattern.id && now - p.timestamp < recentWindow,
    ).length;

    // 오래된 항목 정리
    this.recentPatterns = this.recentPatterns.filter(
      (p) => now - p.timestamp < recentWindow * 2,
    );

    if (samePatternCount >= this.directionWarnThreshold) {
      return `방향 경고: ${pattern.name} 패턴 ${samePatternCount}회 연속 — 다른 작업 필요?`;
    }

    return undefined;
  }

  /** 회고 리포트 생성 */
  private generateReflection(
    input: string,
    pattern: { id: string; name: string; score: number } | null,
    metrics: ExecutionMetrics,
    durationMs: number,
  ): ReflectionReport {
    const improvements: string[] = [];

    if (metrics.errors > 0) {
      improvements.push(`에러 ${metrics.errors}회 발생 — 원인 분석 필요`);
    }
    if (metrics.retries > 2) {
      improvements.push(`재시도 ${metrics.retries}회 — 안정성 개선 필요`);
    }
    if (metrics.aborted) {
      improvements.push('가드레일에 의해 중단됨 — 한도 조정 검토');
    }
    if (metrics.totalIterations > 10) {
      improvements.push(`${metrics.totalIterations}회 반복 — 컨텍스트 압축 또는 작업 분할 권장`);
    }
    if (metrics.elapsedSeconds > 30) {
      improvements.push(`${metrics.elapsedSeconds.toFixed(0)}초 소요 — 성능 최적화 검토`);
    }

    const summary = [
      pattern ? `[${pattern.id} ${pattern.name}]` : '[미분류]',
      `${metrics.totalIterations}회 반복,`,
      `${metrics.elapsedSeconds.toFixed(1)}초,`,
      metrics.errors > 0 ? `에러 ${metrics.errors}회,` : '',
      metrics.aborted ? '중단됨,' : '완료',
    ].filter(Boolean).join(' ');

    return {
      timestamp: Date.now(),
      input: input.slice(0, 100),
      pattern,
      metrics,
      summary,
      improvements,
      durationMs,
    };
  }

  /** 성장 추적 — 반복 패턴 + 품질 기반 스킬 제안 */
  private trackGrowth(pattern: { id: string; name: string; score: number }, metrics?: ExecutionMetrics): void {
    const existing = this.growthMap.get(pattern.id);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
      existing.avgScore = (existing.avgScore * (existing.count - 1) + pattern.score) / existing.count;

      // 제안 조건: 반복 3회+ 또는 낮은 점수 반복 2회+ 또는 에러 다발
      if (!existing.suggestedSkill) {
        if (existing.count >= 3) {
          existing.suggestedSkill = `반복 패턴 ${pattern.id}(${pattern.name}) ${existing.count}회 감지 — 전용 스킬/단축키 생성 권장`;
        } else if (existing.count >= 2 && existing.avgScore < 0.5) {
          existing.suggestedSkill = `패턴 ${pattern.id} 분류 정확도 낮음(avg ${(existing.avgScore * 100).toFixed(0)}%) — 키워드 보강 필요`;
        } else if (metrics && metrics.errors >= 2) {
          existing.suggestedSkill = `패턴 ${pattern.id} 실행 시 에러 다발 — 메서드 가드레일 점검 필요`;
        }
      }
    } else {
      this.growthMap.set(pattern.id, {
        patternId: pattern.id,
        count: 1,
        lastSeen: Date.now(),
        avgScore: pattern.score,
      });
    }
  }

  /** 성장 리포트 조회 */
  getGrowthReport(): GrowthEntry[] {
    return Array.from(this.growthMap.values()).sort((a, b) => b.count - a.count);
  }

  /** 회고 리포트 조회 */
  getReflections(): ReflectionReport[] {
    return [...this.reflections];
  }

  /** 최근 회고 요약 */
  getRecentReflection(count = 5): string {
    const recent = this.reflections.slice(-count);
    if (recent.length === 0) return '회고 기록 없음';

    return recent
      .map((r, i) => {
        const lines = [`${i + 1}. ${r.summary}`];
        if (r.improvements.length > 0) {
          lines.push(...r.improvements.map((imp) => `   - ${imp}`));
        }
        return lines.join('\n');
      })
      .join('\n');
  }

  /** 성장 제안 조회 */
  getGrowthSuggestions(): string[] {
    return Array.from(this.growthMap.values())
      .filter((g) => g.suggestedSkill)
      .map((g) => g.suggestedSkill!);
  }

  /** 반복 패턴 → 실제 스킬 파일 생성 */
  async generateGrowthSkills(patternRegistry: PatternRegistry): Promise<string[]> {
    const created: string[] = [];
    for (const entry of this.growthMap.values()) {
      if (!entry.suggestedSkill) continue;
      const pattern = patternRegistry.get(entry.patternId);
      if (!pattern) continue;
      try {
        const filePath = await createSkillFromGrowth(
          entry.patternId,
          pattern.name,
          pattern.description,
          pattern.methods(),
          [],
        );
        created.push(filePath);
      } catch {
        // 이미 생성된 스킬은 스킵 (중복 무시)
      }
    }
    return created;
  }

  /** 전체 상태 리셋 */
  reset(): void {
    this.recentPatterns = [];
    this.reflections = [];
    this.growthMap.clear();
  }
}
