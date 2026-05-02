// Explicitly re-export types (not type *)
export type {
  IModelProvider,
  Message,
  Response,
  StreamChunk,
  ToolSchema,
  ToolCall,
  ToolCallDelta,
  ProviderConfig,
} from './interfaces/IModelProvider';

export type {
  ITool,
  ToolResult,
  ToolPropertySchema,
} from './interfaces/ITool';

export type {
  IMethod,
  MethodInput,
  MethodContext,
  MethodOutput,
  MethodConfigSchema,
} from './interfaces/IMethod';

export type { IPattern } from './interfaces/IPattern';
export { KeywordPattern } from './interfaces/IPattern';
export type { PatternStep } from './interfaces/IPattern';

export type {
  IChannel,
  UserInput,
} from './interfaces/IChannel';

export type {
  IConfigParser,
  ValidationResult,
  ConfigData,
} from './interfaces/IConfigParser';

export { ModelRegistry, modelRegistry, registry } from './registry/ModelRegistry';
export { MethodRegistry, methodRegistry } from './registry/MethodRegistry';
export { PatternRegistry, patternRegistry } from './registry/PatternRegistry';
export { ToolRegistry, toolRegistry } from './registry/ToolRegistry';

export { parseSSEStream, openaiSSEParser, ollamaSSEParser } from './engine/SSEParser';
export type { SSEParserOptions } from './engine/SSEParser';

export { Guardrails, classifyError, recommendedAction, ExecutionLogger } from './engine/Guardrails';
export type { GuardrailEvent, GuardrailAction, ErrorCategory, ExecutionMetrics, ExecutionLogEntry } from './engine/Guardrails';

export { SessionStore } from './engine/SessionStore';

export { KnowledgeStore } from './engine/KnowledgeStore';
export type { KnowledgeEntry, KnowledgeSearchResult } from './engine/KnowledgeStore';

export { SkillRegistry } from './engine/SkillRegistry';
export type { SkillDefinition } from './engine/SkillRegistry';

export { loadConfig, saveConfig, ensureDefaultConfig, getConfigPath, maskSecret } from './engine/Config';
export type { AiruConfig } from './engine/Config';

export { runAgentLoop, agentChat, executeToolCall, compressContext, estimateTokens, toolToOpenAiSchema } from './engine/Agent';
export type { ToolCallResult, AgentOptions } from './engine/Agent';

export { Orchestrator } from './engine/Orchestrator';
export type { ReflectionReport, GrowthEntry, OrchestratorOptions } from './engine/Orchestrator';
