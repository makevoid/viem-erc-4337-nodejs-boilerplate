import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createPublicClient, createWalletClient, http, parseEther, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GasUtils } from '../../utils/gasUtils.js';
import { TEST_CONFIG, testClient } from '../setup/testSetup.js';

describe('GasUtils', () => {
  let gasUtils;
  let testClient;
  let testWalletClient;
  let testAccount;

  beforeAll(async () => {
    testAccount = privateKeyToAccount(TEST_CONFIG.testPrivateKeys[0]);
    
    testClient = createPublicClient({
      chain: TEST_CONFIG.chain,
      transport: http(TEST_CONFIG.rpcUrl),
    });

    testWalletClient = createWalletClient({
      account: testAccount,
      chain: TEST_CONFIG.chain,
      transport: http(TEST_CONFIG.rpcUrl),
    });
  });

  beforeEach(async () => {
    gasUtils = new GasUtils(testClient);
  });

  describe('Constructor', () => {
    it('should initialize with client', () => {
      expect(gasUtils.client).toBe(testClient);
    });
  });

  describe('estimateGasWithBump', () => {
    it('should use default bump options', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      const gasParams = await gasUtils.estimateGasWithBump(transactionRequest);

      expect(gasParams).toHaveProperty('gasLimit');
      expect(gasParams).toHaveProperty('maxFeePerGas');
      expect(gasParams).toHaveProperty('maxPriorityFeePerGas');
      expect(gasParams).toHaveProperty('timeout');

      expect(typeof gasParams.gasLimit).toBe('bigint');
      expect(typeof gasParams.maxFeePerGas).toBe('bigint');
      expect(typeof gasParams.maxPriorityFeePerGas).toBe('bigint');
      expect(typeof gasParams.timeout).toBe('number');
    });

    it('should apply custom bump options', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      const options = {
        gasBumpGwei: 5,
        priorityBumpPercent: 50,
        timeout: 60000,
      };

      const gasParams = await gasUtils.estimateGasWithBump(transactionRequest, options);

      expect(gasParams.timeout).toBe(60000);
      expect(gasParams.maxFeePerGas).toBeGreaterThan(0n);
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThan(0n);
    });

    it('should calculate bumped gas prices correctly', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      // Get current network gas price for comparison
      const currentGasPrice = await testClient.getGasPrice();
      const gasParams = await gasUtils.estimateGasWithBump(transactionRequest);

      // Max fee should be higher than current gas price due to bump
      expect(gasParams.maxFeePerGas).toBeGreaterThan(currentGasPrice);
    });

    it('should return fallback values when estimation fails', async () => {
      // Create invalid transaction to trigger fallback
      const invalidTransactionRequest = {
        to: "0x0000000000000000000000000000000000000000",
        value: parseEther("1000000"), // Impossible amount
        data: "0xinvaliddata",
      };

      const gasParams = await gasUtils.estimateGasWithBump(invalidTransactionRequest);

      // Should return fallback values
      expect(gasParams.gasLimit).toBe(BigInt(21000));
      expect(gasParams.maxFeePerGas).toBe(parseGwei("10"));
      expect(gasParams.maxPriorityFeePerGas).toBe(parseGwei("2"));
    });

    it('should handle priority fee bump calculation', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      const gasParams = await gasUtils.estimateGasWithBump(transactionRequest, {
        priorityBumpPercent: 100, // 100% bump
      });

      // Priority fee should be bumped
      const basePriorityFee = parseGwei("1");
      const expectedBumpedFee = basePriorityFee + (basePriorityFee * BigInt(100) / BigInt(100));
      
      expect(gasParams.maxPriorityFeePerGas).toBeGreaterThanOrEqual(expectedBumpedFee);
    });
  });

  describe('sendTransactionWithBump', () => {
    it('should prepare transaction with bumped gas settings', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      // Mock the sendTransaction call to avoid actual transaction
      const originalSendTransaction = testWalletClient.sendTransaction;
      testWalletClient.sendTransaction = vi.fn().mockResolvedValue("0x1234567890abcdef");
      
      // Mock waitForTransactionReceipt
      const originalWaitForReceipt = testClient.waitForTransactionReceipt;
      testClient.waitForTransactionReceipt = vi.fn().mockResolvedValue({
        blockNumber: 123n,
        status: 'success',
      });

      try {
        const result = await gasUtils.sendTransactionWithBump(testWalletClient, transactionRequest);

        expect(result).toHaveProperty('hash');
        expect(result).toHaveProperty('receipt');
        expect(result.hash).toBe("0x1234567890abcdef");

        // Verify gas parameters were added to transaction
        const callArgs = testWalletClient.sendTransaction.mock.calls[0][0];
        expect(callArgs).toHaveProperty('gas');
        expect(callArgs).toHaveProperty('maxFeePerGas');
        expect(callArgs).toHaveProperty('maxPriorityFeePerGas');

      } finally {
        // Restore original methods
        testWalletClient.sendTransaction = originalSendTransaction;
        testClient.waitForTransactionReceipt = originalWaitForReceipt;
      }
    });

    it('should pass through original transaction parameters', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
        data: "0x1234",
      };

      // Mock methods
      testWalletClient.sendTransaction = vi.fn().mockResolvedValue("0x1234567890abcdef");
      testClient.waitForTransactionReceipt = vi.fn().mockResolvedValue({
        blockNumber: 123n,
        status: 'success',
      });

      try {
        await gasUtils.sendTransactionWithBump(testWalletClient, transactionRequest);

        const callArgs = testWalletClient.sendTransaction.mock.calls[0][0];
        expect(callArgs.to).toBe(testAccount.address);
        expect(callArgs.value).toBe(parseEther("0.001"));
        expect(callArgs.data).toBe("0x1234");

      } finally {
        // Restore original methods
        testWalletClient.sendTransaction = testWalletClient.constructor.prototype.sendTransaction;
        testClient.waitForTransactionReceipt = testClient.constructor.prototype.waitForTransactionReceipt;
      }
    });
  });

  describe('Gas calculation logic', () => {
    it('should handle different gas bump amounts', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      const params1 = await gasUtils.estimateGasWithBump(transactionRequest, { gasBumpGwei: 1 });
      const params5 = await gasUtils.estimateGasWithBump(transactionRequest, { gasBumpGwei: 5 });

      // Higher bump should result in higher max fee
      expect(params5.maxFeePerGas).toBeGreaterThan(params1.maxFeePerGas);
    });

    it('should handle different priority fee bumps', async () => {
      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      const params20 = await gasUtils.estimateGasWithBump(transactionRequest, { priorityBumpPercent: 20 });
      const params50 = await gasUtils.estimateGasWithBump(transactionRequest, { priorityBumpPercent: 50 });

      // Higher bump should result in higher priority fee
      expect(params50.maxPriorityFeePerGas).toBeGreaterThan(params20.maxPriorityFeePerGas);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors during gas estimation', async () => {
      // Create utils with invalid client to test error handling
      const invalidClient = createPublicClient({
        chain: TEST_CONFIG.chain,
        transport: http("http://invalid-rpc.com"),
      });

      const invalidGasUtils = new GasUtils(invalidClient);

      const transactionRequest = {
        to: testAccount.address,
        value: parseEther("0.001"),
      };

      const gasParams = await invalidGasUtils.estimateGasWithBump(transactionRequest);

      // Should return fallback values when network fails
      expect(gasParams.gasLimit).toBe(BigInt(21000));
      expect(gasParams.maxFeePerGas).toBe(parseGwei("10"));
      expect(gasParams.maxPriorityFeePerGas).toBe(parseGwei("2"));
    });

    it('should validate transaction parameters', async () => {
      const invalidTransactionRequest = null;

      await expect(
        gasUtils.estimateGasWithBump(invalidTransactionRequest)
      ).rejects.toThrow();
    });
  });
});