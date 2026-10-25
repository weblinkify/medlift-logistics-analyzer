import { LiveAxiosLogisticsClient, logisticsService } from '../services';
import { BackendAIAgent } from './BackendAIAgent';
import { MockAIAgent } from './MockAIAgent';
import type { RouteOptimizationAgent } from './RouteOptimizationAgent';

export function createRouteAgent(): RouteOptimizationAgent {
  return logisticsService instanceof LiveAxiosLogisticsClient
    ? new BackendAIAgent(logisticsService.client)
    : new MockAIAgent();
}

export const routeAgent = createRouteAgent();

export type { AgentInsight, AgentRecommendation, InsightSeverity, RouteOptimizationAgent } from './RouteOptimizationAgent';
export { MockAIAgent } from './MockAIAgent';
