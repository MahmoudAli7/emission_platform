import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  console.log('Seeding database...');

  // Clear existing data (in reverse FK order)
  await db.delete(schema.ingestionLogs);
  await db.delete(schema.measurements);
  await db.delete(schema.sites);

  // Insert demo sites with GPS coordinates
  const [alpha, beta, gamma] = await db
    .insert(schema.sites)
    .values([
      {
        name: 'Well Pad Alpha',
        location: 'Alberta, Canada',
        emissionLimit: '5000.0000',
        latitude: '51.044700',
        longitude: '-114.071900',
      },
      {
        name: 'Processing Plant Beta',
        location: 'Texas, USA',
        emissionLimit: '12000.0000',
        latitude: '31.968600',
        longitude: '-99.901800',
      },
      {
        name: 'Compressor Station',
        location: 'Manchester, UK',
        emissionLimit: '3000.0000',
        latitude: '53.483959',
        longitude: '-2.244644',
      },
    ])
    .returning();

  console.log(`Created 3 sites:`);
  console.log(`  - ${alpha.name} (limit: ${alpha.emissionLimit} kg)`);
  console.log(`  - ${beta.name} (limit: ${beta.emissionLimit} kg)`);
  console.log(`  - ${gamma.name} (limit: ${gamma.emissionLimit} kg)`);

  // ---------------------------------------------------------------------------
  // Seed measurements for time-series chart data
  // ---------------------------------------------------------------------------
  const now = new Date();
  let batchIndex = 0;

  function generateMeasurements(
    siteId: string,
    count: number,
    baseValue: number,
    variance: number,
  ) {
    return Array.from({ length: count }, (_, i) => {
      const daysAgo = count - i; // oldest first
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(8 + (i % 12), (i * 17) % 60, 0, 0);

      const value = baseValue + (Math.random() * variance * 2 - variance);
      batchIndex++;

      return {
        siteId,
        value: value.toFixed(4),
        recordedAt: date,
        idempotencyKey: `seed-batch:${batchIndex}`,
      };
    });
  }

  // Alpha: 20 readings averaging ~150 kg, total ~3000 of 5000 limit
  const alphaMeasurements = generateMeasurements(alpha.id, 20, 150, 40);
  // Beta: 18 readings averaging ~500 kg, total ~9000 of 12000 limit
  const betaMeasurements = generateMeasurements(beta.id, 18, 500, 100);
  // Gamma: 15 readings averaging ~180 kg, total ~2700 of 3000 limit (near limit)
  const gammaMeasurements = generateMeasurements(gamma.id, 15, 180, 30);

  const allMeasurements = [
    ...alphaMeasurements,
    ...betaMeasurements,
    ...gammaMeasurements,
  ];

  await db.insert(schema.measurements).values(allMeasurements);

  // Update each site's total_emissions_to_date to match seeded measurements
  const alphaTotal = alphaMeasurements.reduce(
    (sum, m) => sum + parseFloat(m.value),
    0,
  );
  const betaTotal = betaMeasurements.reduce(
    (sum, m) => sum + parseFloat(m.value),
    0,
  );
  const gammaTotal = gammaMeasurements.reduce(
    (sum, m) => sum + parseFloat(m.value),
    0,
  );

  const { eq } = await import('drizzle-orm');

  await db
    .update(schema.sites)
    .set({ totalEmissionsToDate: alphaTotal.toFixed(4) })
    .where(eq(schema.sites.id, alpha.id));

  await db
    .update(schema.sites)
    .set({ totalEmissionsToDate: betaTotal.toFixed(4) })
    .where(eq(schema.sites.id, beta.id));

  await db
    .update(schema.sites)
    .set({ totalEmissionsToDate: gammaTotal.toFixed(4) })
    .where(eq(schema.sites.id, gamma.id));

  // Log batch keys for ingestion_logs so idempotency still works
  await db.insert(schema.ingestionLogs).values([
    {
      batchKey: 'seed-alpha',
      siteId: alpha.id,
      readingsCount: alphaMeasurements.length,
      totalValue: alphaTotal.toFixed(4),
    },
    {
      batchKey: 'seed-beta',
      siteId: beta.id,
      readingsCount: betaMeasurements.length,
      totalValue: betaTotal.toFixed(4),
    },
    {
      batchKey: 'seed-gamma',
      siteId: gamma.id,
      readingsCount: gammaMeasurements.length,
      totalValue: gammaTotal.toFixed(4),
    },
  ]);

  console.log(`Seeded ${allMeasurements.length} measurements:`);
  console.log(
    `  - ${alpha.name}: ${alphaMeasurements.length} readings, total ${alphaTotal.toFixed(2)} kg`,
  );
  console.log(
    `  - ${beta.name}: ${betaMeasurements.length} readings, total ${betaTotal.toFixed(2)} kg`,
  );
  console.log(
    `  - ${gamma.name}: ${gammaMeasurements.length} readings, total ${gammaTotal.toFixed(2)} kg`,
  );

  console.log('Seed complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
