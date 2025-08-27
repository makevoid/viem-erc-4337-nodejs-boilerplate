import { SmartAccountManager } from "./SmartAccountManager.js";
import { parseEther } from "viem";

async function main() {
  try {
    // Create smart account manager - NOTE: this defaults to Sepolia ETH testnet
    const manager = new SmartAccountManager();

    // Initialize account
    await manager.initialize();

    // Display current balances
    await manager.displayBalances();

    // Send a self-transaction (this will auto-fund if needed)
    const result = await manager.sendSelfTransaction(parseEther("0.001"));

    // Or better - send a transaction to a specific address using `transferTo()`
    // const recipientAddress = "0xRecipientAddress"; // Replace with the recipient's address
    // const amount = parseEther("0.0xxx"); // amount in ethers
    // await manager.transferTo(recipientAddress, amount);

    console.log("Transaction completed successfully!");
    console.log("Final balances:");
    await manager.displayBalances();

    // Exit cleanly
    console.log("\n✅ Demo completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
