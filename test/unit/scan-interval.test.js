/**
 * Unit tests for scan interval functionality
 */

import { describe, it, expect, beforeEach } from './test-framework.js';
import { Page, PageStore, PageState } from '../../src/lib/page.js';

describe('Scan Interval - needsScan()', () => {
  let page;

  beforeEach(() => {
    page = null;
  });

  describe('Pages without lastScanTime', () => {
    it('should need scan if lastScanTime is null', () => {
      page = new Page('test-1', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: 60,
        lastScanTime: null
      });
      
      expect(page.needsScan()).toBe(true);
    });

    it('should need scan if lastScanTime is undefined', () => {
      page = new Page('test-2', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: 60
      });
      
      expect(page.needsScan()).toBe(true);
    });
  });

  describe('Pages with scanIntervalMinutes = 0', () => {
    it('should not need scan if interval is 0 (manual only)', () => {
      page = new Page('test-3', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: 0,
        lastScanTime: null
      });
      
      expect(page.needsScan()).toBe(false);
    });

    it('should not need scan even if lastScanTime is old', () => {
      const oldTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      page = new Page('test-4', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: 0,
        lastScanTime: oldTime
      });
      
      expect(page.needsScan()).toBe(false);
    });
  });

  describe('Pages with valid intervals', () => {
    it('should need scan if elapsed time exceeds interval', () => {
      const intervalMinutes = 5;
      const oldTime = Date.now() - ((intervalMinutes + 1) * 60 * 1000); // 6 minutes ago
      
      page = new Page('test-5', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: intervalMinutes,
        lastScanTime: oldTime
      });
      
      expect(page.needsScan()).toBe(true);
    });

    it('should not need scan if elapsed time is less than interval', () => {
      const intervalMinutes = 60;
      const recentTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
      
      page = new Page('test-6', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: intervalMinutes,
        lastScanTime: recentTime
      });
      
      expect(page.needsScan()).toBe(false);
    });

    it('should need scan exactly at interval boundary', () => {
      const intervalMinutes = 10;
      const exactTime = Date.now() - (intervalMinutes * 60 * 1000); // Exactly 10 minutes ago
      
      page = new Page('test-7', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: intervalMinutes,
        lastScanTime: exactTime
      });
      
      expect(page.needsScan()).toBe(true);
    });

    it('should handle very short intervals (5 minutes)', () => {
      const intervalMinutes = 5;
      const oldTime = Date.now() - ((intervalMinutes + 1) * 60 * 1000);
      
      page = new Page('test-8', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: intervalMinutes,
        lastScanTime: oldTime
      });
      
      expect(page.needsScan()).toBe(true);
    });

    it('should handle long intervals (daily)', () => {
      const intervalMinutes = 1440; // 24 hours
      const oldTime = Date.now() - ((intervalMinutes + 60) * 60 * 1000); // 25 hours ago
      
      page = new Page('test-9', {
        title: 'Test Page',
        url: 'https://example.com',
        scanIntervalMinutes: intervalMinutes,
        lastScanTime: oldTime
      });
      
      expect(page.needsScan()).toBe(true);
    });
  });
});

