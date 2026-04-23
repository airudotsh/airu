/**
 * ModelRegistry - 모델 Provider 레지스트리
 */
import type { IModelProvider, ProviderConfig } from './provider';

export class ModelRegistry {
  private providers = new Map<string, IModelProvider>();
  private instances = new Map<string, IModelProvider>();

  register(name: string, ProviderClass: new () => IModelProvider): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }
    this.providers.set(name, new ProviderClass());
  }

  registerInstance(name: string, instance: IModelProvider): void {
    this.providers.set(name, instance);
  }

  async get(name: string, config?: ProviderConfig): Promise<IModelProvider | undefined> {
    const cached = this.instances.get(name);
    if (cached) return cached;

    const Provider = this.providers.get(name);
    if (!Provider) return undefined;

    const instance = Provider;
    if (config) {
      await instance.initialize(config);
    }
    this.instances.set(name, instance);
    return instance;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  supportedModels(name: string): string[] | undefined {
    return this.providers.get(name)?.supportedModels;
  }

  allModels(): Array<{ provider: string; model: string }> {
    const models: Array<{ provider: string; model: string }> = [];
    for (const [providerName, provider] of this.providers) {
      for (const model of provider.supportedModels) {
        models.push({ provider: providerName, model });
      }
    }
    return models;
  }
}

export const registry = new ModelRegistry();
