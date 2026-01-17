// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
//BCT is now FCT
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
    
    //NO CHANGE IN THIS FUNCTION 
    function registerFirm() public {
        firmManagement.registerFirm(msg.sender);
    }

    // NO CHANGE IN THIS FUNCTION
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

    //NO CHANGE IN THIS FUNCTION
    function isCreditPending(uint256 creditId) public view returns (bool) {
        return creditManagement.isCreditPending(creditId);
    }
    
    //HAVE TO CHANGE THIS FUNCTION
    //THIS FUNCTION CHANGES IN firmManagement.sol, we remove the property bctBalance from firm struct
    // uint256 realWalletBalance = IERC20(fctTokenAddress).balanceOf(firmAddress); --> this has to be put dude
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
    
    //NO CHANGE IN THIS FUNCTION
    function isFirmRegistered(address firmAddress) public view returns (bool) {
        return firmManagement.isFirmRegistered(firmAddress);
    }
    
    // NO NEED TO CHANGE THIS FUNCTION AT ALL
    function createTCO2Credit(
        string memory tier,
        string memory location,
        string[] memory coordinates
    ) public returns (uint256) {
        uint256 t =  creditManagement.createTCO2CreditForFirm(msg.sender, tier, location, coordinates);

        emit CreditCreatedByFirm(t, msg.sender);
    }
    
    //NO NEED TO CHANGE THIS FUNCTION
    function storeDummyCredit(
        string memory tier,
        string memory location,
        string[] memory coordinates
    ) public returns (uint256) {
        return creditManagement.storeDummyCredit(tier, location, coordinates);
    }
    
    //NO NEED TO CHANGE THIS FUNCTION
    function assignCreditToFirm(uint256 creditId, address firmAddress) public {
        creditManagement.assignCreditToFirm(creditId, firmAddress);

        emit CreditAssignedToFirm(creditId, firmAddress);
    }
    
    //NO NEED TO CHANGE
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
    
    //NO NEED TO CHANGE THIS FUNCTION
    function getAllPendingCreditIds() public view returns (uint256[] memory) {
        return creditManagement.getAllPendingCreditIds();
    }
    
    //NO NEED TO CHANGE THIS FUNCTION
    function getPendingCreditsByTier(string memory tier) public view returns (uint256[] memory) {
        return creditManagement.getPendingCreditsByTier(tier);
    }
    
    // BCT Management Functions
    event BCTMinted(address firm, uint256 amount, string tier, uint256 tco2Used);

    //HAVE TO CHANGE THIS FUNCTION
    function mintBCT(string memory tier, uint256 tco2Amount) public {
        require(firmManagement.isFirmRegistered(msg.sender), "Only registered firms can mint BCT");
        
        uint256 bctAmount = bctManagement.calculateBCTFromTCO2(tier, tco2Amount);
        bctManagement.mintBCTForFirm(msg.sender, tier, tco2Amount);
        
        emit BCTMinted(msg.sender, bctAmount, tier, tco2Amount);
    }

    //NO NEED TO CHANGE
    function getTotalBCTSupply() public view returns (uint256) {
        return bctManagement.getTotalBCTSupply();
    }
    
    //NO NEED TO CHANGE
    function calculateBCTFromTCO2(string memory tier, uint256 tco2Amount) public view returns (uint256) {
        return bctManagement.calculateBCTFromTCO2(tier, tco2Amount);
    }

    //NO NEED TO CHANGE
    function updateReputation(address firmAddress) public {
        firmManagement.updateReputation(firmAddress);
    }

    //NO NEED TO CHANGE
    function getFirmReputation(address firmAddress) public returns (uint256) {
        firmManagement.updateReputation(firmAddress);
        (, uint256 reputation, , , , , ) = firmManagement.getFirmDetails(firmAddress);
        return reputation;
    }

    // Staking Functions
    event BCTStaked(address firm, uint256 amount, uint256 reputation);

    //HAVE TO CHANGE THIS FUNCTION
    function stakeBCT(address firmAddress, uint256 amount) public {
        require(firmManagement.isFirmRegistered(firmAddress), "Only registered firms can stake BCT");
        require(amount > 0, "Amount must be greater than 0");
        uint256 reputation = getFirmReputation(firmAddress);
        bctManagement.stakeBCT(firmAddress, amount);
        
        emit BCTStaked(firmAddress, amount, reputation);
    }

    //NO NEED TO CHANGE
    function getFirmStakedBCT(address firmAddress) public view returns (uint256) {
        return bctManagement.staked(firmAddress);
    }

    //NO NEED TO CHANGE
    function getTotalBCTStaked() public view returns (uint256) {
        return bctManagement.getTotalBCTstaked();
    }

    //NO NEED TO CHANGE
    function updateContributionRatio(address firmAddress) public {
        firmManagement.updateContributionRatio(firmAddress);
    }

    //NO NEED TO CHANGE
    function getFirmContributionRatio(address firmAddress) public view returns (uint256) {
        (, , , uint256 contributionRatio, , , ) = firmManagement.getFirmDetails(firmAddress);
        return contributionRatio;
    }

    //HAVE TO CHANGE THIS FUNCTION
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
    
    //NO NEED TO CHANGE
    function getTierPoolStatus(string memory tier) public view returns (
        uint256 generalPoolCount,
        uint256 priorityReserveCount,
        uint256 totalCapacity,
        uint256 totalSoFar,
        uint256 conversionRate
    ) {
        return tierPoolManagement.getTierPoolStatus(tier);
    }

    //NO NEED TO CHANGE
    function getFirmCreditsPerTier(address firmAddress, string memory tier) public view returns (uint256) {
        return tierPoolManagement.getFirmCreditsPerTier(firmAddress, tier);
    }
    
    

    // HAVE TO CHANGE THIS FUNCTION
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


    
    //NO NEED TO CHANGE
    function getAllTiers() public pure returns (string[5] memory) {
        return ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
    }
    
    //NO NEED TO CHANGE
    function getTotalCreditsCreated() public view returns (uint256) {
        return creditManagement.getTotalCreditsCreated();
    }
    
    //NO NEED TO CHANGE
    function getTotalPendingCredits() public view returns (uint256) {
        return creditManagement.getTotalPendingCredits();
    }
    
    //NO NEED TO CHANGE
    function getFirmAvailableTCO2PerTier(address firmAddress, string memory tier) public view returns (uint256) {
        return firmManagement.getFirmAvailableTCO2PerTier(firmAddress, tier);
    }
    
    //HAVE TO CHANGE THIS FUNCTION
    function getFirmBCTBalance(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmBCTBalance(firmAddress);
    }
    
    //NO NEED TO CHANGE
    function getFirmTotalTCO2Deposited(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmTotalTCO2Deposited(firmAddress);
    }
    
    //NO NEED TO CHANGE
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

    // HAVE TO CHANGE THIS FUNCTION
    function addUSDCToFirmWallet(address firmAddress, uint256 amount) public {
        firmManagement.addUSDCToFirmWallet(firmAddress, amount);
    }

    // HAVE TO CHANGE THIS FUNCTION
    function buyBCT(address firmAddress, uint256 usdcAmount) public {
        firmManagement.buyBCT(firmAddress, usdcAmount);
    }

    // HAVE TO CHANGE THIS FUNCTION
    function sellBCT(address firmAddress, uint256 bctAmount) public {
        firmManagement.sellBCT(firmAddress, bctAmount);
    }

    //HAVE TO CHANGE THIS FUNCTION --> USE UNISWAP API
    function getBCTPrice() public view returns (uint256) {
        return firmManagement.getBCTPrice();
    }

    //HAVE TO CHANGE THIS FUNCTION --> USE UNISWAP API
    function getUSDCPrice() public view returns (uint256) {
        return firmManagement.getUSDCPrice();
    }

    //HAVE TO CHANGE THIS FUNCTION --> USE UNISWAP API
    function getPoolState() public view returns (uint256 usdcPool, uint256 bctPool, uint256 invariant) {
        return firmManagement.getPoolState();
    }

    //NO NEED TO CHANGE
    function getFirmCredits(address firmAddress, string memory tier) external view returns (
        uint256 generalCredits,
        uint256 priorityCredits
    ) {
        return tierPoolManagement.getFirmCredits(firmAddress, tier);
    }

    //HAVE TO CHANGE THIS FUNCTION --> USE UNISWAP API
    function calculateBCTOutput(uint256 usdcInput) public view returns (uint256) {
        return firmManagement.calculateBCTOutput(usdcInput);
    }

    //HAVE TO CHANGE THIS FUNCTION --> USE UNISWAP API
    function calculateUSDCOutput(uint256 bctInput) public view returns (uint256) {
        return firmManagement.calculateUSDCOutput(bctInput);
    }

    //HAVE TO CHANGE THIS FUNCTION --> DONE
    function getFirmUSDCBalance(address firmAddress) public view returns (uint256) {
        return firmManagement.getFirmUSDCBalance(firmAddress);
    }

    event USDCAdded(address firm, uint256 amount);
    event BCTPurchased(address firm, uint256 usdcAmount, uint256 bctReceived);
    event BCTSold(address firm, uint256 bctAmount, uint256 usdcReceived);

    //HAVE TO CHANGE THIS FUNCTION --> LETS NOT USE THIS PLEASEE
    function addUSDCToFirmWalletWithEvent(address firmAddress, uint256 amount) public {
        firmManagement.addUSDCToFirmWallet(firmAddress, amount);
        emit USDCAdded(firmAddress, amount);
    }

    //HAVE TO CHANGE THIS FUNCTION
    function buyBCTWithEvent(address firmAddress, uint256 usdcAmount) public {
        uint256 bctBefore = firmManagement.getFirmBCTBalance(firmAddress);
        firmManagement.buyBCT(firmAddress, usdcAmount);
        uint256 bctAfter = firmManagement.getFirmBCTBalance(firmAddress);
        uint256 bctReceived = bctAfter - bctBefore;
        emit BCTPurchased(firmAddress, usdcAmount, bctReceived);
    }

    //NO NEED TO CHANGE
    function getTierPoolCounts(string memory tier) public view returns (
        uint256 generalPoolCount,
        uint256 priorityReserveCount
    ){
        return tierPoolManagement.getTierPoolCounts(tier);
    }

    //HAVE TO CHANGE THIS FUNCTION
    function sellBCTWithEvent(address firmAddress, uint256 bctAmount) public {
        uint256 usdcBefore = firmManagement.getFirmUSDCBalance(firmAddress);
        firmManagement.sellBCT(firmAddress, bctAmount);
        uint256 usdcAfter = firmManagement.getFirmUSDCBalance(firmAddress);
        uint256 usdcReceived = usdcAfter - usdcBefore;
        emit BCTSold(firmAddress, bctAmount, usdcReceived);
    }

    //NO NEED TO CHANGE
    function getUnretiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getUnretiredCreditIds(firmAddress, tier);
    }

    //NO NEED TO CHANGE
    function getRetiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getRetiredCreditIds(firmAddress, tier);
    }

    //NO NEED TO CHANGE
    function getTierPoolPriorityIdsByFirmUnretired(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getTierPoolPriorityIdsByFirmUnretired(firmAddress, tier);
    }

    //NO NEED TO CHANGE
    function getTierPoolPriorityIdsByFirmRetired(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getTierPoolPriorityIdsByFirmRetired(firmAddress, tier);
    }

    //NO NEED TO CHANGE
    function getFirmRetiredGeneralCreditIdsByTier(address firmAddress, string memory tier) external view returns (uint256[] memory){
        return tierPoolManagement.getFirmRetiredGeneralCreditIdsByTier(firmAddress, tier);
    }
}
