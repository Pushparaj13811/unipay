# Publishing Guide - UniPay NPM Packages

This document provides step-by-step instructions for publishing UniPay packages to NPM registry.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Package Structure](#package-structure)
- [Pre-Publishing Checklist](#pre-publishing-checklist)
- [Publishing Process](#publishing-process)
- [Publishing Individual Packages](#publishing-individual-packages)
- [Publishing All Packages](#publishing-all-packages)
- [Post-Publishing Verification](#post-publishing-verification)
- [Version Management](#version-management)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. NPM Account Setup

```bash
# Create NPM account (if you don't have one)
# Visit: https://www.npmjs.com/signup

# Login to NPM
npm login

# Verify your login
npm whoami
```

### 2. NPM Organization (for @unipay scope)

```bash
# Create organization on NPM
# Visit: https://www.npmjs.com/org/create

# Or use existing organization
# Organization name: unipay
# All packages use: @unipay/* scope
```

### 3. Two-Factor Authentication (Recommended)

```bash
# Enable 2FA for added security
# Visit: https://www.npmjs.com/settings/[your-username]/tfa

# Configure 2FA for publishing
npm profile enable-2fa auth-and-writes
```

### 4. Required Tools

```bash
# Install pnpm (if not installed)
npm install -g pnpm@10.27.0

# Verify pnpm installation
pnpm --version

# Install dependencies
pnpm install
```

---

## Package Structure

UniPay is a monorepo with the following publishable packages:

```
unipay/
├── packages/
│   ├── core/                    → @unipay/core
│   ├── orchestrator/            → @unipay/orchestrator
│   └── adapters/
│       ├── stripe/              → @unipay/adapter-stripe
│       └── razorpay/            → @unipay/adapter-razorpay
```

**Publication Order** (dependencies first):
1. `@unipay/core` (base package)
2. `@unipay/orchestrator` (depends on core)
3. `@unipay/adapter-stripe` (depends on core)
4. `@unipay/adapter-razorpay` (depends on core)

---

## Pre-Publishing Checklist

### 1. Code Quality Checks

```bash
# Run linting (if configured)
pnpm lint

# Run type checking
pnpm typecheck

# Run all tests
pnpm test

# Run integration tests (if credentials available)
STRIPE_TEST_KEY=sk_test_xxx RAZORPAY_TEST_KEY=rzp_test_xxx pnpm test:integration
```

### 2. Build All Packages

```bash
# Clean previous builds
pnpm clean

# Build all packages
pnpm build

# Verify build outputs
ls -la packages/core/dist
ls -la packages/orchestrator/dist
ls -la packages/adapters/stripe/dist
ls -la packages/adapters/razorpay/dist
```

### 3. Version Verification

```bash
# Check current versions
cat packages/core/package.json | grep version
cat packages/orchestrator/package.json | grep version
cat packages/adapters/stripe/package.json | grep version
cat packages/adapters/razorpay/package.json | grep version
```

### 4. Update CHANGELOG

```bash
# Update CHANGELOG.md with release notes
# Include:
# - New features
# - Bug fixes
# - Breaking changes
# - Migration guide (if needed)
```

---

## Publishing Process

### Method 1: Manual Publishing (Recommended for First Release)

#### Step 1: Publish Core Package

```bash
cd packages/core

# Verify package contents
npm pack --dry-run

# Publish to NPM
npm publish --access public

# Verify publication
npm view @unipay/core
```

#### Step 2: Publish Orchestrator

```bash
cd ../orchestrator

# Update dependency to published version
# Edit package.json: "@unipay/core": "^0.1.0"

# Publish
npm pack --dry-run
npm publish --access public

# Verify
npm view @unipay/orchestrator
```

#### Step 3: Publish Stripe Adapter

```bash
cd ../adapters/stripe

# Update dependency
# Edit package.json: "@unipay/core": "^0.1.0"

# Publish
npm pack --dry-run
npm publish --access public

# Verify
npm view @unipay/adapter-stripe
```

#### Step 4: Publish Razorpay Adapter

```bash
cd ../razorpay

# Update dependency
# Edit package.json: "@unipay/core": "^0.1.0"

# Publish
npm pack --dry-run
npm publish --access public

# Verify
npm view @unipay/adapter-razorpay
```

---

### Method 2: Automated Publishing with pnpm

#### Step 1: Update Dependencies

```bash
# From project root
# Replace workspace:* with actual versions in package.json files

# For each package, update:
# "@unipay/core": "workspace:*" → "@unipay/core": "^0.1.0"
```

#### Step 2: Publish All at Once

```bash
# From project root
pnpm -r publish --access public

# Or publish individually with pnpm
pnpm --filter @unipay/core publish --access public
pnpm --filter @unipay/orchestrator publish --access public
pnpm --filter @unipay/adapter-stripe publish --access public
pnpm --filter @unipay/adapter-razorpay publish --access public
```

---

## Publishing Individual Packages

### Update Single Package Version

```bash
# Navigate to package
cd packages/core

# Update version (choose one)
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

# Or set specific version
npm version 0.1.1

# Publish
npm publish --access public
```

---

## Publishing All Packages

### Synchronized Version Release

```bash
# From project root

# 1. Update all versions
cd packages/core && npm version patch && cd ../..
cd packages/orchestrator && npm version patch && cd ../..
cd packages/adapters/stripe && npm version patch && cd ../../..
cd packages/adapters/razorpay && npm version patch && cd ../../..

# 2. Update inter-package dependencies
# Edit each package.json to match new versions

# 3. Rebuild all
pnpm clean && pnpm build

# 4. Publish all
pnpm -r publish --access public
```

---

## Post-Publishing Verification

### 1. Verify Package on NPM

```bash
# Check package page
open https://www.npmjs.com/package/@unipay/core
open https://www.npmjs.com/package/@unipay/orchestrator
open https://www.npmjs.com/package/@unipay/adapter-stripe
open https://www.npmjs.com/package/@unipay/adapter-razorpay

# Verify installation
npm view @unipay/core
npm view @unipay/orchestrator
npm view @unipay/adapter-stripe
npm view @unipay/adapter-razorpay
```

### 2. Test Installation

```bash
# Create test project
mkdir test-unipay && cd test-unipay
npm init -y

# Install packages
npm install @unipay/core @unipay/orchestrator @unipay/adapter-stripe

# Verify imports
node -e "console.log(require('@unipay/core'))"
```

### 3. Check Package Metadata

```bash
# Verify keywords, description, repository links
npm view @unipay/core keywords
npm view @unipay/core description
npm view @unipay/core repository
```

---

## Version Management

### Semantic Versioning

We follow [SemVer](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Version Update Strategy

```bash
# Bug fixes
npm version patch

# New features (no breaking changes)
npm version minor

# Breaking changes
npm version major

# Pre-release versions
npm version premajor --preid=alpha  # 1.0.0-alpha.0
npm version preminor --preid=beta   # 0.2.0-beta.0
npm version prepatch --preid=rc     # 0.1.1-rc.0
```

### Maintaining Version Consistency

```bash
# Use a script to sync versions
cat > scripts/sync-versions.sh << 'EOF'
#!/bin/bash
VERSION=$1
for pkg in packages/core packages/orchestrator packages/adapters/*/; do
  cd "$pkg"
  npm version "$VERSION" --no-git-tag-version
  cd -
done
EOF

chmod +x scripts/sync-versions.sh

# Usage
./scripts/sync-versions.sh 0.2.0
```

---

## Troubleshooting

### Issue: "You do not have permission to publish"

```bash
# Solution 1: Check login
npm whoami

# Solution 2: Login again
npm logout
npm login

# Solution 3: Verify organization access
# Visit: https://www.npmjs.com/org/unipay/members
```

### Issue: "Package name already exists"

```bash
# Solution: Package names in NPM are unique
# Use scoped package: @your-org/package-name
# Update package.json: "name": "@your-org/unipay-core"
```

### Issue: "version already published"

```bash
# Solution: Increment version
npm version patch

# Or unpublish (within 72 hours only)
npm unpublish @unipay/core@0.1.0
```

### Issue: "Invalid package.json"

```bash
# Solution: Validate package.json
cat package.json | jq .

# Check required fields
cat package.json | jq '{name, version, main, types}'
```

### Issue: "Build artifacts missing"

```bash
# Solution: Ensure build before publish
pnpm build

# Verify dist folder exists
ls -la dist/

# Check package.json "files" field includes dist
cat package.json | jq .files
```

---

## Best Practices

### 1. Always Test Before Publishing

```bash
# Use npm pack to test package contents
npm pack
tar -xzf unipay-core-0.1.0.tgz
ls -la package/
```

### 2. Use --dry-run Flag

```bash
# Preview publish without actually publishing
npm publish --dry-run
```

### 3. Tag Releases

```bash
# Create git tag for release
git tag -a v0.1.0 -m "Release version 0.1.0"
git push origin v0.1.0
```

### 4. Update Documentation

```bash
# Update README with new version
# Update CHANGELOG with release notes
# Update migration guides if needed
```

### 5. Announce Release

```bash
# Create GitHub release
gh release create v0.1.0 --notes "Release notes here"

# Tweet/share on social media
# Update website documentation
```

---

## CI/CD Publishing

For automated publishing via GitHub Actions, see:
- [CI/CD Setup Guide](./docs/ci-cd-setup.md)
- [Release Workflow](./.github/workflows/publish.yml)

---

## Questions or Issues?

- **NPM Registry Issues**: https://npm.community/
- **UniPay Issues**: https://github.com/Pushparaj13811/unipay/issues
- **Publishing Help**: https://docs.npmjs.com/cli/v9/commands/npm-publish

---

**Last Updated**: December 2025
**Maintained by**: UniPay Contributors
