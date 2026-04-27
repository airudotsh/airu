import type { IMethod, MethodConfigSchema } from '../interfaces/IMethod';

export class MethodRegistry {
  private methods = new Map<string, IMethod>();

  register(method: IMethod): void {
    if (this.methods.has(method.name)) throw new Error(`Method '${method.name}' already registered`);
    for (const existing of this.methods.values()) {
      if (existing.id === method.id) throw new Error(`Method id '${method.id}' already registered as '${existing.name}'`);
    }
    this.methods.set(method.name, method);
  }

  get(name: string): IMethod | undefined { return this.methods.get(name); }
  list(): IMethod[] { return Array.from(this.methods.values()); }
  listByCategory(category: 'common' | 'project'): IMethod[] {
    return this.list().filter((m) => m.category === category);
  }
  listEnabled(config: Record<string, { enabled?: boolean }> = {}): IMethod[] {
    return this.list().filter((m) => {
      const mc = config[m.name];
      if (mc && 'enabled' in mc) return mc.enabled !== false;
      return m.defaultEnabled !== false;
    });
  }
}

export const methodRegistry = new MethodRegistry();
