/// <reference types="node" />
/**
 * Guardrails - 에이전트 실행 안전망
 * Sprint 4: 시간/반복 한도, 에러 분류, 자동 재시도, 검증 스텝
 */

export type GuardrailEvent =
  | { type: 'loop_start'; iteration: number }
  | { type: 'loop_warning'; iteration: number; message: string }
  | { type: 'loop_abort'; iteration: number; reason: string }
  | { type: 'time_warning'; elapsed: number; limit: number }
  | { type: 'time_abort'; elapsed: number; limit: number }
  | { type: 'error_classified'; error: string; category: ErrorCategory; action: GuardrailAction }
  | { type: 'retry'; attempt: number; maxRetries: number; reason: string }
  | { type: 'verification_pass'; step: string }
  | { type: 'verification_fail'; step: string; reason: string };

export type GuardrailAction = 'retry' | 'fallback' | 'abort' | 'skip';

export type ErrorCategory =
  | 'network'       // 네트워크/연결 문제
  | 'auth'          // 인증/권한 문제
  | 'timeout'       // 시간 초과
  | 'rate_limit'    //Rate limit
  | 'validation'    // 입력/파라미터 오류
  | 'tool'          // 툴 실행 실패
  | 'model'          // 모델 응답 오류
  | 'unknown';       // 알 수 없는 오류

/** 에러 분류기 */
export function classifyError(error: string): ErrorCategory {
  const lower = error.toLowerCase();
  if (/401|403|unauthorized|forbidden|incorrect api key/i.test(lower)) return 'auth';
  if (/timeout|timed out|etimedout/i.test(lower)) return 'timeout';
  if (/econnrefused|econnreset|enotfound|network/i.test(lower)) return 'network';
  if (/rate.limit|429|too many requests/i.test(lower)) return 'rate_limit';
  if (/invalid|malformed|schema|validation|bad request/i.test(lower)) return 'validation';
  if (/tool|execute|run|command|failed/i.test(lower)) return 'tool';
  if (/model response|model error|generation|content filter|refusal/i.test(lower)) return 'model';
  return 'unknown';
}

/** 에러 카테고리 → 권장 조치 */
export function recommendedAction(category: ErrorCategory): {
  action: GuardrailAction;
  maxRetries: number;
  delayMs: number;
  message: string;
} {
  switch (category) {
    case 'network':
      return { action: 'retry', maxRetries: 3, delayMs: 2000, message: '네트워크 오류, 재시도...' };
    case 'timeout':
      return { action: 'retry', maxRetries: 2, delayMs: 1000, message: '시간 초과, 재시도...' };
    case 'rate_limit':
      return { action: 'retry', maxRetries: 5, delayMs: 5000, message: 'Rate limit, 대기 후 재시도...' };
    case 'auth':
      return { action: 'abort', maxRetries: 0, delayMs: 0, message: '인증 오류, 중단.' };
    case 'validation':
      return { action: 'abort', maxRetries: 0, delayMs: 0, message: '입력 오류, 중단.' };
    case 'tool':
      return { action: 'fallback', maxRetries: 1, delayMs: 500, message: '툴 실패, 대체 방법 시도...' };
    case 'model':
      return { action: 'retry', maxRetries: 2, delayMs: 1000, message: '모델 오류, 재시도...' };
    case 'unknown':
    default:
      return { action: 'retry', maxRetries: 1, delayMs: 1000, message: '알 수 없는 오류, 재시도...' };
  }
}

/** 실행 로그 */
export interface ExecutionLogEntry {
  timestamp: number;
  event: GuardrailEvent;
}

export class ExecutionLogger {
  private logs: ExecutionLogEntry[] = [];
  private startTime = Date.now();

  log(event: GuardrailEvent): void {
    this.logs.push({ timestamp: Date.now(), event });
  }

  getLogs(): ExecutionLogEntry[] {
    return [...this.logs];
  }

  getMetrics(): ExecutionMetrics {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const events = this.logs.map((l) => l.event.type);

    return {
      elapsedSeconds: elapsed,
      totalIterations: events.filter((e) => e === 'loop_start').length,
      warnings: events.filter((e) => e.includes('warning')).length,
      errors: events.filter((e) => e.includes('error') || e.includes('fail')).length,
      retries: events.filter((e) => e === 'retry').length,
      aborted: events.includes('loop_abort') || events.includes('time_abort'),
      logCount: this.logs.length,
    };
  }

  reset(): void {
    this.logs = [];
    this.startTime = Date.now();
  }
}

export interface ExecutionMetrics {
  elapsedSeconds: number;
  totalIterations: number;
  warnings: number;
  errors: number;
  retries: number;
  aborted: boolean;
  logCount: number;
}

