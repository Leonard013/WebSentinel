/**
 * Service Worker - Background script for Page Watch
 * Handles alarms, scanning, and message passing
 */

import { PageStore } from '../lib/page.js';
import { scanPage, scanPages } from '../lib/scanner.js';
import { showUpdateNotification, onNotificationClick } from '../lib/notifications.js';

const ALARM_NAME = 'pagewatch-autoscan';
const ALARM_INTERVAL_MINUTES = 5;

let pageStore = null;
let isScanning = false;

/**
 * Initialize the extension
 */
async function init() {
  console.log('[PageWatch] Initializing...');
  
  pageStore = await PageStore.load();
  
  // Set up alarm for periodic scanning
  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: ALARM_INTERVAL_MINUTES
  });

  // Handle notification clicks - open popup
  onNotificationClick(() => {
    chrome.action.openPopup().catch(() => {
      // Fallback: open as a tab if popup can't be opened
      chrome.tabs.create({ url: 'src/popup/popup.html' });
    });
  });

  console.log('[PageWatch] Ready');
}

/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  
  await runAutoScan();
});

/**
 * Run automatic scan for pages that need updating
 */
async function runAutoScan() {
  if (isScanning) {
    console.log('[PageWatch] Scan already in progress, skipping');
    return;
  }

  pageStore = await PageStore.load();
  const needsScan = pageStore.getNeedingScan();
  
  if (needsScan.length === 0) {
    return;
  }

  console.log(`[PageWatch] Auto-scanning ${needsScan.length} pages`);
  isScanning = true;

  try {
    const changedCount = await scanPages(needsScan);
    
    if (changedCount > 0) {
      await showUpdateNotification(changedCount);
      updateBadge(pageStore.getChanged().length);
    }
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
  if (details.reason === 'install') {
    console.log('[PageWatch] Extension installed');
    
    // Create a sample page on first install
    pageStore = await PageStore.load();
    await pageStore.create({
      title: 'Example: Hacker News',
      url: 'https://news.ycombinator.com/',
      scanIntervalMinutes: 60
    });
  }
});

// Initialize on startup
init();
