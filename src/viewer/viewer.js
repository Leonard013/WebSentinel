/**
 * Viewer script - Display page changes with diff highlighting
 */

import { PageHtml } from '../lib/page.js';
import { highlightChanges, extractText } from '../lib/diff.js';

// DOM Elements
const pageTitle = document.getElementById('pageTitle');
const pageUrl = document.getElementById('pageUrl');
const viewModeBtn = document.getElementById('viewModeBtn');
const viewModeText = document.getElementById('viewModeText');
const openPageBtn = document.getElementById('openPageBtn');
const singleView = document.getElementById('singleView');
const sideBySide = document.getElementById('sideBySide');
const contentFrame = document.getElementById('contentFrame');
const oldFrame = document.getElementById('oldFrame');
const newFrame = document.getElementById('newFrame');
const changeInfo = document.getElementById('changeInfo');
const oldTime = document.getElementById('oldTime');
const newTime = document.getElementById('newTime');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');

// State
let page = null;
let oldHtml = null;
let newHtml = null;
let isSideBySide = false;

/**
 * Initialize the viewer
 */
async function init() {
  const params = new URLSearchParams(window.location.search);
  const pageId = params.get('id');

  if (!pageId) {
    showError('No page ID provided');
    return;
  }

  try {
    // Load page data
    const response = await chrome.runtime.sendMessage({ type: 'GET_PAGE', id: pageId });
    page = response.page;

    if (!page) {
      showError('Page not found');
      return;
    }

    // Update header
    pageTitle.textContent = page.title;
    pageUrl.textContent = page.url;
    pageUrl.href = page.url;
    document.title = `${page.title} - Page Watch`;

    // Load HTML content
    oldHtml = await PageHtml.loadOld(pageId);
    newHtml = await PageHtml.loadNew(pageId);

    if (!newHtml) {
      showError('No content available for this page');
      return;
    }

    // Update time info
    if (page.lastChangeTime) {
      changeInfo.textContent = `Changed ${formatTime(page.lastChangeTime)}`;
    }
    
    if (page.oldScanTime) {
      oldTime.textContent = formatTime(page.oldScanTime);
    }
    
    if (page.lastScanTime) {
      newTime.textContent = formatTime(page.lastScanTime);
    }

    // Render content
    renderContent();
    hideLoading();

    // Mark as read
    await chrome.runtime.sendMessage({ type: 'MARK_AS_READ', id: pageId });

  } catch (err) {
    console.error('Error loading page:', err);
    showError(err.message);
  }
}

/**
 * Render content based on view mode
 */
function renderContent() {
  if (isSideBySide) {
    renderSideBySide();
  } else {
    renderHighlighted();
  }
}

/**
 * Render highlighted diff view
 */
function renderHighlighted() {
  const highlighted = oldHtml 
    ? highlightChanges(oldHtml, newHtml, '#ffff66')
    : newHtml;

  setFrameContent(contentFrame, highlighted);
}

/**
 * Render side by side view
 */
function renderSideBySide() {
  if (!oldHtml) {
    setFrameContent(oldFrame, '<p style="padding: 20px; color: #666;">No previous version available</p>');
    // Still highlight the new version even if there's no old version
    const highlightedNew = highlightChanges('', newHtml, '#ffff66');
    setFrameContent(newFrame, highlightedNew);
    return;
  }

  // Show highlighted versions in both frames
  // Left: old version (original, no highlighting)
  // Right: new version with added/changed content highlighted in yellow
  const highlightedNew = highlightChanges(oldHtml, newHtml, '#ffff66');
  
  // Show old version as-is (or with removed content highlighted in red)
  const highlightedOld = highlightRemoved(oldHtml, newHtml);
  
  setFrameContent(oldFrame, highlightedOld);
  setFrameContent(newFrame, highlightedNew);
}

/**
 * Highlight removed content in old version
 * Shows the old HTML with removed sections highlighted in red
 */
function highlightRemoved(oldHtml, newHtml) {
  if (!oldHtml || !newHtml) return oldHtml;
  
  // Swap the order: highlight what's in old but not in new (removals)
  // Use red color to indicate removed content
  return highlightChanges(newHtml, oldHtml, '#ffcccc');
}

/**
 * Set content of an iframe
 */
function setFrameContent(frame, html) {
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) {
      // Iframe might not be ready, wait a bit
      setTimeout(() => setFrameContent(frame, html), 100);
      return;
    }
    
    doc.open();
    doc.write(html);
    doc.close();
  } catch (error) {
    console.error('Error setting frame content:', error);
  }
}

/**
 * Toggle view mode
 */
function toggleViewMode() {
  isSideBySide = !isSideBySide;
  
  if (isSideBySide) {
    singleView.classList.add('hidden');
    sideBySide.classList.remove('hidden');
    viewModeText.textContent = 'Show Highlighted';
    // Small delay to ensure iframes are ready when switching
    setTimeout(() => renderContent(), 50);
  } else {
    singleView.classList.remove('hidden');
    sideBySide.classList.add('hidden');
    viewModeText.textContent = 'Show Side by Side';
    renderContent();
  }
}

/**
 * Open original page
 */
function openPage() {
  if (page?.url) {
    chrome.tabs.create({ url: page.url });
  }
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Show/hide states
 */
function hideLoading() {
  loadingState.classList.add('hidden');
}

function showError(message) {
  loadingState.classList.add('hidden');
  errorMessage.textContent = message;
  errorState.classList.remove('hidden');
}

// Event listeners
viewModeBtn.addEventListener('click', toggleViewMode);
openPageBtn.addEventListener('click', openPage);

// Initialize
init();
