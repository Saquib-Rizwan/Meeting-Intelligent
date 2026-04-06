const cache = new Map();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 5 * 60 * 1000;

export const queryCacheService = {
  get(key) {
    const entry = cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return undefined;
    }

    return entry.value;
  },

  set(key, value) {
    cache.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
    return value;
  },

  clear() {
    cache.clear();
  }
};

