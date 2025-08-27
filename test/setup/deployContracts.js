import { createPublicClient, createWalletClient, http, parseEther, getContract } from "viem";
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ERC-4337 Entry Point contract (v0.7.0)
const ENTRY_POINT_ABI = [
  {
    "inputs": [],
    "name": "entryPoint",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Coinbase Smart Account Factory ABI (simplified)
const SMART_ACCOUNT_FACTORY_ABI = [
  {
    "inputs": [
      {"internalType": "bytes[]", "name": "owners", "type": "bytes[]"},
      {"internalType": "uint256", "name": "nonce", "type": "uint256"}
    ],
    "name": "createAccount",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Minimal empty contract bytecode for testing (just returns)
const ENTRY_POINT_BYTECODE = "0x6080604052348015600f57600080fd5b50600a80601d6000396000f3fe6080604052600080fdfea264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c63430008110033";

// Minimal empty contract bytecode for testing (just returns)  
const FACTORY_BYTECODE = "0x6080604052348015600f57600080fd5b50600a80601d6000396000f3fe6080604052600080fdfea264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c63430008110033";

export class ContractDeployer {
  constructor() {
    this.anvilClient = createPublicClient({
      chain: anvil,
      transport: http("http://127.0.0.1:8545"),
    });

    // Use anvil's default accounts
    this.deployerAccount = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    
    this.walletClient = createWalletClient({
      account: this.deployerAccount,
      chain: anvil,
      transport: http("http://127.0.0.1:8545"),
    });

    // Use addresses from Forge deployment
    this.deployedContracts = {
      entryPoint: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      factory: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      implementation: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    };
  }

  async deployEntryPoint() {
    console.log("Deploying Entry Point contract...");
    
    // Deploy Entry Point at deterministic address
    const entryPointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
    
    // Check if already deployed
    const code = await this.anvilClient.getCode({ address: entryPointAddress });
    if (code && code !== "0x") {
      console.log(`Entry Point already deployed at ${entryPointAddress}`);
      this.deployedContracts.entryPoint = entryPointAddress;
      return entryPointAddress;
    }

    const hash = await this.walletClient.deployContract({
      abi: [],
      bytecode: ENTRY_POINT_BYTECODE,
    });

    const receipt = await this.anvilClient.waitForTransactionReceipt({ hash });
    console.log(`Entry Point deployed at: ${receipt.contractAddress}`);
    
    this.deployedContracts.entryPoint = receipt.contractAddress;
    return receipt.contractAddress;
  }

  async deploySmartAccountFactory() {
    console.log("Deploying Coinbase Smart Account Factory...");
    
    const hash = await this.walletClient.deployContract({
      abi: SMART_ACCOUNT_FACTORY_ABI,
      bytecode: FACTORY_BYTECODE,
    });

    const receipt = await this.anvilClient.waitForTransactionReceipt({ hash });
    console.log(`Smart Account Factory deployed at: ${receipt.contractAddress}`);
    
    this.deployedContracts.factory = receipt.contractAddress;
    return receipt.contractAddress;
  }

  async fundTestAccounts() {
    console.log("Funding test accounts...");
    
    const testAccounts = [
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // anvil account #1
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // anvil account #2
    ];

    for (const account of testAccounts) {
      const hash = await this.walletClient.sendTransaction({
        to: account,
        value: parseEther("10"), // 10 ETH for testing
      });
      
      await this.anvilClient.waitForTransactionReceipt({ hash });
      console.log(`Funded ${account} with 10 ETH`);
    }
  }

  async deployAll() {
    console.log("Using pre-deployed Solady contracts on Anvil...");
    
    try {
      // Check anvil connection
      const blockNumber = await this.anvilClient.getBlockNumber();
      console.log(`Connected to Anvil at block ${blockNumber}`);
      
      // Verify contracts exist
      const entryPointCode = await this.anvilClient.getCode({ address: this.deployedContracts.entryPoint });
      const factoryCode = await this.anvilClient.getCode({ address: this.deployedContracts.factory });
      
      if (!entryPointCode || entryPointCode === "0x") {
        throw new Error("EntryPoint contract not found. Run forge deployment first.");
      }
      
      if (!factoryCode || factoryCode === "0x") {
        throw new Error("ERC4337Factory contract not found. Run forge deployment first.");
      }
      
      console.log("✅ EntryPoint contract found at:", this.deployedContracts.entryPoint);
      console.log("✅ ERC4337Factory contract found at:", this.deployedContracts.factory);
      
      await this.fundTestAccounts();
      
      console.log("Setup completed successfully!");
      console.log("Available contracts:", this.deployedContracts);
      
      return this.deployedContracts;
      
    } catch (error) {
      console.error("Setup failed:", error);
      throw error;
    }
  }

  getDeployedContracts() {
    return this.deployedContracts;
  }
}

// Run deployment if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployer = new ContractDeployer();
  await deployer.deployAll();
}