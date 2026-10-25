# MedLift Logistics Analyzer

**Should this hospital shipment go by medical drone or road courier?**
MedLift compares door-to-door time, cost and CO₂ for every shipment across a hospital network. It accounts for
restricted airspace, weather, payload limits, drone-pad availability and cold-chain limits, and an AI
Route Optimization Agent explains each decision in plain language.

The reference network is the Helsinki University Hospital (HUS) district in Finland: 9 facilities and
5 airspace zones, including the Helsinki-Vantaa airport control zone.

| | |
|---|---|
| **Frontend** | React 18 · TypeScript · Tailwind CSS · Vite, deployed on Vercel |
| **Backend** | Spring Boot 3.3 · Java 21 · Spring Data JPA · Flyway |
| **Database** | PostgreSQL 16 |
| **AI** | Provider-abstracted agent: deterministic mock (default) or Anthropic Claude |

---

## Run the demo in 30 seconds

No backend, database or API keys needed. Everything runs in the browser.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (NEXT_PUBLIC_API_MODE defaults to "mock")
```

### Investor walkthrough (≈3 min)

1. **KPI strip:** projected network impact if urgent hub-to-hospital runs move to drones: annual savings,
   delivery hours saved, CO₂ avoided, and how many routes are drone-ready.
2. **Airport detour** scenario (loaded on start): a STAT blood delivery from Meilahti to Hyvinkää at rush hour.
   The direct line crosses the Helsinki-Vantaa control zone, so the planner routes a western detour around it.
   The drone arrives about 65 min sooner. The AI agent flags the airspace conflict and the nature-corridor
   advisory, and warns that the 47 min flight exceeds the 30 min passive cold-chain window.
3. **Control zone:** Peijas Hospital lies *inside* the airport zone. No detour is possible, so the agent
   asks for ATC (Fintraffic) authorisation instead.
4. **Storm / Heavy load / No drone pad:** the cases where the drone can't fly. The tool recommends the courier
   and explains why. Credibility comes from showing when *not* to use the product.
5. **Network rollout plan:** route-by-route business case. Click any row, or any hospital on the map, to analyse it.

---

## Architecture

```
┌──────────────────────── Vercel ────────────────────────┐
│  React SPA (frontend/dist)                             │
│   ├─ LogisticsService ◄── createLogisticsService()     │
│   │    ├─ MockLogisticsClient   (mode = mock)  ──► domain/engine.ts (in-browser)
│   │    └─ LiveAxiosLogisticsClient (mode = live) ─┐    │
│   └─ RouteOptimizationAgent                       │    │
│        ├─ MockAIAgent           (mode = mock)     │    │
│        └─ BackendAIAgent        (mode = live) ────┤    │
│                                                   ▼    │
│  /api/v1/*  ──rewrite──►  api/proxy.ts (serverless) ───┼──► BACKEND_URL
└────────────────────────────────────────────────────────┘          │
                                                                    ▼
                         ┌──────────── Spring Boot API ─────────────┐
                         │ FacilityController  AnalysisController   │
                         │ AgentController                          │
                         │ LogisticsAnalysisService                 │
                         │   └─ LogisticsCalculator (pure model)    │
                         │ RouteOptimizationAgentService            │
                         │   └─ LlmProvider ── MockAIAgent          │
                         │                  └─ AnthropicLlmProvider │
                         └──────────────────┬───────────────────────┘
                                            ▼
                              PostgreSQL (Flyway migrations)
```

### Provider abstraction and mock mode

- **`LogisticsService`** (`frontend/src/services/LogisticsService.ts`) is the only interface the UI uses.
  - `MockLogisticsClient` runs the full analysis engine in the browser against the seed network, with simulated latency.
  - `LiveAxiosLogisticsClient` calls the REST API with axios.
- **`NEXT_PUBLIC_API_MODE`** picks the implementation (`mock` | `live`) and is inlined at build time. It defaults to
  `mock`, so a fresh Vercel deploy needs no backend.
- **Parity guarantee:** `frontend/src/domain/engine.ts` is a line-for-line port of `LogisticsCalculator.java`.
  `src/__tests__/parity.test.ts` posts every facility pair (72 routes, mixed weather, priority and payload) to a
  running API and asserts the results are identical.

### AI Route Optimization Agent

- **Backend:** `LlmProvider` is the LLM abstraction layer. `MockAIAgent` is a deterministic rule engine that writes
  natural-language advice (e.g. *"Warning: Direct line passes through Helsinki-Vantaa (EFHK) airspace restriction
  zone; recommending 0.3 km western detour."*). `AnthropicLlmProvider` sends the same analysis to Claude with
  structured output, so both return the same `LlmAdvice` contract. If the live provider fails, the service falls
  back to the mock. Every recommendation is stored in `agent_recommendation`.
- **Frontend:** `RouteOptimizationAgent` has two implementations. `MockAIAgent` runs in the browser and costs nothing.
  `BackendAIAgent` asks the API, which holds the credentials, so **API keys never reach the browser**.
- Live LLM calls happen only when the backend runs with `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` set.
  Demos and evaluations default to the mock and incur no LLM cost.

---

## Local full stack (Docker)

```bash
docker compose up --build            # PostgreSQL 16 + Spring Boot API on :8080
cd frontend && npm run dev:live      # UI on :5173, /api proxied to :8080
```

Flyway applies `V1__schema.sql` and `V2__seed_helsinki_network.sql` when the API starts.
The API waits for the database health check, so `up` works first time. To reset the data: `docker compose down -v`.

To use Claude for the AI agent:

```bash
AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... docker compose up --build
```

---

## REST API (`/api/v1`)

| Method | Path | Description |
|---|---|---|
| GET | `/facilities` | Hospitals and hub |
| GET | `/restricted-zones` | Active airspace zones |
| POST | `/analyses` | Run a drone-vs-courier analysis (persisted) |
| GET | `/analyses?limit=10` | Recent analyses |
| GET | `/analyses/{id}` | One analysis |
| GET | `/network/summary` | Annualised hub-to-hospital impact projection |
| POST | `/agent/recommendations` | `{ "analysisId": "…" }` → AI agent advice |
| GET | `/actuator/health` | Liveness / readiness |

```bash
curl -X POST localhost:8080/api/v1/analyses -H 'Content-Type: application/json' -d '{
  "originId": 1, "destinationId": 8, "payloadType": "BLOOD_PRODUCTS", "payloadKg": 2,
  "priority": "STAT", "weather": "CLEAR", "timeWindow": "PEAK" }'
```

Errors are returned as RFC 7807 `ProblemDetail` JSON.

---

## Deploying to Vercel

`vercel.json` (repo root) builds `frontend/` and serves `frontend/dist`.

| Setting | Demo (default) | Live backend |
|---|---|---|
| `NEXT_PUBLIC_API_MODE` | `mock` (or unset) | `live` |
| `BACKEND_URL` | n/a | e.g. `https://medlift-api.example.com` |

In live mode, `/api/v1/*` is rewritten to the `api/proxy.ts` serverless function. The function forwards an
allow-listed set of routes to `BACKEND_URL`, so the browser stays same-origin and the backend needs no public CORS.

```bash
npx vercel --prod
```

The backend image (`backend/Dockerfile`) is a layered, non-root JRE image with a health check. It runs on any
container platform (Fly.io, Render, Cloud Run, ECS). Set `DB_URL`, `DB_USER`, `DB_PASSWORD` and `CORS_ALLOWED_ORIGINS`.

---

## Model assumptions

These are planning estimates for scenario comparison, not operational guidance.

| Parameter | Drone | Courier |
|---|---|---|
| Speed | 72 km/h cruise (×0.7–1.0 by weather) | 32 km/h urban for the first 12 km, then 80 km/h; ×1.0/1.2/1.55 traffic |
| Fixed time | 4 min prep + 2 min handoff | 8 / 15 / 30 min dispatch (STAT / urgent / routine) + 5 min handoff |
| Distance | Great-circle + airspace detours (0.5 km buffer) | Great-circle × 1.38 road circuity |
| Cost | €22 + €0.85/km | (€38 + €1.45/km) × 1.6 / 1.25 / 0.55 (routine is batched) |
| CO₂ | 6 g/km | 180 g/km |
| Limits | 5 kg payload, 60 km range, grounded in storms, needs a pad at both ends | none |

Airspace handling: **prohibited** zone on an endpoint means the drone is blocked. **Restricted** zone on an
endpoint means ATC authorisation is required. A **restricted or prohibited** zone crossed mid-route triggers a
detour. An **advisory** zone produces a warning only. Network projections assume 88% flyable days.

---

## Repository layout

```
.
├── api/proxy.ts                    Vercel serverless mapping layer → Spring Boot
├── vercel.json                     Build, rewrites, security headers
├── docker-compose.yml              PostgreSQL + API local loop
├── backend/
│   ├── Dockerfile
│   └── src/main/
│       ├── java/com/medlift/analyzer/
│       │   ├── api/                Controllers + ProblemDetail error handling
│       │   ├── service/            LogisticsCalculator (model), LogisticsAnalysisService
│       │   ├── ai/                 LlmProvider, MockAIAgent, AnthropicLlmProvider, agent service
│       │   ├── domain/             Records & enums (wire contract)
│       │   └── repository/         JPA entities & repositories
│       └── resources/db/migration/ V1 schema DDL, V2 seed network
└── frontend/src/
    ├── services/                   LogisticsService, MockLogisticsClient, LiveAxiosLogisticsClient
    ├── ai/                         RouteOptimizationAgent, MockAIAgent, BackendAIAgent
    ├── domain/                     Types, seed data, engine (port of the Java model)
    └── components/                 Map, comparison, agent panel, KPI strip, rollout table
```

## Tests

```bash
# Backend (JUnit 5, MockMvc). No local JDK needed:
docker run --rm -v "$PWD/backend":/src -w /src maven:3.9-eclipse-temurin-21 mvn -B test

# Frontend (Vitest): engine, provider switching, mock AI agent
cd frontend && npm test

# Mock ↔ backend parity across all 72 routes (needs `docker compose up`)
PARITY_API_URL=http://localhost:8080/api/v1 npm test
```
