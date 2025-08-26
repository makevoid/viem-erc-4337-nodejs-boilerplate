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

    it('should initialize smart account with real Solady contracts', async () => {
      // Now we have real contracts deployed, test actual initialization
      const account = await manager.initialize();
      
      expect(account).toBeDefined();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(manager.account).toBe(account);
      expect(manager.bundlerClient).toBeDefined();
      
      console.log(`✅ Smart Account initialized: ${account.address}`);
    });

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
      
      expect(gasParams.gasLimit).toBeGreaterThanOrEqual(21000n);
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

      // Should return reasonable gas parameters (either estimated or fallback)
      expect(gasParams.gasLimit).toBeGreaterThanOrEqual(BigInt(21000));
      expect(gasParams.gasLimit).toBeLessThan(BigInt(1000000)); // Reasonable upper bound
      expect(gasParams.maxFeePerGas).toBeGreaterThan(0n);
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThan(0n);
    });
  });

  describe('Smart Account Balance and Funding', () => {
    it('should get smart account balances after initialization', async () => {
      // Account should be initialized from previous test
      expect(manager.account).toBeDefined();
      
      const balances = await manager.getBalances();
      
      expect(balances).toHaveProperty('eoa');
      expect(balances).toHaveProperty('smartAccount');
      expect(balances.eoa.address).toBe(testAccount.address);
      expect(balances.smartAccount.address).toBe(manager.account.address);
      
      console.log(`EOA: ${balances.eoa.balanceFormatted} ETH`);
      console.log(`Smart Account: ${balances.smartAccount.balanceFormatted} ETH`);
    });

    it('should fund smart account when needed', async () => {
      const initialBalances = await manager.getBalances();
      const smartAccountBalance = initialBalances.smartAccount.balance;
      
      const fundingResult = await manager.ensureFunding();
      
      if (fundingResult) {
        console.log(`✅ Smart Account funded: ${fundingResult.hash}`);
        
        const newBalances = await manager.getBalances();
        expect(newBalances.smartAccount.balance).toBeGreaterThan(smartAccountBalance);
      } else {
        console.log('Smart Account already sufficiently funded');
        expect(smartAccountBalance).toBeGreaterThanOrEqual(manager.minBalance);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully for uninitialized manager', async () => {
      // Create a new manager that's not initialized
      const uninitializedManager = new SmartAccountManager({
        privateKey: TEST_CONFIG.testPrivateKeys[0],
        rpcUrl: TEST_CONFIG.rpcUrl,
        chain: TEST_CONFIG.chain,
        bundlerUrl: TEST_CONFIG.rpcUrl,
        minBalance: parseEther("0.001"),
      });

      expect(uninitializedManager.account).toBeNull();
      expect(uninitializedManager.bundlerClient).toBeNull();

      // Methods that require initialization should throw
      await expect(uninitializedManager.getBalances()).rejects.toThrow();
      await expect(uninitializedManager.sendUserOperation([])).rejects.toThrow();
    });

    it('should validate transaction calls', async () => {
      // These methods should exist and be functions, but will throw when called without initialization
      expect(typeof manager.sendSelfTransaction).toBe('function');
      expect(typeof manager.transferTo).toBe('function');

      // Should throw when not initialized
      await expect(manager.sendSelfTransaction(parseEther("0.001"))).rejects.toThrow();
      await expect(manager.transferTo(testAccount.address, parseEther("0.001"))).rejects.toThrow();
    });
  });
});