import { parseEther, formatEther } from "viem";
import { GasUtils } from "./gasUtils.js";

export class FundingUtils {
  constructor(client, walletClient) {
    this.client = client;
    this.walletClient = walletClient;
    this.gasUtils = new GasUtils(client);
  }

  async checkBalance(address) {
    const balance = await this.client.getBalance({ address });
    return balance;
  }

  async fundSmartAccount(smartAccountAddress, minBalance = parseEther("0.01")) {
    const currentBalance = await this.checkBalance(smartAccountAddress);

    console.log(`Smart Account current balance: ${formatEther(currentBalance)} ETH`);

    if (currentBalance < minBalance) {
      const fundingAmount = minBalance - currentBalance + parseEther("0.001"); // Add a bit extra for gas

      console.log(`Funding smart account with ${formatEther(fundingAmount)} ETH...`);

      const { hash, receipt } = await this.gasUtils.sendTransactionWithBump(
        this.walletClient,
        {
          to: smartAccountAddress,
          value: fundingAmount,
        },
        {
          gasBumpGwei: 1,
          priorityBumpPercent: 20,
          timeout: 60000, // 60 second timeout for funding
        }
      );

      console.log(`Funding transaction confirmed in block ${receipt.blockNumber}`);

      const newBalance = await this.checkBalance(smartAccountAddress);
      console.log(`Smart Account new balance: ${formatEther(newBalance)} ETH`);

      return receipt;
    } else {
      console.log("Smart Account has sufficient balance");
      return null;
    }
  }

  async ensureFunding(smartAccountAddress, minBalance = parseEther("0.01")) {
    const eoaBalance = await this.checkBalance(this.walletClient.account.address);
    const smartAccountBalance = await this.checkBalance(smartAccountAddress);

    console.log(`EOA Balance: ${formatEther(eoaBalance)} ETH`);
    console.log(`Smart Account Balance: ${formatEther(smartAccountBalance)} ETH`);

    if (smartAccountBalance < minBalance) {
      if (eoaBalance < minBalance + parseEther("0.001")) {
        throw new Error(
          `Insufficient EOA balance to fund smart account. Need at least ${formatEther(minBalance + parseEther("0.001"))} ETH`,
        );
      }

      return await this.fundSmartAccount(smartAccountAddress, minBalance);
    }

    return null;
  }
}