/** Guardrails - 실행 안전망 */
export class Guardrails {
  readonly maxIterations: number;
  readonly warnAtIteration: number;
  readonly abortAtIteration: number;
  readonly maxTimeMs: number;
  readonly warnAtTimeMs: number;

  private iteration = 0;
  private startTime = Date.now();
  private lastWarningTime = 0;
  private retryCount = 0; // 누적 재시도 횟수
  private readonly maxTotalRetries: number; // 전체 재시도 한도

  readonly logger: ExecutionLogger;

  constructor(options: {
    maxIterations?: number;
    warnAtIteration?: number;
    abortAtIteration?: number;
    maxTimeMs?: number;
    warnAtTimeMs?: number;
  } = {}) {
    this.maxIterations = options.maxIterations ?? 15;
    this.warnAtIteration = options.warnAtIteration ?? 10;
    this.abortAtIteration = options.abortAtIteration ?? 15;
    this.maxTimeMs = options.maxTimeMs ?? 5 * 60 * 1000; // 5분
    this.warnAtTimeMs = options.warnAtTimeMs ?? 4 * 60 * 1000; // 4분
    this.maxTotalRetries = (this.maxIterations - 1) * 2; // 안전상 상한
    this.logger = new ExecutionLogger();
  }

  /** 다음 반복으로 진행. 경고/중단 필요하면 반환 */
  async next(): Promise<{ continue: boolean; reason?: string }> {
    this.iteration++;
    this.logger.log({ type: 'loop_start', iteration: this.iteration });

    const elapsed = Date.now() - this.startTime;

    // 시간 체크
    if (elapsed >= this.maxTimeMs) {
      this.logger.log({ type: 'time_abort', elapsed, limit: this.maxTimeMs });
      return { continue: false, reason: `시간 한도 초과 (${Math.round(elapsed / 1000)}s > ${Math.round(this.maxTimeMs / 1000)}s)` };
    }
    if (elapsed >= this.warnAtTimeMs && elapsed - this.lastWarningTime >= 60000) {
      this.lastWarningTime = elapsed;
      this.logger.log({ type: 'time_warning', elapsed, limit: this.warnAtTimeMs });
    }

    // 반복 횟수 체크
    if (this.iteration >= this.abortAtIteration) {
      this.logger.log({ type: 'loop_abort', iteration: this.iteration, reason: `반복 한도 초과 (${this.iteration}회)` });
      return { continue: false, reason: `반복 한도 초과 (${this.iteration}회)` };
    }
    if (this.iteration >= this.warnAtIteration) {
      this.logger.log({ type: 'loop_warning', iteration: this.iteration, message: `반복 ${this.iteration}회 경고` });
      return { continue: true, reason: `반복 ${this.iteration}회 경고` };
    }

    return { continue: true };
  }

  getIteration(): number {
    return this.iteration;
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  reset(): void {
    this.iteration = 0;
    this.startTime = Date.now();
    this.lastWarningTime = 0;
    this.retryCount = 0;
    this.logger.reset();
  }

  /** 에러 처리 + 자동 재시도. Exponential backoff 적용 */
  async handleError(error: string): Promise<{
    shouldRetry: boolean;
    delayMs: number;
    message: string;
  }> {
    const category = classifyError(error);
    const { action, maxRetries, delayMs, message } = recommendedAction(category);

    this.logger.log({
      type: 'error_classified',
      error: error.slice(0, 100),
      category,
      action,
    });

    if (action === 'abort') {
      return { shouldRetry: false, delayMs: 0, message };
    }

    if (action === 'skip') {
      return { shouldRetry: false, delayMs: 0, message };
    }

    // 누적 재시도 횟수 초과 시 중단
    if (this.retryCount >= this.maxTotalRetries) {
      this.logger.log({
        type: 'error_classified',
        error: 'max total retries exceeded',
        category: 'unknown',
        action: 'abort',
      });
      return { shouldRetry: false, delayMs: 0, message: '재시도 한도 초과, 중단.' };
    }

    this.retryCount++;
    this.logger.log({
      type: 'retry',
      attempt: this.retryCount,
      maxRetries: this.maxTotalRetries,
      reason: error.slice(0, 80),
    });

    // Exponential backoff: baseDelay * 2^(attempt-1), capped at 30s
    const backoffDelay = Math.min(delayMs * Math.pow(2, this.retryCount - 1), 30000);

    return { shouldRetry: action === 'retry' || action === 'fallback', delayMs: backoffDelay, message };
  }

  /** 검증 스텝 */
  async verify(step: string, check: () => Promise<boolean>): Promise<boolean> {
    try {
      const passed = await check();
      if (passed) {
        this.logger.log({ type: 'verification_pass', step });
      } else {
        this.logger.log({ type: 'verification_fail', step, reason: 'check returned false' });
      }
      return passed;
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      this.logger.log({ type: 'verification_fail', step, reason });
      return false;
    }
  }
}
