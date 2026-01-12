/**
 * Tests for the signing module
 */

import {
  generateKeyPair,
  generatePemKeyPair,
  signDocument,
  verifySignature,
  removeSignature,
  generateCertificate,
  SigningAlgorithm,
} from '../signing';
import { OpenRateCard } from '../types';

const testDoc: OpenRateCard = {
  name: 'Test Rate Card',
  schema_version: '1.0.0',
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

describe('Signing Module', () => {
  describe('generateKeyPair', () => {
    it('should generate RSA key pair', async () => {
      const keyPair = await generateKeyPair('RS256');
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
    });

    it('should generate ECDSA key pair', async () => {
      const keyPair = await generateKeyPair('ES256');
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
    });

    it('should default to RS256', async () => {
      const keyPair = await generateKeyPair();
      expect(keyPair.publicKey).toBeDefined();
    });
  });

  describe('generatePemKeyPair', () => {
    it('should generate PEM formatted keys', async () => {
      const keyPair = await generatePemKeyPair('RS256');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate valid PEM for EC keys', async () => {
      const keyPair = await generatePemKeyPair('ES256');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });
  });

  describe('signDocument', () => {
    it('should sign document with CryptoKey', async () => {
      const keyPair = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256');
      
      expect(signed.metadata?.signature).toBeDefined();
      const sigInfo = JSON.parse(signed.metadata!.signature!);
      expect(sigInfo.algorithm).toBe('RS256');
      expect(sigInfo.signature).toBeDefined();
    });

    it('should sign document with PEM key', async () => {
      const keyPair = await generatePemKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256');
      
      expect(signed.metadata?.signature).toBeDefined();
    });

    it('should include timestamp by default', async () => {
      const keyPair = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256');
      
      const sigInfo = JSON.parse(signed.metadata!.signature!);
      expect(sigInfo.timestamp).toBeDefined();
    });

    it('should include public key when provided', async () => {
      const keyPair = await generatePemKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256', {
        publicKey: keyPair.publicKey,
      });
      
      const sigInfo = JSON.parse(signed.metadata!.signature!);
      expect(sigInfo.publicKey).toBe(keyPair.publicKey);
    });

    it('should include keyId when provided', async () => {
      const keyPair = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256', {
        keyId: 'key-123',
      });
      
      const sigInfo = JSON.parse(signed.metadata!.signature!);
      expect(sigInfo.keyId).toBe('key-123');
    });

    it('should not modify original document', async () => {
      const keyPair = await generateKeyPair('RS256');
      await signDocument(testDoc, keyPair.privateKey, 'RS256');
      
      expect(testDoc.metadata?.signature).toBeUndefined();
    });
  });

  describe('verifySignature', () => {
    it('should verify valid RS256 signature', async () => {
      const keyPair = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256');
      
      const result = await verifySignature(signed, keyPair.publicKey);
      expect(result.valid).toBe(true);
      expect(result.signatureInfo?.algorithm).toBe('RS256');
    });

    it('should verify valid ES256 signature', async () => {
      const keyPair = await generateKeyPair('ES256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'ES256');
      
      const result = await verifySignature(signed, keyPair.publicKey);
      expect(result.valid).toBe(true);
    });

    it('should verify using embedded public key', async () => {
      const keyPair = await generatePemKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256', {
        publicKey: keyPair.publicKey,
      });
      
      const result = await verifySignature(signed);
      expect(result.valid).toBe(true);
    });

    it('should reject tampered document', async () => {
      const keyPair = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256');
      signed.name = 'Tampered Name';
      
      const result = await verifySignature(signed, keyPair.publicKey);
      expect(result.valid).toBe(false);
    });

    it('should reject document with wrong key', async () => {
      const keyPair1 = await generateKeyPair('RS256');
      const keyPair2 = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair1.privateKey, 'RS256');
      
      const result = await verifySignature(signed, keyPair2.publicKey);
      expect(result.valid).toBe(false);
    });

    it('should return error for unsigned document', async () => {
      const result = await verifySignature(testDoc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No signature found');
    });

    it('should return error when no public key available', async () => {
      const keyPair = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256');
      
      const result = await verifySignature(signed);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No public key');
    });
  });

  describe('removeSignature', () => {
    it('should remove signature from document', async () => {
      const keyPair = await generateKeyPair('RS256');
      const signed = await signDocument(testDoc, keyPair.privateKey, 'RS256');
      
      const unsigned = removeSignature(signed);
      expect(unsigned.metadata?.signature).toBeUndefined();
    });

    it('should preserve other metadata', async () => {
      const docWithMeta: OpenRateCard = {
        ...testDoc,
        metadata: {
          notes: 'Keep me',
          signature: '{"test": true}',
        },
      };
      
      const result = removeSignature(docWithMeta);
      expect(result.metadata?.notes).toBe('Keep me');
      expect(result.metadata?.signature).toBeUndefined();
    });
  });

  describe('generateCertificate', () => {
    it('should generate a certificate structure', async () => {
      const result = await generateCertificate({
        subject: 'CN=Test,O=Test Org',
      });
      
      expect(result.certificate.subject).toBe('CN=Test,O=Test Org');
      expect(result.certificate.issuer).toBe('CN=Test,O=Test Org');
      expect(result.certificate.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(result.certificate.algorithm).toBe('RS256');
    });

    it('should set custom issuer', async () => {
      const result = await generateCertificate({
        subject: 'CN=Test',
        issuer: 'CN=Root CA',
      });
      
      expect(result.certificate.issuer).toBe('CN=Root CA');
    });

    it('should set custom validity period', async () => {
      const result = await generateCertificate({
        subject: 'CN=Test',
        validityDays: 30,
      });
      
      const validFrom = new Date(result.certificate.validFrom);
      const validTo = new Date(result.certificate.validTo);
      const diffDays = (validTo.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('should use specified algorithm', async () => {
      const result = await generateCertificate({
        subject: 'CN=Test',
        algorithm: 'ES256',
      });
      
      expect(result.certificate.algorithm).toBe('ES256');
    });

    it('should generate unique serial numbers', async () => {
      const result1 = await generateCertificate({ subject: 'CN=Test1' });
      const result2 = await generateCertificate({ subject: 'CN=Test2' });
      
      expect(result1.certificate.serialNumber).not.toBe(result2.certificate.serialNumber);
    });
  });

  describe('Algorithm support', () => {
    const algorithms: SigningAlgorithm[] = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384'];
    // Note: ES512 uses P-521 which may not be supported in all environments
    
    algorithms.forEach((algorithm) => {
      it(`should support ${algorithm}`, async () => {
        const keyPair = await generateKeyPair(algorithm);
        const signed = await signDocument(testDoc, keyPair.privateKey, algorithm);
        const result = await verifySignature(signed, keyPair.publicKey);
        
        expect(result.valid).toBe(true);
      });
    });
  });
});
