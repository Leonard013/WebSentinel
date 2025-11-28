/**
 * Scanner module - Fetches pages and detects changes
 */

import { Page, PageState, PageHtml } from './page.js';
import { extractText, countChanges } from './diff.js';

const SCAN_DELAY_MS = 2000;

/**
 * Scan a single page for changes
 * @param {Page} page - Page to scan
 * @returns {Promise<boolean>} - True if major change detected
 */
export async function scanPage(page) {
  console.log(`[Scanner] Scanning: ${page.title} (${page.url})`);

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response;
    try {
      response = await fetch(page.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const newHtml = await response.text();
    const previousHtml = await PageHtml.loadNew(page.id);
    
    const hasChanged = detectChange(previousHtml, newHtml, page.changeThreshold);

    if (hasChanged && !page.isChanged()) {
      // New change detected - save current as old for diff view
      if (previousHtml) {
        await PageHtml.saveOld(page.id, previousHtml);
      }
      page.state = PageState.CHANGED;
      page.lastChangeTime = Date.now();
    } else if (!page.isChanged()) {
      page.state = PageState.NO_CHANGE;
    }

    // Always save the latest HTML
    await PageHtml.saveNew(page.id, newHtml);
    page.lastScanTime = Date.now();
    page.errorMessage = null;
    await page.save();

    console.log(`[Scanner] ${page.title}: ${hasChanged ? 'CHANGED' : 'no change'}`);
    return hasChanged;

  } catch (error) {
    console.error(`[Scanner] Error scanning ${page.title}:`, error);
    page.state = PageState.ERROR;
    page.errorMessage = error.name === 'AbortError' 
      ? 'Request timeout (30s)' 
      : error.message || 'Unknown error';
    page.lastScanTime = Date.now();
    await page.save();
    return false;
  }
}

/**
 * Scan multiple pages sequentially with delay
 * @param {Page[]} pages - Pages to scan
 * @returns {Promise<number>} - Number of changed pages
 */
export async function scanPages(pages) {
  let changedCount = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    try {
      if (await scanPage(page)) {
        changedCount++;
      }
    } catch (error) {
      console.error(`[Scanner] Failed to scan ${page.title}:`, error);
      // Continue with next page even if one fails
    }
    
    // Only delay between pages, not after the last one
    if (i < pages.length - 1) {
      await sleep(SCAN_DELAY_MS);
    }
  }

  return changedCount;
}

/**
 * Detect if content has changed significantly
 */
function detectChange(oldHtml, newHtml, threshold) {
  if (!oldHtml) return false;
  if (oldHtml === newHtml) return false;

  const oldText = extractText(oldHtml);
  const newText = extractText(newHtml);

  if (oldText === newText) return false;

  // If threshold is 1, detect any change (even single character differences)
  if (threshold <= 1) {
    return oldText !== newText;
  }

  const changes = countChanges(oldText, newText);
  return changes >= threshold;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
