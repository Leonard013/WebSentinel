# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WebSentinel is a browser extension (Manifest V3) for Chrome and Firefox that monitors web pages for content changes. It runs entirely locally with no external servers or npm dependencies — all code is vanilla JavaScript using ES modules and browser extension APIs.

## Build & Test

### Build
```bash
node build.js              # Chrome (default)
node build.js --firefox    # Firefox
node build.js --all        # Both
```
Produces `WebSentinel-v{VERSION}.zip` (Chrome) and/or `WebSentinel-firefox-v{VERSION}.zip` (Firefox).

### Run Tests
Open `test/run-tests.html` directly in Chrome, or serve locally:
```bash
python3 -m http.server 8000
# Navigate to http://localhost:8000/test/run-tests.html
```
Quick smoke tests: open `test/simple-test.html` in Chrome.

There is no npm, no CLI test runner — tests use a custom browser-based framework (`test/unit/test-framework.js`).

### Load Extension for Development
**Chrome:** `chrome://extensions/` → Enable Developer mode → Load unpacked → Select project root
**Firefox:** Copy `manifest.firefox.json` to `manifest.json`, then `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → Select `manifest.json`

## Architecture

### Component Communication
The **service worker** (`src/background/service-worker.js`) is the central hub. The popup and viewer communicate with it via `chrome.runtime.sendMessage`. Message types: `GET_PAGES`, `ADD_PAGE`, `EDIT_PAGE`, `DELETE_PAGE`, `SCAN_PAGE`, `SCAN_ALL`, `GET_PAGE_HTML`, `CLEAR_CHANGES`.

### Data Flow: Page Monitoring
1. User adds a page via popup → `ADD_PAGE` message → service worker stores it
2. `chrome.alarms` fires every 5 minutes → service worker calls `scanPages()`
3. Scanner fetches URL (3 retries, 30s timeout) → extracts text → compares via diff engine
4. If change exceeds threshold → page state set to `CHANGED` → browser notification sent
5. User clicks notification or changed page → opens viewer with highlighted diff

### Storage Architecture (dual-layer)
- **Page metadata** → `chrome.storage.sync` (cloud-synced across devices), falls back to `chrome.storage.local` if quota exceeded
- **HTML content** → IndexedDB via `HtmlStorage` class (no size limits)

### Change Detection (hybrid strategy in `src/lib/diff.js`)
- Text < 1000 chars: **character-level** diff (Levenshtein distance) for precision
- Text >= 1000 chars: **word-level** diff (LCS algorithm) for performance
- Three sensitivity thresholds: 1 word ("Every Change"), 100 words ("Default"), 500 words ("Low")

### Key Modules
| Module | Role |
|--------|------|
| `src/lib/diff.js` | Text extraction, tokenization, change counting, HTML highlighting, sanitization |
| `src/lib/scanner.js` | Page fetching with retry/timeout, change detection orchestration |
| `src/lib/page.js` | `Page` class (model) and `PageStore` (CRUD + scan scheduling) |
| `src/lib/storage.js` | `Storage` (chrome.storage wrapper) and `HtmlStorage` (IndexedDB wrapper) |
| `src/lib/notifications.js` | Browser notification creation and click handling |
| `src/lib/backup.js` | JSON export/import of all pages and HTML content |
| `src/popup/popup.js` | Main UI: page list, add/edit modal, scan triggers, backup/restore |
| `src/viewer/viewer.js` | Diff viewer: side-by-side and highlighted views |

### Security Considerations
- `diff.js` includes `sanitizeHtml()` — strips `<script>`, `<iframe>`, `<object>`, `<embed>`, and event handlers before rendering
- The viewer renders fetched HTML in sanitized form; changes to sanitization logic require careful review

### Firefox Compatibility
- `manifest.firefox.json` uses `background.scripts` (not `service_worker`) for Firefox 109+ support
- `browser_specific_settings.gecko` provides the Firefox add-on ID
- `chrome.action.openPopup()` has a feature-check fallback in service-worker.js
- All `chrome.*` APIs work in Firefox via its compatibility layer
- The source code is shared between Chrome and Firefox; only the manifest differs
