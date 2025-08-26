import { ContractDeployer } from './deployContracts.js';

export async function setup() {
  console.log('🚀 Starting global test setup...');
  console.log('📋 Requirements: Anvil must be running on http://127.0.0.1:8545');
  console.log('📋 Start Anvil with: anvil');
  
  const deployer = new ContractDeployer();
  
  try {
    // Verify Anvil is running
    const blockNumber = await deployer.anvilClient.getBlockNumber();
    console.log(`✅ Anvil connection established (block: ${blockNumber})`);
    
    const deployedContracts = await deployer.deployAll();
    
    // Store contract addresses in global variables for tests
    globalThis.testContracts = deployedContracts;
    globalThis.anvilRpc = "http://127.0.0.1:8545";
    
    console.log('✅ Global setup completed successfully');
    return deployedContracts;
    
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    console.error('❌ Make sure Anvil is running: anvil');
    throw new Error('Test setup requires Anvil to be running on http://127.0.0.1:8545');
  }
}

export async function teardown() {
  console.log('🧹 Global teardown completed');
}