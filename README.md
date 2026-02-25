# WebSentinel

**Webpage monitoring extension for Chrome and Firefox.**
*Heavily inspired by the legendary [Update Scanner](https://github.com/sneakypete81/updatescanner) for Firefox.*

WebSentinel monitors web pages for content changes. It runs in the background and notifies you when pages update, with configurable sensitivity to filter out minor edits.

## Features

- **Granular Sensitivity:** Choose between "Every Change", "Default" (significant edits), or "Low" (major updates only).
- **Diff Viewer:** See exactly what changed with a built-in visual diff tool (highlighted and side-by-side views).
- **Local Processing:** All checks happen locally in your browser — no external servers involved.
- **Cloud Sync:** Page list syncs across devices via Chrome/Firefox sync.
- **Backup & Restore:** Export and import your monitored pages as JSON.

## Installation

### Chrome (Developer Mode)

1. Clone the repository:
   ```bash
   git clone https://github.com/Leonard013/WebSentinel
   ```
2. Open `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project root folder (contains `manifest.json`).

### Firefox (Temporary Add-on)

1. Clone the repository:
   ```bash
   git clone https://github.com/Leonard013/WebSentinel
   ```
2. Copy `manifest.firefox.json` over `manifest.json`:
   ```bash
   cp manifest.firefox.json manifest.json
   ```
   Or use the build script to generate a Firefox package (see [Build](#build) below).
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** and select any file inside the project folder (e.g. `manifest.json`).

> **Note:** Temporary add-ons are removed when Firefox closes. For permanent installation, submit the built `.zip` to [addons.mozilla.org](https://addons.mozilla.org/).

## Quick Start

1. Click the **WebSentinel icon** in your browser toolbar.
2. Navigate to a page you want to track and click **Add Page**.
3. **Configure Sensitivity:**
   - *Every Change:* Detects even a single character change.
   - *Default:* Ignores minor formatting; detects changes of ~100+ words.
   - *Low:* Only triggers on major structural updates.
4. Click **Save**.

## Build

Requires Node.js. Produces a `.zip` ready for store submission.

```bash
# Build for Chrome (default)
node build.js

# Build for Firefox
node build.js --firefox

# Build for both
node build.js --all
```

Output files:
- `WebSentinel-v{VERSION}.zip` — Chrome Web Store package
- `WebSentinel-firefox-v{VERSION}.zip` — Firefox Add-ons package

## Project Structure

```
WebSentinel/
├── manifest.json              # Chrome extension manifest (MV3)
├── manifest.firefox.json      # Firefox extension manifest (MV3)
├── build.js                   # Build script (supports --chrome, --firefox, --all)
├── icons/                     # Extension icons
├── src/
│   ├── background/            # Service worker (alarms, scanning, message hub)
│   ├── lib/                   # Core logic (diff engine, storage, scanner, backup)
│   ├── popup/                 # Main popup UI
│   └── viewer/                # Diff viewer (highlighted + side-by-side)
└── test/                      # Browser-based unit tests
```

## Browser Compatibility

| Feature | Chrome | Firefox |
|---------|--------|---------|
| Manifest | V3 (service worker) | V3 (background scripts) |
| Min version | Chrome 102+ | Firefox 109+ |
| Storage sync | chrome.storage.sync | chrome.storage.sync |
| Notifications | Full support | Full support |
| Keyboard shortcut | Alt+W | Alt+W |

## Running Tests

Tests run in the browser (no CLI test runner):

```bash
python3 -m http.server 8000
# Open http://localhost:8000/test/run-tests.html
```

Quick smoke tests: open `test/simple-test.html` in the browser.
