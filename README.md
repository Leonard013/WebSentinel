# WebSentinel

A modern Chrome extension that monitors webpages for changes and notifies you when content updates.

![WebSentinel](icons/icon-128.png)

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this folder (`new_version`)

## Quick Start

1. Click the WebSentinel icon in your toolbar
2. Click **Add Page**
3. Enter the URL you want to monitor
4. Choose your **Change Sensitivity**:
   - **Every Change** - Detects any modification (even 1 character)
   - **Default** - Detects significant changes (100+ words)
   - **Low** - Only major updates
5. Click **Save**

The extension will automatically scan pages based on your scan interval settings.

## Testing

### Quick Test (30 seconds)

1. Open `test/simple-test.html` in Chrome
2. Click the test buttons
3. Verify all tests pass (green)

### Full Test Suite

1. Open `test/run-tests.html` in Chrome
2. Click **Run All Tests**
3. Review results

Tests verify:
- ✅ Single character detection
- ✅ Various change scenarios
- ✅ Performance benchmarks
- ✅ Edge cases

## Usage

### Viewing Changes

When a page changes:
- A badge appears on the extension icon
- You receive a browser notification
- The page is highlighted in the list
- Click it to see the diff view

### Diff Viewer

- **Highlighted View** - Shows changes with yellow highlights
- **Side-by-Side** - Compare old vs new versions
- Click **Show Side by Side** to toggle views

### Settings

Each page can be configured with:
- **Scan Interval** - How often to check (5 min to daily)
- **Change Sensitivity** - How much change triggers a notification
- **Manual Scan** - Click the refresh icon to scan immediately

## Project Structure

```
new_version/
├── manifest.json          # Extension manifest
├── icons/                 # Extension icons
├── src/
│   ├── background/       # Service worker
│   ├── lib/              # Core functionality
│   ├── popup/            # Main UI
│   └── viewer/           # Diff viewer
└── test/                 # Test files
```

## Requirements

- Chrome 88+ (Manifest V3)
- No external dependencies

## License

MIT License

## Contributing

Contributions welcome! Please test your changes using the provided test suite.
