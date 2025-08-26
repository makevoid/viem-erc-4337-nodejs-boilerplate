import { beforeEach } from 'vitest';
import { createPublicClient, http } from 'viem';
import { anvil } from 'viem/chains';

// Test configuration
export const TEST_CONFIG = {
  rpcUrl: "http://127.0.0.1:8545",
  chain: anvil,
  // Test private keys from anvil's default accounts
  testPrivateKeys: [
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account #1
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account #2
  ],
  testAddresses: [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1 
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2
  ],
};

// Create test client
export const testClient = createPublicClient({
  chain: TEST_CONFIG.chain,
  transport: http(TEST_CONFIG.rpcUrl),
});

beforeEach(async () => {
  // Reset anvil state before each test if needed
  // await testClient.request({ method: 'anvil_reset' });
});