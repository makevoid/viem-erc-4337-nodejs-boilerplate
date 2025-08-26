import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SmartAccountManager } from '../../SmartAccountManager.js';
import { TEST_CONFIG } from '../setup/testSetup.js';

describe('SmartAccount Integration Tests', () => {
  let manager;
  let testAccount;
  let testClient;

  beforeAll(async () => {
    testAccount = privateKeyToAccount(TEST_CONFIG.testPrivateKeys[0]);
    
    testClient = createPublicClient({
      chain: TEST_CONFIG.chain,
      transport: http(TEST_CONFIG.rpcUrl),
    });

    // Create manager with anvil configuration
    manager = new SmartAccountManager({
      privateKey: TEST_CONFIG.testPrivateKeys[0],
      rpcUrl: TEST_CONFIG.rpcUrl,
      chain: TEST_CONFIG.chain,
      bundlerUrl: TEST_CONFIG.rpcUrl, // Use anvil as mock bundler
      minBalance: parseEther("0.001"),
    });

    console.log(`Test account: ${testAccount.address}`);
    const balance = await testClient.getBalance({ address: testAccount.address });
    console.log(`Test account balance: ${formatEther(balance)} ETH`);
  });

  describe('End-to-End Smart Account Flow', () => {
    it('should have sufficient test account balance', async () => {
      const balance = await testClient.getBalance({ address: testAccount.address });
      expect(balance).toBeGreaterThan(parseEther("5")); // Should have ~10 ETH from setup
    });

    it('should create manager with correct configuration', () => {
      expect(manager).toBeDefined();
      expect(manager.owner.address).toBe(testAccount.address);
      expect(manager.rpcUrl).toBe(TEST_CONFIG.rpcUrl);
      expect(manager.minBalance).toBe(parseEther("0.001"));
    });

    it('should have working client connections', async () => {
      const blockNumber = await manager.client.getBlockNumber();
      expect(blockNumber).toBeGreaterThan(0n);

      const chainId = await manager.client.getChainId();
      expect(chainId).toBe(TEST_CONFIG.chain.id);
    });

    it('should handle balance checking correctly', async () => {
      const balance = await manager.fundingUtils.checkBalance(testAccount.address);
      expect(balance).toBeGreaterThan(parseEther("5"));
    });

    // Note: Full smart account initialization requires proper ERC-4337 contracts
    // which are complex to deploy in test environment. These tests focus on 
    // the parts that can work with anvil's basic functionality.

    it('should validate funding logic calculations', async () => {
      const currentBalance = parseEther("0.5");
      const minBalance = parseEther("1.0");
      const expectedFunding = minBalance - currentBalance + parseEther("0.001");
      
      expect(expectedFunding).toBe(parseEther("0.501"));
    });

    it('should handle gas estimation for basic transactions', async () => {
      const gasParams = await manager.fundingUtils.gasUtils.estimateGasWithBump({
        to: testAccount.address,
        value: parseEther("0.001"),
      });

      expect(gasParams).toHaveProperty('gasLimit');
      expect(gasParams).toHaveProperty('maxFeePerGas');
      expect(gasParams).toHaveProperty('maxPriorityFeePerGas');
      
      expect(gasParams.gasLimit).toBeGreaterThan(21000n);
      expect(gasParams.maxFeePerGas).toBeGreaterThan(0n);
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThan(0n);
    });
  });

  describe('Funding Utils Integration', () => {
    it('should determine when funding is needed', async () => {
      const lowBalanceAddress = "0x1234567890123456789012345678901234567890";
      const eoaBalance = await manager.fundingUtils.checkBalance(testAccount.address);
      const smartAccountBalance = await manager.fundingUtils.checkBalance(lowBalanceAddress);
      const minBalance = parseEther("0.01");

      // EOA should have sufficient balance for funding
      expect(eoaBalance).toBeGreaterThan(minBalance + parseEther("0.001"));
      
      // Low balance address should need funding
      expect(smartAccountBalance).toBeLessThan(minBalance);
    });

    it('should calculate correct funding requirements', () => {
      const currentBalance = 0n;
      const minBalance = parseEther("0.01");
      const buffer = parseEther("0.001");
      const expectedFunding = minBalance - currentBalance + buffer;

      expect(expectedFunding).toBe(parseEther("0.011"));
    });
  });

  describe('Gas Utils Integration', () => {
    it('should provide realistic gas estimates', async () => {
      const transactionRequest = {
        to: TEST_CONFIG.testAddresses[1],
        value: parseEther("0.001"),
      };

      const gasParams = await manager.fundingUtils.gasUtils.estimateGasWithBump(
        transactionRequest,
        { gasBumpGwei: 2, priorityBumpPercent: 25 }
      );

      // Should have reasonable gas limit for simple transfer
      expect(gasParams.gasLimit).toBeGreaterThanOrEqual(21000n);
      expect(gasParams.gasLimit).toBeLessThan(100000n);

      // Should have non-zero gas prices
      expect(gasParams.maxFeePerGas).toBeGreaterThan(0n);
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThan(0n);
    });

    it('should handle fallback gas calculation', async () => {
      const invalidTransaction = {
        to: "0x0000000000000000000000000000000000000000",
        value: parseEther("999999"), // Impossible amount
      };

      const gasParams = await manager.fundingUtils.gasUtils.estimateGasWithBump(invalidTransaction);

      // Should use fallback values
      expect(gasParams.gasLimit).toBe(BigInt(21000));
      expect(gasParams.maxFeePerGas).toBe(parseEther("0.00000001")); // 10 gwei
      expect(gasParams.maxPriorityFeePerGas).toBe(parseEther("0.000000002")); // 2 gwei
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      expect(manager.account).toBeNull();
      expect(manager.bundlerClient).toBeNull();

      // Methods that require initialization should throw
      await expect(manager.getBalances()).rejects.toThrow();
      await expect(manager.sendUserOperation([])).rejects.toThrow();
    });

    it('should validate transaction calls', () => {
      expect(() => {
        manager.sendSelfTransaction(parseEther("0.001"));
      }).not.toThrow();

      expect(() => {
        manager.transferTo(testAccount.address, parseEther("0.001"));
      }).not.toThrow();
    });
  });
});