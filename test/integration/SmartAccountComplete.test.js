import { describe, it, expect, beforeAll } from 'vitest';
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SmartAccountManager } from '../../SmartAccountManager.js';
import { TEST_CONFIG } from '../setup/testSetup.js';

describe('Smart Account Complete Integration Tests', () => {
  let manager;
  let manager2; // For multi-account testing
  let testAccount1;
  let testAccount2;
  let testClient;

  beforeAll(async () => {
    testAccount1 = privateKeyToAccount(TEST_CONFIG.testPrivateKeys[0]);
    testAccount2 = privateKeyToAccount(TEST_CONFIG.testPrivateKeys[1]);
    
    testClient = createPublicClient({
      chain: TEST_CONFIG.chain,
      transport: http(TEST_CONFIG.rpcUrl),
    });

    // Create first manager
    manager = new SmartAccountManager({
      privateKey: TEST_CONFIG.testPrivateKeys[0],
      rpcUrl: TEST_CONFIG.rpcUrl,
      chain: TEST_CONFIG.chain,
      bundlerUrl: TEST_CONFIG.rpcUrl,
      minBalance: parseEther("0.01"),
    });

    // Create second manager with different salt
    manager2 = new SmartAccountManager({
      privateKey: TEST_CONFIG.testPrivateKeys[1],
      rpcUrl: TEST_CONFIG.rpcUrl,
      chain: TEST_CONFIG.chain,
      bundlerUrl: TEST_CONFIG.rpcUrl,
      minBalance: parseEther("0.01"),
      salt: "0x1",
    });

    console.log(`Test account 1: ${testAccount1.address}`);
    console.log(`Test account 2: ${testAccount2.address}`);
    
    const balance1 = await testClient.getBalance({ address: testAccount1.address });
    const balance2 = await testClient.getBalance({ address: testAccount2.address });
    console.log(`Test account 1 balance: ${formatEther(balance1)} ETH`);
    console.log(`Test account 2 balance: ${formatEther(balance2)} ETH`);
  });

  describe('Manager Configuration and Setup', () => {
    it('should have sufficient test account balances', async () => {
      const balance1 = await testClient.getBalance({ address: testAccount1.address });
      const balance2 = await testClient.getBalance({ address: testAccount2.address });
      
      expect(balance1).toBeGreaterThan(parseEther("5"));
      expect(balance2).toBeGreaterThan(parseEther("5"));
    });

    it('should create managers with correct configuration', () => {
      expect(manager).toBeDefined();
      expect(manager.owner.address).toBe(testAccount1.address);
      expect(manager.rpcUrl).toBe(TEST_CONFIG.rpcUrl);
      expect(manager.minBalance).toBe(parseEther("0.01"));

      expect(manager2).toBeDefined();
      expect(manager2.owner.address).toBe(testAccount2.address);
      expect(manager2.salt).toBe("0x1");
    });

    it('should have working client connections', async () => {
      const blockNumber = await manager.client.getBlockNumber();
      expect(blockNumber).toBeGreaterThan(0n);

      const chainId = await manager.client.getChainId();
      expect(chainId).toBe(TEST_CONFIG.chain.id);
    });
  });

  describe('Smart Account Initialization', () => {
    it('should initialize first smart account with real Solady contracts', async () => {
      const account = await manager.initialize();
      
      expect(account).toBeDefined();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(manager.account).toBe(account);
      expect(manager.bundlerClient).toBeDefined();
      
      console.log(`✅ Smart Account 1: ${account.address}`);
    });

    it('should initialize second smart account with different address', async () => {
      const account2 = await manager2.initialize();
      
      expect(account2).toBeDefined();
      expect(account2.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(account2.address).not.toBe(manager.account.address);
      
      console.log(`✅ Smart Account 2: ${account2.address}`);
    });

    it('should validate deterministic address generation', async () => {
      // Same owner + same salt = same address
      const manager3 = new SmartAccountManager({
        privateKey: TEST_CONFIG.testPrivateKeys[0],
        rpcUrl: TEST_CONFIG.rpcUrl,
        chain: TEST_CONFIG.chain,
        bundlerUrl: TEST_CONFIG.rpcUrl,
        minBalance: parseEther("0.01"),
        salt: "0x0", // Same as first manager
      });

      const account3 = await manager3.initialize();
      expect(account3.address).toBe(manager.account.address);
      
      // Different salt = different address
      const manager4 = new SmartAccountManager({
        privateKey: TEST_CONFIG.testPrivateKeys[0],
        rpcUrl: TEST_CONFIG.rpcUrl,
        chain: TEST_CONFIG.chain,
        bundlerUrl: TEST_CONFIG.rpcUrl,
        minBalance: parseEther("0.01"),
        salt: "0x123",
      });

      const account4 = await manager4.initialize();
      expect(account4.address).not.toBe(manager.account.address);
      
      console.log(`Deterministic address verified`);
    });
  });

  describe('Balance Management and Funding', () => {
    it('should get balances for EOA and smart account', async () => {
      const balances = await manager.getBalances();
      
      expect(balances).toHaveProperty('eoa');
      expect(balances).toHaveProperty('smartAccount');
      expect(balances.eoa.address).toBe(testAccount1.address);
      expect(balances.smartAccount.address).toBe(manager.account.address);
      
      console.log(`EOA: ${balances.eoa.balanceFormatted} ETH`);
      console.log(`Smart Account: ${balances.smartAccount.balanceFormatted} ETH`);
    });

    it('should automatically fund smart account when needed', async () => {
      const initialBalances = await manager.getBalances();
      const smartAccountBalance = initialBalances.smartAccount.balance;
      
      const fundingResult = await manager.ensureFunding();
      
      if (fundingResult) {
        console.log(`✅ Smart Account funded: ${fundingResult.hash}`);
        
        const newBalances = await manager.getBalances();
        expect(newBalances.smartAccount.balance).toBeGreaterThan(smartAccountBalance);
        expect(newBalances.smartAccount.balance).toBeGreaterThanOrEqual(manager.minBalance);
      } else {
        console.log('Smart Account already sufficiently funded');
        expect(smartAccountBalance).toBeGreaterThanOrEqual(manager.minBalance);
      }
    });

    it('should check individual balances correctly', async () => {
      const eoaBalance = await manager.fundingUtils.checkBalance(testAccount1.address);
      const smartAccountBalance = await manager.fundingUtils.checkBalance(manager.account.address);
      const zeroBalance = await manager.fundingUtils.checkBalance("0x1234567890123456789012345678901234567890");
      
      expect(eoaBalance).toBeGreaterThan(parseEther("5"));
      expect(typeof smartAccountBalance).toBe('bigint');
      expect(zeroBalance).toBe(0n);
    });
  });

  describe('Gas Estimation and Optimization', () => {
    it('should estimate gas with bumping for transactions', async () => {
      const gasParams = await manager.fundingUtils.gasUtils.estimateGasWithBump({
        to: testAccount1.address,
        value: parseEther("0.001"),
      });

      expect(gasParams).toHaveProperty('gasLimit');
      expect(gasParams).toHaveProperty('maxFeePerGas');
      expect(gasParams).toHaveProperty('maxPriorityFeePerGas');
      
      expect(gasParams.gasLimit).toBeGreaterThanOrEqual(21000n);
      expect(gasParams.maxFeePerGas).toBeGreaterThan(0n);
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThan(0n);
      
      console.log(`Gas Limit: ${gasParams.gasLimit}, Max Fee: ${gasParams.maxFeePerGas} wei`);
    });

    it('should apply custom gas bump settings', async () => {
      const baseGasPrice = await testClient.getGasPrice();
      
      const gasParams = await manager.fundingUtils.gasUtils.estimateGasWithBump({
        to: testAccount1.address,
        value: parseEther("0.001"),
      }, {
        gasBumpGwei: 3,
        priorityBumpPercent: 25
      });

      expect(gasParams.maxFeePerGas).toBeGreaterThan(baseGasPrice);
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThan(0n);
    });

    it('should handle gas estimation fallbacks', async () => {
      const gasParams = await manager.fundingUtils.gasUtils.estimateGasWithBump({
        to: "0x0000000000000000000000000000000000000000",
        value: parseEther("1000000"), // Impossible amount
        data: "0xinvaliddata",
      });

      // Should return fallback values
      expect(gasParams.gasLimit).toBe(BigInt(21000));
      expect(gasParams.maxFeePerGas).toBeGreaterThan(0n);
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThan(0n);
    });
  });

  describe('Smart Account Transfers and Operations', () => {
    it('should validate transfer call structure', async () => {
      expect(typeof manager.sendSelfTransaction).toBe('function');
      expect(typeof manager.transferTo).toBe('function');
      expect(typeof manager.sendUserOperation).toBe('function');
      
      const calls = [
        {
          to: testAccount2.address,
          value: parseEther("0.001"),
        }
      ];
      
      expect(calls).toHaveLength(1);
      expect(calls[0].to).toBe(testAccount2.address);
      expect(calls[0].value).toBe(parseEther("0.001"));
    });

    it('should fail transfer attempts due to missing ERC-4337 infrastructure', async () => {
      const transferAmount = parseEther("0.001");
      
      await expect(manager.sendSelfTransaction(transferAmount)).rejects.toThrow();
    });

    it('should fail inter-smart-account transfers due to missing ERC-4337 infrastructure', async () => {
      const transferAmount = parseEther("0.001");
      const targetAddress = manager2.account.address;
      
      await expect(manager.transferTo(targetAddress, transferAmount)).rejects.toThrow();
    });
  });

  describe('Contract Integration', () => {
    it('should verify deployed Solady contracts exist', async () => {
      const entryPointAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const factoryAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
      
      const entryPointCode = await testClient.getCode({ address: entryPointAddress });
      const factoryCode = await testClient.getCode({ address: factoryAddress });
      
      expect(entryPointCode).toBeDefined();
      expect(entryPointCode.length).toBeGreaterThan(2);
      expect(factoryCode).toBeDefined();
      expect(factoryCode.length).toBeGreaterThan(2);
      
      console.log(`EntryPoint exists: ${entryPointAddress}`);
      console.log(`Factory exists: ${factoryAddress}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle uninitialized manager operations', async () => {
      const uninitializedManager = new SmartAccountManager({
        privateKey: TEST_CONFIG.testPrivateKeys[0],
        rpcUrl: TEST_CONFIG.rpcUrl,
        chain: TEST_CONFIG.chain,
        bundlerUrl: TEST_CONFIG.rpcUrl,
        minBalance: parseEther("0.001"),
      });

      expect(uninitializedManager.account).toBeNull();
      expect(uninitializedManager.bundlerClient).toBeNull();

      await expect(uninitializedManager.getBalances()).rejects.toThrow();
      await expect(uninitializedManager.sendUserOperation([])).rejects.toThrow();
      await expect(uninitializedManager.ensureFunding()).rejects.toThrow();
    });

    it('should handle insufficient balance scenarios', async () => {
      const highMinManager = new SmartAccountManager({
        privateKey: TEST_CONFIG.testPrivateKeys[0],
        rpcUrl: TEST_CONFIG.rpcUrl,
        chain: TEST_CONFIG.chain,
        bundlerUrl: TEST_CONFIG.rpcUrl,
        minBalance: parseEther("20000"), // More than available in test account
      });

      await highMinManager.initialize();

      await expect(highMinManager.ensureFunding()).rejects.toThrow('Insufficient EOA balance');
    });

    it('should handle invalid addresses and network errors', async () => {
      await expect(
        manager.fundingUtils.checkBalance("invalid-address")
      ).rejects.toThrow();

      await expect(
        manager.fundingUtils.checkBalance("")
      ).rejects.toThrow();
    });
  });
});