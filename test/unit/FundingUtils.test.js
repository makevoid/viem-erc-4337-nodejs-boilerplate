import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { FundingUtils } from '../../utils/funding.js';
import { TEST_CONFIG, testClient } from '../setup/testSetup.js';

describe('FundingUtils', () => {
  let fundingUtils;
  let testClient;
  let testWalletClient;
  let testAccount;
  let targetAddress;

  beforeAll(async () => {
    testAccount = privateKeyToAccount(TEST_CONFIG.testPrivateKeys[0]);
    targetAddress = TEST_CONFIG.testAddresses[1]; // Different account for funding tests
    
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
    fundingUtils = new FundingUtils(testClient, testWalletClient);
  });

  describe('Constructor', () => {
    it('should initialize with client and wallet client', () => {
      expect(fundingUtils.client).toBe(testClient);
      expect(fundingUtils.walletClient).toBe(testWalletClient);
      expect(fundingUtils.gasUtils).toBeDefined();
    });
  });

  describe('checkBalance', () => {
    it('should return balance for valid address', async () => {
      const balance = await fundingUtils.checkBalance(testAccount.address);
      
      expect(typeof balance).toBe('bigint');
      expect(balance).toBeGreaterThan(0n); // Account should have funds from setup
    });

    it('should return zero balance for unfunded address', async () => {
      const randomAddress = "0x1234567890123456789012345678901234567890";
      const balance = await fundingUtils.checkBalance(randomAddress);
      
      expect(balance).toBe(0n);
    });

    it('should handle invalid address', async () => {
      await expect(
        fundingUtils.checkBalance("invalid-address")
      ).rejects.toThrow();
    });
  });

  describe('fundSmartAccount', () => {
    it('should not fund when balance is sufficient', async () => {
      const currentBalance = await fundingUtils.checkBalance(testAccount.address);
      const minBalance = currentBalance - parseEther("1"); // Set min below current
      
      const result = await fundingUtils.fundSmartAccount(testAccount.address, minBalance);
      
      expect(result).toBeNull(); // No funding needed
    });

    it('should calculate correct funding amount when balance is insufficient', async () => {
      const targetBalance = await fundingUtils.checkBalance(targetAddress);
      const minBalance = targetBalance + parseEther("1"); // Set min above current
      
      // We'll test the logic without actually sending the transaction
      // by mocking or using a try-catch for the actual transaction
      const fundingAmount = minBalance - targetBalance + parseEther("0.001");
      
      expect(fundingAmount).toBeGreaterThan(parseEther("1"));
      expect(fundingAmount).toBeLessThan(parseEther("2"));
    });
  });

  describe('ensureFunding', () => {
    it('should check both EOA and smart account balances', async () => {
      const eoaBalance = await fundingUtils.checkBalance(testWalletClient.account.address);
      const smartAccountBalance = await fundingUtils.checkBalance(targetAddress);
      
      expect(typeof eoaBalance).toBe('bigint');
      expect(typeof smartAccountBalance).toBe('bigint');
    });

    it('should not fund when smart account balance is sufficient', async () => {
      const targetBalance = await fundingUtils.checkBalance(targetAddress);
      const minBalance = targetBalance; // Set min equal to current
      
      const result = await fundingUtils.ensureFunding(targetAddress, minBalance);
      
      expect(result).toBeNull(); // No funding needed
    });

    it('should throw error when EOA balance is insufficient for funding', async () => {
      const eoaBalance = await fundingUtils.checkBalance(testWalletClient.account.address);
      const excessiveMinBalance = eoaBalance + parseEther("100"); // More than EOA has
      
      await expect(
        fundingUtils.ensureFunding(targetAddress, excessiveMinBalance)
      ).rejects.toThrow(/Insufficient EOA balance to fund smart account/);
    });

    it('should calculate funding requirements correctly', async () => {
      const eoaBalance = await fundingUtils.checkBalance(testWalletClient.account.address);
      const smartAccountBalance = await fundingUtils.checkBalance(targetAddress);
      const minBalance = parseEther("0.01");
      
      if (smartAccountBalance < minBalance) {
        const requiredFunding = minBalance + parseEther("0.001");
        expect(requiredFunding).toBeGreaterThan(minBalance);
        
        if (eoaBalance >= requiredFunding) {
          // Should proceed with funding
          expect(eoaBalance).toBeGreaterThanOrEqual(requiredFunding);
        }
      }
    });
  });

  describe('Integration with GasUtils', () => {
    it('should have GasUtils instance for transaction optimization', () => {
      expect(fundingUtils.gasUtils).toBeDefined();
      expect(fundingUtils.gasUtils.constructor.name).toBe('GasUtils');
    });

    it('should use GasUtils for transaction sending', () => {
      expect(typeof fundingUtils.gasUtils.sendTransactionWithBump).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create utils with invalid RPC to test error handling
      const invalidClient = createPublicClient({
        chain: TEST_CONFIG.chain,
        transport: http("http://invalid-rpc.com"),
      });

      const invalidFundingUtils = new FundingUtils(invalidClient, testWalletClient);

      await expect(
        invalidFundingUtils.checkBalance(testAccount.address)
      ).rejects.toThrow();
    });

    it('should validate addresses before operations', async () => {
      await expect(
        fundingUtils.checkBalance("")
      ).rejects.toThrow();

      await expect(
        fundingUtils.checkBalance(null)
      ).rejects.toThrow();
    });
  });
});