/**
 * Open Rate Card TypeScript Type Definitions
 * Based on the Open Rate Card Specification v1.0.0
 * @see https://github.com/connexcs/interconnect-made-easy
 */

// ============================================================================
// Basic Types & Enums
// ============================================================================

/** Signaling protocol for VoIP */
export type Protocol = 'sip' | 'h323' | 'iax2' | 'webrtc';

/** Transport protocol */
export type Transport = 'udp' | 'tcp' | 'tls' | 'ws' | 'wss';

/** Card type identifier */
export type CardType = 'termination' | 'origination' | 'messaging' | 'wholesale' | 'retail' | 'did' | 'toll_free';

/** Traffic direction */
export type Direction = 'outbound' | 'inbound' | 'bidirectional';

/** Traffic type */
export type TrafficType = 'voice' | 'sms' | 'mms' | 'fax' | 'data' | 'video';

/** Service classification */
export type ServiceType = 'wholesale' | 'retail' | 'did' | 'toll_free' | 'premium';

/** Rounding method */
export type Rounding = 'up' | 'down' | 'nearest' | 'half_up' | 'half_down';

/** Dispute resolution method */
export type DisputeResolution = 'arbitration' | 'litigation' | 'mediation';

/** P-Asserted-Identity requirement */
export type PreAssertId = 'required' | 'optional' | 'none';

/** STIR/SHAKEN attestation level */
export type StirShakenAttestation = 'A' | 'B' | 'C';

/** Customer type */
export type CustomerType = 'carrier' | 'enterprise' | 'reseller' | 'retail' | 'other';

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * Legal terms and conditions
 */
