/**
 * MethodRegistry - 메서드 등록/조회/활성화
 */
import type { IMethod, MethodConfigSchema } from './interfaces/IMethod';

export class MethodRegistry {
  private methods = new Map<string, IMethod>();

  register(method: IMethod): void {
    if (this.methods.has(method.name)) {
      throw new Error(`Method '${method.name}' already registered`);
    }
    this.methods.set(method.name, method);
  }

  get(name: string): IMethod | undefined {
    return this.methods.get(name);
  }

  list(): IMethod[] {
    return Array.from(this.methods.values());
  }

  /** category별 필터 */
  listByCategory(category: 'common' | 'project'): IMethod[] {
    return this.list().filter((m) => m.category === category);
  }

  /** 활성화된 메서드만 (config enabled 필터) */
  listEnabled(config: Record<string, { enabled?: boolean }> = {}): IMethod[] {
    return this.list().filter((m) => {
      const methodConfig = config[m.name];
      // default: common=활성, project=비활성
      if (!methodConfig) {
        return m.category === 'common';
      }
      return methodConfig.enabled !== false;
    });
  }

  /** 메ASIL 인터페이스로 변환 */
  toInterface(): Record<string, {
    id: string;
    name: string;
    description: string;
    category: string;
    requiredTools: string[];
    configSchema: MethodConfigSchema;
  }> {
    const result: Record<string, unknown> = {};
    for (const m of this.list()) {
      result[m.name] = {
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        requiredTools: m.requiredTools(),
        configSchema: m.configSchema(),
      };
    }
    return result as ReturnType<typeof this.toInterface>;
  }
}

export const methodRegistry = new MethodRegistry();
