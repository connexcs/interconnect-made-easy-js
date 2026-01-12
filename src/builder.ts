/**
 * Builder module for Open Rate Card documents
 * Provides a fluent API for constructing rate card documents
 */

import {
  OpenRateCard,
  Card,
  CardType,
  Direction,
  TrafficType,
  ServiceType,
  Endpoint,
  Protocol,
  Transport,
  Legal,
  DisputeResolution,
  Customer,
  CustomerType,
  Address,
  Metadata,
  RateConfig,
  ChargeConfig,
  Rounding,
  Field,
  RateEntry,
  CriteriaItem,
  Performance,
  Codec,
  NumberFormat,
  NumberFormatConfig,
} from './types';

/**
 * Builder for Card objects
 */
export class CardBuilder {
  private card: Partial<Card> = {};

  constructor(name: string, type: CardType, currency: string, endpoint: string) {
    this.card.name = name;
    this.card.type = type;
    this.card.currency = currency;
    this.card.endpoint = endpoint;
  }

  /** Set card description */
  description(description: string): this {
    this.card.description = description;
    return this;
  }

  /** Set traffic direction */
  direction(direction: Direction): this {
    this.card.direction = direction;
    return this;
  }

  /** Set traffic type */
  trafficType(trafficType: TrafficType): this {
    this.card.traffic_type = trafficType;
    return this;
  }

  /** Set service type */
  serviceType(serviceType: ServiceType): this {
    this.card.service_type = serviceType;
    return this;
  }

  /** Set technical prefix */
  techPrefix(prefix: string): this {
    this.card.tech_prefix = prefix;
    return this;
  }

  /** Set rate configuration */
  rateConfig(config: RateConfig): this {
    this.card.rate = config;
    return this;
  }

  /** Set charge configuration */
  chargeConfig(config: ChargeConfig): this {
    this.card.charge = config;
    return this;
  }

  /** Set fields (column definitions for rates) */
  fields(fields: (string | Field)[]): this {
    this.card.fields = fields.map(f => typeof f === 'string' ? { name: f } : f);
    return this;
  }

  /** Add a single rate entry */
  addRate(rate: RateEntry): this {
    if (!this.card.rates) {
      this.card.rates = [];
    }
    this.card.rates.push(rate);
    return this;
  }

  /** Set all rates at once */
  rates(rates: RateEntry[]): this {
    this.card.rates = rates;
    return this;
  }

  /** Set quality criteria */
  criteria(criteria: CriteriaItem[]): this {
    this.card.criteria = criteria;
    return this;
  }

  /** Set performance SLA */
  performance(performance: Performance): this {
    this.card.performance = performance;
    return this;
  }

  /** Set codecs */
  codecs(codecs: Codec[]): this {
    this.card.codecs = codecs;
    return this;
  }

  /** Set number format */
  numberFormat(format: NumberFormat): this {
    this.card.number_format = format;
    return this;
  }

  /** Set custom property */
  set(key: string, value: unknown): this {
    (this.card as Record<string, unknown>)[key] = value;
    return this;
  }

  /** Build the card */
  build(): Card {
    if (!this.card.name || !this.card.type || !this.card.currency || !this.card.endpoint) {
      throw new Error('Card requires name, type, currency, and endpoint');
    }
    return this.card as Card;
  }
}

/**
 * Builder for Endpoint objects
 */
export class EndpointBuilder {
  private endpoint: Partial<Endpoint> = {};

  /** Set protocol */
  protocol(protocol: Protocol): this {
    this.endpoint.protocol = protocol;
    return this;
  }

  /** Set transport */
  transport(transport: Transport): this {
    this.endpoint.transport = transport;
    return this;
  }

  /** Set host */
  host(host: string): this {
    this.endpoint.host = host;
    return this;
  }

  /** Set port */
  port(port: number): this {
    this.endpoint.port = port;
    return this;
  }

  /** Set username */
  username(username: string): this {
    this.endpoint.username = username;
    return this;
  }

  /** Set password */
  password(password: string): this {
    this.endpoint.password = password;
    return this;
  }

  /** Set priority */
  priority(priority: number): this {
    this.endpoint.priority = priority;
    return this;
  }

  /** Build the endpoint */
  build(): Endpoint {
    return this.endpoint as Endpoint;
  }
}

/**
 * Main builder for Open Rate Card documents
 */
export class OpenRateCardBuilder {
  private doc: Partial<OpenRateCard>;

