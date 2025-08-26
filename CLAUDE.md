# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- `npm start` - Runs the main smart account demo
- `npm install` - Installs dependencies
- `node main.js` - Direct execution of the main example

## Architecture Overview

This is an Account Abstraction (ERC-4337) project using Coinbase Smart Accounts with a modular OOP design:

### Core Classes

- **`SmartAccountManager`** - Main orchestrator class that:
  - Initializes Viem clients (public, wallet, bundler) 
  - Creates Coinbase smart accounts using `toCoinbaseSmartAccount`
  - Manages the complete user operation lifecycle
  - Handles both EOA and smart account balance tracking
  - Coordinates automatic funding and gas optimization

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

- Uses Sepolia testnet by default
- RPC: https://ethereum-sepolia-rpc.publicnode.com
- Bundler: https://api.pimlico.io/v2/sepolia/rpc (requires PIMLICO_API_KEY)
- Requires PRIVATE_KEY for EOA that funds smart account operations

### Integration Points

- Viem v2.35.1 with account abstraction modules
- Pimlico infrastructure for ERC-4337 bundler services
- Coinbase Smart Account factory (version "1.1")
- Environment variables managed through dotenv

When modifying this codebase, ensure gas estimation and automatic funding logic work together to prevent user operation failures.