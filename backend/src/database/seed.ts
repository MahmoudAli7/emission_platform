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

  // Insert demo sites
  const [alpha, beta, gamma] = await db
    .insert(schema.sites)
    .values([
      {
        name: 'Well Pad Alpha',
        location: 'Alberta, Canada',
        emissionLimit: '5000.0000',
      },
      {
        name: 'Processing Plant Beta',
        location: 'Texas, USA',
        emissionLimit: '12000.0000',
      },
      {
        name: 'Compressor Station Gamma',
        location: 'North Sea, UK',
        emissionLimit: '3000.0000',
      },
    ])
    .returning();

  console.log(`Created ${3} sites:`);
  console.log(`  - ${alpha.name} (limit: ${alpha.emissionLimit} kg)`);
  console.log(`  - ${beta.name} (limit: ${beta.emissionLimit} kg)`);
  console.log(`  - ${gamma.name} (limit: ${gamma.emissionLimit} kg)`);

  console.log('Seed complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
