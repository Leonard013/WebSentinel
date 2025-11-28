/**
 * Popup script - Main UI logic for Page Watch
 */

import { createBackup, downloadBackup, openBackupFile, restoreBackup } from '../lib/backup.js';
import { PageStore } from '../lib/page.js';

// DOM Elements
const pageList = document.getElementById('pageList');
const menuBtn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const pageForm = document.getElementById('pageForm');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');

// Form fields
const pageTitleInput = document.getElementById('pageTitle');
const pageUrlInput = document.getElementById('pageUrl');
const scanIntervalSelect = document.getElementById('scanInterval');
const changeThresholdSelect = document.getElementById('changeThreshold');

// Menu buttons
const scanAllBtn = document.getElementById('scanAllBtn');
const backupBtn = document.getElementById('backupBtn');
const restoreBtn = document.getElementById('restoreBtn');

// State
let editingPageId = null;

/**
 * Send message to service worker
 */
async function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

/**
 * Load and render pages
 */
async function loadPages() {
  const { pages } = await sendMessage({ type: 'GET_PAGES' });
  renderPageList(pages);
}

/**
 * Render the page list
 */
function renderPageList(pages) {
  if (pages.length === 0) {
    pageList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p>No pages yet</p>
        <span>Click + to add a page to monitor</span>
      </div>
    `;
    return;
  }

  // Sort: changed first, then by title
  const sorted = [...pages].sort((a, b) => {
    if (a.state === 'changed' && b.state !== 'changed') return -1;
    if (b.state === 'changed' && a.state !== 'changed') return 1;
    return a.title.localeCompare(b.title);
  });

  pageList.innerHTML = sorted.map(page => createPageCard(page)).join('');

  // Add event listeners
  pageList.querySelectorAll('.page-card').forEach(card => {
    const pageId = card.dataset.id;
    
    card.addEventListener('click', (e) => {
      if (e.target.closest('.page-actions')) return;
      handlePageClick(pageId, pages.find(p => p.id === pageId));
    });
  });

  pageList.querySelectorAll('.scan-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleScanPage(btn.dataset.id);
    });
  });

  pageList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleEditPage(btn.dataset.id);
    });
  });

  pageList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeletePage(btn.dataset.id);
    });
  });
}

/**
 * Create page card HTML
 */
function createPageCard(page) {
  const stateClass = page.state === 'changed' ? 'changed' : page.state === 'error' ? 'error' : '';
  const lastScan = page.lastScanTime ? formatTime(page.lastScanTime) : 'Never';
  const threshold = page.changeThreshold || 100;
  const sensitivityLabel = getSensitivityLabel(threshold);
  
  return `
    <div class="page-card ${stateClass}" data-id="${page.id}">
      <div class="page-indicator"></div>
      <div class="page-info">
        <div class="page-title">${escapeHtml(page.title)}</div>
        <div class="page-url">${escapeHtml(page.url)}</div>
        <div class="page-meta">Last scan: ${lastScan} • Sensitivity: ${sensitivityLabel}</div>
      </div>
      <div class="page-actions">
        <button class="icon-btn scan-btn" data-id="${page.id}" title="Scan now">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
        <button class="icon-btn edit-btn" data-id="${page.id}" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button class="icon-btn delete-btn" data-id="${page.id}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Handle page card click
 */
async function handlePageClick(pageId, page) {
  if (page.state === 'changed') {
    // Open viewer page
    chrome.tabs.create({ 
      url: chrome.runtime.getURL(`src/viewer/viewer.html?id=${pageId}`) 
    });
    await sendMessage({ type: 'MARK_AS_READ', id: pageId });
    loadPages();
  } else {
    // Open the actual page URL
    chrome.tabs.create({ url: page.url });
  }
}

/**
 * Handle scan single page
 */
async function handleScanPage(pageId) {
  showStatus('Scanning...');
  
  try {
    await sendMessage({ type: 'SCAN_PAGE', id: pageId });
    hideStatus();
    loadPages();
  } catch (error) {
    console.error('Scan error:', error);
    showStatus('Error: ' + (error.message || 'Scan failed'));
    setTimeout(hideStatus, 3000);
  }
}

/**
 * Handle edit page
 */
async function handleEditPage(pageId) {
  const { page } = await sendMessage({ type: 'GET_PAGE', id: pageId });
  if (!page) return;

  editingPageId = pageId;
  modalTitle.textContent = 'Edit Page';
  pageTitleInput.value = page.title;
  pageUrlInput.value = page.url;
  scanIntervalSelect.value = page.scanIntervalMinutes;
  changeThresholdSelect.value = page.changeThreshold || 100;
  showModal();
}

/**
 * Handle delete page
 */
async function handleDeletePage(pageId) {
  if (!confirm('Delete this page?')) return;
  await sendMessage({ type: 'DELETE_PAGE', id: pageId });
  loadPages();
}

/**
 * Handle scan all pages
 */
async function handleScanAll() {
  closeMenu();
  showStatus('Scanning all pages...');
  
  try {
    const response = await sendMessage({ type: 'SCAN_ALL' });
    
    if (!response.success) {
      if (response.reason === 'already_scanning') {
        showStatus('Scan already in progress...');
        setTimeout(hideStatus, 2000);
      } else {
        showStatus('Scan failed');
        setTimeout(hideStatus, 2000);
      }
      return;
    }
    
    hideStatus();
    loadPages();
    
    if (response.changed > 0) {
      showStatus(`${response.changed} page${response.changed > 1 ? 's' : ''} updated!`);
      setTimeout(hideStatus, 2000);
    }
  } catch (error) {
    console.error('Scan error:', error);
    showStatus('Error: ' + (error.message || 'Scan failed'));
    setTimeout(hideStatus, 3000);
  }
}

/**
 * Handle backup
 */
async function handleBackup() {
  closeMenu();
  const store = await PageStore.load();
  const json = createBackup(store);
  downloadBackup(json);
}

/**
 * Handle restore
 */
async function handleRestore() {
  closeMenu();
  try {
    const json = await openBackupFile();
    const store = await PageStore.load();
    const count = await restoreBackup(store, json);
    alert(`Restored ${count} pages successfully!`);
    loadPages();
  } catch (err) {
    if (err.message !== 'No file selected') {
      alert('Error restoring backup: ' + err.message);
    }
  }
}

/**
 * Handle form submit
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const data = {
    title: pageTitleInput.value.trim(),
    url: pageUrlInput.value.trim(),
    scanIntervalMinutes: parseInt(scanIntervalSelect.value, 10),
    changeThreshold: parseInt(changeThresholdSelect.value, 10)
  };

  if (editingPageId) {
    await sendMessage({ type: 'UPDATE_PAGE', id: editingPageId, data });
  } else {
    await sendMessage({ type: 'ADD_PAGE', data });
  }

  hideModal();
  loadPages();
}

/**
 * UI Helpers
 */
function showModal() {
  modal.classList.remove('hidden');
  pageTitleInput.focus();
}

function hideModal() {
  modal.classList.add('hidden');
  editingPageId = null;
  pageForm.reset();
}

function toggleMenu() {
  menu.classList.toggle('hidden');
}

function closeMenu() {
  menu.classList.add('hidden');
}

function showStatus(text) {
  statusText.textContent = text;
  statusBar.classList.remove('hidden');
}

function hideStatus() {
  statusBar.classList.add('hidden');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getSensitivityLabel(threshold) {
  if (threshold <= 1) return 'Every Change';
  if (threshold <= 10) return 'Very Sensitive';
  if (threshold <= 25) return 'Sensitive';
  if (threshold <= 50) return 'Moderate';
  if (threshold <= 100) return 'Default';
  if (threshold <= 200) return 'Low';
  return 'Very Low';
}

/**
 * Get current tab info for adding
 */
async function getCurrentTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ? { title: tab.title, url: tab.url } : null;
}

/**
 * Event Listeners
 */
menuBtn.addEventListener('click', toggleMenu);
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
    closeMenu();
  }
});

addBtn.addEventListener('click', async () => {
  editingPageId = null;
  modalTitle.textContent = 'Add Page';
  pageForm.reset();
  
  // Pre-fill with current tab info
  const tabInfo = await getCurrentTabInfo();
  if (tabInfo && tabInfo.url?.startsWith('http')) {
    pageTitleInput.value = tabInfo.title || '';
    pageUrlInput.value = tabInfo.url;
  }
  
  showModal();
});

closeModal.addEventListener('click', hideModal);
cancelBtn.addEventListener('click', hideModal);
pageForm.addEventListener('submit', handleFormSubmit);

scanAllBtn.addEventListener('click', handleScanAll);
backupBtn.addEventListener('click', handleBackup);
restoreBtn.addEventListener('click', handleRestore);

// Close modal on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
    hideModal();
  }
});

/**
 * Initialize popup
 */
async function init() {
  // Check if scan is in progress
  try {
    const { isScanning } = await sendMessage({ type: 'GET_SCAN_STATUS' });
    if (isScanning) {
      showStatus('Scanning in background...');
    } else {
      hideStatus();
    }
  } catch (error) {
    // Ignore errors, just ensure status is hidden
    hideStatus();
  }
  
  loadPages();
}

// Initialize
init();
