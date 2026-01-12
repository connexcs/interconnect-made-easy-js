/**
 * Tests for the validation module
 */

import * as fs from 'fs';
import * as path from 'path';
import { Validator, validate, isValidRateCard, parseRateCard } from '../validator';
import { OpenRateCard } from '../types';

// Load the example.json from the submodule
const examplePath = path.join(__dirname, '../../interconnect-made-easy/example.json');
const exampleJson = fs.readFileSync(examplePath, 'utf8');
const exampleDoc = JSON.parse(exampleJson);

describe('Validator', () => {
  let validator: Validator;

  beforeAll(() => {
    validator = new Validator();
  });

  describe('validateObject', () => {
    it('should validate the example.json from the specification', () => {
      const result = validator.validateObject(exampleDoc);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a minimal valid document', () => {
      const minimalDoc: OpenRateCard = {
        name: 'Test Rate Card',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: {
          default: {
            name: 'Default Card',
            type: 'termination',
            currency: 'USD',
            endpoint: 'default',
          },
        },
      };

      const result = validator.validateObject(minimalDoc);
      expect(result.valid).toBe(true);
    });

    it('should reject a document missing required fields', () => {
      const invalidDoc = {
        name: 'Test',
        // missing schema_version, version, date, cards
      };

      const result = validator.validateObject(invalidDoc);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid schema_version format', () => {
      const invalidDoc = {
        name: 'Test',
        schema_version: 'invalid',
        version: '1.0',
        date: '2026-01-12',
        cards: {
          default: {
            name: 'Default',
            type: 'termination',
            currency: 'USD',
            endpoint: 'default',
          },
        },
      };

      const result = validator.validateObject(invalidDoc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('schema_version'))).toBe(true);
    });

    it('should reject invalid card type', () => {
      const invalidDoc = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: {
          default: {
            name: 'Default',
            type: 'invalid_type',
            currency: 'USD',
            endpoint: 'default',
          },
        },
      };

      const result = validator.validateObject(invalidDoc);
      expect(result.valid).toBe(false);
    });

    it('should reject empty cards object', () => {
      const invalidDoc = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: {},
      };

      const result = validator.validateObject(invalidDoc);
      expect(result.valid).toBe(false);
    });

    it('should validate document with optional fields', () => {
      const fullDoc: OpenRateCard = {
        name: 'Full Rate Card',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        description: 'A full test document',
        author: 'Test Author',
        website: 'https://example.com',
        email: 'test@example.com',
        phone: '+1234567890',
        cards: {
          default: {
            name: 'Default',
            type: 'termination',
            currency: 'USD',
            endpoint: 'default',
          },
        },
        legal: {
          jurisdiction: 'US',
          dispute_resolution: 'arbitration',
        },
      };

      const result = validator.validateObject(fullDoc);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateString', () => {
    it('should validate a valid JSON string', () => {
      const result = validator.validateString(exampleJson);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = validator.validateString('not valid json');
      expect(result.valid).toBe(false);
      expect(result.errors[0].keyword).toBe('parse');
    });

    it('should reject valid JSON that fails schema validation', () => {
      const result = validator.validateString('{"name": "test"}');
      expect(result.valid).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true for valid documents', () => {
      expect(validator.isValid(exampleDoc)).toBe(true);
    });

    it('should return false for invalid documents', () => {
      expect(validator.isValid({})).toBe(false);
    });
  });

  describe('validateAndParse', () => {
    it('should return typed document for valid input', () => {
      const doc = validator.validateAndParse(exampleDoc);
      expect(doc.name).toBe('ABC Telecom Rate Card');
      expect(doc.cards.default).toBeDefined();
    });

    it('should parse JSON string and return typed document', () => {
      const doc = validator.validateAndParse(exampleJson);
      expect(doc.name).toBe('ABC Telecom Rate Card');
    });

    it('should throw for invalid document', () => {
      expect(() => validator.validateAndParse({})).toThrow('Validation failed');
    });
  });

  describe('getSchema', () => {
    it('should return the schema object', () => {
      const schema = validator.getSchema();
      expect(schema).toBeDefined();
      expect((schema as any).$schema).toContain('json-schema.org');
    });
  });
});

describe('Module exports', () => {
  describe('validate', () => {
    it('should validate objects', () => {
      const result = validate(exampleDoc);
      expect(result.valid).toBe(true);
    });

    it('should validate strings', () => {
      const result = validate(exampleJson);
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidRateCard', () => {
    it('should return true for valid documents', () => {
      expect(isValidRateCard(exampleDoc)).toBe(true);
    });

    it('should return false for invalid documents', () => {
      expect(isValidRateCard(null)).toBe(false);
      expect(isValidRateCard(undefined)).toBe(false);
      expect(isValidRateCard({})).toBe(false);
    });
  });

  describe('parseRateCard', () => {
    it('should parse and validate', () => {
      const doc = parseRateCard(exampleJson);
      expect(doc.name).toBe('ABC Telecom Rate Card');
    });
  });
});
