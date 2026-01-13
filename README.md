# Interconnect Made Easy - JavaScript/TypeScript Implementation

[![npm version](https://badge.fury.io/js/%40connexcs%2Finterconnect-made-easy.svg)](https://www.npmjs.com/package/@connexcs/interconnect-made-easy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive JavaScript/TypeScript implementation of the [Open Rate Card specification](https://github.com/connexcs/interconnect-made-easy) for telecommunications rate cards. This library enables automated exchange of pricing, routing, and service information between VoIP carriers and wholesale providers.

## Features

- 📋 **Validation** - Validate JSON documents against the Open Rate Card schema
- 🔒 **Checksum** - Add and verify SHA-256 checksums using canonical JSON (RFC 8785)
- ✍️ **Signing** - Sign and verify documents using RSA or ECDSA signatures
- 📊 **CSV Export/Import** - Convert rate cards to/from CSV format
- 🏗️ **Builder API** - Fluent API for constructing rate card documents
- 🛠️ **Utilities** - Helper functions for rate lookup, cost calculation, and more
- 🌐 **Universal** - Works in both Node.js and browser environments
- 📘 **TypeScript** - Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @connexcs/interconnect-made-easy
```

## Quick Start

### Validate a Rate Card

```typescript
import { validate, parseRateCard, isValidRateCard } from '@connexcs/interconnect-made-easy';

// Validate a JSON string or object
const result = validate(rateCardJson);
if (result.valid) {
  console.log('Rate card is valid!');
} else {
  console.log('Validation errors:', result.errors);
}

// Parse and validate in one step (throws on error)
const rateCard = parseRateCard(rateCardJson);

// Type guard check
if (isValidRateCard(data)) {
  // data is typed as OpenRateCard
  console.log(data.name);
}
```

### Build a Rate Card

```typescript
import { createRateCard } from '@connexcs/interconnect-made-easy';

const rateCard = createRateCard('ABC Telecom Rate Card')
  .version('1.0')
  .date('2026-01-12')
  .description('Competitive international calling rates')
  .author('ABC Telecom')
  .website('https://www.abctelecom.com')
  .email('rates@abctelecom.com')
  .phone('+1-555-123-4567')
  .addLegal(legal => legal
    .jurisdiction('US')
    .disputeResolution('arbitration')
    .liabilityCap(10000))
  .addEndpoint('default', endpoint => endpoint
    .protocol('sip')
    .transport('udp')
    .host('sip.abctelecom.com')
    .port(5060))
  .addCard('default', card => card
    .direction('outbound')
    .trafficType('voice')
    .serviceType('wholesale')
    .fields(['prefix', 'name', 'rate', 'connection_fee'])
    .rates([
      ['1', 'USA', 0.01, 0],
      ['44', 'UK', 0.02, 0],
      ['49', 'Germany', 0.015, 0],
    ])
    .rateConfig({
      precision: 4,
      rounding: 'up',
      default_pulse: 60,
      default_initial: 60,
    })
    .codecs(['PCMU', 'PCMA', 'G729']),
    'termination', 'USD', 'default')
  .build();

// Output as JSON
console.log(JSON.stringify(rateCard, null, 2));
```

### Add and Verify Checksum

```typescript
import { addChecksum, verifyChecksum } from '@connexcs/interconnect-made-easy';

// Add checksum to document
const docWithChecksum = await addChecksum(rateCard);
console.log(docWithChecksum.metadata.checksum);

// Verify checksum
const verification = await verifyChecksum(docWithChecksum);
if (verification.valid) {
  console.log('Document integrity verified');
} else {
  console.log('Document has been modified!');
}
```

### Sign and Verify Documents

```typescript
import { 
  generatePemKeyPair, 
  signDocument, 
  verifySignature 
} from '@connexcs/interconnect-made-easy';

// Generate key pair
const keyPair = await generatePemKeyPair('RS256');

// Sign document
const signedDoc = await signDocument(rateCard, keyPair.privateKey, 'RS256', {
  publicKey: keyPair.publicKey,  // Embed public key for verification
  keyId: 'key-001',
});

// Verify signature
const result = await verifySignature(signedDoc, keyPair.publicKey);
// Or use embedded public key:
const result2 = await verifySignature(signedDoc);

if (result.valid) {
  console.log('Signature valid!');
}
```

### Export to CSV

```typescript
import { exportToCsv, exportCardToCsv, importFromCsv } from '@connexcs/interconnect-made-easy';

// Export all cards
const csvFiles = exportToCsv(rateCard);
console.log(csvFiles.default);  // CSV for 'default' card

// Export specific card with options
const csv = exportCardToCsv(rateCard.cards.default, {
  delimiter: ',',
  includeHeaders: true,
  includeMetadata: true,
  includeFields: ['prefix', 'name', 'rate'],
});

// Import from CSV
const { fields, rates } = importFromCsv(csv);
```

### Utility Functions

```typescript
import {
  findRateByPrefix,
  calculateCallCost,
  getAllRatesAsObjects,
  filterRates,
  sortRates,
  getCardStatistics,
} from '@connexcs/interconnect-made-easy';

// Find rate for a phone number (longest prefix match)
const match = findRateByPrefix(card, '+442071234567');
if (match) {
  console.log(`Rate for ${match.prefix}: $${match.entry[2]}/min`);
}

// Calculate call cost
const cost = calculateCallCost(card, match.entry, 120); // 120 seconds
console.log(`Call cost: $${cost.totalCost}`);

// Get rates as objects
const ratesObjects = getAllRatesAsObjects(card);
console.log(ratesObjects[0].name);

// Filter rates
const ukRates = filterRates(card, (entry, obj) => 
  (obj.name as string).includes('UK')
);

// Sort rates by rate
const sortedByRate = sortRates(card, 'rate');

// Get statistics
const stats = getCardStatistics(card);
console.log(`Total rates: ${stats.totalRates}`);
console.log(`Rate range: $${stats.rateRange.min} - $${stats.rateRange.max}`);
```

## API Reference

### Validation

| Function | Description |
|----------|-------------|
| `validate(data)` | Validate JSON string or object against schema |
| `parseRateCard(data)` | Validate and return typed OpenRateCard |
| `isValidRateCard(data)` | Type guard - returns true if valid |
| `new Validator()` | Create validator instance |

### Checksum

| Function | Description |
|----------|-------------|
| `addChecksum(doc)` | Add SHA-256 checksum to document |
| `verifyChecksum(doc)` | Verify document checksum |
| `calculateChecksum(doc)` | Calculate checksum without adding it |
| `removeChecksum(doc)` | Remove checksum from document |
| `createCanonicalJson(doc)` | Create RFC 8785 canonical JSON |

### Signing

| Function | Description |
|----------|-------------|
| `signDocument(doc, privateKey, algorithm, options)` | Sign document |
| `verifySignature(doc, publicKey?)` | Verify document signature |
| `generateKeyPair(algorithm)` | Generate CryptoKey pair |
| `generatePemKeyPair(algorithm)` | Generate PEM-encoded key pair |
| `generateCertificate(options)` | Generate simple certificate |
| `removeSignature(doc)` | Remove signature from document |

**Supported Algorithms:** `RS256`, `RS384`, `RS512`, `ES256`, `ES384`, `ES512`

### CSV

| Function | Description |
|----------|-------------|
| `exportToCsv(doc, cardName?, options)` | Export cards to CSV |
| `exportCardToCsv(card, options)` | Export single card to CSV |
| `exportToCsvFile(doc, cardName, filePath, options)` | Export to file (Node.js) |
| `parseCsv(csv, options)` | Parse CSV string |
| `importFromCsv(csv, options)` | Import CSV to fields/rates |

### Builder

| Class/Function | Description |
|----------------|-------------|
| `createRateCard(name)` | Create document builder |
| `createCard(name, type, currency, endpoint)` | Create card builder |
| `createEndpoint()` | Create endpoint builder |
| `createRateConfig()` | Create rate config builder |
| `createPerformance()` | Create performance builder |

### Utilities

| Function | Description |
|----------|-------------|
| `findRateByPrefix(card, number)` | Find rate using longest prefix match |
| `calculateCallCost(card, entry, duration)` | Calculate call cost |
| `rateEntryToObject(card, entry)` | Convert rate array to object |
| `objectToRateEntry(card, obj)` | Convert object to rate array |
| `getAllRatesAsObjects(card)` | Get all rates as objects |
| `mergeCards(base, override)` | Merge two cards |
| `filterRates(card, predicate)` | Filter rates |
| `sortRates(card, field, descending)` | Sort rates by field |
| `getUniqueFieldValues(card, field)` | Get unique field values |
| `cloneDocument(doc)` | Deep clone document |
| `getCardStatistics(card)` | Get card statistics |

## Types

The library exports comprehensive TypeScript types for the Open Rate Card specification:

```typescript
import type {
  OpenRateCard,
  Card,
  CardType,
  Endpoint,
  Legal,
  Customer,
  Metadata,
  RateConfig,
  ChargeConfig,
  Performance,
  CriteriaItem,
  Codec,
  NumberFormat,
  ValidationResult,
  ValidationError,
  // ... and more
} from '@connexcs/interconnect-made-easy';
```

## Browser Usage

The library works in browsers via the bundled version:

```html
<script src="node_modules/@connexcs/interconnect-made-easy/dist/browser/interconnect-made-easy.min.js"></script>
<script>
  const { validate, createRateCard } = InterconnectMadeEasy;
  
  // Use the library
  const result = validate(rateCardJson);
</script>
```

Or with ES modules:

```javascript
import { validate, createRateCard } from '@connexcs/interconnect-made-easy';
```

## Node.js Usage

```javascript
// CommonJS
const { validate, createRateCard } = require('@connexcs/interconnect-made-easy');

// ES Modules
import { validate, createRateCard } from '@connexcs/interconnect-made-easy';
```

## Specification Reference

This implementation follows the [Open Rate Card Specification v1.0.0](https://github.com/connexcs/interconnect-made-easy). The specification defines a standardized JSON format for telecommunications rate cards, enabling automated exchange of:

- Pricing information
- Routing details
- Service level agreements
- Quality criteria
- Endpoint configurations
- Legal terms

For detailed field documentation, see:
- [SPECIFICATION.md](https://github.com/connexcs/interconnect-made-easy/blob/main/SPECIFICATION.md)
- [CARD-TYPES.md](https://github.com/connexcs/interconnect-made-easy/blob/main/CARD-TYPES.md)
- [GLOSSARY.md](https://github.com/connexcs/interconnect-made-easy/blob/main/GLOSSARY.md)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the library
npm run build

# Lint the code
npm run lint
```

## Testing

The test suite includes:
- Schema validation against the official example
- Checksum generation and verification
- Digital signature operations
- CSV export/import roundtrips
- Builder API functionality
- Utility function correctness

```bash
npm test
```

## License

MIT

## Related Projects

- [interconnect-made-easy](https://github.com/connexcs/interconnect-made-easy) - The specification repository
- [ConnexCS](https://www.connexcs.com) - VoIP softswitch platform

## Contributing

Contributions are welcome! Please see the [contributing guidelines](https://github.com/connexcs/interconnect-made-easy/blob/main/CONTRIBUTING.md) in the specification repository.
