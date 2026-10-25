import type { AnalysisRequest, AnalysisResult, Facility, NetworkSummary, RestrictedZone } from '../domain/types';

/**
 * Provider abstraction for the logistics backend. The UI depends only on this interface;
 * {@link createLogisticsService} picks the implementation from NEXT_PUBLIC_API_MODE.
 */
export interface LogisticsService {
  readonly mode: 'mock' | 'live';
  listFacilities(): Promise<Facility[]>;
  listRestrictedZones(): Promise<RestrictedZone[]>;
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
  recentAnalyses(limit?: number): Promise<AnalysisResult[]>;
  networkSummary(): Promise<NetworkSummary>;
}

export class LogisticsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LogisticsApiError';
  }
}
