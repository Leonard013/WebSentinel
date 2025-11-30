# WebSentinel

I decided to move away from Firefox but i wanted to bring with me the best extension I've ever had https://github.com/sneakypete81/updatescanner?tab=readme-ov-file#readme

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

## License

MIT License

## Contributing

Contributions welcome! Please test your changes using the provided test suite.
