// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library DataStructures {
    
    // TCO2 Credit Structure
    struct TCO2Credit {
        uint256 creditId;
        string tier;
        string location;
        string[] coordinates;
        address owner;
        bool isRetired;
    }
    
    // Firm Structure
    struct Firm {
        address firmAddress;
        uint256 reputationScore;
        uint256 bctBalance;
        uint256 bctStaked;
        uint256 bctRetired;
        uint256 usdcBalance;
        mapping(uint256 => TCO2Credit) tco2Credits;
        mapping(string => uint256) depositedTCO2PerTier;
        uint256 contributionRatio;
        uint256 averageContributionTier;
        uint256[] ownedCreditIds;
        uint256 totalTCO2Deposited;
        uint256 penalty;
        mapping(string => uint256) availableTCO2PerTier;
    }
    
    // Simplified Tier Pool Structure - just counts, no ID arrays
    struct TierPool {
        uint256 generalPoolCount;
        uint256 priorityReserveCount;
        uint256 totalCapacity;
    }

    struct RetiredCreditsInfo {
        uint256 platinum;
        uint256 gold;
        uint256 silver;
        uint256 bronze;
        uint256 grey;
    }

}