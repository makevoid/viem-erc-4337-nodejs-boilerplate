import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { createBundlerClient, toCoinbaseSmartAccount } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { FundingUtils } from "./utils/funding.js";
import dotenv from "dotenv";

dotenv.config();

export class SmartAccountManager {
  constructor(options = {}) {
    this.privateKey = options.privateKey || process.env.PRIVATE_KEY;
    this.pimlicoApiKey = options.pimlicoApiKey || process.env.PIMLICO_API_KEY;
    this.chain = options.chain || sepolia;
    this.rpcUrl = options.rpcUrl || "https://ethereum-sepolia-rpc.publicnode.com";
    this.bundlerUrl = options.bundlerUrl || "https://public.pimlico.io/v2/1/rpc";
    this.minBalance = options.minBalance || parseEther("0.01");

    // Initialize clients
    this.client = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl),
    });

    this.owner = privateKeyToAccount(this.privateKey);
    
    this.walletClient = createWalletClient({
      account: this.owner,
      chain: this.chain,
      transport: http(this.rpcUrl),
    });

    this.fundingUtils = new FundingUtils(this.client, this.walletClient);
    this.account = null;
    this.bundlerClient = null;
  }

  async initialize() {
    // Create smart account
    this.account = await toCoinbaseSmartAccount({
      client: this.client,
      owners: [this.owner],
      version: "1.1",
    });

    // Create bundler client
    this.bundlerClient = createBundlerClient({
      client: this.client,
      transport: http(this.bundlerUrl),
    });

    console.log(`Smart Account initialized: ${this.account.address}`);
    return this.account;
  }

  async getBalances() {
    if (!this.account) {
      throw new Error("Account not initialized. Call initialize() first.");
    }

    const eoaBalance = await this.fundingUtils.checkBalance(this.owner.address);
    const smartAccountBalance = await this.fundingUtils.checkBalance(this.account.address);

    return {
      eoa: {
        address: this.owner.address,
        balance: eoaBalance,
        balanceFormatted: formatEther(eoaBalance),
      },
      smartAccount: {
        address: this.account.address,
        balance: smartAccountBalance,
        balanceFormatted: formatEther(smartAccountBalance),
      },
    };
  }

  async displayBalances() {
    const balances = await this.getBalances();

    console.log(`EOA Account Address: ${balances.eoa.address}`);
    console.log(`EOA Balance: ${balances.eoa.balance} wei (${balances.eoa.balanceFormatted} ETH)`);
    console.log(`Smart Account Address: ${balances.smartAccount.address}`);
    console.log(
      `Smart Account Balance: ${balances.smartAccount.balance} wei (${balances.smartAccount.balanceFormatted} ETH)`,
    );

    return balances;
  }

  async ensureFunding() {
    if (!this.account) {
      throw new Error("Account not initialized. Call initialize() first.");
    }

    return await this.fundingUtils.ensureFunding(this.account.address, this.minBalance);
  }

  async sendUserOperation(calls) {
    if (!this.account || !this.bundlerClient) {
      throw new Error("Account not initialized. Call initialize() first.");
    }

    // Ensure smart account has sufficient funds
    await this.ensureFunding();

    console.log("Sending user operation...");
    const hash = await this.bundlerClient.sendUserOperation({
      account: this.account,
      calls,
    });

    console.log(`User Operation hash: ${hash}`);

    const receipt = await this.bundlerClient.waitForUserOperationReceipt({ hash });
    console.log(`User Operation confirmed in block ${receipt.receipt.blockNumber}`);

    return { hash, receipt };
  }

  async sendSelfTransaction(amount = parseEther("0.001")) {
    const calls = [
      {
        to: this.owner.address,
        value: amount,
      },
    ];

    return await this.sendUserOperation(calls);
  }

  async transferTo(to, amount) {
    const calls = [
      {
        to,
        value: amount,
      },
    ];

    return await this.sendUserOperation(calls);
  }
}
