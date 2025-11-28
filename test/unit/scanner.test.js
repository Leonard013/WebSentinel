/**
 * Unit tests for scanner functionality
 */

import { describe, it, expect, beforeEach, afterEach } from './test-framework.js';
import { scanPage } from '../../src/lib/scanner.js';
import { Page, PageState } from '../../src/lib/page.js';
import { PageHtml } from '../../src/lib/page.js';

// Mock storage
const mockStorage = new Map();
const mockHtmlStorage = new Map();

// Mock the storage modules
jest.mock('../../src/lib/page.js', () => {
  const actual = jest.requireActual('../../src/lib/page.js');
  return {
    ...actual,
    PageHtml: {
      loadNew: async (id) => mockHtmlStorage.get(`html:${id}:new`),
      loadOld: async (id) => mockHtmlStorage.get(`html:${id}:old`),
      saveNew: async (id, html) => { mockHtmlStorage.set(`html:${id}:new`, html); },
      saveOld: async (id, html) => { mockHtmlStorage.set(`html:${id}:old`, html); }
    }
  };
});

describe('Scanner', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockHtmlStorage.clear();
  });

  describe('scanPage - Single Character Detection', () => {
    it('should detect single character change with threshold 1', async () => {
      const page = new Page('test-1', {
        title: 'Test Page',
        url: 'https://example.com',
        changeThreshold: 1
      });

      // Mock fetch
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '<html><body><p>Hello world</p></body></html>'
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '<html><body><p>Hello worldx</p></body></html>'
        });

      // First scan - no previous HTML
      await scanPage(page);
      expect(page.state).toBe(PageState.NO_CHANGE);

      // Second scan - single character added
      const changed = await scanPage(page);
      expect(changed).toBe(true);
      expect(page.state).toBe(PageState.CHANGED);
    });

    it('should detect single character removal with threshold 1', async () => {
      const page = new Page('test-2', {
        title: 'Test Page',
        url: 'https://example.com',
        changeThreshold: 1
      });

      // Set initial HTML
      await PageHtml.saveNew(page.id, '<html><body><p>Hello world</p></body></html>');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><p>Hello worl</p></body></html>'
      });

      const changed = await scanPage(page);
      expect(changed).toBe(true);
    });

    it('should detect single character modification with threshold 1', async () => {
      const page = new Page('test-3', {
        title: 'Test Page',
        url: 'https://example.com',
        changeThreshold: 1
      });

      await PageHtml.saveNew(page.id, '<html><body><p>Hello world</p></body></html>');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><p>Hello worlx</p></body></html>'
      });

      const changed = await scanPage(page);
      expect(changed).toBe(true);
    });
  });

  describe('scanPage - Threshold Detection', () => {
    it('should not detect change below threshold', async () => {
      const page = new Page('test-4', {
        title: 'Test Page',
        url: 'https://example.com',
        changeThreshold: 100
      });

      await PageHtml.saveNew(page.id, '<html><body><p>Hello world</p></body></html>');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><p>Hello worldx</p></body></html>'
      });

      const changed = await scanPage(page);
      expect(changed).toBe(false);
      expect(page.state).toBe(PageState.NO_CHANGE);
    });

    it('should detect change above threshold', async () => {
      const page = new Page('test-5', {
        title: 'Test Page',
        url: 'https://example.com',
        changeThreshold: 10
      });

      await PageHtml.saveNew(page.id, '<html><body><p>Hello world</p></body></html>');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body><p>Hello world this is a much longer text with many changes</p></body></html>'
      });

      const changed = await scanPage(page);
      expect(changed).toBe(true);
    });
  });

  describe('scanPage - Error Handling', () => {
    it('should handle network errors', async () => {
      const page = new Page('test-6', {
        title: 'Test Page',
        url: 'https://example.com'
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const changed = await scanPage(page);
      expect(changed).toBe(false);
      expect(page.state).toBe(PageState.ERROR);
      expect(page.errorMessage).toBe('Network error');
    });

    it('should handle HTTP errors', async () => {
      const page = new Page('test-7', {
        title: 'Test Page',
        url: 'https://example.com'
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const changed = await scanPage(page);
      expect(changed).toBe(false);
      expect(page.state).toBe(PageState.ERROR);
    });

    it('should handle timeout', async () => {
      const page = new Page('test-8', {
        title: 'Test Page',
        url: 'https://example.com'
      });

      global.fetch = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        });
      });

      const changed = await scanPage(page);
      expect(changed).toBe(false);
      expect(page.state).toBe(PageState.ERROR);
    });
  });
});
