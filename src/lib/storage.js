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
 */
export const Storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },

  async set(key, value) {
    return chrome.storage.local.set({ [key]: value });
  },

  async remove(key) {
    return chrome.storage.local.remove(key);
  },

  async getAll() {
    return chrome.storage.local.get(null);
  },

  onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') callback(changes);
    });
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
