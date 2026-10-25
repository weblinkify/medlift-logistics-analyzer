import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { AnalysisRequest, AnalysisResult, Facility, NetworkSummary, RestrictedZone } from '../domain/types';
import { LogisticsApiError, type LogisticsService } from './LogisticsService';

/** Talks to the Spring Boot API (directly, via the Vite dev proxy, or via the Vercel rewrite). */
export class LiveAxiosLogisticsClient implements LogisticsService {
  readonly mode = 'live' as const;
  private readonly http: AxiosInstance;

  constructor(baseURL: string, http?: AxiosInstance) {
    this.http = http ?? axios.create({ baseURL, timeout: 15_000, headers: { 'Content-Type': 'application/json' } });
    this.http.interceptors.response.use(undefined, (error: AxiosError<{ detail?: string }>) => {
      const detail = error.response?.data?.detail ?? error.message;
      return Promise.reject(new LogisticsApiError(detail, error.response?.status));
    });
  }

  async listFacilities(): Promise<Facility[]> {
    return (await this.http.get<Facility[]>('/facilities')).data;
  }

  async listRestrictedZones(): Promise<RestrictedZone[]> {
    return (await this.http.get<RestrictedZone[]>('/restricted-zones')).data;
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    return (await this.http.post<AnalysisResult>('/analyses', request)).data;
  }

  async recentAnalyses(limit = 10): Promise<AnalysisResult[]> {
    return (await this.http.get<AnalysisResult[]>('/analyses', { params: { limit } })).data;
  }

  async networkSummary(): Promise<NetworkSummary> {
    return (await this.http.get<NetworkSummary>('/network/summary')).data;
  }

  /** Shared with the backend-backed AI agent so both use one configured client. */
  get client(): AxiosInstance {
    return this.http;
  }
}
