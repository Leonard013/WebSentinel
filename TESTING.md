# Testing Guide for Page Watch

## Quick Start

### Option 1: Browser Test Runner (Easiest)

1. **Open the test runner**:
   - Navigate to the `new_version` folder
   - Open `test/run-tests.html` in Chrome
   - Or drag and drop the file into Chrome

2. **Run tests**:
   - Click "Run Diff Tests" to test single character detection
   - Click "Single Character Detection" for load testing
   - Click "Performance Test" for speed tests
   - View results in the output panel

### Option 2: Test the Extension Directly

1. **Load the extension**:
   ```
   Chrome → chrome://extensions/
   → Enable "Developer mode" (top right)
   → Click "Load unpacked"
   → Select the "new_version" folder
   ```

2. **Test single character detection**:
   - Click the extension icon
   - Click "Add Page"
   - Enter a test URL (e.g., `https://example.com`)
   - Set "Change Sensitivity" to "Every Change (1 word)"
   - Click "Save"
   - Click the scan button (refresh icon) on the page
   - Modify the page content by 1 character
   - Scan again - it should detect the change!

3. **Test different thresholds**:
   - Edit a page
   - Try different sensitivity levels
   - Scan and verify detection works correctly

## Manual Testing Checklist

### ✅ Single Character Detection
- [ ] Add a page with "Every Change" sensitivity
- [ ] Scan the page
- [ ] Modify the page by adding 1 character
- [ ] Scan again - should detect change
- [ ] Modify by removing 1 character
- [ ] Scan again - should detect change
- [ ] Modify by changing 1 character
- [ ] Scan again - should detect change

### ✅ Threshold Detection
- [ ] Add page with "Default (100 words)" sensitivity
- [ ] Make a small change (< 100 words)
- [ ] Should NOT detect change
- [ ] Make a large change (> 100 words)
- [ ] Should detect change

### ✅ Side-by-Side View
- [ ] Click on a changed page
- [ ] Click "Show Side by Side"
- [ ] Verify highlights appear in both panels
- [ ] Toggle back to highlighted view
- [ ] Verify highlights still work

### ✅ Auto-scanning
- [ ] Add a page with scan interval "Every 5 minutes"
- [ ] Wait for automatic scan
- [ ] Check if badge appears when changes detected

### ✅ Notifications
- [ ] Make a change to a monitored page
- [ ] Wait for scan or trigger manual scan
- [ ] Verify notification appears
- [ ] Click notification - should open viewer

### ✅ Backup/Restore
- [ ] Add several pages
- [ ] Click Menu → Backup Pages
- [ ] Verify JSON file downloads
- [ ] Delete all pages
- [ ] Click Menu → Restore Pages
- [ ] Select backup file
- [ ] Verify pages are restored

## Automated Test Results

When you run `test/run-tests.html`, you should see:

### Diff Tests
- ✓ Single char addition: detected
- ✓ Single char removal: detected
- ✓ Single char modification: detected
- ✓ Single char at start: detected
- ✓ Single char at end: detected
- ✓ Single space change: detected
- ✓ Identical text: not detected

### Load Test Results
- Pages tested: 100
- Changes detected: 100 (100%)
- Duration: < 5000ms
- Average per page: < 50ms

## Troubleshooting

### Tests don't run in browser
- Make sure you're opening `test/run-tests.html` directly (not through file://)
- Or use a local web server:
  ```bash
  cd new_version
  python3 -m http.server 8000
  # Then open http://localhost:8000/test/run-tests.html
  ```

### Extension not detecting changes
- Check the page's sensitivity setting
- Verify the page actually changed (check manually)
- Look at browser console for errors (F12)
- Check service worker logs: chrome://serviceworker-internals/

### Performance issues
- Large pages (>100KB) may take longer
- Many pages scanning at once may slow down
- Check browser console for timeout errors

## Expected Performance

- **Small pages** (< 10KB): < 100ms per scan
- **Medium pages** (10-100KB): < 500ms per scan
- **Large pages** (> 100KB): < 2000ms per scan
- **100 pages**: < 5000ms total (with delays)

## Test Data

You can use these test pages:
- `https://example.com` - Simple static page
- `https://httpbin.org/html` - Test HTML content
- Any static website you control

For testing changes, you can:
1. Use browser DevTools to modify page content
2. Use a local test server with changing content
3. Monitor a page you know will change
