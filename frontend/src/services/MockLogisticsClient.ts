import { analyze, networkSummary } from '../domain/engine';
import { FACILITIES, RESTRICTED_ZONES } from '../domain/seed';
import type { AnalysisRequest, AnalysisResult, Facility, NetworkSummary, RestrictedZone } from '../domain/types';
import { LogisticsApiError, type LogisticsService } from './LogisticsService';

export interface MockOptions {
  /** Simulated network latency in ms, so loading states are visible in demos. */
  latencyMs?: number;
}

/**
 * Runs the full analysis engine in the browser against the seed network.
 * No PostgreSQL, no Java — suitable for a static Vercel deployment.
 */
export class MockLogisticsClient implements LogisticsService {
  readonly mode = 'mock' as const;
  private readonly history: AnalysisResult[] = [];
  private readonly latencyMs: number;

  constructor(options: MockOptions = {}) {
    this.latencyMs = options.latencyMs ?? 350;
  }

  async listFacilities(): Promise<Facility[]> {
    await this.delay();
    return structuredClone(FACILITIES);
  }

  async listRestrictedZones(): Promise<RestrictedZone[]> {
    await this.delay();
    return structuredClone(RESTRICTED_ZONES);
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    await this.delay();
    if (request.originId === request.destinationId) {
      throw new LogisticsApiError('Origin and destination must be different facilities', 400);
    }
    if (!(request.payloadKg >= 0.1 && request.payloadKg <= 50)) {
      throw new LogisticsApiError('payloadKg must be between 0.1 and 50', 400);
    }
    const origin = this.facility(request.originId);
    const destination = this.facility(request.destinationId);
    const result = analyze(origin, destination, RESTRICTED_ZONES, request);
    this.history.unshift(result);
    this.history.length = Math.min(this.history.length, 100);
    return result;
  }

  async recentAnalyses(limit = 10): Promise<AnalysisResult[]> {
    await this.delay();
    return this.history.slice(0, limit);
  }

  async networkSummary(): Promise<NetworkSummary> {
    await this.delay();
    return networkSummary(FACILITIES, RESTRICTED_ZONES);
  }

  private facility(id: number): Facility {
    const f = FACILITIES.find((x) => x.id === id);
    if (!f) throw new LogisticsApiError(`Facility ${id} not found`, 404);
    return f;
  }

  private delay() {
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
