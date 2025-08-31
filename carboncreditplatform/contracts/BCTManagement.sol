// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Interfaces.sol";

contract BCTManagement {
    //LETS RECORD ALL THE TRANSACTIONS AS WELL
    // Storage
    //lets introduce the BCT -> USDC pool here itself?
    uint256 public totalBCTSupply;
    mapping(string => uint256) public tierConversionRates;
    // REMOVED: mapping(address => uint256) public firmBCTBalances; - using FirmManagement instead
    mapping(address => uint256) public staked;
    uint256 public totalBCTstaked;
    mapping(uint256 => mapping(address => uint256)) public transactions;
    // Contract references
    IFirmManagement public firmManagement;
    
    // Events
    event BCTMinted(address firm, uint256 amount, string tier, uint256 tco2Used);
    event BCTRetired(address firm, uint256 amount, uint256 creditId, string tier);
    event BCTStaked(address firm, uint256 amount);
    
    // Modifiers
    modifier onlyRegisteredFirm(address firmAddress) {
        require(firmManagement.isFirmRegistered(firmAddress), "Only registered firms can call this function");
        _;
    }
    
    constructor(address _firmManagement) {
        firmManagement = IFirmManagement(_firmManagement);
        
        // Initialize tier conversion rates (scaled by 100)
        tierConversionRates["Platinum"] = 150; // 1 TCO2 = 1.5 BCT
        tierConversionRates["Gold"] = 125;     // 1 TCO2 = 1.25 BCT
        tierConversionRates["Silver"] = 100;   // 1 TCO2 = 1 BCT
        tierConversionRates["Bronze"] = 75;    // 1 TCO2 = 0.75 BCT
        tierConversionRates["Grey"] = 50;      // 1 TCO2 = 0.5 BCT
        
        totalBCTSupply = 0;
        totalBCTstaked = 0;
    }
    
    // Function to mint BCT from TCO2 credits
    function mintBCT(string memory tier, uint256 tco2Amount) public onlyRegisteredFirm(msg.sender) {
        _mintBCTForFirm(msg.sender, tier, tco2Amount);
    }

    // Function to mint BCT for a specific firm (can be called by the firm itself or authorized contracts)
    function mintBCTForFirm(address firmAddress, string memory tier, uint256 tco2Amount) public onlyRegisteredFirm(firmAddress) {
        _mintBCTForFirm(firmAddress, tier, tco2Amount);
    }
    
    // Internal function to handle BCT minting logic
    function _mintBCTForFirm(address firmAddress, string memory tier, uint256 tco2Amount) internal {
        require(tco2Amount > 0, "Amount must be greater than 0");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        require(firmManagement.getFirmAvailableTCO2PerTier(firmAddress, tier) >= tco2Amount, "Insufficient TCO2 credits");
        
        // Calculate BCT amount (conversion rates are scaled by 100)
        uint256 bctAmount = (tco2Amount * tierConversionRates[tier]); 
        
        // Reduce the firm's available TCO2 for this tier FIRST
        firmManagement.reduceFirmAvailableTCO2(firmAddress, tier, tco2Amount);
        
        // Update firm's BCT balance through FirmManagement
        firmManagement.increaseBCTBalance(firmAddress, bctAmount);
        
        // Update total BCT supply
        totalBCTSupply += bctAmount;
        
        emit BCTMinted(firmAddress, bctAmount, tier, tco2Amount);
    }

    // Function to stake BCT
    function stakeBCT(address firmAddress, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        require(firmManagement.getFirmBCTBalance(firmAddress) >= amount, "Insufficient BCT balance");
        
        // Reduce the BCT from the firm's account through FirmManagement
        firmManagement.decreaseBCTBalance(firmAddress, amount);
        
        // Update staking records
        staked[firmAddress] += amount;
        totalBCTstaked += amount;
        
        // Update total supply (BCT is moved from circulating to staked)
        totalBCTSupply -= amount;
        
        // Call FirmManagement to update their staking records
        firmManagement.setStake(firmAddress, amount);

        emit BCTStaked(firmAddress, amount);
    }
    
    
    // View functions
    function getTotalBCTSupply() public view returns (uint256) {
        return totalBCTSupply;
    }

    function getTotalBCTstaked() public view returns (uint256) {
        return totalBCTstaked;
    }
    
    function getFirmBCTBalance(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmBCTBalance(firmAddress);
    }
    
    function getTierConversionRate(string memory tier) public view returns (uint256) {
        return tierConversionRates[tier];
    }
    
    function calculateBCTFromTCO2(string memory tier, uint256 tco2Amount) public view returns (uint256) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return (tco2Amount * tierConversionRates[tier]) / 100;
    }
}