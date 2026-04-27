/**
 * @airu/plugins — 전체 플러그인 등록
 * 코어는 구현체를 모른다. 플러그인 하나 추가 + config 두 줄이면 끝.
 */

import { modelRegistry } from '@airu/core';
import { methodRegistry } from '@airu/core';
import { patternRegistry } from '@airu/core';
import { toolRegistry } from '@airu/core';

import { GLMProvider } from './models/glm';
import { OpenAIProvider } from './models/openai';
import { OllamaProvider } from './models/ollama';

import { TerminalTool } from './tools/terminal';
import { FileReadTool, FileWriteTool, FileSearchTool } from './tools/file';
import { WebSearchTool, WebFetchTool } from './tools/web';

import { registerAllMethods } from './methods';
import { registerAllPatterns } from './patterns';

export { GLMProvider } from './models/glm';
export { OpenAIProvider } from './models/openai';
export { OllamaProvider } from './models/ollama';

export { TerminalTool } from './tools/terminal';
export { FileReadTool, FileWriteTool, FileSearchTool } from './tools/file';
export { WebSearchTool, WebFetchTool } from './tools/web';

export { registerAllMethods } from './methods';
export { registerAllPatterns } from './patterns';

/** config 기반으로 플러그인 동적 등록 */
export function loadPlugins(config: Record<string, unknown> = {}): void {
  modelRegistry.register('glm', new GLMProvider());
  modelRegistry.register('openai', new OpenAIProvider());
  modelRegistry.register('ollama', new OllamaProvider());

  toolRegistry.register(new TerminalTool());
  toolRegistry.register(new FileReadTool());
  toolRegistry.register(new FileWriteTool());
  toolRegistry.register(new FileSearchTool());
  toolRegistry.register(new WebSearchTool());
  toolRegistry.register(new WebFetchTool());

  registerAllMethods();
  registerAllPatterns();
}
