/**
 * ModelRegistry - 모델 Provider 동적 로딩
 * 코어는 구현체를 모른다. 레지스트리가 연결한다.
 */
import type { IModelProvider, ProviderConfig } from '../interfaces/IModelProvider';

export class ModelRegistry {
  private providers = new Map<string, IModelProvider>();
  private instances = new Map<string, IModelProvider>();

  register(name: string, provider: IModelProvider): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }
    this.providers.set(name, provider);
  }

  async get(name: string, config?: ProviderConfig): Promise<IModelProvider | undefined> {
    const cached = this.instances.get(name);
    if (cached) return cached;
    const provider = this.providers.get(name);
    if (!provider) return undefined;
    if (config) await provider.initialize(config);
    this.instances.set(name, provider);
    return provider;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  supportedModels(name: string): string[] | undefined {
    return this.providers.get(name)?.supportedModels;
  }

  allModels(): Array<{ provider: string; model: string }> {
    const models: Array<{ provider: string; model: string }> = [];
    for (const [pName, provider] of this.providers) {
      for (const model of provider.supportedModels) {
        models.push({ provider: pName, model });
      }
    }
    return models;
  }
}

export const modelRegistry = new ModelRegistry();
export const registry = modelRegistry;
