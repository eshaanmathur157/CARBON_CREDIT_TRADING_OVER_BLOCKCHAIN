// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"; // <--- ADDS BURN LOGIC
import "@openzeppelin/contracts/access/AccessControl.sol";

contract FairCarbonToken is ERC20, ERC20Burnable, AccessControl {
    // Role for contracts allowed to mint (BCTManagement, etc.)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Fair Carbon Token", "FCT") {
        // Grant YOU (the deployer) Admin and Minter roles initially
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        // Initial supply to yourself (Optional)
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Custom Mint Function (Protected by Role)
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    // NOTE: You do NOT need to write 'burn' or 'transferFrom' here.
    // 'ERC20Burnable' adds 'burn(amount)' automatically.
    // 'ERC20' adds 'transferFrom(sender, recipient, amount)' automatically.
}