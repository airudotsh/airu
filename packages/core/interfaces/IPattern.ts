export interface IPattern {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  match(input: string): number;
  methods(): string[];
}

/** 키워드 기반 패턴 베이스 클래스 */
export abstract class KeywordPattern implements IPattern {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  protected abstract readonly keywordsKo: string[];
  protected abstract readonly keywordsEn: string[];
  protected readonly weight: number = 1.0;
  protected abstract readonly methodIds: string[];

  match(input: string): number {
    const lower = input.toLowerCase();
    const allKeywords = [...this.keywordsKo, ...this.keywordsEn];
    const matched = new Set<number>();
    for (let i = 0; i < allKeywords.length; i++) {
      if (lower.includes(allKeywords[i].toLowerCase())) matched.add(i);
    }
    if (matched.size === 0) return 0;
    const baseScore = Math.min(0.25 + matched.size * 0.25, 1.0);
    return Math.min(baseScore * this.weight, 1.0);
  }

  methods(): string[] { return [...this.methodIds]; }
}
