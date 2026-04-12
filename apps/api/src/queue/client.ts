import { RedisClient } from 'bun'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

// For BullMQ strictly (it uses ioredis under the hood but we pass connection options)
const url = new URL(redisUrl)
export const bullMqConnection = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
  password: url.password || undefined,
  username: url.username || undefined,
  db: parseInt(url.pathname?.replace('/', '') || '0', 10),
  maxRetriesPerRequest: null,
}

// 1. Bun Native Redis Client for general app usage (caching, etc.)
export const redis = new RedisClient(redisUrl)
export const redisConnection = redis // Alias for general usage if needed
