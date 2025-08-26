// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../lib/account-abstraction/contracts/core/EntryPoint.sol";
import "../src/SoladySmartAccount.sol";
import "../lib/solady/src/accounts/ERC4337Factory.sol";

contract Deploy is Script {
    function run() external {
        // Use anvil's first account as deployer
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy EntryPoint v0.7
        EntryPoint entryPoint = new EntryPoint();
        console.log("EntryPoint deployed at:", address(entryPoint));
        
        // Deploy ERC4337 implementation
        SoladySmartAccount implementation = new SoladySmartAccount();
        console.log("ERC4337 implementation deployed at:", address(implementation));
        
        // Deploy ERC4337Factory
        ERC4337Factory factory = new ERC4337Factory(address(implementation));
        console.log("ERC4337Factory deployed at:", address(factory));
        
        vm.stopBroadcast();
        
        // Print addresses for manual copying
        console.log("=== COPY THESE ADDRESSES ===");
        console.log("ENTRY_POINT=%s", address(entryPoint));
        console.log("ERC4337_IMPLEMENTATION=%s", address(implementation));
        console.log("ERC4337_FACTORY=%s", address(factory));
        console.log("===========================");
    }
}