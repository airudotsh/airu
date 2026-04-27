/**
 * 메서드 인덱스 - 모든 메서드 스켈레톤 export
 * Sprint 3: 11개 메서드 스켈레톤
 */
export { PerceptionMethod } from './M1-Perception';
export { ReasoningMethod } from './M2-Reasoning';
export { JudgmentMethod } from './M3-Judgment';
export { PlanningMethod } from './M4-Planning';
export { ExecutionMethod } from './M5-Execution';
export { MonitoringMethod } from './M6-Monitoring';
export { LearningMethod } from './M7-Learning';
export { CommunicationMethod } from './M8-Communication';
export { ToolsMethod } from './M9-Tools';
export { CreativityMethod } from './M10-Creativity';
export { KnowledgeMethod } from './M11-Knowledge';

/**
 * 모든 메서드를 registry에 등록
 */
import { methodRegistry } from '@airu/core';
import { PerceptionMethod } from './M1-Perception';
import { ReasoningMethod } from './M2-Reasoning';
import { JudgmentMethod } from './M3-Judgment';
import { PlanningMethod } from './M4-Planning';
import { ExecutionMethod } from './M5-Execution';
import { MonitoringMethod } from './M6-Monitoring';
import { LearningMethod } from './M7-Learning';
import { CommunicationMethod } from './M8-Communication';
import { ToolsMethod } from './M9-Tools';
import { CreativityMethod } from './M10-Creativity';
import { KnowledgeMethod } from './M11-Knowledge';

export function registerAllMethods(): void {
  const methods = [
    new PerceptionMethod(),
    new ReasoningMethod(),
    new JudgmentMethod(),
    new PlanningMethod(),
    new ExecutionMethod(),
    new MonitoringMethod(),
    new LearningMethod(),
    new CommunicationMethod(),
    new ToolsMethod(),
    new CreativityMethod(),
    new KnowledgeMethod(),
  ];

  for (const m of methods) {
    methodRegistry.register(m);
  }
}
