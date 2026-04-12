import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations');
}

const pool = new Pool({
  connectionString,
  max: 1 // only 1 connection needed for migrations
});

const migrationDb = drizzle(pool);

async function runMigrations() {
  console.log('Running Drizzle migrations...');
  const start = Date.now();
  
  try {
    // This will run all .sql files found in out directory
    await migrate(migrationDb, { migrationsFolder: './src/migrations' });
    console.log(`Migrations complete in ${Date.now() - start}ms`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
