# Emissions Ingestion & Analytics Engine

A full-stack platform for ingesting, storing, and monitoring industrial methane emissions with data integrity guarantees. Built with NestJS, Next.js 15, PostgreSQL, and Drizzle ORM. Live Demo: https://emission-platform.vercel.app

## Quick Start (One Command)

```bash
./start.sh
```

This builds and starts everything via Docker: PostgreSQL, backend, frontend. It also runs database migrations and seeds demo data automatically.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |

**Stop:** `docker compose down`
**Reset database:** `docker compose down -v && ./start.sh`
**pgAdmin (optional):** `docker compose --profile tools up -d` then visit http://localhost:5050

### Manual Start (Development)

For hot-reload during development, run services outside Docker:

```bash
# 1. Start database only
docker compose up -d postgres

# 2. Backend (Terminal 1)
cd backend
npm install
DATABASE_URL="postgresql://emissions_user:emissions_pass@localhost:5433/emissions_db" npm run db:migrate
DATABASE_URL="postgresql://emissions_user:emissions_pass@localhost:5433/emissions_db" npm run db:seed
DATABASE_URL="postgresql://emissions_user:emissions_pass@localhost:5433/emissions_db" npm run start:dev

# 3. Frontend (Terminal 2)
cd frontend
npm install
NEXT_PUBLIC_MAPBOX_TOKEN="your_token_here" npm run dev   # token is optional — map shows fallback without it
```

## Running Tests

```bash
cd backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests (requires running database)
```

See [TESTING.md](./TESTING.md) for the full testing guide including manual verification steps.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for key technical decisions, database schema, and the ingestion flow.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, Drizzle ORM, Zod, PostgreSQL |
| Frontend | Next.js 15 (App Router), React Query, Tailwind CSS |
| Infrastructure | Docker Compose, PostgreSQL 16 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sites` | Create a monitoring site with emission limit and optional GPS coordinates |
| `GET` | `/api/sites` | List all sites with compliance status |
| `GET` | `/api/sites/:id/metrics` | Detailed metrics including readings count and compliance |
| `GET` | `/api/sites/:id/readings` | Time-series readings for the emissions chart |
| `POST` | `/api/ingest` | Submit a batch of 1-100 readings with idempotency |

## Geospatial Map (Optional)

The dashboard includes an interactive map that plots site locations. It requires a free [Mapbox](https://account.mapbox.com/access-tokens/) access token. Create a `.env` file in the project root:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

The app works fully without it — the map section displays a fallback message.

## Bonus Tasks Implemented

1. **Concurrency Control** -- Pessimistic locking (`SELECT ... FOR UPDATE`) prevents lost updates under concurrent writes.
2. **Developer Experience** -- Docker Compose + seed data + single-command start via `./start.sh`.
3. **Type-Safe Contract** -- Zod schemas provide runtime validation and TypeScript types from a single source of truth.
