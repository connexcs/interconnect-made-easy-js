/**
 * Validation module for Open Rate Card documents
 * Validates JSON against the Open Rate Card schema using Ajv
 */

import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { OpenRateCard, ValidationResult, ValidationError } from './types';

// Import the schema - will be bundled or loaded from the submodule
import schema from '../interconnect-made-easy/schema/open-rate-card.schema.json';

/**
 * Validator class for Open Rate Card documents
 */
export class Validator {
  private ajv: Ajv;
  private validate: ReturnType<Ajv['compile']>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    
    // Add format validators (uri, email, date, etc.)
    addFormats(this.ajv);
    
    // Compile the schema
    this.validate = this.ajv.compile(schema);
  }

  /**
   * Validate a JSON string against the Open Rate Card schema
   * @param json - JSON string to validate
   * @returns Validation result with errors if invalid
   */
  validateString(json: string): ValidationResult {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch (e) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Invalid JSON: ${(e as Error).message}`,
          keyword: 'parse'
        }]
      };
    }
    return this.validateObject(data);
  }

  /**
   * Validate a JavaScript object against the Open Rate Card schema
   * @param data - Object to validate
   * @returns Validation result with errors if invalid
   */
  validateObject(data: unknown): ValidationResult {
    const valid = this.validate(data);
    
    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors: ValidationError[] = (this.validate.errors || []).map(
      (error: ErrorObject) => this.formatError(error)
    );

    return { valid: false, errors };
  }

  /**
   * Validate and return the typed document if valid
   * @param data - Object or JSON string to validate
   * @returns Typed OpenRateCard if valid, throws if invalid
   */
  validateAndParse(data: unknown | string): OpenRateCard {
    const result = typeof data === 'string'
      ? this.validateString(data)
      : this.validateObject(data);

    if (!result.valid) {
      const errorMessages = result.errors.map(e => `${e.path}: ${e.message}`).join('\n');
      throw new Error(`Validation failed:\n${errorMessages}`);
    }

    return (typeof data === 'string' ? JSON.parse(data) : data) as OpenRateCard;
  }

  /**
   * Check if data is a valid Open Rate Card
   * @param data - Data to check
   * @returns Type guard boolean
   */
  isValid(data: unknown): data is OpenRateCard {
    return this.validateObject(data).valid;
  }

  /**
   * Format an Ajv error into a ValidationError
   */
  private formatError(error: ErrorObject): ValidationError {
    const path = error.instancePath || '/';
    let message = error.message || 'Unknown error';
    
    // Enhance error messages
    if (error.keyword === 'required') {
      const missingProperty = (error.params as { missingProperty?: string }).missingProperty;
      message = `Missing required property: ${missingProperty}`;
    } else if (error.keyword === 'enum') {
      const allowedValues = (error.params as { allowedValues?: unknown[] }).allowedValues;
      message = `Value must be one of: ${allowedValues?.join(', ')}`;
    } else if (error.keyword === 'pattern') {
      message = `Value does not match required pattern`;
    } else if (error.keyword === 'format') {
      const format = (error.params as { format?: string }).format;
      message = `Invalid format, expected: ${format}`;
    } else if (error.keyword === 'type') {
      const type = (error.params as { type?: string }).type;
      message = `Invalid type, expected: ${type}`;
    } else if (error.keyword === 'minimum' || error.keyword === 'maximum') {
      const limit = (error.params as { limit?: number }).limit;
      message = `Value must be ${error.keyword === 'minimum' ? 'at least' : 'at most'} ${limit}`;
    } else if (error.keyword === 'minProperties') {
      message = `Object must have at least one property`;
    }

    return {
      path,
      message,
      keyword: error.keyword,
      expected: error.schema,
      actual: error.data
    };
  }

  /**
   * Get the schema being used for validation
   */
  getSchema(): object {
    return schema;
  }
}

// Default validator instance
let defaultValidator: Validator | null = null;

/**
 * Get the default validator instance (lazy initialization)
 */
export function getValidator(): Validator {
  if (!defaultValidator) {
    defaultValidator = new Validator();
  }
  return defaultValidator;
}

/**
 * Validate a JSON string or object
 * @param data - JSON string or object to validate
 * @returns Validation result
 */
export function validate(data: unknown | string): ValidationResult {
  const validator = getValidator();
  return typeof data === 'string'
    ? validator.validateString(data)
    : validator.validateObject(data);
}

/**
 * Check if data is a valid Open Rate Card
 * @param data - Data to check
 * @returns boolean
 */
export function isValidRateCard(data: unknown): data is OpenRateCard {
  return getValidator().isValid(data);
}

/**
 * Parse and validate JSON, returning typed document
 * @param data - JSON string or object
 * @returns Typed OpenRateCard
 * @throws Error if validation fails
 */
export function parseRateCard(data: unknown | string): OpenRateCard {
  return getValidator().validateAndParse(data);
}
