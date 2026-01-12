/**
 * Utility functions for Open Rate Card documents
 */

import { OpenRateCard, Card, RateEntry, Field } from './types';

/**
 * Find a rate by prefix using longest match
 * @param card - Rate card to search in
 * @param number - Phone number to match
 * @returns Matching rate entry with index and prefix, or null if not found
 */
export function findRateByPrefix(
  card: Card,
  number: string
): { entry: RateEntry; index: number; prefix: string } | null {
  const fields = card.fields || [];
  const rates = card.rates || [];
  
  // Find the prefix field index
  const prefixIndex = fields.findIndex(f => f.name === 'prefix');
  if (prefixIndex === -1) {
    return null;
  }
  
  // Clean the number
  const cleanNumber = number.replace(/[^0-9]/g, '');
  
  // Find longest matching prefix
  let bestMatch: { entry: RateEntry; index: number; prefix: string } | null = null;
  let longestPrefix = 0;
  
  rates.forEach((entry, index) => {
    const prefix = String(entry[prefixIndex]);
    if (cleanNumber.startsWith(prefix) && prefix.length > longestPrefix) {
      bestMatch = { entry, index, prefix };
      longestPrefix = prefix.length;
    }
  });
  
  return bestMatch;
}

/**
 * Get a rate entry as a named object
 * @param card - Rate card
 * @param entry - Rate entry array
 * @returns Object with field names as keys
 */
export function rateEntryToObject(
  card: Card,
  entry: RateEntry
): Record<string, unknown> {
  const fields = card.fields || [];
  const result: Record<string, unknown> = {};
  
  fields.forEach((field, index) => {
    result[field.name] = entry[index];
  });
  
  return result;
}

/**
 * Convert an object to a rate entry array
 * @param card - Rate card (for field order)
 * @param obj - Object with rate data
 * @returns Rate entry array
 */
export function objectToRateEntry(
  card: Card,
  obj: Record<string, unknown>
): RateEntry {
  const fields = card.fields || [];
  return fields.map(field => {
    const value = obj[field.name];
    if (value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      return value;
    }
    return String(value);
  });
}

/**
 * Get all rates as objects
 * @param card - Rate card
 * @returns Array of rate objects
 */
export function getAllRatesAsObjects(card: Card): Record<string, unknown>[] {
  const rates = card.rates || [];
  return rates.map(entry => rateEntryToObject(card, entry));
}

/**
 * Calculate call cost
 * @param card - Rate card with rate configuration
 * @param rateEntry - Rate entry to use
 * @param durationSeconds - Call duration in seconds
 * @returns Cost calculation result
 */
export function calculateCallCost(
  card: Card,
  rateEntry: RateEntry,
  durationSeconds: number
): {
  rate: number;
  connectionFee: number;
  duration: number;
  billableSeconds: number;
  totalCost: number;
} {
  const fields = card.fields || [];
  const rateConfig = card.rate || {};
  
  // Get field indices
  const rateIndex = fields.findIndex(f => f.name === 'rate');
  const connFeeIndex = fields.findIndex(f => f.name === 'connection_fee');
  const initialIndex = fields.findIndex(f => f.name === 'initial_interval');
  const billingIndex = fields.findIndex(f => f.name === 'billing_interval');
  
  // Get values
  const rate = rateIndex >= 0 ? Number(rateEntry[rateIndex]) || 0 : 0;
  const connectionFee = connFeeIndex >= 0 
    ? Number(rateEntry[connFeeIndex]) || 0 
    : rateConfig.connection || 0;
  const initialInterval = initialIndex >= 0 
    ? Number(rateEntry[initialIndex]) || 60 
    : rateConfig.default_initial || 60;
  const billingInterval = billingIndex >= 0 
    ? Number(rateEntry[billingIndex]) || 60 
    : rateConfig.default_pulse || 60;
  
  // Calculate billable seconds
  let billableSeconds = 0;
  if (durationSeconds > 0) {
    if (durationSeconds <= initialInterval) {
      billableSeconds = initialInterval;
    } else {
      const remaining = durationSeconds - initialInterval;
      const additionalIntervals = Math.ceil(remaining / billingInterval);
      billableSeconds = initialInterval + (additionalIntervals * billingInterval);
    }
  }
  
  // Calculate cost (rate is per minute, so divide by 60)
  const callCost = (billableSeconds / 60) * rate;
  
  // Apply rounding
  const precision = rateConfig.precision ?? 4;
  const factor = Math.pow(10, precision);
  let totalCost = connectionFee + callCost;
  
  const rounding = card.charge?.rounding || rateConfig.rounding || 'up';
  switch (rounding) {
    case 'up':
      totalCost = Math.ceil(totalCost * factor) / factor;
      break;
    case 'down':
      totalCost = Math.floor(totalCost * factor) / factor;
      break;
    case 'nearest':
    case 'half_up':
      totalCost = Math.round(totalCost * factor) / factor;
      break;
    case 'half_down':
      totalCost = Math.round(totalCost * factor - 0.0001) / factor;
      break;
  }
  
  return {
    rate,
    connectionFee,
    duration: durationSeconds,
    billableSeconds,
    totalCost,
  };
}

/**
 * Merge two rate cards (second overrides first for matching prefixes)
 * @param base - Base rate card
 * @param override - Override rate card
 * @returns Merged card (new object)
 */
