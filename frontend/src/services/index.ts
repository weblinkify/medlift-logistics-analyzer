import { API_BASE_URL, API_MODE, type ApiMode } from '../config';
import { LiveAxiosLogisticsClient } from './LiveAxiosLogisticsClient';
import type { LogisticsService } from './LogisticsService';
import { MockLogisticsClient } from './MockLogisticsClient';

export function createLogisticsService(mode: ApiMode = API_MODE): LogisticsService {
  return mode === 'live' ? new LiveAxiosLogisticsClient(API_BASE_URL) : new MockLogisticsClient();
}

export const logisticsService = createLogisticsService();

export type { LogisticsService } from './LogisticsService';
export { LogisticsApiError } from './LogisticsService';
export { MockLogisticsClient } from './MockLogisticsClient';
export { LiveAxiosLogisticsClient } from './LiveAxiosLogisticsClient';
