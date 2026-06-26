/**
 * Unified Cache Service for SkillSphere
 * Implements a high-performance, in-memory caching mechanism with automated Time-To-Live (TTL)
 * expiration. Designed as a provider that can easily fall back or scale to a Redis client.
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    console.log('⚡ [CACHE SERVICE] Initialized in-memory caching provider.');
  }

  /**
   * Retrieves a value from the cache.
   * Automatically handles expired keys and removes them.
   * 
   * @param {string} key - Cache identifier
   * @returns {any|null} Cached data, or null if expired/missing
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    
    // Check if the cache entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Stores a value in the cache with a specified TTL.
   * 
   * @param {string} key - Cache identifier
   * @param {any} value - The data payload to store
   * @param {number} ttlSeconds - Duration in seconds before expiration (defaults to 300)
   */
  set(key, value, ttlSeconds = 300) {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Deletes a specific cache key.
   * 
   * @param {string} key - Cache identifier
   */
  del(key) {
    this.cache.delete(key);
  }

  /**
   * Deletes all keys matching a specific prefix namespace pattern (e.g. "analytics:")
   * 
   * @param {string} prefix - Namespace pattern to invalidate
   */
  invalidateByPrefix(prefix) {
    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`⚡ [CACHE INVALIDATE] Cleared ${deletedCount} cache keys matching prefix: "${prefix}"`);
    }
  }

  /**
   * Clears the entire cache store.
   */
  clear() {
    this.cache.clear();
    console.log('⚡ [CACHE SERVICE] Cache store cleared.');
  }
}

// Export singleton instance of CacheService
const cacheService = new CacheService();
export default cacheService;
export { cacheService };
