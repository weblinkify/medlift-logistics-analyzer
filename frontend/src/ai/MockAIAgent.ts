import type { AnalysisResult, BlockerCode } from '../domain/types';
import type { AgentInsight, AgentRecommendation, RouteOptimizationAgent } from './RouteOptimizationAgent';

// Mirrors backend/src/main/java/com/medlift/analyzer/ai/MockAIAgent.java.

export const MOCK_MODEL = 'medlift-route-advisor-mock-v1';

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

export class MockAIAgent implements RouteOptimizationAgent {
  readonly provider = 'mock';

  constructor(private readonly thinkingMs = 900) {}

  async recommend(a: AnalysisResult): Promise<AgentRecommendation> {
    const started = performance.now();
    await new Promise((r) => setTimeout(r, this.thinkingMs));
    const { summary, insights, confidence } = adviseMock(a);
    return {
      analysisId: a.id,
      summary,
      insights,
      confidence,
      provider: this.provider,
      model: MOCK_MODEL,
      generatedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

export function adviseMock(a: AnalysisResult): Pick<AgentRecommendation, 'summary' | 'insights' | 'confidence'> {
  const req = a.request;
  const insights: AgentInsight[] = [];

  for (const b of a.drone.blockers) {
    insights.push({ severity: 'CRITICAL', title: 'Drone dispatch blocked', detail: `${b.message}. ${blockerAdvice(b.code, a)}` });
  }

  for (const z of a.drone.zoneConflicts) {
    switch (z.resolution) {
      case 'DETOUR':
        insights.push({
          severity: 'WARNING',
          title: `Airspace conflict: ${z.zoneName}`,
          detail: `Warning: Direct line passes through ${z.zoneName} airspace restriction zone; recommending ${f1(Math.max(0.1, z.detourKm ?? 0))} km ${z.detourDirection} detour.`,
        });
        break;
      case 'AUTHORIZATION_REQUIRED': {
        const site = z.endpoint === 'origin' ? a.origin.name : a.destination.name;
        insights.push({
          severity: 'WARNING',
          title: 'ATC authorisation required',
          detail: `${site} lies inside the ${z.zoneName} control zone. File a UTM flight authorisation with ${z.authority} before launch and expect ~5 min coordination.`,
        });
        break;
      }
      case 'ADVISORY':
        insights.push({
          severity: 'INFO',
          title: `Advisory area: ${z.zoneName}`,
          detail: `Route skirts ${z.zoneName}; hold cruise altitude at 90–120 m AGL and avoid hovering.`,
        });
        break;
      case 'BLOCKED':
        break; // reported as a blocker
    }
  }

  if (a.drone.feasible) {
    if (req.weather === 'WINDY') {
      insights.push({ severity: 'INFO', title: 'Wind advisory', detail: 'Gusts cut effective cruise speed by 15%; battery reserve policy raised to 30%.' });
    } else if (req.weather === 'RAIN') {
      insights.push({ severity: 'INFO', title: 'Light rain', detail: 'IP54-rated airframes cleared for rain; ETA padded by 10%.' });
    } else if (req.weather === 'SNOW') {
      insights.push({ severity: 'INFO', title: 'Winter operations', detail: 'Sub-zero conditions: de-icing check before launch; cruise speed reduced 20%.' });
    }

    if (req.payloadType === 'BLOOD_PRODUCTS') {
      const ok = a.drone.totalMinutes <= 30;
      insights.push({
        severity: ok ? 'SUCCESS' : 'WARNING',
        title: 'Cold chain',
        detail: ok
          ? `Cold-chain window maintained: ${f1(a.drone.totalMinutes)} min door-to-door keeps blood products within the 2–6 °C envelope.`
          : `Flight of ${f1(a.drone.totalMinutes)} min exceeds the 30 min passive-cooling window; use an active-cooled pod.`,
      });
    } else if (req.payloadType === 'PHARMACEUTICALS') {
      insights.push({
        severity: 'INFO',
        title: 'Chain of custody',
        detail: 'Use a tamper-evident sealed pod for controlled pharmaceuticals; custody log is attached automatically.',
      });
    }

    if (req.timeWindow === 'PEAK') {
      insights.push({
        severity: 'INFO',
        title: 'Peak-hour traffic',
        detail: `Road congestion inflates courier ETA by 55%; drone advantage widens to ${f1(a.timeSavedMinutes)} min.`,
      });
    }
  }

  if (a.straightLineKm < 2) {
    insights.push({
      severity: 'INFO',
      title: 'Short hop',
      detail: `Facilities are only ${f1(a.straightLineKm)} km apart; for routine loads an in-house porter or pneumatic tube is cheapest.`,
    });
  }

  if (a.drone.feasible) {
    insights.push(
      a.costDeltaEur >= 0
        ? {
            severity: 'SUCCESS',
            title: 'Economics',
            detail: `Drone saves ${f1(a.timeSavedMinutes)} min, €${f2(a.costDeltaEur)} and ${f2(a.co2SavedKg)} kg CO₂ per delivery versus road courier.`,
          }
        : {
            severity: 'INFO',
            title: 'Economics',
            detail: `Drone is ${f1(a.timeSavedMinutes)} min faster but €${f2(-a.costDeltaEur)} more expensive; batched courier wins on cost for routine loads.`,
          },
    );
  }

  return { summary: summary(a), insights, confidence: confidence(a) };
}

function summary(a: AnalysisResult): string {
  const route = `${a.origin.name} → ${a.destination.name}`;
  if (a.recommendation === 'DRONE') {
    const detour = a.drone.detourKm >= 0.1 ? `, including a ${f1(a.drone.detourKm)} km detour around restricted airspace` : '';
    return `Recommend drone dispatch for ${route}: ETA ${f1(a.drone.totalMinutes)} min vs ${f1(a.courier.totalMinutes)} min by road${detour}.`;
  }
  if (!a.drone.feasible) {
    return `Recommend road courier for ${route}: drone dispatch blocked (${a.drone.blockers[0].message.toLowerCase()}). Courier ETA ${f1(a.courier.totalMinutes)} min.`;
  }
  return `Recommend batched road courier for ${route}: €${f2(-a.costDeltaEur)} cheaper for this routine load; a drone would save ${f1(a.timeSavedMinutes)} min.`;
}

function confidence(a: AnalysisResult): number {
  if (!a.drone.feasible) return 0.97;
  const conflicts = a.drone.zoneConflicts.filter((z) => z.resolution !== 'ADVISORY').length;
  const c = 0.93 - 0.05 * conflicts - (a.request.weather === 'CLEAR' ? 0 : 0.04);
  return Math.round(Math.max(0.6, c) * 100) / 100;
}

function blockerAdvice(code: BlockerCode, a: AnalysisResult): string {
  switch (code) {
    case 'PAYLOAD_LIMIT':
      return `Split the consignment across ${Math.ceil(a.request.payloadKg / 5)} drone sorties or dispatch a courier.`;
    case 'RANGE_LIMIT':
      return 'Stage via an intermediate hospital pad or dispatch a courier.';
    case 'WEATHER_GROUNDED':
      return 'Courier dispatched as contingency; re-evaluate when the weather window opens.';
    case 'NO_DRONE_PAD':
      return 'Land at the nearest certified pad and hand off by porter, or dispatch a courier.';
    case 'PROHIBITED_ZONE':
      return 'No flight path is permissible; dispatch a courier.';
  }
}
