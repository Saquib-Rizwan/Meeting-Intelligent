const cache = new Map();

export const queryCacheService = {
  get(key) {
    return cache.get(key);
  },

  set(key, value) {
    cache.set(key, value);
    return value;
  },

  clear() {
    cache.clear();
  }
};

