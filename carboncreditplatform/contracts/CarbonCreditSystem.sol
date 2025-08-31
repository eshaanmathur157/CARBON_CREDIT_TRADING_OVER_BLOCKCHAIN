// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Interfaces.sol";
import "./FirmManagement.sol";
import "./CreditManagement.sol";
import "./TierPoolManagement.sol";
import "./BCTManagement.sol";
import "./DataStructures.sol";

contract CarbonCreditSystem {
    // Contract instances
    FirmManagement public firmManagement;
    CreditManagement public creditManagement;
    TierPoolManagement public tierPoolManagement;
    BCTManagement public bctManagement;
    
    // Events
    event SystemInitialized(
        address firmManagement,
        address creditManagement,
        address tierPoolManagement,
        address bctManagement
    );
    event BCTRetired(
    address firm, 
    uint256 totalBCTAmount, 
    uint256 priorityAmount, 
    uint256 generalAmount,
    DataStructures.RetiredCreditsInfo priorityCreditsRetired,
    DataStructures.RetiredCreditsInfo generalCreditsRetired
);
    event CreditAssignedToFirm(uint256 creditId, address firm);
    event CreditCreatedByFirm(uint256 creditId, address firm);
    constructor() {
        // Deploy all sub-contracts
        firmManagement = new FirmManagement();
        
        // Deploy other contracts with references to each other
        creditManagement = new CreditManagement(
            address(firmManagement),
            address(0) // Will be updated after TierPoolManagement is deployed
        );
        
        tierPoolManagement = new TierPoolManagement(
            address(firmManagement),
            address(creditManagement)
        );
        
        bctManagement = new BCTManagement(
            address(firmManagement)
        );
        
        // Update the TierPoolManagement reference in CreditManagement
        creditManagement.setTierPoolManagement(address(tierPoolManagement));
        
        // Set the BCT management contract reference in FirmManagement
        firmManagement.setBCTManagementContract(address(bctManagement));
        
        emit SystemInitialized(
            address(firmManagement),
            address(creditManagement),
            address(tierPoolManagement),
            address(bctManagement)
        );
    }
    
    // Proxy functions for easier access to main functionality
    
    // Firm Management Functions
    function registerFirm() public {
        firmManagement.registerFirm(msg.sender);
    }

    // Credit Management Functions
    function getPendingCredit(uint256 creditId) public view returns (
        uint256 id,
        string memory tier,
        string memory location,
        string[] memory coordinates,
        address owner,
        bool isRetired
    ) {
        return creditManagement.getPendingCredit(creditId);
    }

    function isCreditPending(uint256 creditId) public view returns (bool) {
        return creditManagement.isCreditPending(creditId);
    }
    
    function getFirmDetails(address firmAddress) public view returns (
        address addr,
        uint256 reputation,
        uint256 bctBalance,
        uint256 contributionRatio,
        uint256 averageContributionTier,
        uint256[] memory ownedCredits,
        uint256 totalTCO2Deposited
    ) {
        return firmManagement.getFirmDetails(firmAddress);
    }
    
    function isFirmRegistered(address firmAddress) public view returns (bool) {
        return firmManagement.isFirmRegistered(firmAddress);
    }
    
    // Credit Management Functions
    function createTCO2Credit(
        string memory tier,
        string memory location,
        string[] memory coordinates
    ) public returns (uint256) {
        uint256 t =  creditManagement.createTCO2CreditForFirm(msg.sender, tier, location, coordinates);

        emit CreditCreatedByFirm(t, msg.sender);
    }
    
    function storeDummyCredit(
        string memory tier,
        string memory location,
        string[] memory coordinates
    ) public returns (uint256) {
        return creditManagement.storeDummyCredit(tier, location, coordinates);
    }
    
    function assignCreditToFirm(uint256 creditId, address firmAddress) public {
        creditManagement.assignCreditToFirm(creditId, firmAddress);

        emit CreditAssignedToFirm(creditId, firmAddress);
    }
    
    function getTCO2Credit(uint256 creditId) public view returns (
        uint256 id,
        string memory tier,
        string memory location,
        string[] memory coordinates,
        address owner,
        bool isRetired
    ) {
        return creditManagement.getTCO2Credit(creditId);
    }
    
    function getAllPendingCreditIds() public view returns (uint256[] memory) {
        return creditManagement.getAllPendingCreditIds();
    }
    
    function getPendingCreditsByTier(string memory tier) public view returns (uint256[] memory) {
        return creditManagement.getPendingCreditsByTier(tier);
    }
    
    // BCT Management Functions
    event BCTMinted(address firm, uint256 amount, string tier, uint256 tco2Used);

    function mintBCT(string memory tier, uint256 tco2Amount) public {
        require(firmManagement.isFirmRegistered(msg.sender), "Only registered firms can mint BCT");
        
        uint256 bctAmount = bctManagement.calculateBCTFromTCO2(tier, tco2Amount);
        bctManagement.mintBCTForFirm(msg.sender, tier, tco2Amount);
        
        emit BCTMinted(msg.sender, bctAmount, tier, tco2Amount);
    }

    function getTotalBCTSupply() public view returns (uint256) {
        return bctManagement.getTotalBCTSupply();
    }
    
    function calculateBCTFromTCO2(string memory tier, uint256 tco2Amount) public view returns (uint256) {
        return bctManagement.calculateBCTFromTCO2(tier, tco2Amount);
    }

    function updateReputation(address firmAddress) public {
        firmManagement.updateReputation(firmAddress);
    }

    function getFirmReputation(address firmAddress) public returns (uint256) {
        firmManagement.updateReputation(firmAddress);
        (, uint256 reputation, , , , , ) = firmManagement.getFirmDetails(firmAddress);
        return reputation;
    }

    // Staking Functions
    event BCTStaked(address firm, uint256 amount, uint256 reputation);

    function stakeBCT(address firmAddress, uint256 amount) public {
        require(firmManagement.isFirmRegistered(firmAddress), "Only registered firms can stake BCT");
        require(amount > 0, "Amount must be greater than 0");
        uint256 reputation = getFirmReputation(firmAddress);
        bctManagement.stakeBCT(firmAddress, amount);
        
        emit BCTStaked(firmAddress, amount, reputation);
    }

    function getFirmStakedBCT(address firmAddress) public view returns (uint256) {
        return bctManagement.staked(firmAddress);
    }

    function getTotalBCTStaked() public view returns (uint256) {
        return bctManagement.getTotalBCTstaked();
    }

    function updateContributionRatio(address firmAddress) public {
        firmManagement.updateContributionRatio(firmAddress);
    }

    function getFirmContributionRatio(address firmAddress) public view returns (uint256) {
        (, , , uint256 contributionRatio, , , ) = firmManagement.getFirmDetails(firmAddress);
        return contributionRatio;
    }

    function getEnhancedFirmDetails(address firmAddress) public view returns (
        address addr,
        uint256 reputation,
        uint256 bctBalance,
        uint256 stakedBCT,
        uint256 contributionRatio,
        uint256 averageContributionTier,
        uint256[] memory ownedCredits,
        uint256 totalTCO2Deposited
    ) {
        (addr, reputation, bctBalance, contributionRatio, averageContributionTier, ownedCredits, totalTCO2Deposited) = firmManagement.getFirmDetails(firmAddress);
        stakedBCT = getFirmStakedBCT(firmAddress);
    }
    
    // Tier Pool Management Functions
    function getTierPoolStatus(string memory tier) public view returns (
        uint256 generalPoolCount,
        uint256 priorityReserveCount,
        uint256 totalCapacity,
        uint256 totalSoFar,
        uint256 conversionRate
    ) {
        return tierPoolManagement.getTierPoolStatus(tier);
    }
    
    function getFirmCreditsPerTier(address firmAddress, string memory tier) public view returns (uint256) {
        return tierPoolManagement.getFirmCreditsPerTier(firmAddress, tier);
    }
    
    

    // NEW: Retirement Function
    function retireBCT(
    address firmAddress,
    uint256 totalBCTAmount,
    uint256 platinum,
    uint256 gold,
    uint256 silver,
    uint256 bronze,
    uint256 grey
) public returns (DataStructures.RetiredCreditsInfo memory priorityCreditsRetired, DataStructures.RetiredCreditsInfo memory generalCreditsRetired) {
    require(firmManagement.isFirmRegistered(firmAddress), "Only registered firms can retire BCT");
    require(totalBCTAmount > 0, "BCT amount must be greater than 0");
    
    uint256 priorityBCTAmount = 150 * platinum + 125 * gold + 100 * silver + 75 * bronze + 50 * grey;
    
    // Call the tierPoolManagement retireBCT function and capture return values
    (priorityCreditsRetired, generalCreditsRetired) = tierPoolManagement.retireBCT(
        firmAddress,
        totalBCTAmount,
        platinum,
        gold,
        silver,
        bronze,
        grey
    );
    
    // Emit the updated event with retired credits info
    emit BCTRetired(
        msg.sender, 
        totalBCTAmount, 
        priorityBCTAmount, 
        totalBCTAmount - priorityBCTAmount,
        priorityCreditsRetired,
        generalCreditsRetired
    );
}


    
    // Utility Functions
    function getAllTiers() public pure returns (string[5] memory) {
        return ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
    }
    
    function getTotalCreditsCreated() public view returns (uint256) {
        return creditManagement.getTotalCreditsCreated();
    }
    
    function getTotalPendingCredits() public view returns (uint256) {
        return creditManagement.getTotalPendingCredits();
    }
    
    // Additional view functions for comprehensive access
    function getFirmAvailableTCO2PerTier(address firmAddress, string memory tier) public view returns (uint256) {
        return firmManagement.getFirmAvailableTCO2PerTier(firmAddress, tier);
    }
    
    function getFirmBCTBalance(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmBCTBalance(firmAddress);
    }
    
    function getFirmTotalTCO2Deposited(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmTotalTCO2Deposited(firmAddress);
    }
    
    function getFirmAverageContributionTier(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmAverageContributionTier(firmAddress);
    }

    
    // Contract addresses getter for frontend integration
    function getContractAddresses() public view returns (
        address firmMgmt,
        address creditMgmt,
        address tierPoolMgmt,
        address bctMgmt
    ) {
        return (
            address(firmManagement),
            address(creditManagement),
            address(tierPoolManagement),
            address(bctManagement)
        );
    }

    // AMM Functions
    function addUSDCToFirmWallet(address firmAddress, uint256 amount) public {
        firmManagement.addUSDCToFirmWallet(firmAddress, amount);
    }

    function buyBCT(address firmAddress, uint256 usdcAmount) public {
        firmManagement.buyBCT(firmAddress, usdcAmount);
    }

    function sellBCT(address firmAddress, uint256 bctAmount) public {
        firmManagement.sellBCT(firmAddress, bctAmount);
    }

    function getBCTPrice() public view returns (uint256) {
        return firmManagement.getBCTPrice();
    }

    function getUSDCPrice() public view returns (uint256) {
        return firmManagement.getUSDCPrice();
    }

    function getPoolState() public view returns (uint256 usdcPool, uint256 bctPool, uint256 invariant) {
        return firmManagement.getPoolState();
    }

    function getFirmCredits(address firmAddress, string memory tier) external view returns (
        uint256 generalCredits,
        uint256 priorityCredits
    ) {
        return tierPoolManagement.getFirmCredits(firmAddress, tier);
    }

    function calculateBCTOutput(uint256 usdcInput) public view returns (uint256) {
        return firmManagement.calculateBCTOutput(usdcInput);
    }

    function calculateUSDCOutput(uint256 bctInput) public view returns (uint256) {
        return firmManagement.calculateUSDCOutput(bctInput);
    }

    function getFirmUSDCBalance(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmUSDCBalance(firmAddress);
    }

    event USDCAdded(address firm, uint256 amount);
    event BCTPurchased(address firm, uint256 usdcAmount, uint256 bctReceived);
    event BCTSold(address firm, uint256 bctAmount, uint256 usdcReceived);

    function addUSDCToFirmWalletWithEvent(address firmAddress, uint256 amount) public {
        firmManagement.addUSDCToFirmWallet(firmAddress, amount);
        emit USDCAdded(firmAddress, amount);
    }

    function buyBCTWithEvent(address firmAddress, uint256 usdcAmount) public {
        uint256 bctBefore = firmManagement.getFirmBCTBalance(firmAddress);
        firmManagement.buyBCT(firmAddress, usdcAmount);
        uint256 bctAfter = firmManagement.getFirmBCTBalance(firmAddress);
        uint256 bctReceived = bctAfter - bctBefore;
        emit BCTPurchased(firmAddress, usdcAmount, bctReceived);
    }
    function getTierPoolCounts(string memory tier) public view returns (
        uint256 generalPoolCount,
        uint256 priorityReserveCount
    ){
        return tierPoolManagement.getTierPoolCounts(tier);
    }

    function sellBCTWithEvent(address firmAddress, uint256 bctAmount) public {
        uint256 usdcBefore = firmManagement.getFirmUSDCBalance(firmAddress);
        firmManagement.sellBCT(firmAddress, bctAmount);
        uint256 usdcAfter = firmManagement.getFirmUSDCBalance(firmAddress);
        uint256 usdcReceived = usdcAfter - usdcBefore;
        emit BCTSold(firmAddress, bctAmount, usdcReceived);
    }

    function getUnretiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getUnretiredCreditIds(firmAddress, tier);
    }
    function getRetiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getRetiredCreditIds(firmAddress, tier);
    }

    function getTierPoolPriorityIdsByFirmUnretired(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getTierPoolPriorityIdsByFirmUnretired(firmAddress, tier);
    }

    function getTierPoolPriorityIdsByFirmRetired(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getTierPoolPriorityIdsByFirmRetired(firmAddress, tier);
    }

    function getFirmRetiredGeneralCreditIdsByTier(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getFirmRetiredGeneralCreditIdsByTier(firmAddress, tier);
    }
}
