import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';

// ──────────────────────────────────────────────
// SITES TABLE
// ──────────────────────────────────────────────
// Core entity: an industrial site (well pad, processing plant, etc.)
// that requires emissions monitoring.
export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),

  // Max allowed emissions (set by regulators). Using numeric for exact
  // decimal arithmetic — floats have rounding errors that are unacceptable
  // in regulatory reporting.
  emissionLimit: numeric('emission_limit', { precision: 14, scale: 4 }).notNull(),

  // Pre-computed running total. Updated atomically during ingestion so we
  // never need to SUM() millions of measurement rows for compliance checks.
  totalEmissionsToDate: numeric('total_emissions_to_date', {
    precision: 14,
    scale: 4,
  })
    .notNull()
    .default('0'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ──────────────────────────────────────────────
// MEASUREMENTS TABLE
// ──────────────────────────────────────────────
// Every individual methane reading from a sensor. The idempotency_key
// has a UNIQUE constraint as the database-level safety net against
// duplicate readings.
export const measurements = pgTable('measurements', {
  id: uuid('id').defaultRandom().primaryKey(),

  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id),

  // The actual methane reading value (kg)
  value: numeric('value', { precision: 14, scale: 4 }).notNull(),

  // When the sensor took this reading (provided by the sensor)
  recordedAt: timestamp('recorded_at').notNull(),

  // Format: "{batch_key}:{index}" e.g. "abc-123:0", "abc-123:1"
  // UNIQUE constraint rejects duplicate inserts at the database level.
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ──────────────────────────────────────────────
// INGESTION LOGS TABLE
// ──────────────────────────────────────────────
// Tracks processed batches for fast duplicate detection. Before processing
// a batch, we check: "Have I seen this batch_key before?" If yes, return
// the cached result immediately without starting a transaction.
export const ingestionLogs = pgTable('ingestion_logs', {
  id: uuid('id').defaultRandom().primaryKey(),

  // One log entry per batch. UNIQUE constraint for fast duplicate lookup.
  batchKey: varchar('batch_key', { length: 255 }).notNull().unique(),

  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id),

  readingsCount: integer('readings_count').notNull(),
  totalValue: numeric('total_value', { precision: 14, scale: 4 }).notNull(),

  processedAt: timestamp('processed_at').defaultNow().notNull(),
});
