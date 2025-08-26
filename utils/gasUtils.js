import { parseGwei } from "viem";

export class GasUtils {
  constructor(client) {
    this.client = client;
  }

  async estimateGasWithBump(transactionRequest, options = {}) {
    const {
      gasBumpGwei = 3, // Add 3 gweis to max fee per gas
      priorityBumpPercent = 20, // Add 20% to priority fee
      timeout = 30000, // 30 second timeout
    } = options;

    try {
      // Get current gas price
      const gasPrice = await this.client.getGasPrice();

      // Get current block
      const block = await this.client.getBlock({ blockTag: "latest" });
      const baseFeePerGas = block.baseFeePerGas;

      // Calculate suggested priority fee (typically 1-2 gwei)
      const suggestedPriorityFee = parseGwei("1");

      // Calculate bumped priority fee
      const bumpedPriorityFee =
        suggestedPriorityFee + (suggestedPriorityFee * BigInt(priorityBumpPercent)) / BigInt(100);

      // Calculate max fee per gas: base fee + priority fee + bump
      const maxFeePerGas = baseFeePerGas + bumpedPriorityFee + parseGwei(gasBumpGwei.toString());

      // Estimate gas limit
      const gasLimit = await this.client.estimateGas({
        ...transactionRequest,
        maxFeePerGas,
        maxPriorityFeePerGas: bumpedPriorityFee,
      });

      return {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas: bumpedPriorityFee,
        timeout,
      };
    } catch (error) {
      console.warn("Gas estimation failed, using fallback values:", error.message);

      // Fallback gas settings
      return {
        gasLimit: BigInt(21000), // Standard transfer
        maxFeePerGas: parseGwei("10"), // 10 gwei fallback
        maxPriorityFeePerGas: parseGwei("2"), // 2 gwei priority
        timeout,
      };
    }
  }

  async sendTransactionWithBump(walletClient, transactionRequest, options = {}) {
    const gasParams = await this.estimateGasWithBump(transactionRequest, options);

    console.log(
      `Gas settings - Limit: ${gasParams.gasLimit}, Max Fee: ${gasParams.maxFeePerGas} wei, Priority: ${gasParams.maxPriorityFeePerGas} wei`,
    );

    const hash = await walletClient.sendTransaction({
      ...transactionRequest,
      gas: gasParams.gasLimit,
      maxFeePerGas: gasParams.maxFeePerGas,
      maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
    });

    console.log(`Transaction hash: ${hash}`);

    // Wait for confirmation with custom timeout
    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      timeout: gasParams.timeout,
    });

    return { hash, receipt };
  }
}
