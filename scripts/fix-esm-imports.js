#!/usr/bin/env node

/**
 * Post-process ESM validator.js to add import attributes for JSON imports
 * This is needed for Node.js 20+ which requires import attributes for JSON modules
 */

const fs = require('fs');
const path = require('path');

const esmValidatorPath = path.join(__dirname, '../dist/esm/validator.js');

try {
  let content = fs.readFileSync(esmValidatorPath, 'utf8');
  
  // Add import attribute to the JSON import
  content = content.replace(
    /import schema from '(.+?\.json)';/,
    "import schema from '$1' with { type: 'json' };"
  );
  
  fs.writeFileSync(esmValidatorPath, content, 'utf8');
  console.log('✓ Added import attribute to ESM validator.js');
} catch (error) {
  console.error('Error processing ESM validator.js:', error.message);
  process.exit(1);
}
