pragma solidity ^0.8.0;

import "./Interfaces.sol";

// Interface to talk to your AccessControl-enabled FCT Token
interface IFairCarbonToken {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract BCTManagement {
    
    // 1. HARDCODED ADDRESS of your FCT Token (The "Central Bank")
    address public constant FCT_ADDRESS = 0x80E8b7Eb8B3f754024D449D139dc8308f55E55Ac;

    // Storage
    uint256 public totalBCTSupply;
    mapping(string => uint256) public tierConversionRates;
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
    
    // Constructor (Removed FCT address argument since it is hardcoded)
    constructor(address _firmManagement) {
        firmManagement = IFirmManagement(_firmManagement);
        
        // Initialize tier conversion rates (scaled by 100)
        tierConversionRates["Platinum"] = 150; // 1 TCO2 = 1.5 FCT
        tierConversionRates["Gold"] = 125;     // 1 TCO2 = 1.25 FCT
        tierConversionRates["Silver"] = 100;   // 1 TCO2 = 1.0 FCT
        tierConversionRates["Bronze"] = 75;    // 1 TCO2 = 0.75 FCT
        tierConversionRates["Grey"] = 50;      // 1 TCO2 = 0.5 FCT
        
        totalBCTSupply = 0;
        totalBCTstaked = 0;
    }
    
    // Function to mint BCT from TCO2 credits (Called by Firm)
    function mintBCT(string memory tier, uint256 tco2Amount) public onlyRegisteredFirm(msg.sender) {
        _mintBCTForFirm(msg.sender, tier, tco2Amount);
    }

    // Function to mint BCT for a specific firm (Called by System/Admin)
    function mintBCTForFirm(address firmAddress, string memory tier, uint256 tco2Amount) public onlyRegisteredFirm(firmAddress) {
        _mintBCTForFirm(firmAddress, tier, tco2Amount);
    }
    
    // Internal function to handle BCT minting logic
    function _mintBCTForFirm(address firmAddress, string memory tier, uint256 tco2Amount) internal {
        require(tco2Amount > 0, "Amount must be greater than 0");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        require(firmManagement.getFirmAvailableTCO2PerTier(firmAddress, tier) >= tco2Amount, "Insufficient TCO2 credits");
        
        // 2. CALCULATE 18-DECIMAL TOKEN AMOUNT
        // Rate 150 means 1.5x. 
        // Logic: Amount * 150 * 10^18 / 100
        uint256 bctAmount = (tco2Amount * tierConversionRates[tier] * 10**18) / 100; 
        
        // Reduce the firm's available TCO2 for this tier
        firmManagement.reduceFirmAvailableTCO2(firmAddress, tier, tco2Amount);
        
        // 3. MINT TOKENS DIRECTLY TO WALLET
        // This requires BCTManagement to have the MINTER_ROLE on FCT_ADDRESS
        IFairCarbonToken(FCT_ADDRESS).mint(firmAddress, bctAmount);
        
        // Update total supply stats
        totalBCTSupply += bctAmount;
        
        emit BCTMinted(firmAddress, bctAmount, tier, tco2Amount);
    }

    // Function to stake BCT
    function stakeBCT(address firmAddress, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        
        // A. CHECK REAL WALLET BALANCE
        // We ask the Token Contract: "Does this guy actually have the money?"
        uint256 userBalance = IFairCarbonToken(FCT_ADDRESS).balanceOf(firmAddress);
        require(userBalance >= amount, "Insufficient FCT in wallet");

        // B. TRANSFER TOKENS (User Wallet -> This Contract)
        // This effectively "removes" them from the user's control.
        // NOTE: User must have called 'approve' on the FCT contract first!
        bool success = IFairCarbonToken(FCT_ADDRESS).transferFrom(firmAddress, address(this), amount);
        require(success, "Transfer failed. Did you approve BCTManagement?");

        // C. UPDATE INTERNAL RECORDS
        staked[firmAddress] += amount;
        totalBCTstaked += amount;
        
        // Optional: Update your local supply counter (if it tracks 'circulating' supply)
        if (totalBCTSupply >= amount) {
            totalBCTSupply -= amount;
        }

        // D. UPDATE FIRM MANAGEMENT STATS
        // This ensures the reputation system knows they staked
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
        // Ask the Real Token Contract directly
        return IFairCarbonToken(FCT_ADDRESS).balanceOf(firmAddress);
    }
    
    function getTierConversionRate(string memory tier) public view returns (uint256) {
        return tierConversionRates[tier];
    }
    
    function calculateBCTFromTCO2(string memory tier, uint256 tco2Amount) public view returns (uint256) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return (tco2Amount * tierConversionRates[tier]) / 100;
    }
}

/*
ADDRESSES:
0:
address: firmMgmt 0x738b4157fe4f8406432fE818E80526705d2dD8c5
1:
address: creditMgmt 0x3CF3d191AA2602231f5bf08E3816a21fA2723014
2:
address: tierPoolMgmt 0x0b284D8C4ca87944d5Aede0F9AA03915D00b68Fb
3:
address: bctMgmt 0x91D3bC4f6969E0c4f265F2D50cb8E40dd314Ed3E
*/