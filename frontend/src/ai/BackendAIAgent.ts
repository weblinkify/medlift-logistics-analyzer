import type { AxiosInstance } from 'axios';
import type { AnalysisResult } from '../domain/types';
import type { AgentRecommendation, RouteOptimizationAgent } from './RouteOptimizationAgent';

/** Delegates to POST /agent/recommendations; the backend chooses the LLM provider. */
export class BackendAIAgent implements RouteOptimizationAgent {
  readonly provider = 'backend';

  constructor(private readonly http: AxiosInstance) {}

  async recommend(analysis: AnalysisResult): Promise<AgentRecommendation> {
    const res = await this.http.post<AgentRecommendation>('/agent/recommendations', { analysisId: analysis.id });
    return res.data;
  }
}
