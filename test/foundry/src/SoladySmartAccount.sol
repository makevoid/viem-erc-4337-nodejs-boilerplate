// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../lib/solady/src/accounts/ERC4337.sol";

/// @notice Concrete implementation of Solady ERC4337 account
contract SoladySmartAccount is ERC4337 {
    /// @dev The canonical ERC4337 EntryPoint address for this account.
    /// Override this to return the canonical EntryPoint address.
    /// See: https://eips.ethereum.org/EIPS/eip-4337
    function entryPoint() public view virtual override returns (address) {
        return 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    }

    /// @dev Returns the EIP-712 domain name and version.
    function _domainNameAndVersion()
        internal
        pure
        virtual
        override
        returns (string memory name, string memory version)
    {
        name = "SoladySmartAccount";
        version = "1";
    }
}