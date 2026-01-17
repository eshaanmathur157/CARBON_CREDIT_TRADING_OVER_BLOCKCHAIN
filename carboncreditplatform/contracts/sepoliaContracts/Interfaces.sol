// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFirmManagement {
    function isFirmRegistered(address firmAddress) external view returns (bool);
    function getFirmAvailableTCO2PerTier(address firmAddress, string memory tier) external view returns (uint256);
    function updateFirmTCO2Data(address firmAddress, string memory tier, uint256 amount) external;
    function reduceFirmAvailableTCO2(address firmAddress, string memory tier, uint256 amount) external;
    function getFirmBCTBalance(address firmAddress) external view returns (uint256);
    function increaseBCTBalance(address firmAddress, uint256 amount) external;
    function decreaseBCTBalance(address firmAddress, uint256 amount) external;
    function increaseBCTRetired(address firmAddress, uint256 amount) external;
    function getFirmBCTRetired(address firmAddress) external view returns (uint256);
    function setStake(address firmAddress, uint256 amount) external;
    function getFirmBCTStaked(address firmAddress) external view returns (uint256);
    function updateReputation(address firmAddress) external;
    function updateContributionRatio(address firmAddress) external;
    function updateAverageContributionTier(address firmAddress) external;
    function setBCTManagementContract(address _bctManagement) external;
    function getFirmDetails(address firmAddress) external view returns (
        address addr,
        uint256 reputation,
        uint256 bctBalance,
        uint256 contributionRatio,
        uint256 averageContributionTier,
        uint256[] memory ownedCredits,
        uint256 totalTCO2Deposited
    );
    function getFirmTotalTCO2Deposited(address firmAddress) external view returns (uint256);
    function getFirmAverageContributionTier(address firmAddress) external view returns (uint256);
    function getFirmTCO2PerTier(address firmAddress, string memory tier) external view returns (uint256);
    function retireTCO2FromDeposited(address firmAddress, string memory tier, uint256 amount) external;
}

interface ITierPoolManagement {
    function distributeToTierPools(address firm, uint256 creditId, string memory tier) external;
    function getFirmCreditIdsPerTier(address firmAddress, string memory tier) external view returns (uint256[] memory);
    function getFirmCreditsPerTier(address firmAddress, string memory tier) external view returns (uint256);
    function getTierPoolStatus(string memory tier) external view returns (
        uint256 generalPoolCount,
        uint256 priorityReserveCount,
        uint256 totalCapacity,
        uint256 conversionRate
    );
    function getTierPoolGeneralIds(string memory tier) external view returns (uint256[] memory);
    function getTierPoolPriorityIds(string memory tier) external view returns (uint256[] memory);
    function retireBCT(
        address firmAddress,
        uint256 totalBCTAmount,
        uint256 platinum,
        uint256 gold,
        uint256 silver,
        uint256 bronze,
        uint256 grey
    ) external;
    function getUnretiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory);
    function getRetiredCreditIds(address firmAddress, string memory tier) external view returns (uint256[] memory);
    function getTierPoolPriorityIdsByFirmUnretired(address firmAddress, string memory tier) external view returns (uint256[] memory);
    function getTierPoolPriorityIdsByFirmRetired(address firmAddress, string memory tier) external view returns (uint256[] memory);
    function getFirmRetiredGeneralCreditIdsByTier(address firmAddress, string memory tier) external view returns (uint256[] memory) ;
}

interface ICreditManagement {
    function allCredits(uint256 creditId) external view returns (
        uint256 id,
        string memory tier,
        string memory location,
        string[] memory coordinates,
        address owner,
        bool isRetired
    );
}

interface IBCTManagement {
    function mintBCT(string memory tier, uint256 tco2Amount) external;
    function mintBCTForFirm(address firmAddress, string memory tier, uint256 tco2Amount) external;
    function retireBCT(uint256 bctAmount, uint256 creditId, string memory tier) external;
    function stakeBCT(address firmAddress, uint256 amount) external;
    function getTotalBCTstaked() external view returns (uint256);
    function staked(address firmAddress) external view returns (uint256);
    function getTotalBCTSupply() external view returns (uint256);
    function getFirmBCTBalance(address firmAddress) external view returns (uint256);
    function getTierConversionRate(string memory tier) external view returns (uint256);
    function calculateBCTFromTCO2(string memory tier, uint256 tco2Amount) external view returns (uint256);
  //  function getTransactionsByFirm(address firmAddress) external view returns (Transaction[] memory);
  //  function getAllMintTransactions() external view returns (Transaction[] memory);
   //  function getAllStakeTransactions() external view returns (Transaction[] memory);
}

interface IFairCarbonToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function burn(uint256 amount) external; // <--- THIS MUST BE HERE
}