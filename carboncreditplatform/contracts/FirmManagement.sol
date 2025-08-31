// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DataStructures.sol";

contract FirmManagement {
    using DataStructures for DataStructures.Firm;
    
    // Storage
    mapping(address => DataStructures.Firm) public firms;
    mapping(address => bool) public registeredFirms;
    mapping(string => uint256) public tierValues;
    uint256 public poolUSDC = 10000;
    uint256 public poolBCT = 50000;
    uint256 public k = poolBCT * poolUSDC;
    uint256 totalStaked = 0;
    // Contract references - for cross-contract access control
    address public bctManagementContract;
    
    // Events
    event FirmRegistered(address firmAddress);
    event AverageContributionTierUpdated(address firm, uint256 newAverage);
    event TCO2Reduced(address firm, string tier, uint256 amount);
    event ContributionRatioUpdated(address firm, uint256 newRatio);
    event BCTStaked(address firm, uint256 amount);
    event ReputationUpdated(address firm, uint256 newReputation);
    event BCTBalanceIncreased(address firm, uint256 amount);
    event BCTBalanceDecreased(address firm, uint256 amount);
    event BCTRetired(address firm, uint256 amount);

    modifier onlyBCTContract() {
        require(msg.sender == bctManagementContract, "Only BCTManagement contract can call this");
        _;
    }
    
    constructor() {
        // Initialize tier values for average calculation
        tierValues["Platinum"] = 5;
        tierValues["Gold"] = 4;
        tierValues["Silver"] = 3;
        tierValues["Bronze"] = 2;
        tierValues["Grey"] = 1;
    }
    
    // Function to set BCT management contract address
    function setBCTManagementContract(address _bctManagement) external {
        require(bctManagementContract == address(0), "BCT management contract already set");
        bctManagementContract = _bctManagement;
    }
    
    // Updated function to accept firm address as parameter
    function registerFirm(address firmAddress) public {
        require(!registeredFirms[firmAddress], "Firm already registered");
        
        DataStructures.Firm storage newFirm = firms[firmAddress];
        newFirm.firmAddress = firmAddress;
        newFirm.reputationScore = 0;
        newFirm.bctBalance = 0;
        newFirm.contributionRatio = 0;
        newFirm.averageContributionTier = 0;
        newFirm.totalTCO2Deposited = 0;
        newFirm.bctStaked = 0;
        newFirm.penalty = 0;
        newFirm.bctRetired = 0;
        newFirm.usdcBalance = 0;    //this is the USDC the firm has
        registeredFirms[firmAddress] = true;
        
        emit FirmRegistered(firmAddress);
    }
    
    // Keep the original function for backward compatibility
    function registerFirm() public {
        registerFirm(msg.sender);
    }
    
    // Function to reduce firm's available TCO2 when minting BCT
    function reduceFirmAvailableTCO2(address firmAddress, string memory tier, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(firms[firmAddress].availableTCO2PerTier[tier] >= amount, "Insufficient available TCO2");
        
        firms[firmAddress].availableTCO2PerTier[tier] -= amount;
        
        emit TCO2Reduced(firmAddress, tier, amount);
    }

    // BCT Balance Management Functions
    function increaseBCTBalance(address firmAddress, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(amount > 0, "Amount must be greater than 0");
        
        firms[firmAddress].bctBalance += amount;
        
        emit BCTBalanceIncreased(firmAddress, amount);
    }

    function decreaseBCTBalance(address firmAddress, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(amount > 0, "Amount must be greater than 0");
        require(firms[firmAddress].bctBalance >= amount, "Insufficient BCT balance");
        
        firms[firmAddress].bctBalance -= amount;
        
        emit BCTBalanceDecreased(firmAddress, amount);
    }

    //pool of BCT and USDC:

    //dummy function to increase firm usdc balance
    function addUSDCToFirmWallet(address firmAddress, uint256 amount) public {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(amount > 0, "Amount must be greater than 0");
        firms[firmAddress].usdcBalance += amount;
    }

    // Buy BCT with USDC (AMM implementation)
    function buyBCT(address firmAddress, uint256 usdcAmount) public {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(usdcAmount > 0, "Amount must be greater than 0");
        require(firms[firmAddress].usdcBalance >= usdcAmount, "Insufficient USDC balance");
        require(poolUSDC + usdcAmount > 0, "Invalid pool state");

        // Calculate BCT amount using AMM formula: BCT_out = poolBCT - (k / (poolUSDC + USDC_in))
        uint256 calculatedAmount = poolBCT - (k / (poolUSDC + usdcAmount));
        require(calculatedAmount > 0, "Invalid calculation result");
        require(calculatedAmount <= poolBCT, "Not enough BCT in pool");

        // Update balances
        firms[firmAddress].bctBalance += calculatedAmount;
        firms[firmAddress].usdcBalance -= usdcAmount;
        poolBCT -= calculatedAmount;
        poolUSDC += usdcAmount;
        
        // Update k constant to maintain invariant
        k = poolBCT * poolUSDC;
    }

    function retireTCO2FromDeposited(address firmAddress, string memory tier, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(firms[firmAddress].depositedTCO2PerTier[tier] >= amount, "Insufficient deposited TCO2");
        // Reduce deposited TCO2 for this tier
        firms[firmAddress].depositedTCO2PerTier[tier] -= amount;
        
        // Reduce total deposited TCO2
        firms[firmAddress].totalTCO2Deposited -= amount;
        
        // Emit event for tracking
        emit TCO2Retired(firmAddress, tier, amount);
    }

    // NEW: Event for TCO2 retirement (add to events section)
    event TCO2Retired(address firm, string tier, uint256 amount);


    // Sell BCT for USDC (AMM implementation)  
    function sellBCT(address firmAddress, uint256 bctAmount) public {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(bctAmount > 0, "Amount must be greater than 0");
        require(firms[firmAddress].bctBalance >= bctAmount, "Insufficient BCT balance");
        require(poolBCT + bctAmount > 0, "Invalid pool state");

        // Calculate USDC amount using AMM formula: USDC_out = poolUSDC - (k / (poolBCT + BCT_in))
        uint256 calculatedAmount = poolUSDC - (k / (poolBCT + bctAmount));
        require(calculatedAmount > 0, "Invalid calculation result");
        require(calculatedAmount <= poolUSDC, "Not enough USDC in pool");

        // Update balances - FIXED: was subtracting calculatedAmount twice
        firms[firmAddress].usdcBalance += calculatedAmount;  // Add USDC to firm
        firms[firmAddress].bctBalance -= bctAmount;          // Remove BCT from firm
        poolUSDC -= calculatedAmount;                        // Remove USDC from pool
        poolBCT += bctAmount;                               // Add BCT to pool
        
        // Update k constant to maintain invariant
        k = poolBCT * poolUSDC;
    }

    // Getter functions for AMM prices
    function getBCTPrice() public view returns (uint256) {
        // Price of 1 BCT in USDC (scaled by 1000 for precision)
        // Price = poolUSDC / poolBCT * 1000
        require(poolBCT > 0, "BCT pool cannot be zero");
        return (poolUSDC * 1000) / poolBCT;
    }

    function getUSDCPrice() public view returns (uint256) {
        // Price of 1 USDC in BCT (scaled by 1000 for precision)  
        // Price = poolBCT / poolUSDC * 1000
        require(poolUSDC > 0, "USDC pool cannot be zero");
        return (poolBCT * 1000) / poolUSDC;
    }

    // Get current pool state
    function getPoolState() public view returns (uint256 usdcPool, uint256 bctPool, uint256 invariant) {
        return (poolUSDC, poolBCT, k);
    }

    // Calculate BCT amount for given USDC input
    function calculateBCTOutput(uint256 usdcInput) public view returns (uint256) {
        require(usdcInput > 0, "Input must be greater than 0");
        require(poolUSDC + usdcInput > 0, "Invalid pool state");
        
        uint256 bctOutput = poolBCT - (k / (poolUSDC + usdcInput));
        return bctOutput <= poolBCT ? bctOutput : 0;
    }

    // Calculate USDC amount for given BCT input
    function calculateUSDCOutput(uint256 bctInput) public view returns (uint256) {
        require(bctInput > 0, "Input must be greater than 0");
        require(poolBCT + bctInput > 0, "Invalid pool state");
        
        uint256 usdcOutput = poolUSDC - (k / (poolBCT + bctInput));
        return usdcOutput <= poolUSDC ? usdcOutput : 0;
    }

    // Get firm USDC balance
    function getFirmUSDCBalance(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].usdcBalance;
    }




    // BCT Retirement tracking
    function increaseBCTRetired(address firmAddress, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(amount > 0, "Amount must be greater than 0");
        
        firms[firmAddress].bctRetired += amount;
        
        emit BCTRetired(firmAddress, amount);
    }

    // Staking functions
    function setStake(address firmAddress, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(amount > 0, "Amount must be greater than 0");
        
        firms[firmAddress].bctStaked += amount;
        
        emit BCTStaked(firmAddress, amount);
    }

    // Reputation calculation
    function updateReputation(address firmAddress) public {
        require(registeredFirms[firmAddress], "Firm not registered");
        uint256 inputMin = 0;
        uint256 inputMax = 50;
        // Stake points: (bctStaked / 1000) * 20
        uint256 stakePoints = (firms[firmAddress].bctStaked / 1000) * 20;
        
        // Deposit points calculation
        uint256 depositPoints = (
            firms[firmAddress].availableTCO2PerTier["Platinum"] * 5 +
            firms[firmAddress].availableTCO2PerTier["Gold"] * 4 +
            firms[firmAddress].availableTCO2PerTier["Silver"] * 3 +
            firms[firmAddress].availableTCO2PerTier["Bronze"] * 2 +
            firms[firmAddress].availableTCO2PerTier["Grey"] * 1
        ) / 2;

        // Clamp to input range [inputMin, inputMax]
        if (depositPoints < inputMin) depositPoints = inputMin;
        if (depositPoints > inputMax) depositPoints = inputMax;

        // Scale to [1, 400]
        uint256 scaledPoints = 1 + ((depositPoints - inputMin) * (400 - 1)) / (inputMax - inputMin);

        firms[firmAddress].reputationScore = scaledPoints + depositPoints - firms[firmAddress].penalty;
        
        emit ReputationUpdated(firmAddress, firms[firmAddress].reputationScore);
    }

    // Contribution ratio calculation
    function updateContributionRatio(address firmAddress) public {
        require(registeredFirms[firmAddress], "Firm not registered");
        
        uint256 tco2Value = firms[firmAddress].availableTCO2PerTier["Platinum"] * 150 +
            firms[firmAddress].availableTCO2PerTier["Gold"] * 125 +
            firms[firmAddress].availableTCO2PerTier["Silver"] * 100 +
            firms[firmAddress].availableTCO2PerTier["Bronze"] * 75 +
            firms[firmAddress].availableTCO2PerTier["Grey"] * 50;

        uint256 retiredBCT = firms[firmAddress].bctRetired >= 1 ? firms[firmAddress].bctRetired : 1;

        firms[firmAddress].contributionRatio = tco2Value / retiredBCT;
        
        emit ContributionRatioUpdated(firmAddress, firms[firmAddress].contributionRatio);
    }
    
    // Function to calculate and update average contribution tier
    function updateAverageContributionTier(address firmAddress) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        DataStructures.Firm storage firm = firms[firmAddress];
        
        if (firm.totalTCO2Deposited == 0) {
            firm.averageContributionTier = 0;
            return;
        }
        
        uint256 weightedSum = 0;
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        
        for (uint i = 0; i < tiers.length; i++) {
            string memory tier = tiers[i];
            uint256 tierCount = firm.depositedTCO2PerTier[tier];
            uint256 tierValue = tierValues[tier];
            weightedSum += tierCount * tierValue;
        }
        
        // Calculate average (scaled by 100 for precision)
        firm.averageContributionTier = (weightedSum * 100) / firm.totalTCO2Deposited;
        
        emit AverageContributionTierUpdated(firmAddress, firm.averageContributionTier);
    }

    // Update firm's deposited TCO2 tracking
    function updateFirmTCO2Data(
        address firmAddress, 
        string memory tier, 
        uint256 amount
    ) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        DataStructures.Firm storage firm = firms[firmAddress];
        
        firm.depositedTCO2PerTier[tier] += amount;
        firms[firmAddress].availableTCO2PerTier[tier] += amount;
        firm.totalTCO2Deposited += amount;
    }
    
    // View functions
    function getFirmDetails(address firmAddress) public view returns (
        address addr,
        uint256 reputation,
        uint256 bctBalance,
        uint256 contributionRatio,
        uint256 averageContributionTier,
        uint256[] memory ownedCredits,
        uint256 totalTCO2Deposited
    ) {
        require(registeredFirms[firmAddress], "Firm not registered");
        DataStructures.Firm storage firm = firms[firmAddress];
        
        return (
            firm.firmAddress,
            firm.reputationScore,
            firm.bctBalance, // Direct access to bctBalance from struct
            firm.contributionRatio,
            firm.averageContributionTier,
            firm.ownedCreditIds,
            firm.totalTCO2Deposited
        );
    }
    
    function getFirmAvailableTCO2PerTier(address firmAddress, string memory tier) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].availableTCO2PerTier[tier];
    }
    
    function getFirmBCTBalance(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].bctBalance; // Direct access to struct field
    }
    
    function getFirmTotalTCO2Deposited(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].totalTCO2Deposited;
    }
    
    function getFirmAverageContributionTier(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].averageContributionTier;
    }
    
    function getFirmTCO2PerTier(address firmAddress, string memory tier) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].depositedTCO2PerTier[tier];
    }
    
    function getFirmBCTStaked(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].bctStaked;
    }
    
    function getFirmBCTRetired(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].bctRetired;
    }
    
    function isFirmRegistered(address firmAddress) public view returns (bool) {
        return registeredFirms[firmAddress];
    }
}