  constructor(name: string) {
    this.doc = {
      name,
      schema_version: '1.0.0',
      version: '1.0',
      date: new Date().toISOString().split('T')[0],
      cards: {},
    };
  }

  /** Set schema version */
  schemaVersion(version: string): this {
    this.doc.schema_version = version;
    return this;
  }

  /** Set document version */
  version(version: string): this {
    this.doc.version = version;
    return this;
  }

  /** Set date (YYYY-MM-DD) */
  date(date: string | Date): this {
    this.doc.date = date instanceof Date ? date.toISOString().split('T')[0] : date;
    return this;
  }

  /** Set description */
  description(description: string): this {
    this.doc.description = description;
    return this;
  }

  /** Set author */
  author(author: string): this {
    this.doc.author = author;
    return this;
  }

  /** Set website */
  website(website: string): this {
    this.doc.website = website;
    return this;
  }

  /** Set general contact email */
  email(email: string): this {
    this.doc.email = email;
    return this;
  }

  /** Set technical support email */
  technical(email: string): this {
    this.doc.technical = email;
    return this;
  }

  /** Set NOC email */
  noc(email: string): this {
    this.doc.noc = email;
    return this;
  }

  /** Set billing email */
  billing(email: string): this {
    this.doc.billing = email;
    return this;
  }

  /** Set phone number */
  phone(phone: string): this {
    this.doc.phone = phone;
    return this;
  }

  /** Set effective date */
  effectiveDate(date: string | Date): this {
    this.doc.effective_date = date instanceof Date ? date.toISOString() : date;
    return this;
  }

  /** Set expiry date */
  expiryDate(date: string | Date): this {
    this.doc.expiry_date = date instanceof Date ? date.toISOString() : date;
    return this;
  }

  /** Set timezone */
  timezone(tz: string): this {
    this.doc.timezone = tz;
    return this;
  }

  /** Set legal information */
  legal(legal: Legal): this {
    this.doc.legal = legal;
    return this;
  }

  /** Add legal info using builder pattern */
  addLegal(builder: (legal: LegalBuilder) => LegalBuilder): this {
    const legalBuilder = new LegalBuilder();
    this.doc.legal = builder(legalBuilder).build();
    return this;
  }

  /** Add an endpoint */
  addEndpoint(name: string, endpoint: Endpoint | ((builder: EndpointBuilder) => EndpointBuilder)): this {
    if (!this.doc.endpoints) {
      this.doc.endpoints = {};
    }
    
    if (typeof endpoint === 'function') {
      this.doc.endpoints[name] = endpoint(new EndpointBuilder()).build();
    } else {
      this.doc.endpoints[name] = endpoint;
    }
    return this;
  }

  /** Add a card */
  addCard(
    name: string,
    card: Card | ((builder: CardBuilder) => CardBuilder),
    type?: CardType,
    currency?: string,
    endpoint?: string
  ): this {
    if (!this.doc.cards) {
      this.doc.cards = {};
    }
    
    if (typeof card === 'function') {
      if (!type || !currency || !endpoint) {
        throw new Error('When using builder function, type, currency, and endpoint must be provided');
      }
      this.doc.cards[name] = card(new CardBuilder(name, type, currency, endpoint)).build();
    } else {
      this.doc.cards[name] = card;
    }
    return this;
  }

  /** Set customer information */
  customer(customer: Customer): this {
    this.doc.customer = customer;
    return this;
  }

  /** Add customer info using builder pattern */
  addCustomer(builder: (customer: CustomerBuilder) => CustomerBuilder): this {
    this.doc.customer = builder(new CustomerBuilder()).build();
    return this;
  }

  /** Set metadata */
  metadata(metadata: Metadata): this {
    this.doc.metadata = metadata;
    return this;
  }

  /** Set custom property */
  set(key: string, value: unknown): this {
    (this.doc as Record<string, unknown>)[key] = value;
    return this;
  }

  /** Build the document */
  build(): OpenRateCard {
    if (!this.doc.name) {
      throw new Error('Document name is required');
    }
    if (!this.doc.cards || Object.keys(this.doc.cards).length === 0) {
      throw new Error('At least one card is required');
    }
    
    return this.doc as OpenRateCard;
  }

  /** Build and return as JSON string */
  toJSON(pretty = false): string {
    const doc = this.build();
    return pretty ? JSON.stringify(doc, null, 2) : JSON.stringify(doc);
  }
}

/**
 * Builder for Legal section
 */
export class LegalBuilder {
  private legal: Legal = {};

  termsUrl(url: string): this {
    this.legal.terms_url = url;
    return this;
  }

