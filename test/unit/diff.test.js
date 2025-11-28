/**
 * Unit tests for diff detection functionality
 */

import { describe, it, expect } from './test-framework.js';
import { extractText, countChanges, highlightChanges } from '../../src/lib/diff.js';

describe('Diff Detection', () => {
  describe('extractText', () => {
    it('should extract text from simple HTML', () => {
      const html = '<p>Hello world</p>';
      expect(extractText(html)).toBe('Hello world');
    });

    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("test");</script><p>World</p>';
      expect(extractText(html)).toBe('Hello World');
    });

    it('should remove style tags', () => {
      const html = '<style>body { color: red; }</style><p>Content</p>';
      expect(extractText(html)).toBe('Content');
    });

    it('should handle nested tags', () => {
      const html = '<div><p>Hello <strong>world</strong></p></div>';
      expect(extractText(html)).toBe('Hello world');
    });

    it('should normalize whitespace', () => {
      const html = '<p>Hello    world\n\n  test</p>';
      expect(extractText(html)).toBe('Hello world test');
    });

    it('should decode HTML entities', () => {
      const html = '<p>Hello&nbsp;world&amp;test</p>';
      expect(extractText(html)).toContain('Hello world&test');
    });
  });

  describe('countChanges - Single Character Changes', () => {
    it('should detect single character addition', () => {
      const oldText = 'Hello world';
      const newText = 'Hello worlds';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect single character removal', () => {
      const oldText = 'Hello world';
      const newText = 'Hello worl';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect single character modification', () => {
      const oldText = 'Hello world';
      const newText = 'Hello worlx';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect single character at start', () => {
      const oldText = 'Hello';
      const newText = 'Xello';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect single character at end', () => {
      const oldText = 'Hello';
      const newText = 'Hellox';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect single character in middle', () => {
      const oldText = 'Hello';
      const newText = 'Helxo';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect single space change', () => {
      const oldText = 'Hello world';
      const newText = 'Hello  world'; // double space
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should return 0 for identical texts', () => {
      const text = 'Hello world';
      expect(countChanges(text, text)).toBe(0);
    });
  });

  describe('countChanges - Word Level Changes', () => {
    it('should detect word addition', () => {
      const oldText = 'Hello world';
      const newText = 'Hello world test';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect word removal', () => {
      const oldText = 'Hello world test';
      const newText = 'Hello world';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should detect word replacement', () => {
      const oldText = 'Hello world';
      const newText = 'Hello there';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should count multiple word changes', () => {
      const oldText = 'The quick brown fox';
      const newText = 'The fast red dog';
      const changes = countChanges(oldText, newText);
      expect(changes).toBeGreaterThan(2);
    });
  });

  describe('countChanges - Edge Cases', () => {
    it('should handle empty old text', () => {
      expect(countChanges('', 'Hello')).toBeGreaterThan(0);
    });

    it('should handle empty new text', () => {
      expect(countChanges('Hello', '')).toBeGreaterThan(0);
    });

    it('should handle both empty', () => {
      expect(countChanges('', '')).toBe(0);
    });

    it('should handle very long texts', () => {
      const longText = 'a'.repeat(2000);
      const changedText = longText + 'b';
      expect(countChanges(longText, changedText)).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const oldText = 'Hello 世界';
      const newText = 'Hello 世界!';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const oldText = 'Hello @#$%';
      const newText = 'Hello @#$%^';
      expect(countChanges(oldText, newText)).toBeGreaterThan(0);
    });
  });

  describe('highlightChanges', () => {
    it('should highlight added content', () => {
      const oldHtml = '<p>Hello</p>';
      const newHtml = '<p>Hello world</p>';
      const result = highlightChanges(oldHtml, newHtml, '#ffff66');
      expect(result).toContain('world');
      expect(result).toContain('background-color: #ffff66');
    });

    it('should handle empty old HTML', () => {
      const newHtml = '<p>Hello</p>';
      const result = highlightChanges('', newHtml, '#ffff66');
      expect(result).toBe(newHtml);
    });

    it('should return unchanged HTML when identical', () => {
      const html = '<p>Hello</p>';
      expect(highlightChanges(html, html, '#ffff66')).toBe(html);
    });

    it('should preserve HTML structure', () => {
      const oldHtml = '<div><p>Hello</p></div>';
      const newHtml = '<div><p>Hello world</p></div>';
      const result = highlightChanges(oldHtml, newHtml, '#ffff66');
      expect(result).toContain('<div>');
      expect(result).toContain('<p>');
    });
  });
});
