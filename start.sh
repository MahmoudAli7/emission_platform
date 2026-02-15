#!/bin/bash
set -e

echo "============================================="
echo "  Emissions Data Platform — Starting Up"
echo "============================================="
echo ""

# ── Step 1: Build all images ──────────────────────────────
echo "[1/5] Building Docker images..."
docker compose build
echo ""

# ── Step 2: Start PostgreSQL first ────────────────────────
echo "[2/5] Starting PostgreSQL..."
docker compose up -d --remove-orphans postgres

echo "      Waiting for PostgreSQL to be healthy..."
until docker compose exec postgres pg_isready -U emissions_user -d emissions_db > /dev/null 2>&1; do
  sleep 1
done
echo "      PostgreSQL is ready."
echo ""

# ── Step 3: Run database migrations ──────────────────────
echo "[3/5] Running database migrations..."
docker compose run --rm backend npx --yes drizzle-kit migrate
echo ""

# ── Step 4: Seed the database ────────────────────────────
echo "[4/5] Seeding database with demo data..."
docker compose run --rm backend npx --yes tsx src/database/seed.ts
echo ""

# ── Step 5: Start all services ───────────────────────────
echo "[5/5] Starting backend and frontend..."
docker compose up -d
echo ""

# ── Wait for services to be ready ────────────────────────
echo "      Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3001/api/sites > /dev/null 2>&1; then
    break
  fi
  sleep 2
done
echo "      Backend is ready."

echo "      Waiting for frontend to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    break
  fi
  sleep 2
done
echo "      Frontend is ready."

echo ""
echo "============================================="
echo "  Emissions Data Platform is running!"
echo "============================================="
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001/api"
echo ""
echo "  Optional:"
echo "    pgAdmin:  docker compose --profile tools up -d"
echo "              http://localhost:5050"
echo ""
echo "  Stop:      docker compose down"
echo "  Reset DB:  docker compose down -v && ./start.sh"
echo "============================================="

