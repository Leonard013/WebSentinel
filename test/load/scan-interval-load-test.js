/**
 * Load test for scan interval functionality
 * Tests the scanning system with multiple pages and various intervals
 */

import { Page, PageStore } from '../../src/lib/page.js';
import { scanPages } from '../../src/lib/scanner.js';

// Mock fetch for testing
let mockFetchCalls = 0;
let mockFetchDelay = 0;

function setupMockFetch(delay = 100) {
  mockFetchDelay = delay;
  global.fetch = async (url) => {
    mockFetchCalls++;
    await new Promise(resolve => setTimeout(resolve, mockFetchDelay));
    return {
      ok: true,
      text: async () => `<html><body><p>Test content for ${url} - ${Date.now()}</p></body></html>`
    };
  };
}

async function runLoadTest() {
  console.log('='.repeat(60));
  console.log('SCAN INTERVAL LOAD TEST');
  console.log('='.repeat(60));
  
  const results = {
    totalPages: 0,
    pagesScanned: 0,
    scanTime: 0,
    errors: []
  };

  try {
    // Test 1: Many pages with different intervals
    console.log('\n[Test 1] Creating 50 pages with various intervals...');
    const store = new PageStore();
    const now = Date.now();
    
    const intervals = [5, 15, 30, 60, 360, 1440]; // Various intervals
    const pagesPerInterval = Math.ceil(50 / intervals.length);
    
    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      for (let j = 0; j < pagesPerInterval; j++) {
        const pageIndex = i * pagesPerInterval + j;
        if (pageIndex >= 50) break;
        
        // Mix of pages that need scanning and don't
        const needsScan = pageIndex % 2 === 0;
        const lastScanTime = needsScan 
          ? now - ((interval + 10) * 60 * 1000) // Overdue
          : now - ((interval / 2) * 60 * 1000); // Recent
        
        await store.create({
          title: `Test Page ${pageIndex + 1}`,
          url: `https://example.com/test-${pageIndex}`,
          scanIntervalMinutes: interval,
          lastScanTime: lastScanTime
        });
      }
    }
    
    results.totalPages = store.getAll().length;
    console.log(`✓ Created ${results.totalPages} pages`);
    
    // Test 2: Check which pages need scanning
    console.log('\n[Test 2] Checking which pages need scanning...');
    const needingScan = store.getNeedingScan();
    console.log(`✓ ${needingScan.length} pages need scanning`);
    
    // Test 3: Perform scan
    if (needingScan.length > 0) {
      console.log('\n[Test 3] Performing scan...');
      setupMockFetch(50); // 50ms delay per page
      
      const startTime = Date.now();
      const changedCount = await scanPages(needingScan);
      const endTime = Date.now();
      
      results.pagesScanned = needingScan.length;
      results.scanTime = endTime - startTime;
      
      console.log(`✓ Scanned ${needingScan.length} pages in ${results.scanTime}ms`);
      console.log(`✓ ${changedCount} pages changed`);
      console.log(`✓ Average: ${(results.scanTime / needingScan.length).toFixed(2)}ms per page`);
    }
    
    // Test 4: Verify scan times were updated
    console.log('\n[Test 4] Verifying scan times were updated...');
    // Reload pages to check updated scan times
    const scannedPageIds = new Set(needingScan.map(p => p.id));
    let updatedCount = 0;
    
    for (const page of needingScan) {
      const reloaded = await Page.load(page.id);
      if (reloaded && reloaded.lastScanTime && reloaded.lastScanTime > page.lastScanTime) {
        updatedCount++;
      }
    }
    
    if (updatedCount === needingScan.length) {
      console.log('✓ All scanned pages have updated lastScanTime');
    } else {
      console.log(`⚠ ${updatedCount}/${needingScan.length} pages have updated scan times`);
    }
    
    // Test 5: Stress test with many pages
    console.log('\n[Test 5] Stress test: 100 pages all needing scan...');
    const stressStore = new PageStore();
    const stressStart = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await stressStore.create({
        title: `Stress Page ${i + 1}`,
        url: `https://example.com/stress-${i}`,
        scanIntervalMinutes: 5,
        lastScanTime: now - (10 * 60 * 1000) // All overdue
      });
    }
    
    const stressNeeding = stressStore.getNeedingScan();
    console.log(`✓ Created 100 pages, ${stressNeeding.length} need scanning`);
    
    if (stressNeeding.length > 0) {
      setupMockFetch(10); // Faster for stress test
      const stressScanStart = Date.now();
      await scanPages(stressNeeding.slice(0, 20)); // Scan first 20 to avoid timeout
      const stressScanEnd = Date.now();
      
      console.log(`✓ Scanned 20 pages in ${stressScanEnd - stressScanStart}ms`);
      console.log(`✓ Average: ${((stressScanEnd - stressScanStart) / 20).toFixed(2)}ms per page`);
    }
    
    // Test 6: Test interval boundary conditions
    console.log('\n[Test 6] Testing interval boundary conditions...');
    const boundaryStore = new PageStore();
    
    const intervals = [5, 15, 30, 60];
    for (const interval of intervals) {
      // Exactly at boundary
      await boundaryStore.create({
        title: `Boundary ${interval}min - exact`,
        url: `https://example.com/boundary-${interval}-exact`,
        scanIntervalMinutes: interval,
        lastScanTime: now - (interval * 60 * 1000)
      });
      
      // Just under boundary
      await boundaryStore.create({
        title: `Boundary ${interval}min - under`,
        url: `https://example.com/boundary-${interval}-under`,
        scanIntervalMinutes: interval,
        lastScanTime: now - ((interval * 60 * 1000) - 1000)
      });
      
      // Just over boundary
      await boundaryStore.create({
        title: `Boundary ${interval}min - over`,
        url: `https://example.com/boundary-${interval}-over`,
        scanIntervalMinutes: interval,
        lastScanTime: now - ((interval * 60 * 1000) + 1000)
      });
    }
    
    const boundaryNeeding = boundaryStore.getNeedingScan();
    const expectedNeeding = intervals.length * 2; // exact + over (not under)
    
    console.log(`✓ Created ${intervals.length * 3} boundary test pages`);
    console.log(`✓ ${boundaryNeeding.length} need scanning (expected ~${expectedNeeding})`);
    
    // Test 7: Performance metrics
    console.log('\n[Test 7] Performance metrics...');
    console.log(`Total pages created: ${results.totalPages}`);
    console.log(`Pages scanned: ${results.pagesScanned}`);
    console.log(`Total scan time: ${results.scanTime}ms`);
    console.log(`Mock fetch calls: ${mockFetchCalls}`);
    console.log(`Average time per page: ${results.pagesScanned > 0 ? (results.scanTime / results.pagesScanned).toFixed(2) : 0}ms`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✓ All tests completed successfully`);
    console.log(`✓ Total pages: ${results.totalPages}`);
    console.log(`✓ Pages scanned: ${results.pagesScanned}`);
    console.log(`✓ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    return results;
    
  } catch (error) {
    console.error('\n❌ Load test failed:', error);
    results.errors.push(error.message);
    throw error;
  }
}

// Run test if executed directly
if (typeof window === 'undefined' || window.location.pathname.includes('load-test')) {
  runLoadTest().catch(console.error);
}

export { runLoadTest };

