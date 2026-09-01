import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [{
    provide: DATABASE,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      const pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
      return drizzle(pool, { schema });
    },
  }],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: Database) {}
  async onApplicationShutdown() {
    const client = (this.database as Database & { $client: Pool }).$client;
    await client.end();
  }
}
