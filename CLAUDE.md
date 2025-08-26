# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Current Status:** Fully migrated to Solady Smart Accounts with comprehensive testing (56 tests) on local Anvil blockchain with real contract deployments.

## Common Commands

- `npm start` - Runs the main smart account demo
- `npm test` - Runs optimized test suite with 56 tests (requires `anvil` running)
- `npm run test:claude` - Runs tests with detailed output and --bail=1 for sequential fixing
- `npm run test:watch` - Runs tests in watch mode
- `npm run test:setup` - Manually deploy Solady contracts to Anvil via Foundry
- `npm install` - Installs dependencies
- `node main.js` - Direct execution of the main example

### Test Commands

**IMPORTANT:** Start Anvil before running tests:
```bash
anvil
```

Tests automatically deploy real Solady ERC-4337 contracts via Foundry and fund test accounts with 10 ETH each.

## Architecture Overview

This is an Account Abstraction (ERC-4337) project using **Solady Smart Accounts** with a modular OOP design and comprehensive testing on local Anvil blockchain:

### Core Classes

- **`SmartAccountManager`** - Main orchestrator class that:
  - Initializes Viem clients (public, wallet, bundler) 
  - Creates Solady smart accounts using `toSoladySmartAccount` with deterministic addresses
  - Manages the complete user operation lifecycle
  - Handles both EOA and smart account balance tracking
  - Coordinates automatic funding and gas optimization
  - Supports salt parameter for multiple accounts per EOA

- **`FundingUtils`** (utils/funding.js) - Automatic funding system:
  - Monitors smart account balance vs configurable minimum threshold
  - Transfers ETH from EOA to smart account when needed
  - Uses `GasUtils` for optimized funding transactions
  - Prevents insufficient balance errors in user operations

- **`GasUtils`** (utils/gasUtils.js) - Gas estimation and optimization:
  - Bumps gas prices (+3 gwei max fee, +20% priority fee) for faster inclusion
  - Provides fallback gas values when estimation fails
  - Handles transaction timeouts with configurable limits

### Key Architecture Patterns

1. **Client Management**: Separates public client (read operations) from wallet client (transactions) and bundler client (user operations)

2. **Automatic Funding Flow**: 
   - `ensureFunding()` → `FundingUtils.ensureFunding()` → `fundSmartAccount()` → `GasUtils.sendTransactionWithBump()`

3. **Self-Funded User Operations**: 
   - Uses Pimlico bundler without paymaster
   - Smart account pays its own gas fees from its ETH balance
   - Requires proper gas estimation for `callGasLimit`, `verificationGasLimit`, `preVerificationGas`

### Environment Configuration

**Production (Sepolia):**
- RPC: https://ethereum-sepolia-rpc.publicnode.com
- Bundler: https://api.pimlico.io/v2/sepolia/rpc (requires PIMLICO_API_KEY)
- Requires PRIVATE_KEY for EOA that funds smart account operations

**Testing (Anvil):**
- Local RPC: http://127.0.0.1:8545
- Real Solady contracts deployed via Foundry
- EntryPoint: `0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f`
- Factory: `0x7a2088a1bFc9d81c55368AE168C2C02570cB814F`
- Test accounts pre-funded with 10 ETH each

### Integration Points

- Viem v2.35.1 with account abstraction modules
- Solady ERC-4337 smart account implementation
- Pimlico infrastructure for ERC-4337 bundler services (production)
- Foundry for contract deployment and testing
- Vitest with 56 comprehensive tests covering all functionality
- Environment variables managed through dotenv

### Testing Architecture

**Contract Deployment:**
- Real Solady contracts deployed via Foundry's forge
- Custom SoladySmartAccount implementation (extends abstract ERC4337)
- EntryPoint, Factory, and Implementation contracts
- Deployed fresh for each test run on Anvil

**Test Coverage (56 tests):**
- Unit tests: SmartAccountManager, FundingUtils, GasUtils
- Integration tests: Complete smart account flows with real contracts
- Error handling: Network failures, insufficient balances, invalid operations
- Gas optimization: Estimation, bumping, fallback scenarios
- Multi-account: Deterministic address generation, transfers between accounts

When modifying this codebase, ensure gas estimation and automatic funding logic work together to prevent user operation failures. Run `npm run test:claude` to catch issues early with --bail=1 sequential testing.