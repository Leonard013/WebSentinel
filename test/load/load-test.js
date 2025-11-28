/**
 * Load tests for Page Watch extension
 * Tests performance and functionality under load
 */

import { scanPages } from '../../src/lib/scanner.js';
import { Page, PageState } from '../../src/lib/page.js';
import { PageHtml } from '../../src/lib/page.js';
import { countChanges } from '../../src/lib/diff.js';

// Mock storage for testing
const mockHtmlStorage = new Map();

// Mock PageHtml
const originalLoadNew = PageHtml.loadNew;
const originalSaveNew = PageHtml.saveNew;
const originalSaveOld = PageHtml.saveOld;

PageHtml.loadNew = async (id) => mockHtmlStorage.get(`html:${id}:new`);
PageHtml.saveNew = async (id, html) => { mockHtmlStorage.set(`html:${id}:new`, html); };
PageHtml.saveOld = async (id, html) => { mockHtmlStorage.set(`html:${id}:old`, html); };

// Mock fetch
const originalFetch = global.fetch;

/**
 * Generate test HTML content
 */
function generateHTML(content) {
  return `<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>Test Content</h1>
  <p>${content}</p>
  <div>Additional content here</div>
</body>
</html>`;
}

/**
 * Test single character detection across many pages
 */
async function testSingleCharacterDetection() {
  console.log('\n=== Load Test: Single Character Detection ===');
  
  const pages = [];
  const results = {
    detected: 0,
    missed: 0,
    errors: 0
  };

  // Create 100 test pages
  for (let i = 0; i < 100; i++) {
    const page = new Page(`test-${i}`, {
      title: `Test Page ${i}`,
      url: `https://example.com/test-${i}`,
      changeThreshold: 1 // Every change
    });
    
    // Set initial content
    const initialContent = `Page ${i} content`;
    await PageHtml.saveNew(page.id, generateHTML(initialContent));
    
    pages.push({ page, initialContent });
  }

  // Mock fetch to return modified content (single character change)
  global.fetch = async (url) => {
    const pageIndex = parseInt(url.split('-').pop());
    const { initialContent } = pages[pageIndex];
    const modifiedContent = initialContent + 'x'; // Add single character
    
    return {
      ok: true,
      text: async () => generateHTML(modifiedContent)
    };
  };

  // Scan all pages
  const startTime = Date.now();
  const changedCount = await scanPages(pages.map(p => p.page));
  const duration = Date.now() - startTime;

  // Check results
  for (const { page } of pages) {
    await page.save();
    if (page.state === PageState.CHANGED) {
      results.detected++;
    } else if (page.state === PageState.ERROR) {
      results.errors++;
    } else {
      results.missed++;
    }
  }

  console.log(`Pages tested: ${pages.length}`);
  console.log(`Changes detected: ${results.detected}`);
  console.log(`Changes missed: ${results.missed}`);
  console.log(`Errors: ${results.errors}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Average per page: ${(duration / pages.length).toFixed(2)}ms`);
  console.log(`Success rate: ${((results.detected / pages.length) * 100).toFixed(2)}%`);

  // Cleanup
  mockHtmlStorage.clear();
  global.fetch = originalFetch;

  return results.detected === pages.length && results.errors === 0;
}

/**
 * Test various change types
 */