export function mergeCards(base: Card, override: Card): Card {
  // Ensure fields match
  const baseFields = (base.fields || []).map(f => f.name);
  const overrideFields = (override.fields || []).map(f => f.name);
  
  if (baseFields.join(',') !== overrideFields.join(',')) {
    throw new Error('Cards must have the same field structure to merge');
  }
  
  const prefixIndex = baseFields.indexOf('prefix');
  if (prefixIndex === -1) {
    throw new Error('Cards must have a prefix field to merge');
  }
  
  // Create a map of override rates by prefix
  const overrideMap = new Map<string, RateEntry>();
  (override.rates || []).forEach(entry => {
    overrideMap.set(String(entry[prefixIndex]), entry);
  });
  
  // Merge rates
  const mergedRates: RateEntry[] = [];
  const seenPrefixes = new Set<string>();
  
  // Add all base rates (overriding where needed)
  (base.rates || []).forEach(entry => {
    const prefix = String(entry[prefixIndex]);
    seenPrefixes.add(prefix);
    
    if (overrideMap.has(prefix)) {
      mergedRates.push(overrideMap.get(prefix)!);
    } else {
      mergedRates.push([...entry]);
    }
  });
  
  // Add any new rates from override
  (override.rates || []).forEach(entry => {
    const prefix = String(entry[prefixIndex]);
    if (!seenPrefixes.has(prefix)) {
      mergedRates.push([...entry]);
    }
  });
  
  return {
    ...base,
    ...override,
    rates: mergedRates,
  };
}

/**
 * Filter rates by a predicate
 * @param card - Rate card
 * @param predicate - Filter function
 * @returns New card with filtered rates
 */
export function filterRates(
  card: Card,
  predicate: (entry: RateEntry, obj: Record<string, unknown>, index: number) => boolean
): Card {
  const rates = card.rates || [];
  const filteredRates = rates.filter((entry, index) => {
    const obj = rateEntryToObject(card, entry);
    return predicate(entry, obj, index);
  });
  
  return {
    ...card,
    rates: filteredRates,
  };
}

/**
 * Sort rates by a field
 * @param card - Rate card
 * @param fieldName - Field to sort by
 * @param descending - Sort in descending order
 * @returns New card with sorted rates
 */
export function sortRates(
  card: Card,
  fieldName: string,
  descending = false
): Card {
  const fields = card.fields || [];
  const fieldIndex = fields.findIndex(f => f.name === fieldName);
  
  if (fieldIndex === -1) {
    throw new Error(`Field '${fieldName}' not found`);
  }
  
  const rates = [...(card.rates || [])];
  rates.sort((a, b) => {
    const aVal = a[fieldIndex];
    const bVal = b[fieldIndex];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    let result: number;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      result = aVal - bVal;
    } else {
      result = String(aVal).localeCompare(String(bVal));
    }
    
    return descending ? -result : result;
  });
  
  return {
    ...card,
    rates,
  };
}

/**
 * Get unique values for a field
 * @param card - Rate card
 * @param fieldName - Field name
 * @returns Array of unique values
 */
export function getUniqueFieldValues(card: Card, fieldName: string): unknown[] {
  const fields = card.fields || [];
  const fieldIndex = fields.findIndex(f => f.name === fieldName);
  
  if (fieldIndex === -1) {
    throw new Error(`Field '${fieldName}' not found`);
  }
  
  const rates = card.rates || [];
  const values = new Set<string>();
  const result: unknown[] = [];
  
  rates.forEach(entry => {
    const value = entry[fieldIndex];
    const key = JSON.stringify(value);
    if (!values.has(key)) {
      values.add(key);
      result.push(value);
    }
  });
  
  return result;
}

/**
 * Deep clone a rate card document
 * @param doc - Document to clone
 * @returns Deep cloned document
 */
export function cloneDocument(doc: OpenRateCard): OpenRateCard {
  return JSON.parse(JSON.stringify(doc));
}

/**
 * Get statistics for a rate card
 * @param card - Rate card
 * @returns Statistics object
 */
export function getCardStatistics(card: Card): {
  totalRates: number;
  uniquePrefixes: number;
  rateRange: { min: number; max: number; avg: number } | null;
  currencies: string[];
} {
  const fields = card.fields || [];
  const rates = card.rates || [];
  
  const prefixIndex = fields.findIndex(f => f.name === 'prefix');
  const rateIndex = fields.findIndex(f => f.name === 'rate');
  
  const prefixes = new Set<string>();
  const rateValues: number[] = [];
  
  rates.forEach(entry => {
    if (prefixIndex >= 0) {
      prefixes.add(String(entry[prefixIndex]));
    }
    if (rateIndex >= 0 && typeof entry[rateIndex] === 'number') {
      rateValues.push(entry[rateIndex] as number);
    }
  });
  
  let rateRange = null;
  if (rateValues.length > 0) {
    const sum = rateValues.reduce((a, b) => a + b, 0);
    rateRange = {
      min: Math.min(...rateValues),
      max: Math.max(...rateValues),
      avg: sum / rateValues.length,
    };
  }
  
  return {
    totalRates: rates.length,
    uniquePrefixes: prefixes.size,
    rateRange,
    currencies: [card.currency],
  };
}
