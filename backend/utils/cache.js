/**
 * In-Memory Cache with Redis fallback
 *
 * Strategy:
 *   1. If REDIS_URL is set and Redis connects → use Redis (distributed, survives restarts)
 *   2. Otherwise → use a plain Map with TTL tracking (single-process, zero dependencies)
 *
 * This means you can start development with zero infra and switch to Redis in
 * production by simply setting REDIS_URL in .env — no code changes needed.
 */

const logger = require('./logger');

// ─── In-Memory Store ──────────────────────────────────────────────────────────
const store = new Map(); // key → { value, expiresAt }

const memoryCache = {
  async get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key, value, ttlSeconds = 600) {
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  async del(key) {
    store.delete(key);
  },

  async delByPattern(pattern) {
    // Simple prefix-based pattern matching (e.g. "turfs:mumbai:*")
    const prefix = pattern.replace(/\*$/, '');
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },

  async flush() {
    store.clear();
  },
};

// ─── Redis Adapter ────────────────────────────────────────────────────────────
let redisClient = null;
let activeCache = memoryCache;

const initRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.info('Cache: REDIS_URL not set — using in-memory cache');
    return;
  }

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });

    await redisClient.connect();
    logger.info('Cache: Redis connected');

    activeCache = {
      async get(key) {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
      },
      async set(key, value, ttlSeconds = 600) {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      },
      async del(key) {
        await redisClient.del(key);
      },
      async delByPattern(pattern) {
        const keys = await redisClient.keys(pattern);
        if (keys.length) await redisClient.del(...keys);
      },
      async flush() {
        await redisClient.flushdb();
      },
    };
  } catch (err) {
    logger.warn(`Cache: Redis connection failed (${err.message}) — falling back to in-memory`);
    redisClient = null;
    activeCache = memoryCache;
  }
};

// ─── Cache Key Builders ───────────────────────────────────────────────────────
const cacheKeys = {
  turfList: (city, sport, page) => `turfs:${city || 'all'}:${sport || 'all'}:page${page}`,
  turfBySlug: (slug) => `turf:${slug}`,
  turfSlots: (turfId, date) => `slots:${turfId}:${date}`,
};

// ─── Public API ───────────────────────────────────────────────────────────────
const cache = {
  get: (...args) => activeCache.get(...args),
  set: (...args) => activeCache.set(...args),
  del: (...args) => activeCache.del(...args),
  delByPattern: (...args) => activeCache.delByPattern(...args),
  flush: () => activeCache.flush(),
  keys: cacheKeys,
  init: initRedis,
};

module.exports = cache;
