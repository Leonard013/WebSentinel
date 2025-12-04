# WebSentinel

**Webpage monitoring extension for Google Chrome.**  
*Heavily inspired by the legendary [Update Scanner](https://github.com/sneakypete81/updatescanner) for Firefox.*

WebSentinel allows you to monitor web pages for updates. It runs in the background and notifies you when content changes, with options to filter out minor edits.

## Features
*   **Granular Sensitivity:** Choose between "Every Change", "Default" (significant edits), or "Low" (major updates only).
*   **Diff Viewer:** See exactly what changed with a built-in visual diff tool.
*   **Local Processing:** All checks happen locally on your browser—no external servers involved.

## Installation (Developer Mode)
Since this extension is not yet on the Chrome Web Store, you can install it manually:

1.  Download this repository or clone it:
    ```bash
    git clone https://github.com/yourusername/websentinel.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`
3.  Enable **Developer mode** (toggle in the top-right corner).
4.  Click **Load unpacked**.
5.  Select the `src` folder from this project (or the folder containing `manifest.json`).

## Quick Start
1.  Click the **WebSentinel icon** in your browser toolbar.
2.  Navigate to a page you want to track and click **Add Page**.
3.  **Configure Sensitivity:**
    *   *Every Change:* Detects even a single character change.
    *   *Default:* Ignores minor formatting; detects changes of ~100+ words.
    *   *Low:* Only triggers on major structural updates.
4.  Click **Save**.

## Project Structure

```text
websentinel/
├── manifest.json          # Extension configuration
├── icons/                 # UI assets
├── src/
│   ├── background/        # Service worker (alarms & fetching)
│   ├── lib/               # Core logic (diffing algorithms)
│   ├── popup/             # The main extension popup UI
│   └── viewer/            # The page that shows "Before vs After"
└── test/                  # Unit tests
