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
    // id 중복 검사
    for (const existing of this.methods.values()) {
      if (existing.id === method.id) {
        throw new Error(`Method id '${method.id}' already registered as '${existing.name}'`);
      }
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
      if (methodConfig && 'enabled' in methodConfig) {
        return methodConfig.enabled !== false;
      }
      // defaultEnabled가 false면 비활성, 없으면 true (common 기본)
      return m.defaultEnabled !== false;
    });
  }

  /** 메서드 정보를 plain object로 변환 */
  toInterface(): Record<string, {
    id: string;
    name: string;
    description: string;
    category: string;
    defaultEnabled: boolean;
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
        defaultEnabled: m.defaultEnabled !== false,
        requiredTools: m.requiredTools(),
        configSchema: m.configSchema(),
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result as any;
  }
}

export const methodRegistry = new MethodRegistry();
