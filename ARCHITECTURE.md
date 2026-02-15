# Architecture & Technical Decisions

## Overview

A full-stack emissions monitoring platform built with **NestJS** (backend), **Next.js 15** (frontend), **PostgreSQL 16** (database), and **Drizzle ORM** (type-safe query builder). The system is designed around data integrity — every emission reading is persisted exactly once, even under network failures and concurrent writes.

## Project Structure

```
backend/src/
  main.ts                        # App bootstrap, global middleware
  app.module.ts                  # Root module
  common/
    http-exception.filter.ts     # Unified error response format
    response.interceptor.ts      # Unified success response format
  database/
    database.module.ts           # Drizzle + pg Pool provider
    schema.ts                    # Table definitions (sites, measurements, ingestion_logs)
    seed.ts                      # Demo data (3 sites)
    migrations/                  # Generated SQL
  sites/
    sites.module.ts              # NestJS module wiring
    sites.controller.ts          # POST /sites, GET /sites, GET /sites/:id/metrics
    sites.service.ts             # Business logic + compliance status
    sites.service.spec.ts        # Unit tests
    create-site.dto.ts           # Zod validation schema
  ingestion/
    ingestion.module.ts          # NestJS module wiring
    ingestion.controller.ts      # POST /ingest
    ingestion.service.ts         # Two-layer idempotency + pessimistic locking
    ingestion.service.spec.ts    # Unit tests
    ingest-readings.dto.ts       # Zod validation schema

frontend/src/
  app/
    layout.tsx                   # Root layout + React Query provider
    page.tsx                     # Dashboard (list sites, create site form)
    sites/[id]/page.tsx          # Site detail (metrics, progress bar, ingestion form)
  components/
    site-card.tsx                # Site summary card with progress bar
    status-badge.tsx             # Compliance badge (green/red)
    ingestion-form.tsx           # Batch submission form with retry mechanism
  lib/
    api.ts                       # Fetch wrapper + React Query hooks

Root:
  docker-compose.yml             # PostgreSQL, backend, frontend containers
  start.sh                       # One-command startup (build, migrate, seed, run)
  backend/Dockerfile             # Multi-stage Node.js build
  frontend/Dockerfile            # Multi-stage Next.js build
  .env.example                   # Environment variable template
```

## Key Technical Decisions

### 1. Two-Layer Idempotency

**Problem:** Field sensors retry on timeout. The system must not double-count emissions.

**Solution:**

- **Layer 1 (Fast):** Before entering a transaction, query `ingestion_logs` for the `batch_key`. If found, return the cached result immediately. This handles the vast majority of retries with zero write overhead.

- **Layer 2 (Database):** Each measurement row has a UNIQUE `idempotency_key` (`{batch_key}:{index}`). If Layer 1 misses a concurrent retry (race condition), the database constraint catches it.

**Trade-off:** Two lookups on the happy path (one query + one transaction), but bulletproof duplicate prevention even under concurrent retries.

### 2. Pessimistic Locking (SELECT ... FOR UPDATE)

**Problem:** Multiple concurrent ingestion requests to the same site could cause lost updates on `total_emissions_to_date`.

**Solution:** Inside the transaction, we lock the site row with `FOR UPDATE` before reading or writing. Other transactions targeting the same site wait until the lock is released.

**Why not optimistic locking?** Optimistic locking (version column + retry) works well when conflicts are rare. For emissions ingestion, concurrent updates to the same site are expected (multiple sensors), so pessimistic locking avoids retry storms and guarantees forward progress.

### 3. Pre-Computed Running Total

**Problem:** `GET /sites/:id/metrics` needs `total_emissions_to_date`. Computing `SUM(value)` across millions of measurements on every request is expensive.

**Solution:** The `sites` table stores `total_emissions_to_date` as a materialized aggregate, updated atomically during ingestion within the same transaction. This makes reads O(1) instead of O(n).

**Trade-off:** Writes are slightly more complex (must update the aggregate), but reads are instant. The aggregate is always consistent because it is updated in the same transaction as the measurements.

### 4. NUMERIC(14,4) for Emission Values

