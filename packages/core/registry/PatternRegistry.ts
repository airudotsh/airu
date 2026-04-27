import type { IPattern } from '../interfaces/IPattern';

export class PatternRegistry {
  private patterns: IPattern[] = [];

  register(pattern: IPattern): void {
    if (this.patterns.some((p) => p.id === pattern.id)) throw new Error(`Pattern '${pattern.id}' already registered`);
    this.patterns.push(pattern);
  }

  classify(input: string): { pattern: IPattern; score: number } | null {
    const threshold = 0.3;
    let best: { pattern: IPattern; score: number } | null = null;
    for (const p of this.patterns) {
      const score = p.match(input);
      if (score >= threshold && (!best || score > best.score)) best = { pattern: p, score };
    }
    return best;
  }

  classifyTop(input: string, topN = 3): Array<{ pattern: IPattern; score: number }> {
    return this.patterns.map((p) => ({ pattern: p, score: p.match(input) }))
      .filter((r) => r.score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  list(): IPattern[] { return [...this.patterns]; }
  get(id: string): IPattern | undefined { return this.patterns.find((p) => p.id === id); }
}

export const patternRegistry = new PatternRegistry();