export interface Legal {
  /** URL to terms and conditions */
  terms_url?: string;
  /** URL to privacy policy */
  privacy_url?: string;
  /** Legal jurisdiction country code (ISO 3166-1 alpha-2) */
  jurisdiction?: string;
  /** Method for resolving disputes */
  dispute_resolution?: DisputeResolution;
  /** Maximum liability amount in USD */
  liability_cap?: number;
  /** Whether indemnification is required */
  indemnification?: boolean;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * SIP/VoIP endpoint configuration
 */
export interface Endpoint {
  /** Signaling protocol */
  protocol?: Protocol;
  /** Transport protocol */
  transport?: Transport;
  /** Hostname or IP address */
  host?: string;
  /** Port number (1-65535) */
  port?: number;
  /** Authentication username */
  username?: string;
  /** Authentication password */
  password?: string;
  /** Endpoint priority for failover (lower = higher priority) */
  priority?: number;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Field definition for rates array
 */
export interface Field {
  /** Field name */
  name: string;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Rate calculation configuration
 */
export interface RateConfig {
  /** Number of decimal places for rates (0-10) */
  precision?: number;
  /** Rounding method for rate calculations */
  rounding?: Rounding;
  /** Default billing pulse in seconds */
  default_pulse?: number;
  /** Default initial interval in seconds */
  default_initial?: number;
  /** Default connection fee */
  connection?: number;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Charge calculation configuration
 */
export interface ChargeConfig {
  /** Number of decimal places for charges (0-10) */
  precision?: number;
  /** Rounding method for charge calculations */
  rounding?: Rounding;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Quality criteria item
 */
export interface CriteriaItem {
  /** Average Call Duration in seconds */
  acd?: number;
  /** Answer Seizure Ratio as percentage (0-100) */
  asr?: number;
  /** P-Asserted-Identity requirement */
  pre_assert_id?: PreAssertId;
  /** Required STIR/SHAKEN attestation level */
  stir_shaken_attestation?: StirShakenAttestation;
  /** Whether CLI is required */
  cli_required?: boolean;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Performance SLA metrics
 */
export interface Performance {
  /** Network Effectiveness Ratio as percentage (0-100) */
  ner?: number;
  /** Service uptime percentage (0-100) */
  uptime?: number;
  /** Calls Per Second capacity */
  cps?: number;
  /** Number of available channels */
  channels?: number;
  /** Maximum concurrent calls */
  concurrent_calls?: number;
  /** Post Dial Delay in seconds */
  pdd?: number;
  /** Network latency in milliseconds */
  latency?: number;
  /** Jitter in milliseconds */
  jitter?: number;
  /** Acceptable packet loss percentage (0-100) */
  packet_loss?: number;
  /** Minimum Mean Opinion Score (1.0-5.0) */
  mos_min?: number;
  /** SLA response time in minutes */
  sla_response_time_minutes?: number;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Codec configuration (complex format)
 */
export interface CodecConfig {
  /** Codec name */
  name: string;
  /** Minimum bitrate in bps */
  min_bitrate?: number;
  /** Maximum bitrate in bps */
  max_bitrate?: number;
  /** Number of audio channels */
  channels?: number;
  /** Packet time in milliseconds */
  ptime?: number;
  /** Additional custom properties */
  [key: string]: unknown;
}

/** Codec can be simple string or detailed config */
export type Codec = string | CodecConfig;

/**
 * Number format configuration
 */
export interface NumberFormatConfig {
  /** Accept E.164 format */
  e164?: boolean;
  /** Accept national format */
  national?: boolean;
  /** Accept international format */
  international?: boolean;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Number format requirements
 */
export interface NumberFormat {
  /** Source number (CLI/ANI) format requirements */
  src?: NumberFormatConfig;
  /** Destination number format requirements */
  dst?: NumberFormatConfig;
  /** Additional custom properties */
  [key: string]: unknown;
}

/** Rate entry - array of values matching fields definition */
export type RateEntry = (string | number | boolean | null)[];

/**
 * Rate card definition
 */
export interface Card {
  /** Name of this rate card (required) */
  name: string;
  /** Type of rate card (required) */
  type: CardType;
  /** Currency code for all rates (ISO 4217) (required) */
  currency: string;
  /** Reference to endpoint name (required) */
  endpoint: string;
  /** Description of this rate card */
  description?: string;
  /** Traffic direction */
  direction?: Direction;
  /** Type of traffic */
  traffic_type?: TrafficType;
  /** Service classification */
  service_type?: ServiceType;
  /** Technical prefix for routing */
  tech_prefix?: string;
  /** Field definitions for rates array */
  fields?: Field[];
  /** Rate calculation configuration */
  rate?: RateConfig;
  /** Charge calculation configuration */
  charge?: ChargeConfig;
  /** 2D array of rate data */
  rates?: RateEntry[];
  /** Quality criteria and requirements */
  criteria?: CriteriaItem[];
  /** Performance SLA metrics */
  performance?: Performance;
  /** Supported audio codecs */
  codecs?: Codec[];
  /** Number format requirements */
  number_format?: NumberFormat;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Physical address
 */
export interface Address {
  /** Street address */
  street?: string;
  /** City */
  city?: string;
  /** State or province */
  state?: string;
  /** Postal/ZIP code */
  postal_code?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  country?: string;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Customer information
 */
export interface Customer {
  /** Customer name */
  name?: string;
  /** Account identifier */
  account_id?: string;
  /** Primary contact name */
  contact_name?: string;
  /** Primary contact email */
  contact_email?: string;
  /** Primary contact phone */
  contact_phone?: string;
  /** Billing contact email */
  billing_email?: string;
  /** Technical contact email */
  technical_email?: string;
  /** Physical address */
  address?: Address;
  /** Tax identification number */
  tax_id?: string;
  /** Type of customer */
  customer_type?: CustomerType;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Document metadata
 */
export interface Metadata {
  /** Timestamp when document was created */
  created_at?: string;
  /** Timestamp when document was last updated */
  updated_at?: string;
  /** Email of document creator */
  created_by?: string;
  /** Checksum for integrity verification */
  checksum?: string | null;
  /** Cryptographic signature */
  signature?: string | null;
  /** Additional notes */
  notes?: string;
  /** Additional custom properties */
  [key: string]: unknown;
}

// ============================================================================
// Main Document Interface
// ============================================================================

/**
 * Open Rate Card Document
 * The main interface for the complete rate card document
 */
export interface OpenRateCard {
  /** Name of the rate card or provider (required) */
  name: string;
  /** Schema version (semantic versioning) (required) */
  schema_version: string;
  /** Version of this rate card document (required) */
  version: string;
  /** Date created (YYYY-MM-DD) (required) */
  date: string;
  /** Rate cards (required, at least one) */
  cards: Record<string, Card>;
  
  // Optional fields
  /** Brief description */
  description?: string;
  /** Author or organization */
  author?: string;
  /** Website URL */
  website?: string;
  /** General contact email */
  email?: string;
  /** Technical support email */
  technical?: string;
  /** NOC contact email */
  noc?: string;
  /** Billing contact email */
  billing?: string;
  /** Contact phone (E.164) */
  phone?: string;
  /** Effective date (ISO 8601 datetime) */
  effective_date?: string;
  /** Expiry date (ISO 8601 datetime) */
  expiry_date?: string;
  /** IANA timezone identifier */
  timezone?: string;
  /** Legal terms */
  legal?: Legal;
  /** Named endpoints */
  endpoints?: Record<string, Endpoint>;
  /** Customer information */
  customer?: Customer;
  /** Document metadata */
  metadata?: Metadata;
  
  /** Additional custom properties */
  [key: string]: unknown;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  /** JSON path to the error */
  path: string;
  /** Error message */
  message: string;
  /** Schema keyword that failed */
  keyword?: string;
  /** Expected value or format */
  expected?: unknown;
  /** Actual value provided */
  actual?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the document is valid */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationError[];
}

// ============================================================================
// Utility Types
// ============================================================================

/** Deep partial type for building documents */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Partial rate card for building */
export type PartialOpenRateCard = DeepPartial<OpenRateCard>;
