// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DataStructures.sol";
import "./Interfaces.sol";

contract CreditManagement {
    using DataStructures for DataStructures.TCO2Credit;
    
    // Storage
    mapping(uint256 => DataStructures.TCO2Credit) public allCredits;
    mapping(uint256 => DataStructures.TCO2Credit) public pendingCredits;
    uint256[] public pendingCreditIds;
    uint256 public nextCreditId;
    mapping(string => uint256) public tierConversionRates;
    
    // Contract references
    IFirmManagement public firmManagement;
    ITierPoolManagement public tierPoolManagement;
    
    // Events
    event TCO2CreditCreated(uint256 creditId, string tier, string location, address owner);
    event CreditGenerated(uint256 creditId, string tier, string location);
    event CreditAssignedToFirm(uint256 creditId, address firm, string tier);
    
    constructor(address _firmManagement, address _tierPoolManagement) {
        firmManagement = IFirmManagement(_firmManagement);
        if (_tierPoolManagement != address(0)) {
            tierPoolManagement = ITierPoolManagement(_tierPoolManagement);
        }
        
        // Initialize tier conversion rates (scaled by 100)
        tierConversionRates["Platinum"] = 150; // 1 TCO2 = 1.5 BCT
        tierConversionRates["Gold"] = 125;     // 1 TCO2 = 1.25 BCT
        tierConversionRates["Silver"] = 100;   // 1 TCO2 = 1 BCT
        tierConversionRates["Bronze"] = 75;    // 1 TCO2 = 0.75 BCT
        tierConversionRates["Grey"] = 50;      // 1 TCO2 = 0.5 BCT
        
        nextCreditId = 1;
    }
    
    // Setter function to update TierPoolManagement reference
    function setTierPoolManagement(address _tierPoolManagement) external {
        require(_tierPoolManagement != address(0), "Invalid address");
        tierPoolManagement = ITierPoolManagement(_tierPoolManagement);
    }

    
    // Function to store dummy credit - OWNED BY CONTRACT INITIALLY
    function storeDummyCredit(
        string memory tier,
        string memory location,
        string[] memory coordinates
    ) public returns (uint256) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        uint256 creditId = nextCreditId++;
        
        // Create credit owned by THIS CONTRACT (address(this))
        DataStructures.TCO2Credit memory newCredit = DataStructures.TCO2Credit({
            creditId: creditId,
            tier: tier,
            location: location,
            coordinates: coordinates,
            owner: address(this), // Contract owns it initially
            isRetired: false
        });
        
        // Store in pending credits (these are credits owned by contract)
        pendingCredits[creditId] = newCredit;
        pendingCreditIds.push(creditId);
        
        // Also store in global mapping for easy access
        allCredits[creditId] = newCredit;
        
        emit CreditGenerated(creditId, tier, location);
        return creditId;
    }
    
    // Function to create a new TCO2 credit directly for a firm (different from dummy)
    function createTCO2CreditForFirm(
        address firmAddress,
        string memory tier,
        string memory location,
        string[] memory coordinates
    ) public returns (uint256) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        
        uint256 creditId = nextCreditId++;
        
        DataStructures.TCO2Credit memory newCredit = DataStructures.TCO2Credit({
            creditId: creditId,
            tier: tier,
            location: location,
            coordinates: coordinates,
            owner: firmAddress, // Directly owned by firm
            isRetired: false
        });
        
        // Store in global mapping
        allCredits[creditId] = newCredit;
        
        // Update firm's deposited TCO2 tracking
        firmManagement.updateFirmTCO2Data(firmAddress, tier, 1);
        firmManagement.updateAverageContributionTier(firmAddress);
        
        // Distribute to tier pools directly
        tierPoolManagement.distributeToTierPools(firmAddress, creditId, tier);
        
        emit TCO2CreditCreated(creditId, tier, location, firmAddress);
        return creditId;
    }
    
    // Legacy function for backward compatibility
    function createTCO2Credit(
        string memory tier,
        string memory location,
        string[] memory coordinates
    ) public returns (uint256) {
        return createTCO2CreditForFirm(msg.sender, tier, location, coordinates);
    }
    
    // Function to assign pending credit to a firm
    // This transfers ownership from contract to specified firm
    function assignCreditToFirm(uint256 creditId, address firmAddress) public {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(pendingCredits[creditId].creditId != 0, "Credit not in pending list");
        require(pendingCredits[creditId].owner == address(this), "Credit not owned by contract");
        
        string memory tier = pendingCredits[creditId].tier;
        
        // Update ownership in all mappings
        pendingCredits[creditId].owner = firmAddress;
        allCredits[creditId].owner = firmAddress;
        
        // Update firm's deposited TCO2 tracking
        firmManagement.updateFirmTCO2Data(firmAddress, tier, 1);
        firmManagement.updateAverageContributionTier(firmAddress);
        
        // Distribute to tier pools
        tierPoolManagement.distributeToTierPools(firmAddress, creditId, tier);
        
        // Remove from pending credits (since it's no longer owned by contract)
        _removePendingCredit(creditId);
        
        emit CreditAssignedToFirm(creditId, firmAddress, tier);
    }
    
    // Helper function to remove credit from pending credits array
    function _removePendingCredit(uint256 creditId) internal {
        for (uint256 i = 0; i < pendingCreditIds.length; i++) {
            if (pendingCreditIds[i] == creditId) {
                pendingCreditIds[i] = pendingCreditIds[pendingCreditIds.length - 1];
                pendingCreditIds.pop();
                break;
            }
        }
        delete pendingCredits[creditId];
    }
    
    // View functions
    function getPendingCredit(uint256 creditId) public view returns (
        uint256 id,
        string memory tier,
        string memory location,
        string[] memory coordinates,
        address owner,
        bool isRetired
    ) {
        DataStructures.TCO2Credit storage credit = pendingCredits[creditId];
        require(credit.creditId != 0, "Pending credit does not exist");
        return (
            credit.creditId,
            credit.tier,
            credit.location,
            credit.coordinates,
            credit.owner,
            credit.isRetired
        );
    }
    
    // Get all pending credit IDs (credits owned by contract)
    function getAllPendingCreditIds() public view returns (uint256[] memory) {
        return pendingCreditIds;
    }
    
    // Get pending credits by tier (credits owned by contract for specific tier)
    function getPendingCreditsByTier(string memory tier) public view returns (uint256[] memory) {
        uint256[] memory tierCredits = new uint256[](pendingCreditIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < pendingCreditIds.length; i++) {
            uint256 creditId = pendingCreditIds[i];
            if (keccak256(abi.encodePacked(pendingCredits[creditId].tier)) == keccak256(abi.encodePacked(tier))) {
                tierCredits[count] = creditId;
                count++;
            }
        }
        
        // Create properly sized array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tierCredits[i];
        }
        
        return result;
    }
    
    // Get any credit by ID (regardless of owner)
    function getTCO2Credit(uint256 creditId) public view returns (
        uint256 id,
        string memory tier,
        string memory location,
        string[] memory coordinates,
        address owner,
        bool isRetired
    ) {
        DataStructures.TCO2Credit storage credit = allCredits[creditId];
        require(credit.creditId != 0, "Credit does not exist");
        return (
            credit.creditId,
            credit.tier,
            credit.location,
            credit.coordinates,
            credit.owner,
            credit.isRetired
        );
    }
    
    function getTotalCreditsCreated() public view returns (uint256) {
        return nextCreditId - 1;
    }
    
    function getTotalPendingCredits() public view returns (uint256) {
        return pendingCreditIds.length;
    }
    
    function getAllTiers() public pure returns (string[5] memory) {
        return ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
    }
    
    // Additional helper function to check if credit is pending
    function isCreditPending(uint256 creditId) public view returns (bool) {
        return pendingCredits[creditId].creditId != 0;
    }
    
    // Get contract address (for frontend reference)
    function getContractAddress() public view returns (address) {
        return address(this);
    }
}