async function testChangeTypes() {
  console.log('\n=== Load Test: Various Change Types ===');
  
  const testCases = [
    { name: 'Single char addition', old: 'Hello', new: 'Hellox', threshold: 1, shouldDetect: true },
    { name: 'Single char removal', old: 'Hello', new: 'Hell', threshold: 1, shouldDetect: true },
    { name: 'Single char modification', old: 'Hello', new: 'Hallo', threshold: 1, shouldDetect: true },
    { name: 'Word addition', old: 'Hello', new: 'Hello world', threshold: 1, shouldDetect: true },
    { name: 'Multiple words', old: 'The quick', new: 'The quick brown fox', threshold: 1, shouldDetect: true },
    { name: 'Below threshold', old: 'Hello', new: 'Hellox', threshold: 100, shouldDetect: false },
    { name: 'Above threshold', old: 'Hello', new: 'Hello world this is a long text', threshold: 10, shouldDetect: true },
    { name: 'Whitespace change', old: 'Hello world', new: 'Hello  world', threshold: 1, shouldDetect: true },
    { name: 'Case change', old: 'Hello', new: 'hello', threshold: 1, shouldDetect: true },
    { name: 'Unicode change', old: 'Hello 世界', new: 'Hello 世界!', threshold: 1, shouldDetect: true }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const changes = countChanges(testCase.old, testCase.new);
    const detected = changes >= testCase.threshold;
    
    if (detected === testCase.shouldDetect) {
      passed++;
      console.log(`  ✓ ${testCase.name}: ${detected ? 'detected' : 'not detected'} (${changes} changes)`);
    } else {
      failed++;
      console.log(`  ✗ ${testCase.name}: expected ${testCase.shouldDetect ? 'detected' : 'not detected'}, got ${detected ? 'detected' : 'not detected'} (${changes} changes)`);
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test performance with large HTML
 */
async function testLargeHTMLPerformance() {
  console.log('\n=== Load Test: Large HTML Performance ===');
  
  // Generate large HTML (100KB)
  const largeContent = 'x'.repeat(50000);
  const oldHTML = generateHTML(largeContent);
  const newHTML = generateHTML(largeContent + 'y'); // Single character change

  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    const changes = countChanges(oldHTML, newHTML);
    const duration = Date.now() - start;
    times.push(duration);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`HTML size: ${(oldHTML.length / 1024).toFixed(2)}KB`);
  console.log(`Iterations: ${iterations}`);
  console.log(`Average time: ${avgTime.toFixed(2)}ms`);
  console.log(`Min time: ${minTime}ms`);
  console.log(`Max time: ${maxTime}ms`);

  return avgTime < 1000; // Should complete in under 1 second
}

/**
 * Test concurrent scanning
 */
async function testConcurrentScanning() {
  console.log('\n=== Load Test: Concurrent Scanning ===');
  
  const pageCount = 50;
  const pages = [];

  for (let i = 0; i < pageCount; i++) {
    const page = new Page(`concurrent-${i}`, {
      title: `Concurrent Test ${i}`,
      url: `https://example.com/concurrent-${i}`,
      changeThreshold: 1
    });
    
    await PageHtml.saveNew(page.id, generateHTML(`Content ${i}`));
    pages.push(page);
  }

  // Mock fetch with delay to simulate network
  global.fetch = async (url) => {
    await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
    return {
      ok: true,
      text: async () => generateHTML('Modified content')
    };
  };

  const startTime = Date.now();
  const changedCount = await scanPages(pages);
  const duration = Date.now() - startTime;

  console.log(`Pages scanned: ${pageCount}`);
  console.log(`Changes detected: ${changedCount}`);
  console.log(`Total duration: ${duration}ms`);
  console.log(`Average per page: ${(duration / pageCount).toFixed(2)}ms`);
  console.log(`Expected min duration: ${pageCount * 10}ms (with 10ms delay + 2s between)`);

  // Cleanup
  mockHtmlStorage.clear();
  global.fetch = originalFetch;

  return changedCount === pageCount;
}

/**
 * Run all load tests
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('PAGE WATCH - LOAD TESTS');
  console.log('='.repeat(60));

  const results = {
    singleChar: await testSingleCharacterDetection(),
    changeTypes: await testChangeTypes(),
    largeHTML: await testLargeHTMLPerformance(),
    concurrent: await testConcurrentScanning()
  };

  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Single Character Detection: ${results.singleChar ? 'PASS' : 'FAIL'}`);
  console.log(`Change Types: ${results.changeTypes ? 'PASS' : 'FAIL'}`);
  console.log(`Large HTML Performance: ${results.largeHTML ? 'PASS' : 'FAIL'}`);
  console.log(`Concurrent Scanning: ${results.concurrent ? 'PASS' : 'FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('='.repeat(60));

  return allPassed;
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runAllTests, testSingleCharacterDetection, testChangeTypes, testLargeHTMLPerformance, testConcurrentScanning };
