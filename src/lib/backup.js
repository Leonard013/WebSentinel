/**
 * Backup module - Export and import page data
 */

import { PageStore, Page } from './page.js';

const BACKUP_VERSION = 1;
const BACKUP_ID = 'pagewatch-backup';

/**
 * Create a JSON backup of all pages
 * @param {PageStore} store - PageStore instance
 * @returns {string} - JSON string
 */
export function createBackup(store) {
  const pages = store.getAll().map(page => ({
    title: page.title,
    url: page.url,
    scanIntervalMinutes: page.scanIntervalMinutes,
    changeThreshold: page.changeThreshold
  }));

  const backup = {
    id: BACKUP_ID,
    version: BACKUP_VERSION,
    timestamp: Date.now(),
    pages
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restore pages from a backup
 * @param {PageStore} store - PageStore instance
 * @param {string} json - Backup JSON string
 * @returns {Promise<number>} - Number of pages restored
 */
export async function restoreBackup(store, json) {
  const backup = JSON.parse(json);

  if (backup.id !== BACKUP_ID) {
    throw new Error('Invalid backup file');
  }

  // Clear existing pages
  for (const page of store.getAll()) {
    await store.delete(page.id);
  }

  // Restore pages
  for (const pageData of backup.pages) {
    await store.create(pageData);
  }

  return backup.pages.length;
}

/**
 * Download backup as a file
 * @param {string} json - Backup JSON
 */
export function downloadBackup(json) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `pagewatch-backup-${date}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Open file picker and read backup file
 * @returns {Promise<string>} - File contents
 */
export function openBackupFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      try {
        const text = await file.text();
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    
    input.click();
  });
}
