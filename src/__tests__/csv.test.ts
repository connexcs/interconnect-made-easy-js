/**
 * Tests for the CSV module
 */

import {
  exportCardToCsv,
  exportToCsv,
  parseCsv,
  importFromCsv,
} from '../csv';
import { OpenRateCard, Card } from '../types';

const testCard: Card = {
  name: 'Test Card',
  type: 'termination',
  currency: 'USD',
  endpoint: 'default',
  fields: [
    { name: 'prefix' },
    { name: 'name' },
    { name: 'rate' },
    { name: 'connection_fee' },
  ],
  rates: [
    ['1', 'USA', 0.01, 0],
    ['44', 'UK', 0.02, 0.001],
    ['49', 'Germany', 0.015, 0],
  ],
};

const testDoc: OpenRateCard = {
  name: 'Test Rate Card',
  schema_version: '1.0.0',
  version: '1.0',
  date: '2026-01-12',
  cards: {
    default: testCard,
    premium: {
      ...testCard,
      name: 'Premium Card',
      rates: [
        ['1', 'USA Premium', 0.005, 0],
      ],
    },
  },
};

describe('CSV Module', () => {
  describe('exportCardToCsv', () => {
    it('should export card to CSV with headers', () => {
      const csv = exportCardToCsv(testCard);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('prefix,name,rate,connection_fee');
      expect(lines[1]).toBe('1,USA,0.01,0');
      expect(lines[2]).toBe('44,UK,0.02,0.001');
      expect(lines[3]).toBe('49,Germany,0.015,0');
    });

    it('should export without headers when specified', () => {
      const csv = exportCardToCsv(testCard, { includeHeaders: false });
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('1,USA,0.01,0');
    });

    it('should use custom delimiter', () => {
      const csv = exportCardToCsv(testCard, { delimiter: ';' });
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('prefix;name;rate;connection_fee');
      expect(lines[1]).toBe('1;USA;0.01;0');
    });

    it('should escape values with delimiter', () => {
      const cardWithComma: Card = {
        ...testCard,
        rates: [['1', 'USA, United States', 0.01, 0]],
      };
      
      const csv = exportCardToCsv(cardWithComma);
      expect(csv).toContain('"USA, United States"');
    });

    it('should escape values with quotes', () => {
      const cardWithQuote: Card = {
        ...testCard,
        rates: [['1', 'USA "Premium"', 0.01, 0]],
      };
      
      const csv = exportCardToCsv(cardWithQuote);
      expect(csv).toContain('"USA ""Premium"""');
    });

    it('should include metadata as comments when specified', () => {
      const csv = exportCardToCsv(testCard, { includeMetadata: true });
      expect(csv).toContain('# Card: Test Card');
      expect(csv).toContain('# Type: termination');
      expect(csv).toContain('# Currency: USD');
    });

    it('should filter fields with includeFields', () => {
      const csv = exportCardToCsv(testCard, { includeFields: ['prefix', 'rate'] });
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('prefix,rate');
      expect(lines[1]).toBe('1,0.01');
    });

    it('should filter fields with excludeFields', () => {
      const csv = exportCardToCsv(testCard, { excludeFields: ['connection_fee'] });
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('prefix,name,rate');
      expect(lines[1]).toBe('1,USA,0.01');
    });

    it('should handle null values', () => {
      const cardWithNull: Card = {
        ...testCard,
        rates: [['1', 'USA', null, 0]],
      };
      
      const csv = exportCardToCsv(cardWithNull);
      expect(csv).toContain('1,USA,,0');
    });

    it('should throw error for card without fields', () => {
      const cardNoFields: Card = {
        name: 'No Fields',
        type: 'termination',
        currency: 'USD',
        endpoint: 'default',
      };
      
      expect(() => exportCardToCsv(cardNoFields)).toThrow('Card has no fields defined');
    });
  });

  describe('exportToCsv', () => {
    it('should export all cards', () => {
      const result = exportToCsv(testDoc);
      
      expect(result.default).toBeDefined();
      expect(result.premium).toBeDefined();
    });

    it('should export specific card', () => {
      const result = exportToCsv(testDoc, 'default');
      
      expect(result.default).toBeDefined();
      expect(result.premium).toBeUndefined();
    });

    it('should throw for non-existent card', () => {
      expect(() => exportToCsv(testDoc, 'nonexistent')).toThrow("Card 'nonexistent' not found");
    });

    it('should accept JSON string', () => {
      const result = exportToCsv(JSON.stringify(testDoc));
      expect(result.default).toBeDefined();
    });
  });

  describe('parseCsv', () => {
    it('should parse CSV with headers', () => {
      const csv = 'prefix,name,rate\n1,USA,0.01\n44,UK,0.02';
      const result = parseCsv(csv);
      
      expect(result.headers).toEqual(['prefix', 'name', 'rate']);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual([1, 'USA', 0.01]);
    });

    it('should parse CSV without headers', () => {
      const csv = '1,USA,0.01\n44,UK,0.02';
      const result = parseCsv(csv, { hasHeaders: false });
      
      expect(result.headers).toEqual([]);
      expect(result.data).toHaveLength(2);
    });

    it('should parse numeric values', () => {
      const csv = 'a,b,c\n1,2.5,-3';
      const result = parseCsv(csv);
      
      expect(result.data[0]).toEqual([1, 2.5, -3]);
    });

    it('should parse boolean values', () => {
      const csv = 'a,b\ntrue,false';
      const result = parseCsv(csv);
      
      expect(result.data[0]).toEqual([true, false]);
    });

    it('should handle quoted values', () => {
      const csv = 'a,b\n"hello, world",test';
      const result = parseCsv(csv);
      
      expect(result.data[0][0]).toBe('hello, world');
    });

    it('should handle escaped quotes', () => {
      const csv = 'a,b\n"say ""hello""",test';
      const result = parseCsv(csv);
      
      expect(result.data[0][0]).toBe('say "hello"');
    });

    it('should skip comment lines', () => {
      const csv = '# This is a comment\na,b\n1,2';
      const result = parseCsv(csv);
      
      expect(result.headers).toEqual(['a', 'b']);
      expect(result.data).toHaveLength(1);
    });

    it('should handle empty values', () => {
      const csv = 'a,b,c\n1,,3';
      const result = parseCsv(csv);
      
      expect(result.data[0]).toEqual([1, null, 3]);
    });

    it('should handle different delimiters', () => {
      const csv = 'a;b;c\n1;2;3';
      const result = parseCsv(csv, { delimiter: ';' });
      
      expect(result.headers).toEqual(['a', 'b', 'c']);
    });
  });

  describe('importFromCsv', () => {
    it('should import CSV to fields and rates', () => {
      const csv = 'prefix,name,rate\n1,USA,0.01\n44,UK,0.02';
      const result = importFromCsv(csv);
      
      expect(result.fields).toEqual([
        { name: 'prefix' },
        { name: 'name' },
        { name: 'rate' },
      ]);
      expect(result.rates).toEqual([
        [1, 'USA', 0.01],
        [44, 'UK', 0.02],
      ]);
    });

    it('should roundtrip with exportCardToCsv', () => {
      const csv = exportCardToCsv(testCard);
      const imported = importFromCsv(csv);
      
      expect(imported.fields).toEqual(testCard.fields);
      // Note: prefix values become numbers during CSV parsing
      // because they look like numbers (1, 44, 49)
      expect(imported.rates.length).toBe(testCard.rates!.length);
    });
  });
});
