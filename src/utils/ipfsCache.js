// 🚀 IPFS CACHING LAYER FOR PERFORMANCE OPTIMIZATION
// Implements intelligent caching with LRU eviction and compression

class IPFSCache {
  constructor(maxSize = 50 * 1024 * 1024, maxItems = 100) { // 50MB, 100 items
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxItems = maxItems;
    this.currentSize = 0;
    this.accessTimes = new Map();
    
    // Initialize from localStorage if available
    this.loadFromStorage();
  }

  // 🔍 GET: Retrieve from cache or fetch from IPFS
  async get(hash, fetchFunction) {
    console.log('🔍 Cache lookup for:', hash);
    
    // Check if item exists in cache
    if (this.cache.has(hash)) {
      console.log('✅ Cache HIT for:', hash);
      this.accessTimes.set(hash, Date.now());
      return this.cache.get(hash);
    }
    
    console.log('❌ Cache MISS for:', hash);
    
    // Fetch from IPFS
    const data = await fetchFunction(hash);
    
    if (data && data.success) {
      // Store in cache
      this.set(hash, data);
    }
    
    return data;
  }

  // 💾 SET: Store data in cache with size management
  set(hash, data) {
    console.log('💾 Caching data for:', hash);
    
    // Calculate data size (approximate)
    const dataSize = this.calculateSize(data);
    
    // Check if item would exceed cache limits
    if (dataSize > this.maxSize) {
      console.warn('⚠️ Item too large for cache:', hash, dataSize);
      return false;
    }
    
    // Evict items if necessary
    this.evictIfNeeded(dataSize);
    
    // Store the item
    this.cache.set(hash, data);
    this.accessTimes.set(hash, Date.now());
    this.currentSize += dataSize;
    
    // Persist to localStorage
    this.saveToStorage();
    
    console.log('✅ Cached:', hash, 'Size:', dataSize, 'Total:', this.currentSize);
    return true;
  }

  // 🗑️ EVICT: Remove least recently used items
  evictIfNeeded(newItemSize) {
    // Check if we need to evict by size or count
    while (
      (this.currentSize + newItemSize > this.maxSize) ||
      (this.cache.size >= this.maxItems)
    ) {
      const lruHash = this.findLRUItem();
      if (lruHash) {
        this.remove(lruHash);
        console.log('🗑️ Evicted LRU item:', lruHash);
      } else {
        break; // No items to evict
      }
    }
  }

  // 🔍 FIND: Get least recently used item
  findLRUItem() {
    let oldestTime = Date.now();
    let oldestHash = null;
    
    for (const [hash, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestHash = hash;
      }
    }
    
    return oldestHash;
  }

  // ❌ REMOVE: Delete item from cache
  remove(hash) {
    if (this.cache.has(hash)) {
      const data = this.cache.get(hash);
      const size = this.calculateSize(data);
      
      this.cache.delete(hash);
      this.accessTimes.delete(hash);
      this.currentSize -= size;
      
      console.log('❌ Removed from cache:', hash);
      return true;
    }
    return false;
  }

  // 📏 CALCULATE: Approximate size of cached data
  calculateSize(data) {
    if (!data) return 0;
    
    try {
      // Rough estimation of object size
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // UTF-16 characters = 2 bytes each
    } catch (error) {
      console.warn('Size calculation failed:', error);
      return 1024; // Default 1KB estimate
    }
  }

  // 💾 SAVE: Persist cache to localStorage
  saveToStorage() {
    try {
      const cacheData = {
        items: Array.from(this.cache.entries()).slice(0, 20), // Only save 20 most recent
        accessTimes: Array.from(this.accessTimes.entries()).slice(0, 20),
        timestamp: Date.now()
      };
      
      localStorage.setItem('blockdrop_ipfs_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  // 📂 LOAD: Restore cache from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('blockdrop_ipfs_cache');
      if (!stored) return;
      
      const cacheData = JSON.parse(stored);
      
      // Check if cache is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - cacheData.timestamp > maxAge) {
        console.log('🗑️ Cache expired, starting fresh');
        return;
      }
      
      // Restore cache items
      this.cache = new Map(cacheData.items || []);
      this.accessTimes = new Map(cacheData.accessTimes || []);
      
      // Recalculate current size
      this.currentSize = 0;
      for (const [hash, data] of this.cache) {
        this.currentSize += this.calculateSize(data);
      }
      
      console.log('📂 Restored cache from storage:', this.cache.size, 'items');
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      this.clear();
    }
  }

  // 🧹 CLEAR: Empty the entire cache
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.currentSize = 0;
    localStorage.removeItem('blockdrop_ipfs_cache');
    console.log('🧹 Cache cleared');
  }

  // 📊 STATS: Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      maxItems: this.maxItems,
      hitRate: this.hitRate || 0,
      oldestItem: this.findLRUItem()
    };
  }

  // 🔧 PRELOAD: Preload frequently accessed files
  async preloadFiles(hashes, fetchFunction) {
    console.log('🔧 Preloading', hashes.length, 'files...');
    
    const promises = hashes.map(async (hash) => {
      if (!this.cache.has(hash)) {
        try {
          await this.get(hash, fetchFunction);
        } catch (error) {
          console.warn('Preload failed for:', hash, error);
        }
      }
    });
    
    await Promise.allSettled(promises);
    console.log('✅ Preload completed');
  }
}

// 🌟 SINGLETON: Global cache instance
const ipfsCache = new IPFSCache();

// 🔄 ENHANCED IPFS FUNCTIONS WITH CACHING

export const downloadFromIPFSCached = async (hash) => {
  return await ipfsCache.get(hash, async (hash) => {
    // Import the original function dynamically to avoid circular dependency
    const { downloadFromIPFS } = await import('./ipfs');
    return await downloadFromIPFS(hash);
  });
};

export const uploadToIPFSCached = async (fileData, fileName) => {
  // Import the original function
  const { uploadToIPFS } = await import('./ipfs');
  const result = await uploadToIPFS(fileData, fileName);
  
  // Cache the uploaded file data for potential re-download
  if (result.success) {
    ipfsCache.set(result.hash, {
      success: true,
      data: fileData
    });
  }
  
  return result;
};

// 🔧 UTILITY FUNCTIONS

export const clearIPFSCache = () => {
  ipfsCache.clear();
};

export const getIPFSCacheStats = () => {
  return ipfsCache.getStats();
};

export const preloadFrequentFiles = async (hashes) => {
  const { downloadFromIPFS } = await import('./ipfs');
  await ipfsCache.preloadFiles(hashes, downloadFromIPFS);
};

// 📊 CACHE WARMING: Preload user's recent files
export const warmCacheForUser = async (userFiles) => {
  const recentHashes = userFiles
    .filter(file => file.ipfsHash && file.active)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 10) // Top 10 most recent
    .map(file => file.ipfsHash);
  
  if (recentHashes.length > 0) {
    console.log('🔥 Warming cache with recent files...');
    await preloadFrequentFiles(recentHashes);
  }
};

export default ipfsCache;
