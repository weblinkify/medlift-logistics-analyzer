import { describe, expect, it } from 'vitest';
import { MockAIAgent } from '../ai/MockAIAgent';
import { MockLogisticsClient } from '../services/MockLogisticsClient';
import { createLogisticsService } from '../services';
import { LiveAxiosLogisticsClient } from '../services/LiveAxiosLogisticsClient';

describe('provider abstraction', () => {
  it('selects the implementation from the API mode', () => {
    expect(createLogisticsService('mock')).toBeInstanceOf(MockLogisticsClient);
    expect(createLogisticsService('live')).toBeInstanceOf(LiveAxiosLogisticsClient);
  });

  it('mock client runs a full analysis and records history', async () => {
    const client = new MockLogisticsClient({ latencyMs: 0 });
    const r = await client.analyze({
      originId: 1, destinationId: 8, payloadType: 'LAB_SAMPLES', payloadKg: 2,
      priority: 'URGENT', weather: 'CLEAR', timeWindow: 'DAYTIME',
    });
    expect(r.recommendation).toBe('DRONE');
    expect(await client.recentAnalyses()).toHaveLength(1);
    await expect(client.analyze({ ...r.request, destinationId: 1 })).rejects.toThrow(/different/);
  });

  it('mock AI agent writes the airspace detour warning', async () => {
    const client = new MockLogisticsClient({ latencyMs: 0 });
    const r = await client.analyze({
      originId: 1, destinationId: 8, payloadType: 'LAB_SAMPLES', payloadKg: 2,
      priority: 'URGENT', weather: 'CLEAR', timeWindow: 'DAYTIME',
    });
    const rec = await new MockAIAgent(0).recommend(r);
    expect(rec.provider).toBe('mock');
    expect(rec.summary).toMatch(/^Recommend drone dispatch/);
    expect(rec.insights.some((i) => /Direct line passes through Helsinki-Vantaa \(EFHK\) airspace restriction zone; recommending [\d.]+ km western detour/.test(i.detail))).toBe(true);
  });
});
