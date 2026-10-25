import type { AnalysisResult } from '../domain/types';

export type InsightSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';

export interface AgentInsight {
  severity: InsightSeverity;
  title: string;
  detail: string;
}

export interface AgentRecommendation {
  analysisId: string;
  summary: string;
  insights: AgentInsight[];
  confidence: number;
  provider: string;
  model: string;
  generatedAt: string;
  latencyMs: number;
}

/**
 * AI Route Optimization Agent — LLM abstraction layer.
 *
 * Implementations:
 *  - {@link MockAIAgent}: deterministic, runs in the browser, zero API cost (demo default).
 *  - {@link BackendAIAgent}: asks the Spring Boot API, which holds the LLM credentials and
 *    routes to its configured provider (mock or Anthropic). API keys never reach the browser.
 */
export interface RouteOptimizationAgent {
  readonly provider: string;
  recommend(analysis: AnalysisResult): Promise<AgentRecommendation>;
}
