// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DataStructures.sol";
import "./Interfaces.sol";

contract TierPoolManagement {
    using DataStructures for DataStructures.TierPool;
    
    // Storage
    mapping(string => DataStructures.TierPool) public tierPools;
    mapping(string => uint256) public tierConversionRates;
    mapping(address => mapping(string => uint256)) public firmCredits;
    mapping(string => uint256) public totalCreditsPerTier; // Track total credits distributed per tier
    mapping(address => mapping(string => uint256)) public firmCreditsGeneral;
    mapping(address => mapping(string => uint256)) public firmCreditsPriority;
    
    // Separate tracking structures as requested
    // General pool: Global tracking across all firms
    mapping(string => uint256[]) public creditIDsInGeneralPerTier; // All credit IDs in general pool per tier
    mapping(string => uint256) public generalRetiredPointers; // Global pointer for retired credits from general pool
    
    // Priority pool: Firm-specific tracking
    mapping(address => mapping(string => uint256[])) public firmIDsInPriorityPerFirmPerTier; // Priority credit IDs per firm per tier
    mapping(address => mapping(string => uint256)) public firmPriorityRetiredPointers; // Firm-specific pointers for priority retired credits
    
    // NEW: Track general credits retired by each firm
    mapping(address => mapping(string => uint256[])) public firmRetiredGeneralCreditIds; // General credit IDs retired by each firm per tier
    
    // Contract references
    IFirmManagement public firmManagement;
    ICreditManagement public creditManagement;
    
    // Use the RetiredCreditsInfo from DataStructures
    using DataStructures for DataStructures.RetiredCreditsInfo;
    
    // Events
    event TierPoolDistributed(string tier, uint256 generalPoolCount, uint256 priorityReserveCount, address firm);
    event CreditRemovedFromGeneralPool(string tier, uint256 newGeneralPoolCount, uint256 newPriorityReserveCount);
    event CreditRemovedFromPriorityPool(string tier, uint256 newGeneralPoolCount, uint256 newPriorityReserveCount);
    event BCTRetired(address firm, uint256 totalBCTAmount, uint256 priorityAmount, uint256 generalAmount);
    event PriorityRetirement(address firm, string tier, uint256 creditsRetired, uint256 bctValue);
    event GeneralRetirement(address firm, string tier, uint256 creditsRetired, uint256 bctValue, uint256 remainingBCT);
    
    // Events for credit tracking
    event CreditRetired(address firm, string tier, uint256 creditId, uint256 newRetiredPointer);
    event CreditsRetiredBatch(address firm, string tier, uint256 creditsRetired, uint256 newRetiredPointer);
    event GeneralPoolCreditsRetired(string tier, uint256 creditsRetired, uint256 newGlobalPointer);
    event PriorityPoolCreditsRetired(address firm, string tier, uint256 creditsRetired, uint256 newFirmPointer);
    
    // NEW: Event for firm general credit retirement tracking
    event FirmGeneralCreditsRetired(address firm, string tier, uint256[] creditIds);
    
    constructor(address _firmManagement, address _creditManagement) {
        firmManagement = IFirmManagement(_firmManagement);
        creditManagement = ICreditManagement(_creditManagement);
        
        // Initialize tier conversion rates (scaled by 100)
        tierConversionRates["Platinum"] = 150;
        tierConversionRates["Gold"] = 125;
        tierConversionRates["Silver"] = 100;
        tierConversionRates["Bronze"] = 75;
        tierConversionRates["Grey"] = 50;
        
        // Initialize tier pools
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        for (uint i = 0; i < tiers.length; i++) {
            tierPools[tiers[i]].totalCapacity = 1000;
            tierPools[tiers[i]].generalPoolCount = 0;
            tierPools[tiers[i]].priorityReserveCount = 0;
            totalCreditsPerTier[tiers[i]] = 0; // Initialize total credits tracking
            generalRetiredPointers[tiers[i]] = 0; // Initialize global retired pointers
        }
    }
    
    // Core function to distribute credits to tier pools - UPDATED with new tracking logic
    function distributeToTierPools(address firm, uint256 creditId, string memory tier) external {
        require(firmManagement.isFirmRegistered(firm), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // Get current credit number for deterministic assignment (before incrementing)
        uint256 creditNumber = totalCreditsPerTier[tier];
        
        // True incremental distribution using modulo (40% general, 60% priority)
        // First 2 of every 5 credits go to general (40%), next 3 go to priority (60%)
        if (creditNumber % 5 <= 2) {
            // Assign to general pool - add to global general pool tracking
            creditIDsInGeneralPerTier[tier].push(creditId);
            tierPools[tier].generalPoolCount += 1;
            firmCreditsGeneral[firm][tier] += 1;
        } else {
            // Assign to priority pool - add to firm-specific priority tracking
            firmIDsInPriorityPerFirmPerTier[firm][tier].push(creditId);
            tierPools[tier].priorityReserveCount += 1;
            firmCreditsPriority[firm][tier] += 1;
        }
        
        // Increment firm's total credits for this tier
        firmCredits[firm][tier] += 1;
        
        // Increment total credits for this tier
        totalCreditsPerTier[tier] += 1;
        
        emit TierPoolDistributed(tier, tierPools[tier].generalPoolCount, tierPools[tier].priorityReserveCount, firm);
    }

    // Main retirement function - UPDATED with new tracking logic
    function retireBCT(
        address firmAddress, 
        uint256 totalBCTAmount, 
        uint256 platinum, 
        uint256 gold, 
        uint256 silver, 
        uint256 bronze, 
        uint256 grey
    ) external returns (DataStructures.RetiredCreditsInfo memory priorityRetired, DataStructures.RetiredCreditsInfo memory generalRetired) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(totalBCTAmount > 0, "BCT amount must be greater than 0");
        require(150 * platinum + 125 * gold + 100 * silver + 75 * bronze + 50 * grey <= totalBCTAmount, "Priority amount exceeds total BCT");
        
        priorityRetired = priorityRetirement(firmAddress, platinum, gold, silver, bronze, grey);
        
        if (totalBCTAmount > platinum + gold + silver + bronze + grey) {
            generalRetired = generalRetirement(firmAddress, totalBCTAmount - (150 * platinum + 125 * gold + 100 * silver + 75 * bronze + 50 * grey));
        }
        
        // Update retired pointers based on total retired credits
        _updateRetiredPointers(firmAddress, priorityRetired, generalRetired);
        //define how much to decrease, not to decrease all
        uint256 toDecrease = (priorityRetired.platinum + generalRetired.platinum) * 150 + (priorityRetired.gold + generalRetired.gold) * 125 + (priorityRetired.silver + generalRetired.silver) * 100 + (priorityRetired.bronze + generalRetired.bronze) * 75 + (priorityRetired.grey + generalRetired.grey) * 50;
        firmManagement.decreaseBCTBalance(firmAddress, toDecrease);
        emit BCTRetired(firmAddress, totalBCTAmount, platinum + gold + silver + bronze + grey, totalBCTAmount - (platinum + gold + silver + bronze + grey));
    }
    
    // UPDATED: Internal function to update retired pointers with new logic
    function _updateRetiredPointers(
        address firmAddress,
        DataStructures.RetiredCreditsInfo memory priorityRetired,
        DataStructures.RetiredCreditsInfo memory generalRetired
    ) internal {
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        uint256[5] memory priorityRetiredPerTier = [
            priorityRetired.platinum,
            priorityRetired.gold,
            priorityRetired.silver,
            priorityRetired.bronze,
            priorityRetired.grey
        ];
        uint256[5] memory generalRetiredPerTier = [
            generalRetired.platinum,
            generalRetired.gold,
            generalRetired.silver,
            generalRetired.bronze,
            generalRetired.grey
        ];
        
        for (uint i = 0; i < tiers.length; i++) {
            // Update priority retired pointers (firm-specific)
            if (priorityRetiredPerTier[i] > 0) {
                uint256 newFirmPointer = firmPriorityRetiredPointers[firmAddress][tiers[i]] + priorityRetiredPerTier[i];
                firmPriorityRetiredPointers[firmAddress][tiers[i]] = newFirmPointer;
                
                emit PriorityPoolCreditsRetired(firmAddress, tiers[i], priorityRetiredPerTier[i], newFirmPointer);
            }
            
            // Update general retired pointers (global) and track firm-specific general retirements
            if (generalRetiredPerTier[i] > 0) {
                uint256 currentGlobalPointer = generalRetiredPointers[tiers[i]];
                uint256 newGlobalPointer = currentGlobalPointer + generalRetiredPerTier[i];
                
                // NEW: Track which specific general credit IDs this firm retired
                uint256[] memory retiredGeneralIds = new uint256[](generalRetiredPerTier[i]);
                for (uint256 j = 0; j < generalRetiredPerTier[i]; j++) {
                    if (currentGlobalPointer + j < creditIDsInGeneralPerTier[tiers[i]].length) {
                        retiredGeneralIds[j] = creditIDsInGeneralPerTier[tiers[i]][currentGlobalPointer + j];
                        firmRetiredGeneralCreditIds[firmAddress][tiers[i]].push(retiredGeneralIds[j]);
                    }
                }
                
                generalRetiredPointers[tiers[i]] = newGlobalPointer;
                
                emit GeneralPoolCreditsRetired(tiers[i], generalRetiredPerTier[i], newGlobalPointer);
                emit FirmGeneralCreditsRetired(firmAddress, tiers[i], retiredGeneralIds);
            }
        }
    }
    
    // Priority retirement function - now returns retired credits info
    function priorityRetirement(
        address firmAddress,
        uint256 platinum,
        uint256 gold,
        uint256 silver,
        uint256 bronze,
        uint256 grey
    ) internal returns (DataStructures.RetiredCreditsInfo memory retired) {
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        uint256[5] memory amounts = [platinum, gold, silver, bronze, grey];
        
        uint256[5] memory creditsRetired;
        
        for (uint i = 0; i < tiers.length; i++) {
            if (amounts[i] > 0) {
                uint256 creditsNeeded = amounts[i];
                
            //        require(tierPools[tiers[i]].priorityReserveCount >= creditsNeeded,"Not enough credits in priority pool");
          //      firmManagement.retireTCO2FromDeposited(firmAddress, tiers[i], creditsNeeded);
                
                creditsRetired[i] = creditsNeeded;
                
                emit PriorityRetirement(firmAddress, tiers[i], creditsNeeded, amounts[i]);
            }
        }

        firmCredits[firmAddress]["Platinum"] -= platinum;
        firmCredits[firmAddress]["Gold"] -= gold;
        firmCredits[firmAddress]["Silver"] -= silver;
        firmCredits[firmAddress]["Bronze"] -= bronze;
        firmCredits[firmAddress]["Grey"] -= grey;
        
        firmCreditsPriority[firmAddress]["Platinum"] -= platinum;
        firmCreditsPriority[firmAddress]["Gold"] -= gold;
        firmCreditsPriority[firmAddress]["Silver"] -= silver;
        firmCreditsPriority[firmAddress]["Bronze"] -= bronze;
        firmCreditsPriority[firmAddress]["Grey"] -= grey;

        totalCreditsPerTier["Platinum"] -= platinum;
        totalCreditsPerTier["Gold"] -= gold;
        totalCreditsPerTier["Silver"] -= silver;
        totalCreditsPerTier["Bronze"] -= bronze;
        totalCreditsPerTier["Grey"] -= grey;

        tierPools["Platinum"].priorityReserveCount -= platinum;
        tierPools["Gold"].priorityReserveCount -= gold;
        tierPools["Silver"].priorityReserveCount -= silver;
        tierPools["Bronze"].priorityReserveCount -= bronze;
        tierPools["Grey"].priorityReserveCount -= grey;

        retired = DataStructures.RetiredCreditsInfo({
            platinum: creditsRetired[0],
            gold: creditsRetired[1],
            silver: creditsRetired[2],
            bronze: creditsRetired[3],
            grey: creditsRetired[4]
        });
    }
    
    // General retirement function with reputation-based distribution - now returns retired credits info
    function generalRetirement(address firmAddress, uint256 bctAmount) internal returns (DataStructures.RetiredCreditsInfo memory retired) {
        (, uint256 reputation, , , , , ) = firmManagement.getFirmDetails(firmAddress);
        
        uint256[5] memory totalCreditsRetired = [uint256(0), uint256(0), uint256(0), uint256(0), uint256(0)];
        
        while (bctAmount >= 50) {
            (uint256 platinumPct, uint256 goldPct, uint256 silverPct, uint256 bronzePct, uint256 greyPct) = _getReputationAllocation(reputation);
            
            string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
            uint256[5] memory percentages = [platinumPct, goldPct, silverPct, bronzePct, greyPct];
            
            bool anyRetired = false;
            
            for (uint i = 0; i < tiers.length; i++) {
                if (percentages[i] > 0 && bctAmount >= 50) {
                    uint256 bctForTier = (bctAmount * percentages[i]) / 100;
                    uint256 creditsNeeded = bctForTier / tierConversionRates[tiers[i]];
                    
                    if (creditsNeeded > 0 && tierPools[tiers[i]].generalPoolCount >= creditsNeeded) {
                        uint256 bctUsed = creditsNeeded * tierConversionRates[tiers[i]];
                        bctAmount = bctAmount >= bctUsed ? bctAmount - bctUsed : 0;
                        
                        // Update mappings
                        totalCreditsRetired[i] += creditsNeeded;
                        tierPools[tiers[i]].generalPoolCount -= creditsNeeded;
                        totalCreditsPerTier[tiers[i]] -= creditsNeeded;
                        firmCredits[firmAddress][tiers[i]] -= creditsNeeded;
                        firmCreditsGeneral[firmAddress][tiers[i]] += creditsNeeded;
                        
                        // Retire TCO2 credits
                        firmManagement.retireTCO2FromDeposited(firmAddress, tiers[i], creditsNeeded);
                        
                        anyRetired = true;
                        emit GeneralRetirement(firmAddress, tiers[i], creditsNeeded, bctUsed, bctAmount);
                    }
                }
            }
            
            if (!anyRetired) break;
        }
        
        // Phase 2: Fallback to retire remaining BCT starting from highest tier
        if (bctAmount >= 50) {
            string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
            // Prioritize higher tiers (0: Platinum for high reputation, 4: Grey for low)
            uint256 startIdx = reputation >= 400 ? 0 : (reputation >= 300 ? 1 : (reputation >= 200 ? 2 : (reputation >= 100 ? 3 : 4)));
            uint256 numTiers = tiers.length;
            uint256 processed = 0;

            while (bctAmount >= 50 && processed < numTiers) {
                uint256 i = (startIdx + processed) % numTiers;
                
                while (bctAmount >= tierConversionRates[tiers[i]] && tierPools[tiers[i]].generalPoolCount > 0) {
                    uint256 creditsNeeded = 1; // Retire one credit at a time
                    uint256 bctUsed = creditsNeeded * tierConversionRates[tiers[i]];

                    totalCreditsRetired[i] += creditsNeeded;
                    tierPools[tiers[i]].generalPoolCount -= creditsNeeded;
                    totalCreditsPerTier[tiers[i]] -= creditsNeeded;
                    firmCredits[firmAddress][tiers[i]] -= creditsNeeded;
                    firmCreditsGeneral[firmAddress][tiers[i]] += creditsNeeded;

                    // Retire TCO2 credits
                    firmManagement.retireTCO2FromDeposited(firmAddress, tiers[i], creditsNeeded);

                    bctAmount -= bctUsed;
                    emit GeneralRetirement(firmAddress, tiers[i], creditsNeeded, bctUsed, bctAmount);
                }

                processed++;
            }

        }
        
        retired = DataStructures.RetiredCreditsInfo({
            platinum: totalCreditsRetired[0],
            gold: totalCreditsRetired[1],
            silver: totalCreditsRetired[2],
            bronze: totalCreditsRetired[3],
            grey: totalCreditsRetired[4]
        });
    }
    
    // Get reputation-based allocation percentages
    function _getReputationAllocation(uint256 reputation) internal pure returns (
        uint256 platinum, uint256 gold, uint256 silver, uint256 bronze, uint256 grey
    ) {
        if (reputation >= 400) {
            return (40, 30, 20, 7, 3); // Sums to 100
        } else if (reputation >= 300) {
            return (20, 35, 25, 15, 5); // Sums to 100
        } else if (reputation >= 200) {
            return (5, 20, 35, 25, 15); // Sums to 100
        } else if (reputation >= 100) {
            return (0, 5, 20, 35, 40); // Sums to 100
        } else {
            return (0, 0, 5, 20, 75); // Sums to 100
        }
    }

    // UPDATED getter functions for the new tracking structures
    
    /**
     * @dev Get all credit IDs for a firm in a specific tier (MAINTAINED for backward compatibility)
     * This now combines both general and priority credits for the firm
     */
    function getFirmCreditIds(address firmAddress, string memory tier) public view returns (uint256[] memory) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // For backward compatibility, we'll need to reconstruct this
        // This is a complex operation and might be expensive
        // Consider if this function is still needed with the new architecture
        uint256[] memory priorityIds = firmIDsInPriorityPerFirmPerTier[firmAddress][tier];
        return priorityIds; // For now, return only priority credits
    }
    
    /**
     * @dev UPDATED: Get ALL retired credit IDs for a firm in a specific tier (both priority and general)
     */
    function getRetiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // Get retired priority credit IDs
        uint256 retiredPointer = firmPriorityRetiredPointers[firmAddress][tier];
        uint256[] memory allPriorityIds = firmIDsInPriorityPerFirmPerTier[firmAddress][tier];
        
        uint256 actualPriorityRetiredCount = retiredPointer > allPriorityIds.length ? allPriorityIds.length : retiredPointer;
        
        // Get retired general credit IDs for this firm
        uint256[] memory retiredGeneralIds = firmRetiredGeneralCreditIds[firmAddress][tier];
        
        // Combine both arrays
        uint256 totalRetiredCount = actualPriorityRetiredCount + retiredGeneralIds.length;
        uint256[] memory allRetiredIds = new uint256[](totalRetiredCount);
        
        // Add priority retired IDs
        for (uint256 i = 0; i < actualPriorityRetiredCount; i++) {
            allRetiredIds[i] = allPriorityIds[i];
        }
        
        // Add general retired IDs
        for (uint256 i = 0; i < retiredGeneralIds.length; i++) {
            allRetiredIds[actualPriorityRetiredCount + i] = retiredGeneralIds[i];
        }
        
        return allRetiredIds;
    }
    
    /**
     * @dev UPDATED: Get ALL unretired credit IDs for a firm in a specific tier (both priority and general)
     * Note: For general pool, this shows credits available to all firms, not firm-specific
     */
    function getUnretiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // Get unretired priority credit IDs (firm-specific)
        uint256 retiredPointer = firmPriorityRetiredPointers[firmAddress][tier];
        uint256[] memory allPriorityIds = firmIDsInPriorityPerFirmPerTier[firmAddress][tier];
        
        uint256 unretiredPriorityCount = 0;
        if (retiredPointer < allPriorityIds.length) {
            unretiredPriorityCount = allPriorityIds.length - retiredPointer;
        }
        
        // Get unretired general credit IDs (global, available to all firms)
        uint256 globalRetiredPointer = generalRetiredPointers[tier];
        uint256[] memory allGeneralIds = creditIDsInGeneralPerTier[tier];
        
        uint256 unretiredGeneralCount = 0;
        if (globalRetiredPointer < allGeneralIds.length) {
            unretiredGeneralCount = allGeneralIds.length - globalRetiredPointer;
        }
        
        // Combine both arrays
        uint256 totalUnretiredCount = unretiredPriorityCount + unretiredGeneralCount;
        uint256[] memory allUnretiredIds = new uint256[](totalUnretiredCount);
        
        // Add unretired priority IDs
        for (uint256 i = 0; i < unretiredPriorityCount; i++) {
            allUnretiredIds[i] = allPriorityIds[retiredPointer + i];
        }
        
        // Add unretired general IDs
        for (uint256 i = 0; i < unretiredGeneralCount; i++) {
            allUnretiredIds[unretiredPriorityCount + i] = allGeneralIds[globalRetiredPointer + i];
        }
        
        return allUnretiredIds;
    }
    
    /**
     * @dev NEW: Get general credit IDs retired by a specific firm in a specific tier
     */
    function getFirmRetiredGeneralCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return firmRetiredGeneralCreditIds[firmAddress][tier];
    }
    
    /**
     * @dev Get all credit IDs in general pool for a tier
     */
    function getGeneralPoolCreditIds(string memory tier) external view returns (uint256[] memory) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return creditIDsInGeneralPerTier[tier];
    }
    
    /**
     * @dev Get retired credit IDs from general pool for a tier
     */
    function getGeneralPoolRetiredCreditIds(string memory tier) external view returns (uint256[] memory) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        uint256 retiredPointer = generalRetiredPointers[tier];
        uint256[] memory allGeneralIds = creditIDsInGeneralPerTier[tier];
        
        if (retiredPointer == 0) {
            uint256[] memory empty;
            return empty;
        }
        
        uint256 actualRetiredCount = retiredPointer > allGeneralIds.length ? allGeneralIds.length : retiredPointer;
        uint256[] memory retiredIds = new uint256[](actualRetiredCount);
        
        for (uint256 i = 0; i < actualRetiredCount; i++) {
            retiredIds[i] = allGeneralIds[i];
        }
        
        return retiredIds;
    }
    
    /**
     * @dev Get unretired credit IDs from general pool for a tier
     */
    function getGeneralPoolUnretiredCreditIds(string memory tier) external view returns (uint256[] memory) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        uint256 retiredPointer = generalRetiredPointers[tier];
        uint256[] memory allGeneralIds = creditIDsInGeneralPerTier[tier];
        
        if (retiredPointer >= allGeneralIds.length) {
            uint256[] memory empty;
            return empty;
        }
        
        uint256 unretiredCount = allGeneralIds.length - retiredPointer;
        uint256[] memory unretiredIds = new uint256[](unretiredCount);
        
        for (uint256 i = 0; i < unretiredCount; i++) {
            unretiredIds[i] = allGeneralIds[retiredPointer + i];
        }
        
        return unretiredIds;
    }
    
    /**
     * @dev Get the retired pointer for a firm in a specific tier (priority pool)
     */
    function getRetiredPointer(address firmAddress, string memory tier) public view returns (uint256) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return firmPriorityRetiredPointers[firmAddress][tier];
    }
    
    /**
     * @dev Get the global retired pointer for general pool in a specific tier
     */
    function getGeneralRetiredPointer(string memory tier) public view returns (uint256) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return generalRetiredPointers[tier];
    }
    
    /**
     * @dev UPDATED: Get counts of retired and unretired credits for a firm in a specific tier (both priority and general)
     */
    function getCreditCounts(address firmAddress, string memory tier) public view returns (
        uint256 totalCredits,
        uint256 retiredCredits,
        uint256 unretiredCredits
    ) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // Priority credits
        uint256 totalPriorityCredits = firmIDsInPriorityPerFirmPerTier[firmAddress][tier].length;
        uint256 retiredPriorityCredits = firmPriorityRetiredPointers[firmAddress][tier];
        if (retiredPriorityCredits > totalPriorityCredits) {
            retiredPriorityCredits = totalPriorityCredits;
        }
        uint256 unretiredPriorityCredits = totalPriorityCredits - retiredPriorityCredits;
        
        // General credits (retired by this firm + available general credits)
        uint256 retiredGeneralCredits = firmRetiredGeneralCreditIds[firmAddress][tier].length;
        uint256 availableGeneralCredits = creditIDsInGeneralPerTier[tier].length - generalRetiredPointers[tier];
        
        totalCredits = totalPriorityCredits + retiredGeneralCredits + availableGeneralCredits;
        retiredCredits = retiredPriorityCredits + retiredGeneralCredits;
        unretiredCredits = unretiredPriorityCredits + availableGeneralCredits;
    }
    
    /**
     * @dev Get counts for general pool in a specific tier
     */
    function getGeneralPoolCounts(string memory tier) public view returns (
        uint256 totalCredits,
        uint256 retiredCredits,
        uint256 unretiredCredits
    ) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        totalCredits = creditIDsInGeneralPerTier[tier].length;
        retiredCredits = generalRetiredPointers[tier];
        if (retiredCredits > totalCredits) {
            retiredCredits = totalCredits;
        }
        unretiredCredits = totalCredits - retiredCredits;
    }
    
    // Existing functions remain unchanged
    
    // Get total credits for a specific tier
    function getTotalCreditsInTier(string memory tier) public view returns (uint256) {
        return totalCreditsPerTier[tier];
    }

    
    // Helper function to calculate total credits in a tier (keeping for compatibility)
    function _getTotalCreditsInTier(string memory tier) internal view returns (uint256) {
        return tierPools[tier].generalPoolCount + tierPools[tier].priorityReserveCount;
    }
    
    // View functions
    function getFirmCreditsPerTier(address firmAddress, string memory tier) public view returns (uint256) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        return firmCredits[firmAddress][tier];
    }
    
    function getTierPoolStatus(string memory tier) public view returns (
        uint256 generalPoolCount,
        uint256 priorityReserveCount,
        uint256 totalCapacity,
        uint256 totalSoFar,
        uint256 conversionRate
    ) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return (
            tierPools[tier].generalPoolCount,
            tierPools[tier].priorityReserveCount,
            tierPools[tier].totalCapacity,
            totalCreditsPerTier[tier],
            tierConversionRates[tier]
        );
    }
    
    function getTierPoolCounts(string memory tier) public view returns (
        uint256 generalPoolCount,
        uint256 priorityReserveCount
    ) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return (
            tierPools[tier].generalPoolCount,
            tierPools[tier].priorityReserveCount
        );
    }

    // Updated placeholder functions that now return actual data
    function getTierPoolGeneralIds(string memory tier) public view returns (uint256[] memory) {
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return creditIDsInGeneralPerTier[tier];
    }

    function getFirmCredits(address firmAddress, string memory tier) external view returns (uint256 generalCredits,
        uint256 priorityCredits) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        return (firmCreditsGeneral[firmAddress][tier], firmCreditsPriority[firmAddress][tier]);
    }
    
    function getTierPoolPriorityIds(string memory tier) public view returns (uint256[] memory) {
        // This function is complex to implement with the new structure since priority credits are firm-specific
        // Returning empty array for now, consider if this function is needed
        uint256[] memory empty;
        return empty;
    }

    function getTierPoolPriorityIdsByFirmUnretired(address firmAddress, string memory tier) external view returns (uint256[] memory) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // Get the retired pointer for this firm's priority pool
        uint256 retiredPointer = firmPriorityRetiredPointers[firmAddress][tier];
        
        // Get all priority credit IDs for this firm in this tier
        uint256[] memory allPriorityIds = firmIDsInPriorityPerFirmPerTier[firmAddress][tier];
        
        // If pointer is at or beyond the array length, no unretired credits
        if (retiredPointer >= allPriorityIds.length) {
            uint256[] memory empty;
            return empty;
        }
        
        // Calculate unretired count (from pointer onwards to end)
        uint256 unretiredCount = allPriorityIds.length - retiredPointer;
        uint256[] memory unretiredIds = new uint256[](unretiredCount);
        
        // Copy unretired credit IDs (from pointer onwards)
        for (uint256 i = 0; i < unretiredCount; i++) {
            unretiredIds[i] = allPriorityIds[retiredPointer + i];
        }
        
        return unretiredIds;
    }

    function getTierPoolPriorityIdsByFirmRetired(address firmAddress, string memory tier) external view returns (uint256[] memory) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // Get the retired pointer for this firm's priority pool
        uint256 retiredPointer = firmPriorityRetiredPointers[firmAddress][tier];
        
        // Get all priority credit IDs for this firm in this tier
        uint256[] memory allPriorityIds = firmIDsInPriorityPerFirmPerTier[firmAddress][tier];
        
        // If pointer is 0, no retired credits
        if (retiredPointer == 0) {
            uint256[] memory empty;
            return empty;
        }
        
        // Ensure we don't go beyond the array length
        uint256 actualRetiredCount = retiredPointer > allPriorityIds.length ? allPriorityIds.length : retiredPointer;
        uint256[] memory retiredIds = new uint256[](actualRetiredCount);
        
        // Copy retired credit IDs (from 0 up to the pointer)
        for (uint256 i = 0; i < actualRetiredCount; i++) {
            retiredIds[i] = allPriorityIds[i];
        }
        
        return retiredIds;
    }

    function getFirmRetiredGeneralCreditIdsByTier(address firmAddress, string memory tier) external view returns (uint256[] memory) {
        require(firmManagement.isFirmRegistered(firmAddress), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        // Return the retired general credit IDs for this firm in this tier
        return firmRetiredGeneralCreditIds[firmAddress][tier];
    }


}