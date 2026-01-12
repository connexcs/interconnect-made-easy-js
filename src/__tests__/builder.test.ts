/**
 * Tests for the builder module
 */

import {
  createRateCard,
  createCard,
  createEndpoint,
  createRateConfig,
  createPerformance,
  OpenRateCardBuilder,
  CardBuilder,
} from '../builder';
import { validate } from '../validator';

describe('Builder Module', () => {
  describe('OpenRateCardBuilder', () => {
    it('should build a minimal valid document', () => {
      const doc = createRateCard('Test Rate Card')
        .addEndpoint('default', builder => builder
          .protocol('sip')
          .host('sip.example.com')
          .port(5060))
        .addCard('default', builder => builder
          .description('Default rate card'),
          'termination', 'USD', 'default')
        .build();

      expect(doc.name).toBe('Test Rate Card');
      expect(doc.schema_version).toBe('1.0.0');
      expect(doc.cards.default).toBeDefined();
      
      // Validate against schema
      const result = validate(doc);
      expect(result.valid).toBe(true);
    });

    it('should build a full document with all options', () => {
      const doc = createRateCard('Full Rate Card')
        .version('2.0')
        .schemaVersion('1.0.0')
        .date('2026-01-12')
        .description('A comprehensive rate card')
        .author('Test Author')
        .website('https://example.com')
        .email('contact@example.com')
        .technical('tech@example.com')
        .noc('noc@example.com')
        .billing('billing@example.com')
        .phone('+1234567890')
        .timezone('UTC')
        .effectiveDate('2026-01-01T00:00:00Z')
        .expiryDate('2026-12-31T23:59:59Z')
        .addLegal(legal => legal
          .termsUrl('https://example.com/terms')
          .privacyUrl('https://example.com/privacy')
          .jurisdiction('US')
          .disputeResolution('arbitration')
          .liabilityCap(10000)
          .indemnification(true))
        .addEndpoint('default', builder => builder
          .protocol('sip')
          .transport('udp')
          .host('sip.example.com')
          .port(5060)
          .username('user')
          .password('pass'))
        .addCard('default', builder => builder
          .direction('outbound')
          .trafficType('voice')
          .serviceType('wholesale')
          .techPrefix('555')
          .fields(['prefix', 'name', 'rate'])
          .rates([
            ['1', 'USA', 0.01],
            ['44', 'UK', 0.02],
          ])
          .rateConfig({
            precision: 4,
            rounding: 'up',
            default_pulse: 60,
            default_initial: 60,
          })
          .chargeConfig({
            precision: 4,
            rounding: 'up',
          })
          .performance({
            uptime: 99.9,
            cps: 100,
          })
          .codecs(['PCMU', 'PCMA', 'G729']),
          'termination', 'USD', 'default')
        .addCustomer(customer => customer
          .name('Test Customer')
          .accountId('CUST-001')
          .customerType('carrier'))
        .metadata({
          notes: 'Test metadata',
        })
        .build();

      expect(doc.name).toBe('Full Rate Card');
      expect(doc.version).toBe('2.0');
      expect(doc.legal?.jurisdiction).toBe('US');
      expect(doc.endpoints?.default.protocol).toBe('sip');
      expect(doc.cards.default.rates).toHaveLength(2);
      expect(doc.customer?.name).toBe('Test Customer');

      const result = validate(doc);
      expect(result.valid).toBe(true);
    });

    it('should accept Date objects for dates', () => {
      const doc = createRateCard('Test')
        .date(new Date('2026-01-12'))
        .effectiveDate(new Date('2026-01-01T00:00:00Z'))
        .addCard('default', {
          name: 'Default',
          type: 'termination',
          currency: 'USD',
          endpoint: 'default',
        })
        .build();

      expect(doc.date).toBe('2026-01-12');
      expect(doc.effective_date).toContain('2026-01-01');
    });

    it('should throw if name is missing', () => {
      const builder = new OpenRateCardBuilder('');
      builder.addCard('default', {
        name: 'Default',
        type: 'termination',
        currency: 'USD',
        endpoint: 'default',
      });
      
      expect(() => builder.build()).toThrow('Document name is required');
    });

    it('should throw if no cards defined', () => {
      expect(() => createRateCard('Test').build()).toThrow('At least one card is required');
    });

    it('should allow custom properties via set()', () => {
      const doc = createRateCard('Test')
        .set('custom_field', 'custom_value')
        .addCard('default', {
          name: 'Default',
          type: 'termination',
          currency: 'USD',
          endpoint: 'default',
        })
        .build();

      expect((doc as any).custom_field).toBe('custom_value');
    });

    it('should generate JSON string', () => {
      const json = createRateCard('Test')
        .addCard('default', {
          name: 'Default',
          type: 'termination',
          currency: 'USD',
          endpoint: 'default',
        })
        .toJSON();

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Test');
    });

    it('should generate pretty JSON', () => {
      const json = createRateCard('Test')
        .addCard('default', {
          name: 'Default',
          type: 'termination',
          currency: 'USD',
          endpoint: 'default',
        })
        .toJSON(true);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('CardBuilder', () => {
    it('should build a minimal card', () => {
      const card = createCard('Test Card', 'termination', 'USD', 'default').build();

      expect(card.name).toBe('Test Card');
      expect(card.type).toBe('termination');
      expect(card.currency).toBe('USD');
      expect(card.endpoint).toBe('default');
    });

    it('should build a full card', () => {
      const card = createCard('Test Card', 'termination', 'USD', 'default')
        .description('Test description')
        .direction('outbound')
        .trafficType('voice')
        .serviceType('wholesale')
        .techPrefix('555')
        .fields(['prefix', 'name', 'rate'])
        .addRate(['1', 'USA', 0.01])
        .addRate(['44', 'UK', 0.02])
        .rateConfig({
          precision: 4,
          rounding: 'up',
        })
        .chargeConfig({
          precision: 4,
        })
        .criteria([
          { acd: 60 },
          { asr: 90 },
        ])
        .performance({
          uptime: 99.9,
        })
        .codecs(['PCMU', 'PCMA'])
        .numberFormat({
          src: { e164: true },
          dst: { e164: true },
        })
        .build();

      expect(card.rates).toHaveLength(2);
      expect(card.criteria).toHaveLength(2);
    });

    it('should allow setting rates array directly', () => {
      const card = createCard('Test', 'termination', 'USD', 'default')
        .fields(['a', 'b'])
        .rates([['1', 'x'], ['2', 'y']])
        .build();

      expect(card.rates).toHaveLength(2);
    });

    it('should throw if required fields missing', () => {
      const builder = new CardBuilder('', 'termination', 'USD', 'default');
      expect(() => builder.build()).toThrow();
    });
  });

  describe('EndpointBuilder', () => {
    it('should build an endpoint', () => {
      const endpoint = createEndpoint()
        .protocol('sip')
        .transport('udp')
        .host('sip.example.com')
        .port(5060)
        .username('user')
        .password('pass')
        .priority(0)
        .build();

      expect(endpoint.protocol).toBe('sip');
      expect(endpoint.port).toBe(5060);
    });
  });

  describe('RateConfigBuilder', () => {
    it('should build rate config', () => {
      const config = createRateConfig()
        .precision(4)
        .rounding('up')
        .defaultPulse(60)
        .defaultInitial(60)
        .connection(0)
        .build();

      expect(config.precision).toBe(4);
      expect(config.default_pulse).toBe(60);
    });
  });

  describe('PerformanceBuilder', () => {
    it('should build performance SLA', () => {
      const perf = createPerformance()
        .ner(100)
        .uptime(99.9)
        .cps(10)
        .channels(100)
        .concurrentCalls(100)
        .pdd(3)
        .latency(150)
        .jitter(30)
        .packetLoss(1)
        .mosMin(3.5)
        .slaResponseTime(240)
        .build();

      expect(perf.uptime).toBe(99.9);
      expect(perf.mos_min).toBe(3.5);
    });
  });

  describe('Integration', () => {
    it('should create a document matching the example structure', () => {
      const doc = createRateCard('ABC Telecom Rate Card')
        .version('1.0')
        .date('2024-06-01')
        .description('ABC Telecom provides competitive international calling rates.')
        .author('ABC Telecom')
        .website('https://www.abctelecom.com')
        .email('rates@abctelecom.com')
        .technical('support@abctelecom.com')
        .noc('noc@abctelecom.com')
        .billing('billing@abctelecom.com')
        .phone('+1-555-123-4567')
        .effectiveDate('2024-06-01T00:00:00Z')
        .expiryDate('2024-12-31T23:59:59Z')
        .timezone('UTC')
        .addLegal(legal => legal
          .termsUrl('https://www.abctelecom.com/terms')
          .privacyUrl('https://www.abctelecom.com/privacy')
          .jurisdiction('US')
          .disputeResolution('arbitration')
          .liabilityCap(10000)
          .indemnification(true))
        .addEndpoint('default', endpoint => endpoint
          .protocol('sip')
          .transport('udp')
          .host('sip.abctelecom.com')
          .port(5060)
          .username('user')
          .password('pass'))
        .addCard('default', card => card
          .description('This is the default rate card.')
          .direction('outbound')
          .trafficType('voice')
          .serviceType('wholesale')
          .techPrefix('555')
          .fields([
            'prefix', 'name', 'rate', 'connection_fee',
            'initial_interval', 'billing_interval', 'effective_date',
            'country_code', 'region', 'destination_type',
            'mcc', 'mnc', 'carrier'
          ])
          .rateConfig({
            precision: 4,
            rounding: 'up',
            default_pulse: 60,
            default_initial: 60,
            connection: 0,
          })
          .chargeConfig({
            precision: 4,
            rounding: 'up',
          })
          .rates([
            ['441', 'United Kingdom Landline', 0.012, 0, 60, 60, '2024-06-01', '44', 'Europe', 'landline', null, null, null],
            ['442', 'United Kingdom Mobile', 0.025, 0, 60, 60, '2024-06-01', '44', 'Europe', 'mobile', '234', '10', 'O2'],
          ])
          .performance({
            uptime: 99.9,
            cps: 10,
            channels: 100,
          })
          .codecs(['PCMU', 'PCMA', 'G729']),
          'termination', 'USD', 'default')
        .build();

      const result = validate(doc);
      expect(result.valid).toBe(true);
      expect(doc.cards.default.rates).toHaveLength(2);
    });
  });
});