  privacyUrl(url: string): this {
    this.legal.privacy_url = url;
    return this;
  }

  jurisdiction(code: string): this {
    this.legal.jurisdiction = code;
    return this;
  }

  disputeResolution(method: DisputeResolution): this {
    this.legal.dispute_resolution = method;
    return this;
  }

  liabilityCap(amount: number): this {
    this.legal.liability_cap = amount;
    return this;
  }

  indemnification(required: boolean): this {
    this.legal.indemnification = required;
    return this;
  }

  build(): Legal {
    return this.legal;
  }
}

/**
 * Builder for Customer section
 */
export class CustomerBuilder {
  private customer: Customer = {};

  name(name: string): this {
    this.customer.name = name;
    return this;
  }

  accountId(id: string): this {
    this.customer.account_id = id;
    return this;
  }

  contactName(name: string): this {
    this.customer.contact_name = name;
    return this;
  }

  contactEmail(email: string): this {
    this.customer.contact_email = email;
    return this;
  }

  contactPhone(phone: string): this {
    this.customer.contact_phone = phone;
    return this;
  }

  billingEmail(email: string): this {
    this.customer.billing_email = email;
    return this;
  }

  technicalEmail(email: string): this {
    this.customer.technical_email = email;
    return this;
  }

  address(address: Address): this {
    this.customer.address = address;
    return this;
  }

  taxId(id: string): this {
    this.customer.tax_id = id;
    return this;
  }

  customerType(type: CustomerType): this {
    this.customer.customer_type = type;
    return this;
  }

  build(): Customer {
    return this.customer;
  }
}

/**
 * Builder for Rate configuration
 */
export class RateConfigBuilder {
  private config: RateConfig = {};

  precision(precision: number): this {
    this.config.precision = precision;
    return this;
  }

  rounding(rounding: Rounding): this {
    this.config.rounding = rounding;
    return this;
  }

  defaultPulse(seconds: number): this {
    this.config.default_pulse = seconds;
    return this;
  }

  defaultInitial(seconds: number): this {
    this.config.default_initial = seconds;
    return this;
  }

  connection(fee: number): this {
    this.config.connection = fee;
    return this;
  }

  build(): RateConfig {
    return this.config;
  }
}

/**
 * Builder for Performance SLA
 */
export class PerformanceBuilder {
  private perf: Performance = {};

  ner(value: number): this {
    this.perf.ner = value;
    return this;
  }

  uptime(value: number): this {
    this.perf.uptime = value;
    return this;
  }

  cps(value: number): this {
    this.perf.cps = value;
    return this;
  }

  channels(value: number): this {
    this.perf.channels = value;
    return this;
  }

  concurrentCalls(value: number): this {
    this.perf.concurrent_calls = value;
    return this;
  }

  pdd(seconds: number): this {
    this.perf.pdd = seconds;
    return this;
  }

  latency(ms: number): this {
    this.perf.latency = ms;
    return this;
  }

  jitter(ms: number): this {
    this.perf.jitter = ms;
    return this;
  }

  packetLoss(percent: number): this {
    this.perf.packet_loss = percent;
    return this;
  }

  mosMin(score: number): this {
    this.perf.mos_min = score;
    return this;
  }

  slaResponseTime(minutes: number): this {
    this.perf.sla_response_time_minutes = minutes;
    return this;
  }

  build(): Performance {
    return this.perf;
  }
}

// Factory functions for convenience

/**
 * Create a new rate card document builder
 * @param name - Document name
 * @returns OpenRateCardBuilder instance
 */
export function createRateCard(name: string): OpenRateCardBuilder {
  return new OpenRateCardBuilder(name);
}

/**
 * Create a new card builder
 * @param name - Card name
 * @param type - Card type
 * @param currency - Currency code
 * @param endpoint - Endpoint reference
 * @returns CardBuilder instance
 */
export function createCard(
  name: string,
  type: CardType,
  currency: string,
  endpoint: string
): CardBuilder {
  return new CardBuilder(name, type, currency, endpoint);
}

/**
 * Create a new endpoint builder
 * @returns EndpointBuilder instance
 */
export function createEndpoint(): EndpointBuilder {
  return new EndpointBuilder();
}

/**
 * Create a new rate config builder
 * @returns RateConfigBuilder instance
 */
export function createRateConfig(): RateConfigBuilder {
  return new RateConfigBuilder();
}

/**
 * Create a new performance builder
 * @returns PerformanceBuilder instance
 */
export function createPerformance(): PerformanceBuilder {
  return new PerformanceBuilder();
}
