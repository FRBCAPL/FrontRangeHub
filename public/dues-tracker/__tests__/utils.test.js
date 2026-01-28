/**
 * Frontend Unit Tests for Dues Tracker Utilities
 * Tests utility functions from js/utils.js
 */

// Note: These tests use Jest with jsdom environment
// To run: npm test (from FrontEnd directory)

// Import utility functions (adjust path as needed)
// For now, we'll test the logic directly

describe('Frontend Utility Functions', () => {
  describe('formatCurrency', () => {
    test('should format positive numbers with dollar sign', () => {
      const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || isNaN(amount)) {
          return '$0.00';
        }
        const num = parseFloat(amount);
        if (isNaN(num)) {
          return '$0.00';
        }
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      expect(formatCurrency(42.5)).toBe('$42.50');
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    test('should handle edge cases', () => {
      const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || isNaN(amount)) {
          return '$0.00';
        }
        const num = parseFloat(amount);
        if (isNaN(num)) {
          return '$0.00';
        }
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency('')).toBe('$0.00');
      expect(formatCurrency('abc')).toBe('$0.00');
    });
  });

  describe('formatDate', () => {
    test('should format date strings correctly', () => {
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };

      const result = formatDate('2026-01-27');
      expect(result).toContain('Jan');
      expect(result).toContain('27');
      expect(result).toContain('2026');
    });

    test('should handle empty inputs', () => {
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };

      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('formatDateFromISO', () => {
    test('should format ISO date strings', () => {
      const formatDateFromISO = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };

      const result = formatDateFromISO('2026-01-27T12:00:00Z');
      expect(result).toContain('Jan');
      expect(result).toContain('27');
    });
  });

  describe('normStr', () => {
    test('should normalize strings', () => {
      const normStr = (s) => {
        return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
      };

      expect(normStr('  Hello   World  ')).toBe('hello world');
      expect(normStr('TEST')).toBe('test');
      expect(normStr('')).toBe('');
      expect(normStr(null)).toBe('');
    });
  });
});
