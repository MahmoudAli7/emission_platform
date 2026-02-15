import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Injection token — other files use this to request the Drizzle client
export const DRIZZLE = Symbol('DRIZZLE');

// Type alias for convenience across the app
export type DrizzleDB = NodePgDatabase<typeof schema>;

@Global() // Makes DRIZZLE available everywhere without explicit imports
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
