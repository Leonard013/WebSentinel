/**
 * Storage module - Simple wrapper around Chrome storage API
 */

const DB_NAME = 'PageWatchDB';
const DB_VERSION = 1;
const STORE_NAME = 'html';

let dbInstance = null;

/**
 * Initialize IndexedDB for HTML storage
 */
async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Chrome storage operations for page metadata
 * Uses chrome.storage.sync for cloud sync across devices
 */
export const Storage = {
  async get(key) {
    try {
      const result = await chrome.storage.sync.get(key);
      return result[key];
    } catch (error) {
      // Fallback to local if sync fails (e.g., quota exceeded)
      console.warn('[Storage] Sync failed, falling back to local:', error);
      const result = await chrome.storage.local.get(key);
      return result[key];
    }
  },

  async set(key, value) {
    try {
      return chrome.storage.sync.set({ [key]: value });
    } catch (error) {
      // Fallback to local if sync fails (e.g., quota exceeded)
      console.warn('[Storage] Sync failed, falling back to local:', error);
      return chrome.storage.local.set({ [key]: value });
    }
  },

  async remove(key) {
    try {
      // Remove from both sync and local to ensure cleanup
      await Promise.all([
        chrome.storage.sync.remove(key).catch(() => {}),
        chrome.storage.local.remove(key).catch(() => {})
      ]);
    } catch (error) {
      console.warn('[Storage] Remove error:', error);
    }
  },

  async getAll() {
    try {
      return chrome.storage.sync.get(null);
    } catch (error) {
      // Fallback to local if sync fails
      console.warn('[Storage] Sync getAll failed, falling back to local:', error);
      return chrome.storage.local.get(null);
    }
  },

  onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      // Listen to both sync and local changes
      if (area === 'sync' || area === 'local') {
        callback(changes, area);
      }
    });
  },

  /**
   * Migrate data from local to sync storage (one-time migration)
   */
  async migrateToSync() {
    try {
      const localData = await chrome.storage.local.get(null);
      const syncData = await chrome.storage.sync.get(null);
      
      // Check if migration is needed
      const hasLocalPages = Object.keys(localData).some(key => key.startsWith('page:'));
      const hasSyncPages = Object.keys(syncData).some(key => key.startsWith('page:'));
      
      if (hasLocalPages && !hasSyncPages) {
        console.log('[Storage] Migrating pages from local to sync storage...');
        
        // Migrate only page metadata (not HTML, which stays in IndexedDB)
        const pagesToMigrate = {};
        for (const [key, value] of Object.entries(localData)) {
          if (key.startsWith('page:')) {
            pagesToMigrate[key] = value;
          }
        }
        
        if (Object.keys(pagesToMigrate).length > 0) {
          await chrome.storage.sync.set(pagesToMigrate);
          console.log(`[Storage] Migrated ${Object.keys(pagesToMigrate).length} pages to sync storage`);
        }
      }
    } catch (error) {
      console.error('[Storage] Migration error:', error);
      // Migration failure is not critical, continue with local storage
    }
  }
};

/**
 * IndexedDB operations for HTML content (large data)
 */
export const HtmlStorage = {
  async save(key, html) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(html, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async load(key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async remove(key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
