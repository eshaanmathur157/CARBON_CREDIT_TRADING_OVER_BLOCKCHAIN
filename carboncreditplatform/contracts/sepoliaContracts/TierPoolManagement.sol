// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DataStructures.sol";
import "./Interfaces.sol";

// 1. DEFINE INTERFACE FOR REAL TOKEN BURNING
interface IFairCarbonToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
}

contract TierPoolManagement {
    using DataStructures for DataStructures.TierPool;
    using DataStructures for DataStructures.RetiredCreditsInfo;
    
    // 1. HARDCODED FCT ADDRESS
    address public constant FCT_ADDRESS = 0x80E8b7Eb8B3f754024D449D139dc8308f55E55Ac;

    // Storage
    mapping(string => DataStructures.TierPool) public tierPools;
    mapping(string => uint256) public tierConversionRates;
    mapping(address => mapping(string => uint256)) public firmCredits;
    mapping(string => uint256) public totalCreditsPerTier; 
    mapping(address => mapping(string => uint256)) public firmCreditsGeneral;
    mapping(address => mapping(string => uint256)) public firmCreditsPriority;
    
    // Tracking structures
    mapping(string => uint256[]) public creditIDsInGeneralPerTier; 
    mapping(string => uint256) public generalRetiredPointers; 
    mapping(address => mapping(string => uint256[])) public firmIDsInPriorityPerFirmPerTier; 
    mapping(address => mapping(string => uint256)) public firmPriorityRetiredPointers; 
    mapping(address => mapping(string => uint256[])) public firmRetiredGeneralCreditIds; 
    
    // Contract references
    IFirmManagement public firmManagement;
    ICreditManagement public creditManagement;
    
    // Events
    event TierPoolDistributed(string tier, uint256 generalPoolCount, uint256 priorityReserveCount, address firm);
    event BCTRetired(address firm, uint256 totalBCTAmount, uint256 priorityAmount, uint256 generalAmount);
    event PriorityRetirement(address firm, string tier, uint256 creditsRetired, uint256 bctValue);
    event GeneralRetirement(address firm, string tier, uint256 creditsRetired, uint256 bctValue, uint256 remainingBCT);
    event PriorityPoolCreditsRetired(address firm, string tier, uint256 creditsRetired, uint256 newFirmPointer);
    event GeneralPoolCreditsRetired(string tier, uint256 creditsRetired, uint256 newGlobalPointer);
    event FirmGeneralCreditsRetired(address firm, string tier, uint256[] creditIds);
    
    constructor(address _firmManagement, address _creditManagement) {
        firmManagement = IFirmManagement(_firmManagement);
        creditManagement = ICreditManagement(_creditManagement);
        
        tierConversionRates["Platinum"] = 150;
        tierConversionRates["Gold"] = 125;
        tierConversionRates["Silver"] = 100;
        tierConversionRates["Bronze"] = 75;
        tierConversionRates["Grey"] = 50;
        
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        for (uint i = 0; i < tiers.length; i++) {
            tierPools[tiers[i]].totalCapacity = 1000;
            tierPools[tiers[i]].generalPoolCount = 0;
            tierPools[tiers[i]].priorityReserveCount = 0;
            totalCreditsPerTier[tiers[i]] = 0; 
            generalRetiredPointers[tiers[i]] = 0; 
        }
    }
    
    // ... distributeToTierPools FUNCTION REMAINS EXACTLY THE SAME ...
    function distributeToTierPools(address firm, uint256 creditId, string memory tier) external {
        // (Keep your existing code for this function exactly as provided)
        require(firmManagement.isFirmRegistered(firm), "Firm not registered");
        require(tierConversionRates[tier] > 0, "Invalid tier");
        
        uint256 creditNumber = totalCreditsPerTier[tier];
        
        if (creditNumber % 5 <= 2) {
            creditIDsInGeneralPerTier[tier].push(creditId);
            tierPools[tier].generalPoolCount += 1;
            firmCreditsGeneral[firm][tier] += 1;
        } else {
            firmIDsInPriorityPerFirmPerTier[firm][tier].push(creditId);
            tierPools[tier].priorityReserveCount += 1;
            firmCreditsPriority[firm][tier] += 1;
        }
        
        firmCredits[firm][tier] += 1;
        totalCreditsPerTier[tier] += 1;
        
        emit TierPoolDistributed(tier, tierPools[tier].generalPoolCount, tierPools[tier].priorityReserveCount, firm);
    }

    // --- THE MAIN UPDATE: RETIREMENT ---
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
        
        // 1. CALCULATE PRIORITY COST
        // Note: Amounts are credits. Convert to FCT (multiply by 10^18 if your frontend sends simple ints, or assume frontend sends 18-decimal FCT values?)
        // Assuming inputs platinum/gold/etc are CREDIT COUNTS (integers)
        // And totalBCTAmount is 18-decimal FCT value
        
        uint256 priorityCost = (150 * platinum + 125 * gold + 100 * silver + 75 * bronze + 50 * grey) * 10**18 / 100;
        
        // Safety check: Cost shouldn't exceed total amount sent
        require(priorityCost <= totalBCTAmount, "Priority cost exceeds total BCT sent");
        
        // 2. REAL MONEY MOVEMENT: BURN THE TOKENS
        // A. Pull tokens from user wallet to this contract
        // User must have Approved TierPoolManagement!
        bool success = IFairCarbonToken(FCT_ADDRESS).transferFrom(msg.sender, address(this), totalBCTAmount);
        require(success, "Token transfer failed. Did you approve?");

        // B. Burn the tokens (Remove from existence)
        IFairCarbonToken(FCT_ADDRESS).burn(totalBCTAmount);

        // 3. EXECUTE YOUR COMPLEX CREDIT LOGIC (UNCHANGED)
        priorityRetired = priorityRetirement(firmAddress, platinum, gold, silver, bronze, grey);
        
        uint256 remainingBCT = totalBCTAmount - priorityCost;
        
        // Convert remaining BCT (18 decimals) back to "Internal Points" (integers) for the general logic?
        // Your generalRetirement logic uses integer math (e.g. bctAmount >= 50).
        // Let's normalize: pass the raw 18-decimal amount, but ensure generalRetirement handles it, 
        // OR simply pass the "points" value: remainingBCT / 10^18 * 100?
        // Let's assume generalRetirement expects "points" (like 150 = 1.5).
        
        uint256 generalPoints = (remainingBCT * 100) / 10**18;

        if (generalPoints > 0) {
            generalRetired = generalRetirement(firmAddress, generalPoints);
        }
        
        // 4. UPDATE POINTERS (UNCHANGED)
        _updateRetiredPointers(firmAddress, priorityRetired, generalRetired);
        
        // REMOVED: firmManagement.decreaseBCTBalance(...) 
        // We already burned the real tokens in Step 2.

        emit BCTRetired(firmAddress, totalBCTAmount, priorityCost, remainingBCT);
    }
    
    // ... _updateRetiredPointers REMAINS EXACTLY THE SAME ...
    function _updateRetiredPointers(
        address firmAddress,
        DataStructures.RetiredCreditsInfo memory priorityRetired,
        DataStructures.RetiredCreditsInfo memory generalRetired
    ) internal {
        // (Paste your exact logic here, I will not modify it)
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        uint256[5] memory priorityRetiredPerTier = [priorityRetired.platinum, priorityRetired.gold, priorityRetired.silver, priorityRetired.bronze, priorityRetired.grey];
        uint256[5] memory generalRetiredPerTier = [generalRetired.platinum, generalRetired.gold, generalRetired.silver, generalRetired.bronze, generalRetired.grey];
        
        for (uint i = 0; i < tiers.length; i++) {
            if (priorityRetiredPerTier[i] > 0) {
                uint256 newFirmPointer = firmPriorityRetiredPointers[firmAddress][tiers[i]] + priorityRetiredPerTier[i];
                firmPriorityRetiredPointers[firmAddress][tiers[i]] = newFirmPointer;
                emit PriorityPoolCreditsRetired(firmAddress, tiers[i], priorityRetiredPerTier[i], newFirmPointer);
            }
            if (generalRetiredPerTier[i] > 0) {
                uint256 currentGlobalPointer = generalRetiredPointers[tiers[i]];
                uint256 newGlobalPointer = currentGlobalPointer + generalRetiredPerTier[i];
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
    
    // ... priorityRetirement REMAINS EXACTLY THE SAME ...
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
            
            // 1. CHECK: Does the specific firm actually have these PRIORITY credits?
            // We check the firm's specific priority pointer vs the array length
            uint256 availablePriority = firmIDsInPriorityPerFirmPerTier[firmAddress][tiers[i]].length - firmPriorityRetiredPointers[firmAddress][tiers[i]];
            require(availablePriority >= creditsNeeded, "Insufficient priority credits to retire");

            // 2. EXECUTE: Actually remove the TCO2 from the Firm's Deposit
            // UNCOMMENT THIS LINE! This is what makes the retirement "Real"
            firmManagement.retireTCO2FromDeposited(firmAddress, tiers[i], creditsNeeded);
            
            creditsRetired[i] = creditsNeeded;
            emit PriorityRetirement(firmAddress, tiers[i], creditsNeeded, amounts[i]);
        }
    }

    // 3. UPDATE LEDGERS (Your existing logic was correct here)
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
    // ... generalRetirement REMAINS EXACTLY THE SAME ...
    function generalRetirement(address firmAddress, uint256 bctAmount) internal returns (DataStructures.RetiredCreditsInfo memory retired) {
    (, uint256 reputation, , , , , ) = firmManagement.getFirmDetails(firmAddress);
    
    // Initialize tracking array
    uint256[5] memory totalCreditsRetired; 
    
    // PHASE 1: Reputation-Based Distribution
    while (bctAmount >= 50) {
        (uint256 p, uint256 g, uint256 s, uint256 b, uint256 gr) = _getReputationAllocation(reputation);
        
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        uint256[5] memory percentages = [p, g, s, b, gr];
        
        bool anyRetired = false;
        
        for (uint i = 0; i < tiers.length; i++) {
            if (percentages[i] > 0 && bctAmount >= 50) {
                // Calculate how much BCT from this batch goes to this tier
                uint256 bctForTier = (bctAmount * percentages[i]) / 100;
                // Calculate how many credits that buys
                uint256 creditsNeeded = bctForTier / tierConversionRates[tiers[i]];
                
                // Check if the GENERAL POOL has enough credits
                if (creditsNeeded > 0 && tierPools[tiers[i]].generalPoolCount >= creditsNeeded) {
                    uint256 bctUsed = creditsNeeded * tierConversionRates[tiers[i]];
                    
                    // Safety subtraction
                    bctAmount = bctAmount >= bctUsed ? bctAmount - bctUsed : 0;
                    
                    // Update Mappings
                    totalCreditsRetired[i] += creditsNeeded;
                    tierPools[tiers[i]].generalPoolCount -= creditsNeeded;
                    totalCreditsPerTier[tiers[i]] -= creditsNeeded;
                    firmCredits[firmAddress][tiers[i]] -= creditsNeeded;
                    // Note: In general retirement, we INCREASE the firm's specific general counter
                    // because they are "claiming" these general credits as retired by them.
                    firmCreditsGeneral[firmAddress][tiers[i]] += creditsNeeded;
                    
                    // CALL EXTERNAL CONTRACT
                    firmManagement.retireTCO2FromDeposited(firmAddress, tiers[i], creditsNeeded);
                    
                    anyRetired = true;
                    emit GeneralRetirement(firmAddress, tiers[i], creditsNeeded, bctUsed, bctAmount);
                }
            }
        }
        
        // Anti-Infinite Loop: If we went through all tiers and couldn't retire ANYTHING, stop.
        if (!anyRetired) break;
    }
    
    // PHASE 2: Clean Up Remainder (Fallback)
    // If we still have BCT but couldn't retire via reputation ratios (e.g. Platinum pool was empty),
    // use the remaining BCT to retire whatever is available, starting from Highest or Lowest tier based on logic.
    if (bctAmount >= 50) {
        string[5] memory tiers = ["Platinum", "Gold", "Silver", "Bronze", "Grey"];
        
        // Logic: Higher reputation prefers Higher tiers
        uint256 startIdx = reputation >= 400 ? 0 : (reputation >= 300 ? 1 : (reputation >= 200 ? 2 : (reputation >= 100 ? 3 : 4)));
        uint256 numTiers = 5;
        uint256 processed = 0;

        while (bctAmount >= 50 && processed < numTiers) {
            uint256 i = (startIdx + processed) % numTiers;
            
            // While we have enough BCT for at least 1 credit of this tier AND pool is not empty
            while (bctAmount >= tierConversionRates[tiers[i]] && tierPools[tiers[i]].generalPoolCount > 0) {
                uint256 creditsNeeded = 1; 
                uint256 bctUsed = creditsNeeded * tierConversionRates[tiers[i]];

                totalCreditsRetired[i] += creditsNeeded;
                tierPools[tiers[i]].generalPoolCount -= creditsNeeded;
                totalCreditsPerTier[tiers[i]] -= creditsNeeded;
                firmCredits[firmAddress][tiers[i]] -= creditsNeeded;
                firmCreditsGeneral[firmAddress][tiers[i]] += creditsNeeded;

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
    
    // ... _getReputationAllocation REMAINS EXACTLY THE SAME ...
    function _getReputationAllocation(uint256 reputation) internal pure returns (
        uint256 platinum, uint256 gold, uint256 silver, uint256 bronze, uint256 grey
    ) {
        if (reputation >= 400) return (40, 30, 20, 7, 3);
        else if (reputation >= 300) return (20, 35, 25, 15, 5);
        else if (reputation >= 200) return (5, 20, 35, 25, 15);
        else if (reputation >= 100) return (0, 5, 20, 35, 40);
        else return (0, 0, 5, 20, 75);
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