# ── Backend Dockerfile ──────────────────────────────────────
# Multi-stage build: install deps & compile TypeScript, then
# copy everything needed to run + migrate + seed.

# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 — Run
FROM node:20-alpine AS runner
WORKDIR /app

# We need both prod and dev deps because:
#  - drizzle-kit (devDep) runs migrations
#  - tsx (devDep) runs the seed script
COPY package*.json ./
RUN npm ci

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Copy Drizzle config + migrations + seed (needed for db:migrate / db:seed)
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/database/migrations ./src/database/migrations
COPY --from=builder /app/src/database/schema.ts ./src/database/schema.ts
COPY --from=builder /app/src/database/seed.ts ./src/database/seed.ts
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3001

CMD ["node", "dist/main"]

