// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DataStructures.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

contract FirmManagement {
    using DataStructures for DataStructures.Firm;
    using SafeERC20 for IERC20;

    // Storage
    mapping(address => DataStructures.Firm) public firms;
    mapping(address => bool) public registeredFirms;
    mapping(string => uint256) public tierValues;
    
    // Contract references
    address public bctManagementContract;
    
    // 1. REAL ADDRESSES (Sepolia)
    address public constant FCT_ADDRESS = 0x80E8b7Eb8B3f754024D449D139dc8308f55E55Ac;
    address public constant USDC_ADDRESS = 0xE530a032DB0c1b2Abccea2Cd677dde6eB04e7459;
    address public constant ROUTER_ADDRESS = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E; 

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
    event BCTBought(address firm, uint256 usdcSpent, uint256 fctReceived);
    event BCTSold(address firm, uint256 fctSpent, uint256 usdcReceived);
    event TCO2Retired(address firm, string tier, uint256 amount);

    modifier onlyBCTContract() {
        require(msg.sender == bctManagementContract, "Only BCTManagement contract can call this");
        _;
    }
    
    constructor() {
        tierValues["Platinum"] = 5;
        tierValues["Gold"] = 4;
        tierValues["Silver"] = 3;
        tierValues["Bronze"] = 2;
        tierValues["Grey"] = 1;
    }
    
    function setBCTManagementContract(address _bctManagement) external {
        require(bctManagementContract == address(0), "BCT management contract already set");
        bctManagementContract = _bctManagement;
    }
    
    function registerFirm(address firmAddress) public {
        require(!registeredFirms[firmAddress], "Firm already registered");
        
        DataStructures.Firm storage newFirm = firms[firmAddress];
        newFirm.firmAddress = firmAddress;
        newFirm.reputationScore = 0;
        newFirm.contributionRatio = 0;
        newFirm.averageContributionTier = 0;
        newFirm.totalTCO2Deposited = 0;
        newFirm.bctStaked = 0;
        newFirm.penalty = 0;
        newFirm.bctRetired = 0;
        registeredFirms[firmAddress] = true;
        
        emit FirmRegistered(firmAddress);
    }
    
    function registerFirm() public {
        registerFirm(msg.sender);
    }
    
    // SECURED: Only BCT Contract should be able to reduce TCO2 (during minting)
    function reduceFirmAvailableTCO2(address firmAddress, string memory tier, uint256 amount) external onlyBCTContract {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(firms[firmAddress].availableTCO2PerTier[tier] >= amount, "Insufficient available TCO2");
        
        firms[firmAddress].availableTCO2PerTier[tier] -= amount;
        emit TCO2Reduced(firmAddress, tier, amount);
    }

    // --- REAL BUY FUNCTION ---
    function buyBCT(uint256 usdcAmount) public {
        require(registeredFirms[msg.sender], "Firm not registered");
        require(usdcAmount > 0, "Amount must be greater than 0");
        
        // 1. Pull USDC
        IERC20(USDC_ADDRESS).safeTransferFrom(msg.sender, address(this), usdcAmount);

        // 2. Approve Router
        IERC20(USDC_ADDRESS).forceApprove(ROUTER_ADDRESS, usdcAmount);

        // 3. Trade on Uniswap
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: USDC_ADDRESS,
                tokenOut: FCT_ADDRESS,
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp + 300,
                amountIn: usdcAmount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        uint256 fctReceived = ISwapRouter(ROUTER_ADDRESS).exactInputSingle(params);
        emit BCTBought(msg.sender, usdcAmount, fctReceived);
    }

    // --- REAL SELL FUNCTION ---
    function sellBCT(uint256 bctAmount) public {
        require(registeredFirms[msg.sender], "Firm not registered");
        require(bctAmount > 0, "Amount must be greater than 0");

        // 1. Pull FCT
        IERC20(FCT_ADDRESS).safeTransferFrom(msg.sender, address(this), bctAmount);

        // 2. Approve Router
        IERC20(FCT_ADDRESS).forceApprove(ROUTER_ADDRESS, bctAmount);

        // 3. Trade on Uniswap
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: FCT_ADDRESS,
                tokenOut: USDC_ADDRESS,
                fee: 3000,
                recipient: msg.sender,
                deadline: block.timestamp + 300,
                amountIn: bctAmount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        uint256 usdcReceived = ISwapRouter(ROUTER_ADDRESS).exactInputSingle(params);
        emit BCTSold(msg.sender, bctAmount, usdcReceived);
    }
    
    // SECURED: Only internal logic (or authorized contracts) should retire TCO2
    // Assuming TierPoolManagement calls this? If so, you might need a separate modifier or setter for TierPool.
    // For now, kept 'external' but be careful who calls this!
    function retireTCO2FromDeposited(address firmAddress, string memory tier, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(firms[firmAddress].depositedTCO2PerTier[tier] >= amount, "Insufficient deposited TCO2");

        firms[firmAddress].depositedTCO2PerTier[tier] -= amount;
        firms[firmAddress].totalTCO2Deposited -= amount;
        
        emit TCO2Retired(firmAddress, tier, amount);
    }

    // --- REMOVED DEAD AMM GETTER FUNCTIONS HERE ---
    // (getBCTPrice, getPoolState, etc. are gone because they used deleted variables)

    function getFirmUSDCBalance(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return IERC20(USDC_ADDRESS).balanceOf(firmAddress);
    }

    // SECURED: Only TierPool contract should call this (assuming logic)
    function increaseBCTRetired(address firmAddress, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(amount > 0, "Amount must be greater than 0");
        
        firms[firmAddress].bctRetired += amount;
        emit BCTRetired(firmAddress, amount);
    }

    // SECURED: Only BCTManagement should call this
    function setStake(address firmAddress, uint256 amount) external onlyBCTContract {
        require(registeredFirms[firmAddress], "Firm not registered");
        require(amount > 0, "Amount must be greater than 0");
        
        firms[firmAddress].bctStaked += amount;
        emit BCTStaked(firmAddress, amount);
    }

    // ... (Reputation functions and View functions remain unchanged) ...
    // Note: Ensure updateFirmTCO2Data is called by a trusted contract (CreditManagement)
    
    function updateReputation(address firmAddress) public {
        require(registeredFirms[firmAddress], "Firm not registered");
        uint256 inputMin = 0;
        uint256 inputMax = 50;
        uint256 stakePoints = (firms[firmAddress].bctStaked / 1000) * 20;
        
        uint256 depositPoints = (
            firms[firmAddress].availableTCO2PerTier["Platinum"] * 5 +
            firms[firmAddress].availableTCO2PerTier["Gold"] * 4 +
            firms[firmAddress].availableTCO2PerTier["Silver"] * 3 +
            firms[firmAddress].availableTCO2PerTier["Bronze"] * 2 +
            firms[firmAddress].availableTCO2PerTier["Grey"] * 1
        ) / 2;

        if (depositPoints < inputMin) depositPoints = inputMin;
        if (depositPoints > inputMax) depositPoints = inputMax;

        uint256 scaledPoints = 1 + ((depositPoints - inputMin) * (400 - 1)) / (inputMax - inputMin);
        firms[firmAddress].reputationScore = scaledPoints + depositPoints - firms[firmAddress].penalty;
        
        emit ReputationUpdated(firmAddress, firms[firmAddress].reputationScore);
    }

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
        
        firm.averageContributionTier = (weightedSum * 100) / firm.totalTCO2Deposited;
        emit AverageContributionTierUpdated(firmAddress, firm.averageContributionTier);
    }

    function updateFirmTCO2Data(address firmAddress, string memory tier, uint256 amount) external {
        require(registeredFirms[firmAddress], "Firm not registered");
        DataStructures.Firm storage firm = firms[firmAddress];
        
        firm.depositedTCO2PerTier[tier] += amount;
        firms[firmAddress].availableTCO2PerTier[tier] += amount;
        firm.totalTCO2Deposited += amount;
    }
    
    // View Functions
    function getFirmDetails(address firmAddress) public view returns (
        address addr, uint256 reputation, uint256 bctBalance, uint256 contributionRatio,
        uint256 averageContributionTier, uint256[] memory ownedCredits, uint256 totalTCO2Deposited
    ) {
        require(registeredFirms[firmAddress], "Firm not registered");
        DataStructures.Firm storage firm = firms[firmAddress];
        uint256 realWalletBalance = IERC20(FCT_ADDRESS).balanceOf(firmAddress);

        return (
            firm.firmAddress, firm.reputationScore, realWalletBalance,
            firm.contributionRatio, firm.averageContributionTier,
            firm.ownedCreditIds, firm.totalTCO2Deposited
        );
    }
    
    function getFirmAvailableTCO2PerTier(address firmAddress, string memory tier) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return firms[firmAddress].availableTCO2PerTier[tier];
    }
    
    function getFirmBCTBalance(address firmAddress) public view returns (uint256) {
        require(registeredFirms[firmAddress], "Firm not registered");
        return IERC20(FCT_ADDRESS).balanceOf(firmAddress);
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