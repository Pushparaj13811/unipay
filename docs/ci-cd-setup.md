# CI/CD Setup Guide - UniPay

This guide explains how to set up and use the Continuous Integration and Continuous Deployment (CI/CD) pipelines for UniPay.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Prerequisites](#prerequisites)
- [Setting Up Secrets](#setting-up-secrets)
- [CI Workflow](#ci-workflow)
- [Publish Workflow](#publish-workflow)
- [Triggering Releases](#triggering-releases)
- [Repository Settings](#repository-settings)
- [Troubleshooting](#troubleshooting)

---

## Overview

UniPay uses GitHub Actions for automated testing, building, and publishing. The CI/CD pipeline consists of:

1. **CI Workflow** (`.github/workflows/ci.yml`): Runs on every push and pull request
2. **Publish Workflow** (`.github/workflows/publish.yml`): Runs when a release is published

### Workflow Diagram

```
Push/PR → CI Workflow → Test → Type Check → Build
                          ↓
                       Success ✓

Release Published → Publish Workflow → Test → Build → Publish to NPM
                                                         ↓
                                                      Success ✓
```

---

## GitHub Actions Workflows

### 1. CI Workflow

**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop` branches

**Jobs**:
- **test**: Runs tests on Node.js 18.x, 20.x, and 22.x
  - Checkout code
  - Setup pnpm
  - Install dependencies
  - Lint check (optional)
  - Type check
  - Run unit tests
  - Build packages
  - Upload coverage reports (Node 20.x only)

- **integration-test**: Runs integration tests (main branch only)
  - Requires test API keys in secrets
  - Uses Stripe and Razorpay test credentials

- **security**: Runs security audits
  - pnpm audit
  - Snyk vulnerability scanning (optional)

### 2. Publish Workflow

**File**: `.github/workflows/publish.yml`

**Triggers**:
- GitHub release published

**Jobs**:
- **publish**: Publishes all packages to NPM
  - Run tests
  - Build packages
  - Publish @uniipay/core
  - Publish @uniipay/orchestrator
  - Publish @uniipay/adapter-stripe
  - Publish @uniipay/adapter-razorpay
  - Create publication summary

---

## Prerequisites

Before setting up CI/CD, ensure you have:

1. **GitHub Repository**: UniPay repository on GitHub
2. **NPM Account**: Account with access to @uniipay organization
3. **NPM Token**: Automation token with publish permissions
4. **Test API Keys**: Stripe and Razorpay test credentials (for integration tests)

---

## Setting Up Secrets

GitHub secrets store sensitive information securely. Set up the following secrets:

### Required Secrets

#### 1. NPM_TOKEN (Required for Publishing)

**Purpose**: Authenticate with NPM registry for publishing packages

**How to get**:
```bash
# Login to NPM
npm login

# Create automation token
# Visit: https://www.npmjs.com/settings/[username]/tokens/create
# Select "Automation" token type
# Copy the generated token
```

**Add to GitHub**:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Paste your NPM automation token
5. Click "Add secret"

#### 2. STRIPE_TEST_KEY (Optional - for Integration Tests)

**Purpose**: Run Stripe integration tests in CI

**How to get**:
```bash
# Visit Stripe Dashboard
# https://dashboard.stripe.com/test/apikeys
# Copy "Secret key" (starts with sk_test_)
```

**Add to GitHub**:
1. Settings → Secrets and variables → Actions
2. Name: `STRIPE_TEST_KEY`
3. Value: Your Stripe test secret key (sk_test_...)

#### 3. RAZORPAY_TEST_KEY (Optional - for Integration Tests)

**Purpose**: Run Razorpay integration tests in CI

**How to get**:
```bash
# Visit Razorpay Dashboard
# https://dashboard.razorpay.com/app/keys
# Copy "Key ID" from Test Mode
```

**Add to GitHub**:
1. Settings → Secrets and variables → Actions
2. Name: `RAZORPAY_TEST_KEY`
3. Value: Your Razorpay test key ID (rzp_test_...)

#### 4. RAZORPAY_TEST_SECRET (Optional - for Integration Tests)

**Purpose**: Run Razorpay integration tests in CI

**How to get**:
```bash
# Visit Razorpay Dashboard
# https://dashboard.razorpay.com/app/keys
# Copy "Key Secret" from Test Mode
```

**Add to GitHub**:
1. Settings → Secrets and variables → Actions
2. Name: `RAZORPAY_TEST_SECRET`
3. Value: Your Razorpay test key secret

#### 5. SNYK_TOKEN (Optional - for Security Scanning)

**Purpose**: Run Snyk vulnerability scanning

**How to get**:
```bash
# Create Snyk account: https://snyk.io/signup
# Visit: https://app.snyk.io/account
# Copy your API token
```

**Add to GitHub**:
1. Settings → Secrets and variables → Actions
2. Name: `SNYK_TOKEN`
3. Value: Your Snyk API token

### Verify Secrets

```bash
# Check secrets are configured (won't show values)
# Visit: https://github.com/Pushparaj13811/unipay/settings/secrets/actions
```

---

## CI Workflow

### What It Does

The CI workflow ensures code quality on every push and pull request.

### Workflow Steps

1. **Checkout**: Clones the repository
2. **Setup**: Installs pnpm 10.27.0 and Node.js
3. **Install**: Runs `pnpm install --frozen-lockfile`
4. **Lint**: Runs `pnpm lint` (optional)
5. **Type Check**: Runs `pnpm typecheck`
6. **Test**: Runs `pnpm test`
7. **Build**: Runs `pnpm build`
8. **Coverage**: Uploads coverage to Codecov (Node 20.x)

### When It Runs

- **Push Events**:
  - Branch: `main`, `develop`, or `feature/**`
  - Triggers on every commit to these branches

- **Pull Request Events**:
  - Target: `main` or `develop`
  - Runs on PR open, synchronize, or reopen

### Matrix Testing

Tests run on multiple Node.js versions:
- Node.js 18.x (LTS)
- Node.js 20.x (LTS)
- Node.js 22.x (Current)

### Integration Tests

Integration tests run only on `main` branch pushes:
- Requires API secrets configured
- Tests real Stripe and Razorpay API calls
- Uses test mode credentials
- Marked as `continue-on-error: true` (won't fail build if secrets missing)

### Security Audit

Runs on every CI execution:
- `pnpm audit --audit-level=moderate`
- Snyk vulnerability scanning (if token configured)
- Both marked as `continue-on-error: true`

### Viewing CI Results

```bash
# View workflow runs
# Visit: https://github.com/Pushparaj13811/unipay/actions

# Check specific run
# Click on workflow run → View job logs

# Check test results
# CI run → test job → Run unit tests
```

---

## Publish Workflow

### What It Does

Automatically publishes all UniPay packages to NPM when a GitHub release is published.

### Workflow Steps

1. **Checkout**: Clones the repository at the release tag
2. **Setup**: Installs pnpm and Node.js 20.x
3. **Install**: Runs `pnpm install --frozen-lockfile`
4. **Test**: Runs `pnpm test` (ensures all tests pass)
5. **Build**: Runs `pnpm build` (creates dist/ folders)
6. **Publish Core**: Publishes `@uniipay/core` to NPM
7. **Publish Orchestrator**: Publishes `@uniipay/orchestrator` to NPM
8. **Publish Stripe**: Publishes `@uniipay/adapter-stripe` to NPM
9. **Publish Razorpay**: Publishes `@uniipay/adapter-razorpay` to NPM
10. **Summary**: Creates publication summary in GitHub

### Publication Order

Packages are published in dependency order:
1. `@uniipay/core` (no dependencies)
2. `@uniipay/orchestrator` (depends on core)
3. `@uniipay/adapter-stripe` (depends on core)
4. `@uniipay/adapter-razorpay` (depends on core)

### NPM Provenance

All packages are published with `--provenance` flag:
- Links NPM package to GitHub source
- Provides transparency and security
- Requires `id-token: write` permission

### Viewing Publish Results

```bash
# View publish workflow run
# Visit: https://github.com/Pushparaj13811/unipay/actions/workflows/publish.yml

# Check published packages
npm view @uniipay/core
npm view @uniipay/orchestrator
npm view @uniipay/adapter-stripe
npm view @uniipay/adapter-razorpay
```

---

## Triggering Releases

### Automated Publishing

Publishing is triggered by creating a GitHub release.

### Step-by-Step Release Process

#### 1. Update Versions

```bash
# From project root

# Update version in all packages
cd packages/core && npm version patch && cd ../..
cd packages/orchestrator && npm version patch && cd ../..
cd packages/adapters/stripe && npm version patch && cd ../../..
cd packages/adapters/razorpay && npm version patch && cd ../../..

# Or use specific version
cd packages/core && npm version 0.2.0 && cd ../..
```

#### 2. Update CHANGELOG

```bash
# Edit CHANGELOG.md
# Add release notes:
## [0.2.0] - 2026-01-08

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Breaking changes (if any)
```

#### 3. Commit Changes

```bash
# Commit version bumps and changelog
git add .
git commit -m "chore: Bump version to 0.2.0"
git push origin main
```

#### 4. Create Git Tag

```bash
# Create annotated tag
git tag -a v0.2.0 -m "Release version 0.2.0"

# Push tag
git push origin v0.2.0
```

#### 5. Create GitHub Release

**Option A: Using GitHub CLI**

```bash
# Install gh CLI if not installed
# https://cli.github.com/

# Create release
gh release create v0.2.0 \
  --title "v0.2.0" \
  --notes "## What's Changed

- Added new feature X
- Fixed bug Y
- Updated dependencies

See [CHANGELOG.md](./CHANGELOG.md) for full details."
```

**Option B: Using GitHub Web UI**

1. Visit: `https://github.com/Pushparaj13811/unipay/releases/new`
2. Select tag: `v0.2.0`
3. Release title: `v0.2.0`
4. Description: Copy from CHANGELOG
5. Click "Publish release"

#### 6. Monitor Publish Workflow

```bash
# Watch workflow execution
# Visit: https://github.com/Pushparaj13811/unipay/actions

# Wait for green checkmark ✓
# Check each publish step completed successfully
```

#### 7. Verify Publication

```bash
# Check packages on NPM
open https://www.npmjs.com/package/@uniipay/core
open https://www.npmjs.com/package/@uniipay/orchestrator
open https://www.npmjs.com/package/@uniipay/adapter-stripe
open https://www.npmjs.com/package/@uniipay/adapter-razorpay

# Test installation
mkdir test-unipay && cd test-unipay
npm init -y
npm install @uniipay/core@0.2.0
node -e "console.log(require('@uniipay/core'))"
```

### Pre-release Versions

For pre-release versions (alpha, beta, rc):

```bash
# Create pre-release version
npm version prerelease --preid=beta  # 0.1.0 → 0.1.1-beta.0

# Create GitHub pre-release
gh release create v0.1.1-beta.0 \
  --title "v0.1.1-beta.0" \
  --notes "Beta release for testing" \
  --prerelease

# Publish with beta tag (manual, not automated)
cd packages/core
npm publish --tag beta --access public
```

---

## Repository Settings

### Required Repository Permissions

#### 1. Actions Permissions

**Path**: Settings → Actions → General

**Settings**:
- **Actions permissions**: "Allow all actions and reusable workflows"
- **Workflow permissions**:
  - ✓ Read and write permissions
  - ✓ Allow GitHub Actions to create and approve pull requests
- **Fork pull request workflows**: "Require approval for first-time contributors"

#### 2. Branch Protection (Optional but Recommended)

**Path**: Settings → Branches → Add rule

**For `main` branch**:
```yaml
Branch name pattern: main

Protection rules:
✓ Require a pull request before merging
  ✓ Require approvals: 1
✓ Require status checks to pass before merging
  ✓ Require branches to be up to date before merging
  Status checks required:
    - test (18.x)
    - test (20.x)
    - test (22.x)
✓ Require conversation resolution before merging
✓ Include administrators
```

#### 3. Environment Protection (Optional)

**Path**: Settings → Environments → New environment

**For `production` environment**:
```yaml
Name: production

Protection rules:
✓ Required reviewers: 1
✓ Wait timer: 5 minutes
✓ Deployment branches: Selected branches (main only)
```

### Notifications

**Path**: Settings → Notifications

**Recommended**:
- Enable notifications for workflow failures
- Subscribe to release notifications
- Enable security alerts

---

## Troubleshooting

### Issue 1: CI Workflow Fails on Type Check

**Error**:
```
Error: TypeScript compilation failed
```

**Solution**:
```bash
# Run type check locally
pnpm typecheck

# Fix type errors
# Commit fixes
git add .
git commit -m "fix: Resolve TypeScript errors"
git push
```

### Issue 2: Publish Workflow Fails - NPM Authentication

**Error**:
```
npm ERR! code ENEEDAUTH
npm ERR! need auth This command requires you to be logged in.
```

**Solution**:
```bash
# Check NPM_TOKEN secret is configured
# Visit: https://github.com/Pushparaj13811/unipay/settings/secrets/actions

# Verify token is valid
npm login
npm whoami

# Create new automation token if needed
# Visit: https://www.npmjs.com/settings/[username]/tokens
```

### Issue 3: Package Already Published

**Error**:
```
npm ERR! 403 You cannot publish over the previously published versions
```

**Solution**:
```bash
# Version wasn't bumped before release
# Delete the GitHub release
gh release delete v0.1.0

# Delete the tag
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0

# Bump versions
cd packages/core && npm version patch && cd ../..
# ... repeat for all packages

# Commit and create new release
git add .
git commit -m "chore: Bump versions"
git push
git tag -a v0.1.1 -m "Release 0.1.1"
git push origin v0.1.1
gh release create v0.1.1 --title "v0.1.1" --notes "Release notes"
```

### Issue 4: Tests Fail in CI but Pass Locally

**Error**:
```
FAIL packages/core/src/__tests__/error-hierarchy.test.ts
```

**Solution**:
```bash
# Check Node.js version matches CI
node --version  # Should be 18.x, 20.x, or 22.x

# Install exact dependencies
pnpm install --frozen-lockfile

# Run tests with same command as CI
pnpm test

# Check for environment-specific issues
# - Timezone differences
# - File path differences (Windows vs Linux)
# - Environment variables
```

### Issue 5: Integration Tests Fail - Missing Credentials

**Error**:
```
Error: Missing STRIPE_TEST_KEY environment variable
```

**Solution**:
```bash
# Integration tests are optional in CI
# Marked as continue-on-error: true

# To fix, add secrets:
# Visit: https://github.com/Pushparaj13811/unipay/settings/secrets/actions
# Add STRIPE_TEST_KEY, RAZORPAY_TEST_KEY, RAZORPAY_TEST_SECRET

# Or run integration tests locally
export STRIPE_TEST_KEY=sk_test_...
export RAZORPAY_TEST_KEY=rzp_test_...
export RAZORPAY_TEST_SECRET=...
pnpm test:integration
```

### Issue 6: Coverage Upload Fails

**Error**:
```
Error: Unable to upload coverage to Codecov
```

**Solution**:
```bash
# Coverage upload is optional (continue-on-error: true)
# To fix, configure Codecov:

# 1. Sign up at https://codecov.io/
# 2. Add repository
# 3. Get upload token
# 4. Add CODECOV_TOKEN secret to GitHub
# 5. Update ci.yml to use token:
#    uses: codecov/codecov-action@v4
#    with:
#      token: ${{ secrets.CODECOV_TOKEN }}
```

### Issue 7: pnpm Version Mismatch

**Error**:
```
ERR_PNPM_BAD_PM_VERSION  This project requires pnpm version 10.27.0
```

**Solution**:
```bash
# CI uses pnpm@10.27.0 as specified in:
# - package.json: "packageManager": "pnpm@10.27.0"
# - workflows: version: 10.27.0

# Update local pnpm version
npm install -g pnpm@10.27.0

# Or use corepack
corepack enable
corepack prepare pnpm@10.27.0 --activate
```

### Issue 8: Workflow Not Triggering

**Error**:
Workflow doesn't run on push/PR/release

**Solution**:
```bash
# Check workflow file syntax
# Use GitHub Actions extension for VS Code

# Verify trigger conditions
# - Branch name matches pattern
# - Release is "published" not "created"

# Check Actions permissions
# Settings → Actions → General
# Ensure "Allow all actions" is selected

# Force trigger workflow
gh workflow run ci.yml --ref main
```

### Issue 9: Security Audit Warnings

**Error**:
```
found 3 moderate severity vulnerabilities
```

**Solution**:
```bash
# Review vulnerabilities
pnpm audit

# Fix automatically if possible
pnpm audit fix

# Update specific package
pnpm update package-name

# If no fix available, evaluate risk
# - Is it in devDependencies only?
# - Does it affect production code?
# - Is there a workaround?

# Create issue to track
gh issue create --title "Security: Update vulnerable dependency"
```

---

## Best Practices

### 1. Test Locally Before Pushing

```bash
# Run full test suite
pnpm typecheck
pnpm test
pnpm build

# Verify everything passes before pushing
```

### 2. Use Conventional Commits

```bash
# CI/CD works better with clear commit messages
git commit -m "feat: Add new payment method"
git commit -m "fix: Resolve webhook signature validation"
git commit -m "chore: Update dependencies"
```

### 3. Version Consistency

```bash
# Keep all package versions in sync
# Use same version across core, orchestrator, and adapters
# Update peerDependencies to match
```

### 4. CHANGELOG Maintenance

```bash
# Update CHANGELOG.md with every release
# Follow Keep a Changelog format
# https://keepachangelog.com/
```

### 5. Pre-release Testing

```bash
# Test packages before releasing
npm pack
tar -xzf unipay-core-0.1.0.tgz
ls -la package/

# Install in test project
mkdir test-project && cd test-project
npm init -y
npm install ../packages/core/unipay-core-0.1.0.tgz
```

### 6. Monitor CI/CD Runs

```bash
# Subscribe to workflow notifications
# Check status before merging PRs
# Review failed runs immediately
```

### 7. Rotate Secrets Regularly

```bash
# Update NPM tokens every 90 days
# Rotate API keys periodically
# Remove unused secrets
```

---

## Additional Resources

- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **NPM Publishing Guide**: https://docs.npmjs.com/cli/v9/commands/npm-publish
- **Semantic Versioning**: https://semver.org/
- **Conventional Commits**: https://www.conventionalcommits.org/
- **pnpm Workspaces**: https://pnpm.io/workspaces
- **Codecov**: https://docs.codecov.com/docs

---

## Support

For issues with CI/CD setup:
- **GitHub Issues**: https://github.com/Pushparaj13811/unipay/issues
- **GitHub Actions Community**: https://github.community/c/github-actions
- **NPM Support**: https://npm.community/

---

**Last Updated**: January 2026
**Maintained by**: UniPay Contributors
