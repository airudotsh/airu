/**
 * PatternRegistry - 패턴 등록/검색/분류
 * Sprint 5: 입력 → 최고 점수 패턴 → 메서드 조합
 */
import type { IPattern } from './interfaces/IPattern';

export class PatternRegistry {
  private patterns = new Map<string, IPattern>();

  register(pattern: IPattern): void {
    if (this.patterns.has(pattern.id)) {
      throw new Error(`Pattern already registered: ${pattern.id}`);
    }
    this.patterns.set(pattern.id, pattern);
  }

  get(id: string): IPattern | undefined {
    return this.patterns.get(id);
  }

  list(): IPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * 입력 텍스트에서 최고 매칭 패턴 찾기
   * @returns 매칭된 패턴 (임계값 이상) 또는 null
   */
  classify(input: string, threshold = 0.3): { pattern: IPattern; score: number } | null {
    let bestPattern: IPattern | null = null;
    let bestScore = 0;

    for (const pattern of this.patterns.values()) {
      const score = pattern.match(input);
      if (score > bestScore) {
        bestScore = score;
        bestPattern = pattern;
      }
    }

    if (bestScore >= threshold && bestPattern) {
      return { pattern: bestPattern, score: bestScore };
    }

    return null;
  }

  /**
   * 상위 N개 매칭 패턴 반환
   */
  classifyTop(input: string, topN = 3): Array<{ pattern: IPattern; score: number }> {
    const results: Array<{ pattern: IPattern; score: number }> = [];

    for (const pattern of this.patterns.values()) {
      const score = pattern.match(input);
      if (score > 0) {
        results.push({ pattern, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }
}

export const patternRegistry = new PatternRegistry();
