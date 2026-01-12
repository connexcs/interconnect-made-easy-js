/**
 * Signing module for Open Rate Card documents
 * Supports RSA and ECDSA signatures using Web Crypto API / Node.js crypto
 */

import { createCanonicalJson } from './checksum';
import { OpenRateCard } from './types';

/** Supported signing algorithms */
export type SigningAlgorithm = 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';

/** Key pair for signing */
export interface KeyPair {
  publicKey: CryptoKey | string;
  privateKey: CryptoKey | string;
}

/** PEM-encoded key pair */
export interface PemKeyPair {
  publicKey: string;
  privateKey: string;
}

/** Signature metadata embedded in document */
export interface SignatureInfo {
  algorithm: SigningAlgorithm;
  signature: string;
  publicKey?: string;
  timestamp?: string;
  keyId?: string;
}

// Algorithm configuration mapping
const ALGORITHM_CONFIG: Record<SigningAlgorithm, {
  name: string;
  hash: string;
  namedCurve?: string;
}> = {
  'RS256': { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  'RS384': { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
  'RS512': { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
  'ES256': { name: 'ECDSA', hash: 'SHA-256', namedCurve: 'P-256' },
  'ES384': { name: 'ECDSA', hash: 'SHA-384', namedCurve: 'P-384' },
  'ES512': { name: 'ECDSA', hash: 'SHA-512', namedCurve: 'P-521' },
};

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.crypto !== 'undefined';
}

/**
 * Get crypto implementation (Web Crypto or Node.js)
 */
async function getCrypto(): Promise<typeof crypto.subtle> {
  if (isBrowser()) {
    return crypto.subtle;
  }
  const { webcrypto } = await import('crypto');
  return webcrypto.subtle as unknown as typeof crypto.subtle;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof btoa === 'function') {
    // Browser
    return btoa(String.fromCharCode(...bytes));
  }
  // Node.js
  return Buffer.from(bytes).toString('base64');
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob === 'function') {
    // Browser
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  // Node.js
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Convert PEM to ArrayBuffer (strips headers and base64 decodes)
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  return base64ToArrayBuffer(base64);
}

/**
 * Convert ArrayBuffer to PEM format
 */
function arrayBufferToPem(buffer: ArrayBuffer, type: 'PUBLIC KEY' | 'PRIVATE KEY'): string {
  const base64 = arrayBufferToBase64(buffer);
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
}

/**
 * Generate a new key pair for signing
 * @param algorithm - Signing algorithm to use
 * @returns Key pair
 */
export async function generateKeyPair(algorithm: SigningAlgorithm = 'RS256'): Promise<KeyPair> {
  const subtle = await getCrypto();
  const config = ALGORITHM_CONFIG[algorithm];
  
  let keyParams: RsaHashedKeyGenParams | EcKeyGenParams;
  
  if (config.name === 'RSASSA-PKCS1-v1_5') {
    keyParams = {
      name: config.name,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: config.hash,
    };
  } else {
    keyParams = {
      name: config.name,
      namedCurve: config.namedCurve!,
    };
  }
  
  const keyPair = await subtle.generateKey(keyParams, true, ['sign', 'verify']);
  
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Generate a key pair and export as PEM strings
 * @param algorithm - Signing algorithm to use
 * @returns PEM-encoded key pair
 */
export async function generatePemKeyPair(algorithm: SigningAlgorithm = 'RS256'): Promise<PemKeyPair> {
  const keyPair = await generateKeyPair(algorithm);
  const subtle = await getCrypto();
  
  const publicKeyBuffer = await subtle.exportKey('spki', keyPair.publicKey as CryptoKey);
  const privateKeyBuffer = await subtle.exportKey('pkcs8', keyPair.privateKey as CryptoKey);
  
  return {
    publicKey: arrayBufferToPem(publicKeyBuffer, 'PUBLIC KEY'),
    privateKey: arrayBufferToPem(privateKeyBuffer, 'PRIVATE KEY'),
  };
}

/**
 * Import a PEM private key
 */
async function importPrivateKey(pem: string, algorithm: SigningAlgorithm): Promise<CryptoKey> {
  const subtle = await getCrypto();
  const config = ALGORITHM_CONFIG[algorithm];
  const keyBuffer = pemToArrayBuffer(pem);
  
  let importParams: RsaHashedImportParams | EcKeyImportParams;
  
  if (config.name === 'RSASSA-PKCS1-v1_5') {
    importParams = {
      name: config.name,
      hash: config.hash,
    };
  } else {
    importParams = {
      name: config.name,
      namedCurve: config.namedCurve!,
    };
  }
  
  return subtle.importKey('pkcs8', keyBuffer, importParams, false, ['sign']);
}

/**
 * Import a PEM public key
 */
async function importPublicKey(pem: string, algorithm: SigningAlgorithm): Promise<CryptoKey> {
  const subtle = await getCrypto();
  const config = ALGORITHM_CONFIG[algorithm];
  const keyBuffer = pemToArrayBuffer(pem);
  
  let importParams: RsaHashedImportParams | EcKeyImportParams;
  
  if (config.name === 'RSASSA-PKCS1-v1_5') {
    importParams = {
      name: config.name,
      hash: config.hash,
    };
  } else {
    importParams = {
      name: config.name,
      namedCurve: config.namedCurve!,
    };
  }
  
  return subtle.importKey('spki', keyBuffer, importParams, false, ['verify']);
}

/**
 * Sign a rate card document
 * @param doc - Rate card document
 * @param privateKey - Private key (CryptoKey or PEM string)
 * @param algorithm - Signing algorithm
 * @param options - Additional signature options
 * @returns Document with signature added
 */
export async function signDocument(
  doc: OpenRateCard | string,
  privateKey: CryptoKey | string,
  algorithm: SigningAlgorithm = 'RS256',
  options: {
    publicKey?: string;
    keyId?: string;
    includeTimestamp?: boolean;
  } = {}
): Promise<OpenRateCard> {
  const document: OpenRateCard = typeof doc === 'string' ? JSON.parse(doc) : JSON.parse(JSON.stringify(doc));
  
  // Clear any existing signature
  if (document.metadata) {
    delete document.metadata.signature;
  }
  
  // Get canonical form (without checksum and signature)
  const canonical = createCanonicalJson(document);
  
  const subtle = await getCrypto();
  const config = ALGORITHM_CONFIG[algorithm];
  
  // Import key if it's a PEM string
  const key = typeof privateKey === 'string'
    ? await importPrivateKey(privateKey, algorithm)
    : privateKey;
  
  // Create sign params
  const signParams = config.namedCurve
    ? { name: config.name, hash: config.hash }
    : { name: config.name };
  
  // Sign the canonical JSON
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(canonical);
  const signatureBuffer = await subtle.sign(signParams, key, dataBuffer);
  
  // Create signature info
  const signatureInfo: SignatureInfo = {
    algorithm,
    signature: arrayBufferToBase64(signatureBuffer),
  };
  
  if (options.publicKey) {
    signatureInfo.publicKey = options.publicKey;
  }
  
  if (options.keyId) {
    signatureInfo.keyId = options.keyId;
  }
  
  if (options.includeTimestamp !== false) {
    signatureInfo.timestamp = new Date().toISOString();
  }
  
  // Add signature to metadata
  document.metadata = {
    ...document.metadata,
    signature: JSON.stringify(signatureInfo),
  };
  
  return document;
}

/**
 * Verify a signed rate card document
 * @param doc - Signed rate card document
 * @param publicKey - Public key (CryptoKey or PEM string). If not provided, uses embedded key.
 * @returns Verification result
 */
export async function verifySignature(
  doc: OpenRateCard | string,
  publicKey?: CryptoKey | string
): Promise<{
  valid: boolean;
  signatureInfo?: SignatureInfo;
  error?: string;
}> {
  try {
    const document: OpenRateCard = typeof doc === 'string' ? JSON.parse(doc) : doc;
    
    // Get signature info
    if (!document.metadata?.signature) {
      return { valid: false, error: 'No signature found in document' };
    }
    
    let signatureInfo: SignatureInfo;
    try {
      signatureInfo = typeof document.metadata.signature === 'string'
        ? JSON.parse(document.metadata.signature)
        : document.metadata.signature;
    } catch {
      return { valid: false, error: 'Invalid signature format' };
    }
    
    // Determine the public key to use
    let keyToUse = publicKey;
    if (!keyToUse && signatureInfo.publicKey) {
      keyToUse = signatureInfo.publicKey;
    }
    
    if (!keyToUse) {
      return { valid: false, error: 'No public key provided and none embedded in signature' };
    }
    
    // Get canonical form of document (without signature)
    const docCopy = JSON.parse(JSON.stringify(document));
    delete docCopy.metadata.signature;
    const canonical = createCanonicalJson(docCopy);
    
    const subtle = await getCrypto();
    const config = ALGORITHM_CONFIG[signatureInfo.algorithm];
    
    // Import key if needed
    const key = typeof keyToUse === 'string'
      ? await importPublicKey(keyToUse, signatureInfo.algorithm)
      : keyToUse;
    
    // Create verify params
    const verifyParams = config.namedCurve
      ? { name: config.name, hash: config.hash }
      : { name: config.name };
    
    // Verify signature
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(canonical);
    const signatureBuffer = base64ToArrayBuffer(signatureInfo.signature);
    
    const valid = await subtle.verify(verifyParams, key, signatureBuffer, dataBuffer);
    
    return { valid, signatureInfo };
  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Remove the signature from a document
 * @param doc - Rate card document
 * @returns Document without signature
 */
export function removeSignature(doc: OpenRateCard | string): OpenRateCard {
  const document: OpenRateCard = typeof doc === 'string' ? JSON.parse(doc) : JSON.parse(JSON.stringify(doc));
  
  if (document.metadata) {
    delete document.metadata.signature;
  }
  
  return document;
}

/**
 * Helper to create a self-signed certificate-like structure
 * Note: This is a simplified implementation. For production use,
 * consider using proper X.509 certificates.
 */
export interface SimpleCertificate {
  subject: string;
  issuer: string;
  publicKey: string;
  validFrom: string;
  validTo: string;
  algorithm: SigningAlgorithm;
  serialNumber: string;
}

/**
 * Generate a simple certificate structure
 * @param options - Certificate options
 * @returns Certificate and key pair
 */
export async function generateCertificate(options: {
  subject: string;
  issuer?: string;
  algorithm?: SigningAlgorithm;
  validityDays?: number;
}): Promise<{
  certificate: SimpleCertificate;
  privateKey: string;
}> {
  const algorithm = options.algorithm || 'RS256';
  const keyPair = await generatePemKeyPair(algorithm);
  
  const now = new Date();
  const validFrom = now.toISOString();
  const validTo = new Date(now.getTime() + (options.validityDays || 365) * 24 * 60 * 60 * 1000).toISOString();
  
  // Generate a simple serial number
  const serialNumber = Array.from(
    { length: 16 },
    () => Math.floor(Math.random() * 16).toString(16)
  ).join('').toUpperCase();
  
  const certificate: SimpleCertificate = {
    subject: options.subject,
    issuer: options.issuer || options.subject,
    publicKey: keyPair.publicKey,
    validFrom,
    validTo,
    algorithm,
    serialNumber,
  };
  
  return {
    certificate,
    privateKey: keyPair.privateKey,
  };
}
