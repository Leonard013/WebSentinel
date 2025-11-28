# Testing Page Watch

## Quick Start

### Option 1: Simple Test (No Server Needed) ✅

1. **Open `simple-test.html` directly in Chrome**
   - Double-click the file, or
   - Drag and drop into Chrome, or
   - Right-click → Open with → Chrome

2. **Click the test buttons** - Results appear immediately!

### Option 2: Full Test Suite (No Server Needed) ✅

1. **Open `run-tests.html` directly in Chrome**
   - Same as above - no server needed!

2. **Click "Run All Tests"** - All tests run automatically

### Option 3: Use Local Server (Optional)

If you prefer using a server:

```bash
cd new_version
python3 -m http.server 8000
```

Then open: `http://localhost:8000/test/run-tests.html`

## What Gets Tested

### ✅ Single Character Detection
- Character addition
- Character removal  
- Character modification
- At start, middle, end of text

### ✅ Threshold Detection
- Different sensitivity levels
- Word-level vs character-level

### ✅ Performance
- Large HTML handling
- Speed benchmarks

### ✅ Edge Cases
- Empty text
- Unicode characters
- Special characters
- HTML content

## Expected Results

All tests should **PASS** (green) ✅

If any test fails (red) ❌, check:
1. Browser console (F12) for errors
2. Make sure you're using Chrome
3. Try refreshing the page

## Troubleshooting

### "Failed to fetch dynamically imported module"
- **Fixed!** The test files now use inline code, no imports needed
- Just open the HTML files directly in Chrome

### Tests don't run
- Make sure JavaScript is enabled
- Check browser console (F12) for errors
- Try a different browser (Chrome recommended)

### CORS errors
- The test files are now self-contained
- No server needed - open directly in Chrome

## Test Files

- `simple-test.html` - Quick 3-test suite
- `run-tests.html` - Full comprehensive tests
- `unit/` - Unit test files (for reference)
- `load/` - Load test files (for reference)
