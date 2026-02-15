import { z } from 'zod';

const readingSchema = z.object({
  value: z.number().nonnegative('Value cannot be negative'),
  recorded_at: z.string().datetime('Must be ISO 8601 format'),
});

export const ingestReadingsSchema = z.object({
  site_id: z.string().uuid('Must be a valid UUID'),
  batch_key: z.string().uuid('Must be a valid UUID'),
  readings: z
    .array(readingSchema)
    .min(1, 'At least one reading required')
    .max(100, 'Maximum 100 readings per batch'),
});

export type IngestReadingsDto = z.infer<typeof ingestReadingsSchema>;

