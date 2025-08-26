# viem-erc-4337-boilerplate

A Node.js application for experimenting with Ethereum Account Abstraction using **Solady Smart Accounts** and the Viem library with comprehensive testing on local Anvil blockchain.

## What This Project Does

This project demonstrates how to:
- Create and manage Smart Accounts (ERC-4337)
- Automatically fund smart accounts from EOA at startup if needed
- Execute user operations with optimized gas settings
- Handle self-funded transactions without requiring a paymaster

Just fund the EOA account that you load into the repo with test eths and you will be good to go to run the project.

## Lib files

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

## Smart Account Implementation

This project uses **Solady Smart Accounts** with:
- Real contract deployments via Foundry on local Anvil testing
- Deterministic address generation using salt parameter
- ERC-4337 compliant implementation with EntryPoint integration
- Factory pattern for efficient smart account creation

**Deployed Contract Addresses (Anvil):**
- EntryPoint: `0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f`
- Solady Factory: `0x7a2088a1bFc9d81c55368AE168C2C02570cB814F`
- Implementation: `0x4A679253410272dd5232B3Ff7cF5dbB88f295319`

For other supported smart account types, see: [Viem Account Implementations](https://github.com/wevm/viem/tree/main/src/account-abstraction/accounts/implementations)

## Testing

Comprehensive test suite with **56 tests** using Vitest and local Anvil blockchain:

```bash
# Run all tests (requires anvil running)
npm test

# Run tests with detailed output
npm run test:claude

# Run tests in watch mode
npm run test:watch

# Deploy contracts manually (optional - done automatically)
npm run test:setup
```

### Test Setup

**Prerequisites:** Start Anvil in a separate terminal:
```bash
anvil
```

### Test Architecture

**Real Contract Deployment:**
- Uses Foundry to deploy actual Solady ERC-4337 contracts
- EntryPoint, Factory, and Implementation contracts on local Anvil
- Automatic test account funding (10 ETH each)
- No mocking - full blockchain integration testing

**Test Structure:**
- `test/unit/` - Unit tests for `SmartAccountManager`, `FundingUtils`, `GasUtils`
- `test/integration/` - Complete integration tests with real smart accounts
- `test/foundry/` - Solady contract deployment via Forge
- `test/setup/` - Global test configuration and bootstrapping

**Coverage Areas:**
- ✅ Smart account initialization with deterministic addresses
- ✅ Automatic EOA → Smart Account funding logic
- ✅ Gas optimization with bumping strategies
- ✅ User operation preparation and execution
- ✅ Balance management and monitoring
- ✅ Error handling and network failures
- ✅ Multi-account scenarios and transfers

**Multi-Account Testing:**
The test suite creates multiple smart account managers to thoroughly test:
- **Different Owners**: Using separate EOA private keys (`testPrivateKeys[0]`, `testPrivateKeys[1]`)
- **Different Salt Values**: Same owner with different salts (`"0x0"`, `"0x1"`) creates different smart account addresses
- **Deterministic Behavior**: Same owner + same salt always generates the same smart account address
- **Inter-Account Operations**: Testing transfers between different smart accounts
- **Independent Management**: Each smart account maintains separate balances and operates independently

This mirrors real-world usage where users might create multiple smart accounts from a single EOA for different purposes (personal, business, savings, etc.).

**Test Features:**
- Real Solady contracts deployed fresh for each test run
- Parallel test execution with proper isolation
- Expected failure handling for incomplete bundler infrastructure
- Gas estimation testing with fallback scenarios


---

Say hi to [@makevoid](https://x.com/makevoid) on X (Twitter)
