/**
 * Service Worker - Background script for Page Watch
 * Handles alarms, scanning, and message passing
 */

import { PageStore } from '../lib/page.js';
import { scanPage, scanPages } from '../lib/scanner.js';
import { showUpdateNotification, onNotificationClick } from '../lib/notifications.js';
import { Storage } from '../lib/storage.js';

const ALARM_NAME = 'WebSentinel-autoscan';
const ALARM_INTERVAL_MINUTES = 5;

let pageStore = null;
let isScanning = false;

/**
 * Initialize the extension
 */
async function init() {
  console.log('[WebSentinel] Initializing...');
  
  // Migrate from local to sync storage if needed
  await Storage.migrateToSync();
  
  pageStore = await PageStore.load();
  
  // Ensure alarm is set up for periodic scanning
  await setupAlarm();

  // Handle notification clicks - open popup
  onNotificationClick(() => {
    chrome.action.openPopup().catch(() => {
      // Fallback: open as a tab if popup can't be opened
      chrome.tabs.create({ url: 'src/popup/popup.html' });
    });
  });

  // Listen for sync changes from other devices
  Storage.onChange(async (changes, area) => {
    if (area === 'sync') {
      console.log('[WebSentinel] Sync changes detected, reloading pages...');
      // Reload store to get synced data
      pageStore = await PageStore.load();
      // Update badge with new count
      updateBadge(pageStore.getChanged().length);
      // Popup windows will automatically refresh via their own Storage.onChange listeners
    }
  });

  console.log('[WebSentinel] Ready');
}

/**
 * Set up or verify the alarm exists
 */
async function setupAlarm() {
  try {
    // Check if alarm already exists
    const existingAlarm = await chrome.alarms.get(ALARM_NAME);
    
    if (!existingAlarm) {
      // Create new alarm
      await chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 1,
        periodInMinutes: ALARM_INTERVAL_MINUTES
      });
      console.log(`[WebSentinel] Created alarm: ${ALARM_NAME} (every ${ALARM_INTERVAL_MINUTES} minutes)`);
    } else {
      console.log(`[WebSentinel] Alarm already exists: ${ALARM_NAME}`);
    }
  } catch (error) {
    console.error('[WebSentinel] Failed to setup alarm:', error);
    // Try to create anyway
    try {
      await chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 1,
        periodInMinutes: ALARM_INTERVAL_MINUTES
      });
      console.log(`[WebSentinel] Alarm created after retry`);
    } catch (retryError) {
      console.error('[WebSentinel] Alarm setup failed after retry:', retryError);
    }
  }
}

/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[WebSentinel] Alarm fired: ${alarm.name}`);
  
  if (alarm.name !== ALARM_NAME) {
    console.log(`[WebSentinel] Ignoring unknown alarm: ${alarm.name}`);
    return;
  }
  
  try {
    await runAutoScan();
  } catch (error) {
    console.error('[WebSentinel] Error in alarm handler:', error);
  }
});

/**
 * Run automatic scan for pages that need updating
 */
async function runAutoScan() {
  if (isScanning) {
    console.log('[WebSentinel] Scan already in progress, skipping');
    return;
  }

  try {
    pageStore = await PageStore.load();
    const allPages = pageStore.getAll();
    const needsScan = pageStore.getNeedingScan();
    
    console.log(`[WebSentinel] Auto-scan check: ${allPages.length} total pages, ${needsScan.length} need scanning`);
    
    if (needsScan.length === 0) {
      console.log('[WebSentinel] No pages need scanning at this time');
      return;
    }

    // Log which pages will be scanned
    const pageNames = needsScan.map(p => `${p.title} (interval: ${p.scanIntervalMinutes}min, last: ${p.lastScanTime ? new Date(p.lastScanTime).toLocaleTimeString() : 'never'})`);
    console.log(`[WebSentinel] Auto-scanning ${needsScan.length} pages:`, pageNames);
    
    isScanning = true;

    const changedCount = await scanPages(needsScan);
    
    // Reload store to get updated states
    pageStore = await PageStore.load();
    
    if (changedCount > 0) {
      console.log(`[WebSentinel] ${changedCount} page(s) changed`);
      await showUpdateNotification(changedCount);
    }
    
    updateBadge(pageStore.getChanged().length);
    console.log(`[WebSentinel] Auto-scan completed. Changed: ${changedCount}, Total changed pages: ${pageStore.getChanged().length}`);
  } catch (error) {
    console.error('[WebSentinel] Error in runAutoScan:', error);
  } finally {
    isScanning = false;
  }
}

/**
 * Update the extension badge
 */
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

/**
 * Handle messages from popup and other pages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message) {
  // Reload store to get latest data
  pageStore = await PageStore.load();

  switch (message.type) {
    case 'GET_PAGES':
      return { pages: pageStore.getAll().map(p => ({ id: p.id, ...p.toJSON() })) };

    case 'GET_PAGE':
      const page = pageStore.get(message.id);
      return page ? { page: { id: page.id, ...page.toJSON() } } : { page: null };

    case 'ADD_PAGE':
      const newPage = await pageStore.create(message.data);
      return { page: { id: newPage.id, ...newPage.toJSON() } };

    case 'UPDATE_PAGE':
      const updated = await pageStore.update(message.id, message.data);
      return { page: updated ? { id: updated.id, ...updated.toJSON() } : null };

    case 'DELETE_PAGE':
      await pageStore.delete(message.id);
      updateBadge(pageStore.getChanged().length);
      return { success: true };

    case 'MARK_AS_READ':
      await pageStore.markAsRead(message.id);
      updateBadge(pageStore.getChanged().length);
      return { success: true };

    case 'SCAN_PAGE':
      const toScan = pageStore.get(message.id);
      if (toScan) {
        await scanPage(toScan);
        pageStore = await PageStore.load();
        updateBadge(pageStore.getChanged().length);
      }
      return { success: true };

    case 'SCAN_ALL':
      if (isScanning) return { success: false, reason: 'already_scanning' };
      isScanning = true;
      try {
        const all = pageStore.getAll();
        const changed = await scanPages(all);
        if (changed > 0) {
          await showUpdateNotification(changed);
        }
        pageStore = await PageStore.load();
        updateBadge(pageStore.getChanged().length);
        return { success: true, changed };
      } catch (error) {
        console.error('[ServiceWorker] Scan error:', error);
        return { success: false, error: error.message };
      } finally {
        isScanning = false;
      }

    case 'GET_SCAN_STATUS':
      return { isScanning };

    case 'GET_BADGE_COUNT':
      return { count: pageStore.getChanged().length };

    default:
      return { error: 'Unknown message type' };
  }
}

/**
 * Handle extension install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[WebSentinel] Extension ${details.reason}`);
  
  if (details.reason === 'install') {
    // Create a sample page on first install
    pageStore = await PageStore.load();
    await pageStore.create({
      title: 'Example: Hacker News',
      url: 'https://news.ycombinator.com/',
      scanIntervalMinutes: 60
    });
  }
  
  // Ensure alarm is set up after install/update
  await setupAlarm();
});

// Initialize on startup
init();
