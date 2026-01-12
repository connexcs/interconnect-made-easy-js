/**
 * Tests for the checksum module
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  createCanonicalJson,
  calculateChecksum,
  addChecksum,
  verifyChecksum,
  removeChecksum,
} from '../checksum';
import { OpenRateCard } from '../types';

// Load the example.json from the submodule
const examplePath = path.join(__dirname, '../../interconnect-made-easy/example.json');
const exampleJson = fs.readFileSync(examplePath, 'utf8');
const exampleDoc: OpenRateCard = JSON.parse(exampleJson);

describe('Checksum Module', () => {
  describe('createCanonicalJson', () => {
    it('should create deterministic JSON', () => {
      const doc1: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
      };

      const doc2: OpenRateCard = {
        version: '1.0',
        name: 'Test',
        date: '2026-01-12',
        schema_version: '1.0.0',
        cards: { default: { currency: 'USD', name: 'Default', type: 'termination', endpoint: 'default' } },
      };

      expect(createCanonicalJson(doc1)).toBe(createCanonicalJson(doc2));
    });

    it('should exclude checksum and signature from canonical form', () => {
      const doc: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
        metadata: {
          checksum: 'abc123',
          signature: 'xyz789',
          notes: 'Test notes',
        },
      };

      const canonical = createCanonicalJson(doc);
      expect(canonical).not.toContain('checksum');
      expect(canonical).not.toContain('signature');
      expect(canonical).toContain('notes');
    });

    it('should remove empty metadata if only checksum/signature were present', () => {
      const doc: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
        metadata: {
          checksum: 'abc123',
          signature: 'xyz789',
        },
      };

      const canonical = createCanonicalJson(doc);
      expect(canonical).not.toContain('metadata');
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate SHA-256 checksum', async () => {
      const checksum = await calculateChecksum(exampleDoc);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be consistent for same document', async () => {
      const checksum1 = await calculateChecksum(exampleDoc);
      const checksum2 = await calculateChecksum(exampleDoc);
      expect(checksum1).toBe(checksum2);
    });

    it('should differ for different documents', async () => {
      const doc1: OpenRateCard = {
        name: 'Test1',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
      };

      const doc2: OpenRateCard = {
        name: 'Test2',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
      };

      const checksum1 = await calculateChecksum(doc1);
      const checksum2 = await calculateChecksum(doc2);
      expect(checksum1).not.toBe(checksum2);
    });

    it('should accept JSON string input', async () => {
      const checksum = await calculateChecksum(exampleJson);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('addChecksum', () => {
    it('should add checksum to document', async () => {
      const doc: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
      };

      const result = await addChecksum(doc);
      expect(result.metadata?.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should not modify the original document', async () => {
      const doc: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
      };

      await addChecksum(doc);
      expect(doc.metadata).toBeUndefined();
    });

    it('should preserve existing metadata', async () => {
      const doc: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
        metadata: {
          notes: 'Existing notes',
        },
      };

      const result = await addChecksum(doc);
      expect(result.metadata?.notes).toBe('Existing notes');
      expect(result.metadata?.checksum).toBeDefined();
    });
  });

  describe('verifyChecksum', () => {
    it('should verify valid checksum', async () => {
      const doc = await addChecksum(exampleDoc);
      const result = await verifyChecksum(doc);
      expect(result.valid).toBe(true);
      expect(result.expected).toBe(result.actual);
    });

    it('should detect invalid checksum', async () => {
      const doc = await addChecksum(exampleDoc);
      doc.metadata!.checksum = 'invalid_checksum';
      
      const result = await verifyChecksum(doc);
      expect(result.valid).toBe(false);
      expect(result.expected).toBe('invalid_checksum');
    });

    it('should detect missing checksum', async () => {
      const result = await verifyChecksum(exampleDoc);
      expect(result.valid).toBe(false);
      expect(result.expected).toBeNull();
    });

    it('should detect content modification', async () => {
      const doc = await addChecksum(exampleDoc);
      doc.name = 'Modified Name';
      
      const result = await verifyChecksum(doc);
      expect(result.valid).toBe(false);
    });
  });

  describe('removeChecksum', () => {
    it('should remove checksum from document', async () => {
      const doc = await addChecksum(exampleDoc);
      const result = removeChecksum(doc);
      expect(result.metadata?.checksum).toBeUndefined();
    });

    it('should preserve other metadata', async () => {
      const doc: OpenRateCard = {
        name: 'Test',
        schema_version: '1.0.0',
        version: '1.0',
        date: '2026-01-12',
        cards: { default: { name: 'Default', type: 'termination', currency: 'USD', endpoint: 'default' } },
        metadata: {
          checksum: 'abc123',
          notes: 'Keep me',
        },
      };

      const result = removeChecksum(doc);
      expect(result.metadata?.checksum).toBeUndefined();
      expect(result.metadata?.notes).toBe('Keep me');
    });

    it('should handle document without checksum', () => {
      const result = removeChecksum(exampleDoc);
      expect(result.metadata?.checksum).toBeUndefined();
    });
  });
});
