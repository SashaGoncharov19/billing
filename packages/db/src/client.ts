import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const isTestEnv = process.env['NODE_ENV'] === 'test' || process.env['BUN_ENV'] === 'test';
const connectionString = isTestEnv 
  ? (process.env['TEST_DATABASE_URL'] ?? 'postgresql://entityseven:entityseven_dev@localhost:5433/entityseven_test')
  : process.env['DATABASE_URL']

if (!connectionString) throw new Error('DATABASE_URL is required')

const pool = new Pool({
  connectionString,
  max: 20, // explicitly show pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const db = drizzle(pool, { schema })
export type DB = typeof db
