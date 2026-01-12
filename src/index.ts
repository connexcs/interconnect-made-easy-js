/**
 * Open Rate Card - JavaScript/TypeScript Implementation
 * 
 * A comprehensive library for working with Open Rate Card documents
 * as defined by the interconnect-made-easy specification.
 * 
 * @see https://github.com/connexcs/interconnect-made-easy
 * @packageDocumentation
 */

// Export all types
export * from './types';

// Export validation functions
export {
  Validator,
  getValidator,
  validate,
  isValidRateCard,
  parseRateCard,
} from './validator';

// Export checksum functions
export {
  createCanonicalJson,
  calculateChecksum,
  addChecksum,
  verifyChecksum,
  removeChecksum,
} from './checksum';

// Export signing functions
export {
  SigningAlgorithm,
  KeyPair,
  PemKeyPair,
  SignatureInfo,
  SimpleCertificate,
  generateKeyPair,
  generatePemKeyPair,
  signDocument,
  verifySignature,
  removeSignature,
  generateCertificate,
} from './signing';

// Export CSV functions
export {
  CsvExportOptions,
  exportCardToCsv,
  exportToCsv,
  exportToCsvFile,
  parseCsv,
  importFromCsv,
} from './csv';

// Export builder classes and functions
export {
  OpenRateCardBuilder,
  CardBuilder,
  EndpointBuilder,
  LegalBuilder,
  CustomerBuilder,
  RateConfigBuilder,
  PerformanceBuilder,
  createRateCard,
  createCard,
  createEndpoint,
  createRateConfig,
  createPerformance,
} from './builder';

// Export utility functions
export {
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
} from './utils';

// Default export with namespace
import * as validation from './validator';
import * as checksum from './checksum';
import * as signing from './signing';
import * as csv from './csv';
import * as builder from './builder';
import * as utils from './utils';

export default {
  validation,
  checksum,
  signing,
  csv,
  builder,
  utils,
};
