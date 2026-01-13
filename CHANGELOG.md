# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-13

### Fixed
- **Critical**: Fixed incorrect schema import paths in compiled ESM and CJS outputs
  - The compiled files were using `../interconnect-made-easy/schema/...` which failed because from `dist/esm/` or `dist/cjs/`, `../` only reaches the `dist/` directory, not the package root
  - Solution: Copy schema files to `dist/interconnect-made-easy/schema/` during build process
  - Added post-build script to inject ESM import attributes (`with { type: 'json' }`) for Node.js 20+ compatibility
  - Both CommonJS and ESM builds now correctly resolve the schema file
  - Fixes the error: `Cannot find module '../interconnect-made-easy/schema/interconnect-made-easy.schema.json'`

### Added
- Build script `fix:esm` to add import attributes to ESM JSON imports
- Build script `copy:schema` to copy schema files to dist directory
- Post-build processing script `scripts/fix-esm-imports.js`

## [0.1.0] - 2024-12-XX

### Added
- Initial release
- Complete Open Rate Card validation
- Checksum verification (SHA-256)
- Digital signature support (RSA/ECDSA)
- CSV import/export functionality
- Builder API for rate card construction
- TypeScript type definitions
- Browser and Node.js support
