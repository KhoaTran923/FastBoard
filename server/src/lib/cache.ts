import { Redis } from 'ioredis';

// Redis-backed response cache with a 60s default TTL.

export const CACHE_TTL_SECONDS = 60;

let client: Redis | null = null;
let ready = false;

function isEnabled(): boolean {
  return process.env.NODE_ENV !== 'test' && process.env.CACHE_DISABLED !== 'true';
}

function getClient(): Redis | null {
  if (!isEnabled()) return null;
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: false,
      enableOfflineQueue: false, // fail fast instead of queueing while down
      maxRetriesPerRequest: 1,
      retryStrategy: () => 5000, // probe again every 5s, no retry storm
    });
    client.on('ready', () => {
      ready = true;
      console.log('Redis cache connected');
    });
    client.on('error', () => {
      // Logged once via 'end'/'ready' transitions; per-command errors are
      // swallowed by the try/catch in each method
      ready = false;
    });
  }
  return client;
}

export const cache = {
  get ready() {
    return ready;
  },

  async get<T>(key: string): Promise<T | null> {
    const redis = getClient();
    if (!redis || !ready) return null;
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = CACHE_TTL_SECONDS): Promise<void> {
    const redis = getClient();
    if (!redis || !ready) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // fail open
    }
  },

  async del(...keys: string[]): Promise<void> {
    const redis = getClient();
    if (!redis || !ready || keys.length === 0) return;
    try {
      await redis.del(...keys);
    } catch {
      // fail open
    }
  },
};

// Cache key builders, kept in one place so invalidation cannot drift
export const cacheKeys = {
  boards: (projectId: string) => `boards:${projectId}`,
  members: (projectId: string) => `members:${projectId}`,
};