describe('Scan Interval - PageStore.getNeedingScan()', () => {
  let store;

  beforeEach(async () => {
    store = new PageStore();
  });

  it('should return pages that need scanning', async () => {
    const now = Date.now();
    
    // Page 1: needs scan (old lastScanTime)
    await store.create({
      title: 'Page 1',
      url: 'https://example.com/1',
      scanIntervalMinutes: 60,
      lastScanTime: now - (2 * 60 * 60 * 1000) // 2 hours ago
    });
    
    // Page 2: does not need scan (recent)
    await store.create({
      title: 'Page 2',
      url: 'https://example.com/2',
      scanIntervalMinutes: 60,
      lastScanTime: now - (30 * 60 * 1000) // 30 minutes ago
    });
    
    // Page 3: needs scan (never scanned)
    await store.create({
      title: 'Page 3',
      url: 'https://example.com/3',
      scanIntervalMinutes: 60,
      lastScanTime: null
    });
    
    // Page 4: does not need scan (manual only)
    await store.create({
      title: 'Page 4',
      url: 'https://example.com/4',
      scanIntervalMinutes: 0,
      lastScanTime: null
    });

    const needingScan = store.getNeedingScan();
    
    expect(needingScan.length).toBe(2);
    expect(needingScan.some(p => p.title === 'Page 1')).toBe(true);
    expect(needingScan.some(p => p.title === 'Page 3')).toBe(true);
    expect(needingScan.some(p => p.title === 'Page 2')).toBe(false);
    expect(needingScan.some(p => p.title === 'Page 4')).toBe(false);
  });

  it('should return empty array when no pages need scanning', async () => {
    const now = Date.now();
    
    await store.create({
      title: 'Page 1',
      url: 'https://example.com/1',
      scanIntervalMinutes: 60,
      lastScanTime: now - (30 * 60 * 1000) // 30 minutes ago
    });
    
    await store.create({
      title: 'Page 2',
      url: 'https://example.com/2',
      scanIntervalMinutes: 1440,
      lastScanTime: now - (12 * 60 * 60 * 1000) // 12 hours ago
    });

    const needingScan = store.getNeedingScan();
    expect(needingScan.length).toBe(0);
  });

  it('should handle different intervals correctly', async () => {
    const now = Date.now();
    
    // 5 minute interval - needs scan
    await store.create({
      title: 'Fast Page',
      url: 'https://example.com/fast',
      scanIntervalMinutes: 5,
      lastScanTime: now - (6 * 60 * 1000) // 6 minutes ago
    });
    
    // 15 minute interval - needs scan
    await store.create({
      title: 'Medium Page',
      url: 'https://example.com/medium',
      scanIntervalMinutes: 15,
      lastScanTime: now - (20 * 60 * 1000) // 20 minutes ago
    });
    
    // 60 minute interval - does not need scan
    await store.create({
      title: 'Slow Page',
      url: 'https://example.com/slow',
      scanIntervalMinutes: 60,
      lastScanTime: now - (30 * 60 * 1000) // 30 minutes ago
    });

    const needingScan = store.getNeedingScan();
    expect(needingScan.length).toBe(2);
    expect(needingScan.some(p => p.title === 'Fast Page')).toBe(true);
    expect(needingScan.some(p => p.title === 'Medium Page')).toBe(true);
    expect(needingScan.some(p => p.title === 'Slow Page')).toBe(false);
  });
});

describe('Scan Interval - Edge Cases', () => {
  it('should handle very recent scans (just scanned)', () => {
    const page = new Page('test-edge-1', {
      title: 'Test Page',
      url: 'https://example.com',
      scanIntervalMinutes: 60,
      lastScanTime: Date.now() - (1000) // 1 second ago
    });
    
    expect(page.needsScan()).toBe(false);
  });

  it('should handle boundary condition (exactly at interval)', () => {
    const intervalMinutes = 30;
    const page = new Page('test-edge-2', {
      title: 'Test Page',
      url: 'https://example.com',
      scanIntervalMinutes: intervalMinutes,
      lastScanTime: Date.now() - (intervalMinutes * 60 * 1000) // Exactly 30 minutes
    });
    
    expect(page.needsScan()).toBe(true);
  });

  it('should handle boundary condition (just under interval)', () => {
    const intervalMinutes = 30;
    const page = new Page('test-edge-3', {
      title: 'Test Page',
      url: 'https://example.com',
      scanIntervalMinutes: intervalMinutes,
      lastScanTime: Date.now() - ((intervalMinutes * 60 * 1000) - 1000) // 29:59 minutes
    });
    
    expect(page.needsScan()).toBe(false);
  });

  it('should handle future timestamps gracefully', () => {
    const page = new Page('test-edge-4', {
      title: 'Test Page',
      url: 'https://example.com',
      scanIntervalMinutes: 60,
      lastScanTime: Date.now() + (60 * 60 * 1000) // 1 hour in future (clock skew)
    });
    
    // Should not need scan if lastScanTime is in the future
    expect(page.needsScan()).toBe(false);
  });
});

