/**
 * IPattern - 반응형 패턴 인터페이스
 * Sprint 5: 사용자 입력 → 패턴 분류 → 메서드 조합
 */

export interface IPattern {
  readonly id: string;             // "P1", "P2", ...
  readonly name: string;           // "Explain", "Plan", ...
  readonly description: string;

  /** 입력 텍스트에 대한 매칭 점수 (0~1) */
  match(input: string): number;

  /** 이 패턴이 사용할 메서드 ID 목록 */
  methods(): string[];
}

/** 키워드 기반 패턴 베이스 클래스 */
export abstract class KeywordPattern implements IPattern {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;

  /** 매칭 키워드 (한국어) */
  protected abstract readonly keywordsKo: string[];
  /** 매칭 키워드 (영어) */
  protected abstract readonly keywordsEn: string[];
  /** 가중치 (기본 1.0) */
  protected readonly weight: number = 1.0;
  /** 사용할 메서드 */
  protected abstract readonly methodIds: string[];

  match(input: string): number {
    const lower = input.toLowerCase();
    const allKeywords = [...this.keywordsKo, ...this.keywordsEn];
    const matched = new Set<number>(); // 인덱스로 중복 방지

    for (let i = 0; i < allKeywords.length; i++) {
      if (lower.includes(allKeywords[i].toLowerCase())) {
        matched.add(i);
      }
    }

    if (matched.size === 0) return 0;

    // 매칭 키워드 1개 → 0.5, 2개 → 0.75, 3개+ → 1.0
    const baseScore = Math.min(0.25 + (matched.size * 0.25), 1.0);
    return Math.min(baseScore * this.weight, 1.0);
  }

  methods(): string[] {
    return [...this.methodIds]; // defensive copy
  }
}
