/**
 * Checksum module for Open Rate Card documents
 * Uses canonical JSON (RFC 8785) and SHA-256 for checksums
 */

import canonicalize from 'canonicalize';
import { OpenRateCard } from './types';

/**
 * SHA-256 hash function that works in both Node.js and browser
 * @param data - String data to hash
 * @returns Hex-encoded hash
 */
async function sha256(data: string): Promise<string> {
  // Check for browser environment (Web Crypto API)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Node.js environment
  const nodeCrypto = await import('crypto');
  return nodeCrypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Create canonical JSON representation of the document
 * Excludes metadata.checksum and metadata.signature from the canonical form
 * @param doc - Rate card document
 * @returns Canonical JSON string
 */
export function createCanonicalJson(doc: OpenRateCard): string {
  // Create a deep copy without checksum and signature
  const docCopy = JSON.parse(JSON.stringify(doc));
  
  // Remove checksum and signature from metadata if present
  if (docCopy.metadata) {
    delete docCopy.metadata.checksum;
    delete docCopy.metadata.signature;
    
    // Remove metadata entirely if it's now empty
    if (Object.keys(docCopy.metadata).length === 0) {
      delete docCopy.metadata;
    }
  }
  
  // Use RFC 8785 canonicalization
  const canonical = canonicalize(docCopy);
  if (!canonical) {
    throw new Error('Failed to canonicalize document');
  }
  return canonical;
}

/**
 * Calculate the checksum of a document
 * @param doc - Rate card document (or JSON string)
 * @returns SHA-256 checksum as hex string
 */
export async function calculateChecksum(doc: OpenRateCard | string): Promise<string> {
  const document = typeof doc === 'string' ? JSON.parse(doc) : doc;
  const canonical = createCanonicalJson(document);
  return sha256(canonical);
}

/**
 * Add a checksum to the document's metadata
 * @param doc - Rate card document (or JSON string)
 * @returns New document with checksum added (does not modify original)
 */
export async function addChecksum(doc: OpenRateCard | string): Promise<OpenRateCard> {
  const document: OpenRateCard = typeof doc === 'string' ? JSON.parse(doc) : JSON.parse(JSON.stringify(doc));
  
  // Calculate checksum
  const checksum = await calculateChecksum(document);
  
  // Add or update metadata with checksum
  document.metadata = {
    ...document.metadata,
    checksum
  };
  
  return document;
}

/**
 * Verify the checksum of a document
 * @param doc - Rate card document with checksum (or JSON string)
 * @returns Object with valid flag and expected/actual checksums
 */
export async function verifyChecksum(doc: OpenRateCard | string): Promise<{
  valid: boolean;
  expected: string | null;
  actual: string;
}> {
  const document: OpenRateCard = typeof doc === 'string' ? JSON.parse(doc) : doc;
  
  // Get the stored checksum
  const storedChecksum = document.metadata?.checksum || null;
  
  // Calculate what the checksum should be
  const calculatedChecksum = await calculateChecksum(document);
  
  return {
    valid: storedChecksum === calculatedChecksum,
    expected: storedChecksum,
    actual: calculatedChecksum
  };
}

/**
 * Remove the checksum from a document
 * @param doc - Rate card document (or JSON string)
 * @returns New document without checksum
 */
export function removeChecksum(doc: OpenRateCard | string): OpenRateCard {
  const document: OpenRateCard = typeof doc === 'string' ? JSON.parse(doc) : JSON.parse(JSON.stringify(doc));
  
  if (document.metadata) {
    delete document.metadata.checksum;
  }
  
  return document;
}
