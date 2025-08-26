import { parseEther, formatEther } from "viem";

export class FundingUtils {
  constructor(client, owner) {
    this.client = client;
    this.owner = owner;
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

      const hash = await this.client.sendTransaction({
        account: this.owner,
        to: smartAccountAddress,
        value: fundingAmount,
      });

      console.log(`Funding transaction hash: ${hash}`);

      // Wait for transaction confirmation
      const receipt = await this.client.waitForTransactionReceipt({ hash });
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
    const eoaBalance = await this.checkBalance(this.owner.address);
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
