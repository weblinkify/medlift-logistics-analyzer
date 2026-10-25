-- MedLift Logistics Analyzer — core schema (PostgreSQL 14+)

CREATE TABLE facility (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(16)  NOT NULL UNIQUE,
    name             VARCHAR(160) NOT NULL,
    city             VARCHAR(80)  NOT NULL,
    facility_type    VARCHAR(16)  NOT NULL CHECK (facility_type IN ('HUB', 'HOSPITAL', 'LAB')),
    latitude         DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude        DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    has_drone_pad    BOOLEAN      NOT NULL DEFAULT TRUE,
    daily_shipments  INTEGER      NOT NULL DEFAULT 0 CHECK (daily_shipments >= 0),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE restricted_zone (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(24)  NOT NULL UNIQUE,
    name              VARCHAR(160) NOT NULL,
    severity          VARCHAR(16)  NOT NULL CHECK (severity IN ('PROHIBITED', 'RESTRICTED', 'ADVISORY')),
    center_latitude   DOUBLE PRECISION NOT NULL CHECK (center_latitude BETWEEN -90 AND 90),
    center_longitude  DOUBLE PRECISION NOT NULL CHECK (center_longitude BETWEEN -180 AND 180),
    radius_km         DOUBLE PRECISION NOT NULL CHECK (radius_km > 0),
    authority         VARCHAR(80)  NOT NULL,
    notes             TEXT,
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One row per drone-vs-courier comparison. Key metrics are columns for reporting;
-- the full result (conflicts, waypoints, blockers) is kept in result_payload.
CREATE TABLE analysis_run (
    id                   UUID PRIMARY KEY,
    origin_id            BIGINT       NOT NULL REFERENCES facility (id),
    destination_id       BIGINT       NOT NULL REFERENCES facility (id),
    payload_type         VARCHAR(32)  NOT NULL CHECK (payload_type IN ('BLOOD_PRODUCTS', 'LAB_SAMPLES', 'PHARMACEUTICALS', 'MEDICAL_DEVICES')),
    payload_kg           DOUBLE PRECISION NOT NULL CHECK (payload_kg > 0),
    priority             VARCHAR(16)  NOT NULL CHECK (priority IN ('ROUTINE', 'URGENT', 'STAT')),
    weather              VARCHAR(16)  NOT NULL CHECK (weather IN ('CLEAR', 'WINDY', 'RAIN', 'SNOW', 'STORM')),
    time_window          VARCHAR(16)  NOT NULL CHECK (time_window IN ('OFF_PEAK', 'DAYTIME', 'PEAK')),
    straight_line_km     DOUBLE PRECISION NOT NULL,
    drone_feasible       BOOLEAN      NOT NULL,
    drone_distance_km    DOUBLE PRECISION NOT NULL,
    drone_minutes        DOUBLE PRECISION NOT NULL,
    drone_cost_eur       DOUBLE PRECISION NOT NULL,
    courier_distance_km  DOUBLE PRECISION NOT NULL,
    courier_minutes      DOUBLE PRECISION NOT NULL,
    courier_cost_eur     DOUBLE PRECISION NOT NULL,
    recommendation       VARCHAR(16)  NOT NULL CHECK (recommendation IN ('DRONE', 'COURIER')),
    result_payload       JSONB        NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_analysis_distinct_endpoints CHECK (origin_id <> destination_id)
);

CREATE INDEX idx_analysis_run_created_at ON analysis_run (created_at DESC);
CREATE INDEX idx_analysis_run_route ON analysis_run (origin_id, destination_id);

-- Output of the AI Route Optimization Agent (mock or live LLM provider).
CREATE TABLE agent_recommendation (
    id            UUID PRIMARY KEY,
    analysis_id   UUID         NOT NULL REFERENCES analysis_run (id) ON DELETE CASCADE,
    provider      VARCHAR(32)  NOT NULL,
    model         VARCHAR(64)  NOT NULL,
    summary       TEXT         NOT NULL,
    insights      JSONB        NOT NULL,
    confidence    DOUBLE PRECISION NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    latency_ms    INTEGER      NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_recommendation_analysis ON agent_recommendation (analysis_id);
