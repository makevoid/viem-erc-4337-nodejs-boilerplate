# viem-erc-4337-boilerplate

A Node.js application for experimenting with Ethereum Account Abstraction using Coinbase Smart Accounts / Solady Smart Accounts and the Viem library.

## What This Project Does

This project demonstrates how to:
- Create and manage Coinbase Smart Accounts (ERC-4337)
- Automatically fund smart accounts from EOA when needed
- Execute user operations with optimized gas settings
- Handle self-funded transactions without requiring a paymaster

## Architecture

The project follows a modular OOP design:

- **`SmartAccountManager`**: Main class that orchestrates smart account operations
- **`FundingUtils`**: Handles automatic funding of smart accounts from EOA
- **`GasUtils`**: Provides gas estimation with bumping logic for reliable transactions
- **`main.js`**: Example usage showing a self-transaction

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from the sample:
   ```bash
   cp .env.sample .env
   ```

3. Configure your environment variables in `.env`:
   ```
   PIMLICO_API_KEY=your_pimlico_api_key_here
   PRIVATE_KEY=0x...your_private_key_here
   ```

## Usage

### Basic Example

```bash
npm start
```

This runs the main example which:
1. Creates a smart account
2. Displays EOA and smart account balances
3. Automatically funds the smart account if needed
4. Executes a 0.001 ETH self-transaction
5. Shows final balances

### Programmatic Usage

```javascript
import { SmartAccountManager } from "./SmartAccountManager.js";
import { parseEther } from "viem";

const manager = new SmartAccountManager({
  minBalance: parseEther("0.005"), // Custom minimum balance
  rpcUrl: "https://your-custom-rpc.com", // Optional custom RPC
});

await manager.initialize();
await manager.displayBalances();

// Send to any address
await manager.transferTo("0x...", parseEther("0.001"));
```

## Key Features

### Automatic Funding
- Smart accounts are automatically funded from your EOA when balance falls below minimum threshold
- Configurable minimum balance (default: 0.01 ETH)
- Includes extra gas buffer for transactions

### Gas Optimization
- Automatic gas estimation with bumping (+3 gwei max fee, +20% priority fee)
- Fallback gas values if estimation fails
- Extended timeouts for reliable transaction confirmation

### Self-Funded Transactions
- No paymaster required - smart account pays its own transaction fees
- Uses Pimlico bundler infrastructure for ERC-4337 operations
- Proper gas estimation for user operations

## Network Configuration

Currently configured for **Ethereum Sepolia Testnet**:
- RPC: `https://ethereum-sepolia-rpc.publicnode.com`
- Bundler: `https://api.pimlico.io/v2/sepolia/rpc`
- Chain: Sepolia (chain ID: 11155111)

## Environment Variables

- `PIMLICO_API_KEY`: Your Pimlico API key for bundler services
- `PRIVATE_KEY`: Your EOA private key (will fund smart account operations)

## Switch to Solady Contracts

- TODO (readme will be updated with instructions to do so) - here is the list of the currently supported Viem contracts - [LIST](https://github.com/wevm/viem/tree/main/src/account-abstraction/accounts/implementations)

No tests are currently configured, but the project includes vitest as a dev dependency for future test implementation.

### Testing

The project includes comprehensive tests using Vitest with local Anvil integration:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Setup test contracts (optional - done automatically)
npm run test:setup
```

#### Test Setup

Tests use a local Anvil instance for blockchain simulation:

1. **Start Anvil** (in separate terminal):
   ```bash
   anvil
   ```

2. **Run Tests**:
   ```bash
   npm test
   ```

The test suite includes:
- **Unit Tests**: Individual class and utility testing
- **Integration Tests**: End-to-end smart account flows
- **Contract Deployment**: Automatic setup of required ERC-4337 contracts
- **Local Funding**: Test accounts are automatically funded with 10 ETH

#### Test Structure

- `test/setup/` - Global test configuration and contract deployment
- `test/unit/` - Unit tests for individual classes
- `test/integration/` - Integration tests with full blockchain simulation

Tests cover:
- Smart account manager functionality
- Automatic funding logic
- Gas optimization utilities
- Error handling and edge cases
- Network interaction patterns


---

Say hi to [@makevoid](https://x.com/makevoid) on X (Twitter)