**Problem:** Floating-point arithmetic causes rounding errors (`0.1 + 0.2 !== 0.3`). For regulatory reporting, precision is non-negotiable.

**Solution:** PostgreSQL `NUMERIC(14,4)` stores exact decimal values. Drizzle maps these as strings to preserve precision across the JavaScript boundary.

### 5. Unified Response Format

All API responses follow a consistent structure:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "400", "message": "...", "details": { ... } } }
```

Implemented via a global `ResponseInterceptor` (wraps all successful responses) and `HttpExceptionFilter` (catches all errors). Controllers do not need to think about response formatting — it is handled automatically.

### 6. Zod for Validation

Zod schemas validate request bodies at the controller level and export TypeScript types via `z.infer<typeof schema>`. This provides runtime validation and compile-time type safety from a single source of truth, reducing the surface area for type mismatches between layers.

### 7. Frontend Retry Mechanism (UX Resilience)

**Problem:** Field devices operate in low-connectivity areas. If a request times out and the user retries, the system must not double-count emissions.

**Solution:** The ingestion form generates a `batch_key` (UUID) once when the form is opened and stores it in React state. On submission failure, the same `batch_key` is reused when the user clicks "Retry". This means:

- If the original request never reached the server, the retry processes normally.
- If the original request actually succeeded (but the client did not receive the response), the backend detects the duplicate `batch_key` via Layer 1 and returns `{ duplicate: true }` without double-counting.

The frontend displays explicit feedback when a duplicate is detected: "This batch was already processed. No data was double-counted." A fresh `batch_key` is only generated after a confirmed successful (non-duplicate) submission.

## Database Schema

```
sites
--------------------------------------
  id            UUID (PK)
  name          VARCHAR(255)
  location      VARCHAR(255)
  emission_limit          NUMERIC(14,4)
  total_emissions_to_date NUMERIC(14,4)   -- Pre-computed aggregate
  created_at    TIMESTAMP
  updated_at    TIMESTAMP
        |
        | 1:N
        v
measurements                              ingestion_logs
--------------------------------------    --------------------------------------
  id              UUID (PK)                 id              UUID (PK)
  site_id         UUID (FK -> sites)        batch_key       VARCHAR(255) UNIQUE  <-- Layer 1 lookup
  value           NUMERIC(14,4)             site_id         UUID (FK -> sites)
  recorded_at     TIMESTAMP                 readings_count  INTEGER
  idempotency_key VARCHAR(255) UNIQUE       total_value     NUMERIC(14,4)
  created_at      TIMESTAMP                 processed_at    TIMESTAMP
                    ^
                    |
              Layer 2 safety net
```

## Ingestion Flow

```
POST /ingest { site_id, batch_key, readings[] }
  |
  +-- Layer 1: SELECT FROM ingestion_logs WHERE batch_key = ?
  |     Found? --> Return cached result (duplicate: true)
  |
  +-- BEGIN TRANSACTION
  |     +-- SELECT FROM sites WHERE id = ? FOR UPDATE       <-- Lock row
  |     +-- INSERT INTO measurements (batch of readings)
  |     +-- UPDATE sites SET total += batch_total            <-- Atomic aggregate
  |     +-- INSERT INTO ingestion_logs (batch record)        <-- For future lookups
  +-- COMMIT
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sites` | Create a monitoring site with emission limit |
| `GET` | `/api/sites` | List all sites with compliance status |
| `GET` | `/api/sites/:id/metrics` | Detailed metrics including readings count and compliance |
| `POST` | `/api/ingest` | Submit a batch of 1-100 readings with idempotency |

## Bonus Tasks Implemented

1. **Concurrency Control** -- Pessimistic locking via `SELECT ... FOR UPDATE` prevents lost updates when multiple sources write to the same site concurrently.
2. **Developer Experience** -- Docker Compose setup with PostgreSQL, seed data, and a single-command start (`./start.sh`) that builds, migrates, seeds, and runs the full stack.
3. **Type-Safe Contract** -- Zod schemas provide both runtime validation and TypeScript type inference from a single definition.
