/**
 * CSV Export module for Open Rate Card documents
 * Exports rate card data to CSV format
 */

import { OpenRateCard, Card, Field, RateEntry } from './types';

/** CSV export options */
export interface CsvExportOptions {
  /** Delimiter character (default: ',') */
  delimiter?: string;
  /** Quote character for strings (default: '"') */
  quote?: string;
  /** Include headers row (default: true) */
  includeHeaders?: boolean;
  /** Line ending (default: '\n') */
  lineEnding?: string;
  /** Include card metadata as header comments (default: false) */
  includeMetadata?: boolean;
  /** Fields to include (default: all) */
  includeFields?: string[];
  /** Fields to exclude */
  excludeFields?: string[];
}

const DEFAULT_OPTIONS: Required<CsvExportOptions> = {
  delimiter: ',',
  quote: '"',
  includeHeaders: true,
  lineEnding: '\n',
  includeMetadata: false,
  includeFields: [],
  excludeFields: [],
};

/**
 * Escape a value for CSV
 */
function escapeValue(value: unknown, options: Required<CsvExportOptions>): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  const needsQuoting = 
    str.includes(options.delimiter) ||
    str.includes(options.quote) ||
    str.includes('\n') ||
    str.includes('\r');
  
  if (needsQuoting) {
    const escaped = str.replace(new RegExp(options.quote, 'g'), options.quote + options.quote);
    return options.quote + escaped + options.quote;
  }
  
  return str;
}

/**
 * Export a single rate card to CSV
 * @param card - Rate card to export
 * @param options - Export options
 * @returns CSV string
 */
export function exportCardToCsv(card: Card, options: CsvExportOptions = {}): string {
  const opts: Required<CsvExportOptions> = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];
  
  // Get fields and rates
  const fields = card.fields || [];
  const rates = card.rates || [];
  
  if (fields.length === 0) {
    throw new Error('Card has no fields defined');
  }
  
  // Filter fields if specified
  let fieldIndices: number[] = [];
  let headers: string[] = [];
  
  fields.forEach((field, index) => {
    const include = 
      (opts.includeFields.length === 0 || opts.includeFields.includes(field.name)) &&
      !opts.excludeFields.includes(field.name);
    
    if (include) {
      fieldIndices.push(index);
      headers.push(field.name);
    }
  });
  
  // Add metadata as comments if requested
  if (opts.includeMetadata) {
    lines.push(`# Card: ${card.name}`);
    lines.push(`# Type: ${card.type}`);
    lines.push(`# Currency: ${card.currency}`);
    if (card.description) {
      lines.push(`# Description: ${card.description}`);
    }
    lines.push('');
  }
  
  // Add headers
  if (opts.includeHeaders) {
    lines.push(headers.map(h => escapeValue(h, opts)).join(opts.delimiter));
  }
  
  // Add data rows
  for (const rate of rates) {
    const row = fieldIndices.map(index => escapeValue(rate[index], opts));
    lines.push(row.join(opts.delimiter));
  }
  
  return lines.join(opts.lineEnding);
}

/**
 * Export all rate cards from a document to CSV
 * @param doc - Open Rate Card document
 * @param cardName - Optional specific card name to export
 * @param options - Export options
 * @returns Object with card names as keys and CSV strings as values
 */
export function exportToCsv(
  doc: OpenRateCard | string,
  cardName?: string,
  options: CsvExportOptions = {}
): Record<string, string> {
  const document: OpenRateCard = typeof doc === 'string' ? JSON.parse(doc) : doc;
  const result: Record<string, string> = {};
  
  const cardsToExport = cardName
    ? { [cardName]: document.cards[cardName] }
    : document.cards;
  
  for (const [name, card] of Object.entries(cardsToExport)) {
    if (!card) {
      throw new Error(`Card '${name}' not found`);
    }
    result[name] = exportCardToCsv(card, options);
  }
  
  return result;
}

/**
 * Export a rate card to a CSV file (Node.js only)
 * @param doc - Open Rate Card document
 * @param cardName - Card name to export
 * @param filePath - Output file path
 * @param options - Export options
 */
export async function exportToCsvFile(
  doc: OpenRateCard | string,
  cardName: string,
  filePath: string,
  options: CsvExportOptions = {}
): Promise<void> {
  const csv = exportToCsv(doc, cardName, options)[cardName];
  
  // Dynamic import for Node.js fs module
  const fs = await import('fs').then(m => m.promises);
  await fs.writeFile(filePath, csv, 'utf8');
}

/**
 * Parse CSV back to rate entries
 * @param csv - CSV string
 * @param options - Parse options
 * @returns Object with headers and data
 */
export function parseCsv(
  csv: string,
  options: { delimiter?: string; hasHeaders?: boolean } = {}
): { headers: string[]; data: RateEntry[] } {
  const delimiter = options.delimiter || ',';
  const hasHeaders = options.hasHeaders !== false;
  
  const lines = csv.split(/\r?\n/).filter(line => 
    line.trim() && !line.startsWith('#')
  );
  
  if (lines.length === 0) {
    return { headers: [], data: [] };
  }
  
  // Simple CSV parser (handles basic cases)
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    return values;
  };
  
  // Parse all lines
  const parsed = lines.map(parseLine);
  
  // Extract headers and data
  const headers = hasHeaders ? parsed[0] : [];
  const dataLines = hasHeaders ? parsed.slice(1) : parsed;
  
  // Convert data to appropriate types
  const data: RateEntry[] = dataLines.map(row =>
    row.map(value => {
      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num) && value !== '') {
        return num;
      }
      // Check for boolean
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      // Check for null
      if (value === '' || value.toLowerCase() === 'null') return null;
      // Return as string
      return value;
    })
  );
  
  return { headers, data };
}

/**
 * Import CSV data into rate card fields and rates
 * @param csv - CSV string
 * @param options - Import options
 * @returns Object with fields and rates arrays
 */
export function importFromCsv(
  csv: string,
  options: { delimiter?: string } = {}
): { fields: Field[]; rates: RateEntry[] } {
  const { headers, data } = parseCsv(csv, { delimiter: options.delimiter, hasHeaders: true });
  
  const fields: Field[] = headers.map(name => ({ name }));
  
  return { fields, rates: data };
}
