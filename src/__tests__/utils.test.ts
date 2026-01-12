/**
 * Tests for the utility functions
 */

import {
  findRateByPrefix,
  rateEntryToObject,
  objectToRateEntry,
  getAllRatesAsObjects,
  calculateCallCost,
  mergeCards,
  filterRates,
  sortRates,
  getUniqueFieldValues,
  cloneDocument,
  getCardStatistics,
} from '../utils';
import { Card, OpenRateCard } from '../types';

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
    { name: 'initial_interval' },
    { name: 'billing_interval' },
  ],
  rate: {
    precision: 4,
    rounding: 'up',
    default_pulse: 60,
    default_initial: 60,
    connection: 0,
  },
  rates: [
    ['1', 'USA', 0.01, 0, 60, 60],
    ['44', 'UK', 0.02, 0.001, 60, 60],
    ['442', 'UK Mobile', 0.025, 0, 60, 60],
    ['4420', 'UK London', 0.015, 0, 60, 60],
    ['49', 'Germany', 0.018, 0, 30, 6],
  ],
};

describe('Utils Module', () => {
  describe('findRateByPrefix', () => {
    it('should find exact prefix match', () => {
      const result = findRateByPrefix(testCard, '1234567890');
      expect(result?.prefix).toBe('1');
      expect(result?.entry[1]).toBe('USA');
    });

    it('should find longest prefix match', () => {
      const result = findRateByPrefix(testCard, '44207123456');
      expect(result?.prefix).toBe('4420');
      expect(result?.entry[1]).toBe('UK London');
    });

    it('should return null for no match', () => {
      const result = findRateByPrefix(testCard, '999123456');
      expect(result).toBeNull();
    });

    it('should strip non-numeric characters', () => {
      const result = findRateByPrefix(testCard, '+1 (234) 567-890');
      expect(result?.prefix).toBe('1');
    });

    it('should return null for card without prefix field', () => {
      const cardNoPrefix: Card = {
        ...testCard,
        fields: [{ name: 'name' }, { name: 'rate' }],
      };
      const result = findRateByPrefix(cardNoPrefix, '1234');
      expect(result).toBeNull();
    });
  });

  describe('rateEntryToObject', () => {
    it('should convert rate entry to object', () => {
      const entry = testCard.rates![0];
      const obj = rateEntryToObject(testCard, entry);
      
      expect(obj).toEqual({
        prefix: '1',
        name: 'USA',
        rate: 0.01,
        connection_fee: 0,
        initial_interval: 60,
        billing_interval: 60,
      });
    });
  });

  describe('objectToRateEntry', () => {
    it('should convert object to rate entry', () => {
      const obj = {
        prefix: '1',
        name: 'USA',
        rate: 0.01,
        connection_fee: 0,
        initial_interval: 60,
        billing_interval: 60,
      };
      const entry = objectToRateEntry(testCard, obj);
      
      expect(entry).toEqual(['1', 'USA', 0.01, 0, 60, 60]);
    });

    it('should handle missing fields with null', () => {
      const obj = { prefix: '1', name: 'USA' };
      const entry = objectToRateEntry(testCard, obj);
      
      expect(entry[2]).toBeNull();
    });
  });

  describe('getAllRatesAsObjects', () => {
    it('should return all rates as objects', () => {
      const objs = getAllRatesAsObjects(testCard);
      
      expect(objs).toHaveLength(5);
      expect(objs[0].prefix).toBe('1');
      expect(objs[1].prefix).toBe('44');
    });
  });

  describe('calculateCallCost', () => {
    it('should calculate basic call cost', () => {
      const entry = testCard.rates![0]; // USA: 0.01/min
      const result = calculateCallCost(testCard, entry, 120);
      
      expect(result.rate).toBe(0.01);
      expect(result.connectionFee).toBe(0);
      expect(result.billableSeconds).toBe(120);
      expect(result.totalCost).toBe(0.02); // 2 minutes at 0.01/min
    });

    it('should include connection fee', () => {
      const entry = testCard.rates![1]; // UK: 0.02/min + 0.001 connection
      const result = calculateCallCost(testCard, entry, 60);
      
      expect(result.connectionFee).toBe(0.001);
      expect(result.totalCost).toBe(0.021);
    });

    it('should bill minimum initial interval', () => {
      const entry = testCard.rates![0];
      const result = calculateCallCost(testCard, entry, 30);
      
      expect(result.billableSeconds).toBe(60); // Initial interval minimum
    });

    it('should round up billing intervals', () => {
      const entry = testCard.rates![0];
      const result = calculateCallCost(testCard, entry, 90);
      
      expect(result.billableSeconds).toBe(120); // 60 initial + 60 (rounded up from 30)
    });

    it('should handle custom billing intervals', () => {
      const entry = testCard.rates![4]; // Germany: 30/6 billing
      const result = calculateCallCost(testCard, entry, 35);
      
      expect(result.billableSeconds).toBe(36); // 30 initial + 6 (one extra interval)
    });

    it('should return zero for zero duration', () => {
      const entry = testCard.rates![0];
      const result = calculateCallCost(testCard, entry, 0);
      
      expect(result.billableSeconds).toBe(0);
      expect(result.totalCost).toBe(0);
    });
  });

  describe('mergeCards', () => {
    it('should merge two cards', () => {
      const override: Card = {
        ...testCard,
        rates: [
          ['1', 'USA Premium', 0.005, 0, 60, 60], // Override USA
          ['33', 'France', 0.022, 0, 60, 60], // New
        ],
      };

      const merged = mergeCards(testCard, override);
      
      expect(merged.rates).toHaveLength(6); // 5 original + 1 new
      
      // USA should be overridden
      const usa = merged.rates!.find(r => r[0] === '1');
      expect(usa![1]).toBe('USA Premium');
      expect(usa![2]).toBe(0.005);
      
      // France should be added
      const france = merged.rates!.find(r => r[0] === '33');
      expect(france![1]).toBe('France');
    });

    it('should throw for mismatched fields', () => {
      const override: Card = {
        ...testCard,
        fields: [{ name: 'different' }],
      };

      expect(() => mergeCards(testCard, override)).toThrow('same field structure');
    });

    it('should throw if no prefix field', () => {
      const cardNoPrefix: Card = {
        ...testCard,
        fields: [{ name: 'name' }],
      };

      expect(() => mergeCards(cardNoPrefix, cardNoPrefix)).toThrow('prefix field');
    });
  });

  describe('filterRates', () => {
    it('should filter rates by predicate', () => {
      const filtered = filterRates(testCard, (entry, obj) => 
        (obj.rate as number) < 0.02
      );
      
      expect(filtered.rates).toHaveLength(3); // USA, UK London, Germany
    });

    it('should support filtering by object properties', () => {
      const filtered = filterRates(testCard, (entry, obj) =>
        (obj.name as string).includes('UK')
      );
      
      expect(filtered.rates).toHaveLength(3);
    });
  });

  describe('sortRates', () => {
    it('should sort by field ascending', () => {
      const sorted = sortRates(testCard, 'rate');
      
      expect(sorted.rates![0][2]).toBe(0.01); // USA (lowest)
      expect(sorted.rates![sorted.rates!.length - 1][2]).toBe(0.025); // UK Mobile (highest)
    });

    it('should sort by field descending', () => {
      const sorted = sortRates(testCard, 'rate', true);
      
      expect(sorted.rates![0][2]).toBe(0.025);
      expect(sorted.rates![sorted.rates!.length - 1][2]).toBe(0.01);
    });

    it('should sort strings alphabetically', () => {
      const sorted = sortRates(testCard, 'name');
      
      expect(sorted.rates![0][1]).toBe('Germany');
    });

    it('should throw for unknown field', () => {
      expect(() => sortRates(testCard, 'unknown')).toThrow("Field 'unknown' not found");
    });
  });

  describe('getUniqueFieldValues', () => {
    it('should get unique values', () => {
      const cardWithDupes: Card = {
        ...testCard,
        rates: [
          ['1', 'USA', 0.01, 0, 60, 60],
          ['2', 'USA', 0.02, 0, 60, 60],
          ['3', 'UK', 0.03, 0, 60, 60],
        ],
      };

      const unique = getUniqueFieldValues(cardWithDupes, 'name');
      expect(unique).toEqual(['USA', 'UK']);
    });

    it('should throw for unknown field', () => {
      expect(() => getUniqueFieldValues(testCard, 'unknown')).toThrow("Field 'unknown' not found");
    });
  });

  describe('cloneDocument', () => {
    it('should deep clone document', () => {
      const doc: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: testCard },
      };

      const clone = cloneDocument(doc);
      
      // Modify clone
      clone.name = 'Modified';
      clone.cards.default.name = 'Modified Card';
      
      // Original should be unchanged
      expect(doc.name).toBe('Test');
      expect(doc.cards.default.name).toBe('Test Card');
    });
  });

  describe('getCardStatistics', () => {
    it('should calculate card statistics', () => {
      const stats = getCardStatistics(testCard);
      
      expect(stats.totalRates).toBe(5);
      expect(stats.uniquePrefixes).toBe(5);
      expect(stats.rateRange?.min).toBe(0.01);
      expect(stats.rateRange?.max).toBe(0.025);
      // Average of 0.01, 0.02, 0.025, 0.015, 0.018 = 0.088 / 5 = 0.0176
      expect(stats.rateRange?.avg).toBeCloseTo(0.0176, 3);
      expect(stats.currencies).toEqual(['USD']);
    });

    it('should handle card without rates', () => {
      const emptyCard: Card = {
        name: 'Empty',
        type: 'termination',
        currency: 'USD',
        endpoint: 'default',
      };

      const stats = getCardStatistics(emptyCard);
      expect(stats.totalRates).toBe(0);
      expect(stats.rateRange).toBeNull();
    });
  });
});
