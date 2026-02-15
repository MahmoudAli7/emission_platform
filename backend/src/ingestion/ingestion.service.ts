import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/database.module';
import * as schema from '../database/schema';
import { IngestReadingsDto } from './ingest-readings.dto';

@Injectable()
export class IngestionService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async ingest(dto: IngestReadingsDto) {
    // Layer 1: Fast duplicate check — look up batch_key in ingestion_logs
    const [existingBatch] = await this.db
      .select()
      .from(schema.ingestionLogs)
      .where(eq(schema.ingestionLogs.batchKey, dto.batch_key));

    if (existingBatch) {
      return {
        batch_key: existingBatch.batchKey,
        readings_processed: existingBatch.readingsCount,
        total_value: existingBatch.totalValue,
        duplicate: true,
      };
    }

    // Layer 2: Atomic transaction with pessimistic locking
    const batchTotal = dto.readings.reduce((sum, r) => sum + r.value, 0);

    try {
      const result = await this.db.transaction(async (tx) => {
        // Step 1: Lock the site row (pessimistic locking with FOR UPDATE)
        const [site] = await tx
          .select()
          .from(schema.sites)
          .where(eq(schema.sites.id, dto.site_id))
          .for('update');

        if (!site) {
          throw new BadRequestException(`Site ${dto.site_id} not found`);
        }

        // Step 2: Insert all measurements with per-reading idempotency keys
        const measurementValues = dto.readings.map((reading, index) => ({
          siteId: dto.site_id,
          value: reading.value.toString(),
          recordedAt: new Date(reading.recorded_at),
          idempotencyKey: `${dto.batch_key}:${index}`,
        }));

        await tx.insert(schema.measurements).values(measurementValues);

        // Step 3: Atomically update the site's running total
        await tx
          .update(schema.sites)
          .set({
            totalEmissionsToDate: sql`${schema.sites.totalEmissionsToDate} + ${batchTotal.toString()}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.sites.id, dto.site_id));

        // Step 4: Log the batch for future duplicate detection
        await tx.insert(schema.ingestionLogs).values({
          batchKey: dto.batch_key,
          siteId: dto.site_id,
          readingsCount: dto.readings.length,
          totalValue: batchTotal.toString(),
        });

        return {
          batch_key: dto.batch_key,
          readings_processed: dto.readings.length,
          total_value: batchTotal,
          duplicate: false,
        };
      });

      return result;
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      // UNIQUE constraint violation on idempotency_key = concurrent duplicate
      if (err instanceof Error && err.message.includes('idempotency_key')) {
        return {
          batch_key: dto.batch_key,
          readings_processed: dto.readings.length,
          total_value: batchTotal,
          duplicate: true,
        };
      }
      throw err;
    }
  }
}
