export const ABI =[
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "tier",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tco2Used",
        "type": "uint256"
      }
    ],
    "name": "BCTMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bctReceived",
        "type": "uint256"
      }
    ],
    "name": "BCTPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalBCTAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "priorityAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "generalAmount",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "platinum",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "gold",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "silver",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bronze",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "grey",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct DataStructures.RetiredCreditsInfo",
        "name": "priorityCreditsRetired",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "platinum",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "gold",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "silver",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bronze",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "grey",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct DataStructures.RetiredCreditsInfo",
        "name": "generalCreditsRetired",
        "type": "tuple"
      }
    ],
    "name": "BCTRetired",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bctAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "usdcReceived",
        "type": "uint256"
      }
    ],
    "name": "BCTSold",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "reputation",
        "type": "uint256"
      }
    ],
    "name": "BCTStaked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "creditId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      }
    ],
    "name": "CreditAssignedToFirm",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "creditId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      }
    ],
    "name": "CreditCreatedByFirm",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "firmManagement",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "creditManagement",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tierPoolManagement",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "bctManagement",
        "type": "address"
      }
    ],
    "name": "SystemInitialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "firm",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "USDCAdded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "bctManagement",
    "outputs": [
      {
        "internalType": "contract BCTManagement",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "creditManagement",
    "outputs": [
      {
        "internalType": "contract CreditManagement",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "firmManagement",
    "outputs": [
      {
        "internalType": "contract FirmManagement",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "tierPoolManagement",
    "outputs": [
      {
        "internalType": "contract TierPoolManagement",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "registerFirm",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "creditId",
        "type": "uint256"
      }
    ],
    "name": "getPendingCredit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "coordinates",
        "type": "string[]"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isRetired",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "creditId",
        "type": "uint256"
      }
    ],
    "name": "isCreditPending",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "addr",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "reputation",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bctBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "contributionRatio",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "averageContributionTier",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "ownedCredits",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "totalTCO2Deposited",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "isFirmRegistered",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "coordinates",
        "type": "string[]"
      }
    ],
    "name": "createTCO2Credit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "coordinates",
        "type": "string[]"
      }
    ],
    "name": "storeDummyCredit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "creditId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "assignCreditToFirm",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "creditId",
        "type": "uint256"
      }
    ],
    "name": "getTCO2Credit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "coordinates",
        "type": "string[]"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isRetired",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "getAllPendingCreditIds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getPendingCreditsByTier",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "tco2Amount",
        "type": "uint256"
      }
    ],
    "name": "mintBCT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalBCTSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "tco2Amount",
        "type": "uint256"
      }
    ],
    "name": "calculateBCTFromTCO2",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "updateReputation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmReputation",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "stakeBCT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmStakedBCT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "getTotalBCTStaked",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "updateContributionRatio",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmContributionRatio",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getEnhancedFirmDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "addr",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "reputation",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bctBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stakedBCT",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "contributionRatio",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "averageContributionTier",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "ownedCredits",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "totalTCO2Deposited",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getTierPoolStatus",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "generalPoolCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priorityReserveCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalCapacity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalSoFar",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "conversionRate",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getFirmCreditsPerTier",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "totalBCTAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "platinum",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "gold",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "silver",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bronze",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "grey",
        "type": "uint256"
      }
    ],
    "name": "retireBCT",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "platinum",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "gold",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "silver",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bronze",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "grey",
            "type": "uint256"
          }
        ],
        "internalType": "struct DataStructures.RetiredCreditsInfo",
        "name": "priorityCreditsRetired",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "platinum",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "gold",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "silver",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bronze",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "grey",
            "type": "uint256"
          }
        ],
        "internalType": "struct DataStructures.RetiredCreditsInfo",
        "name": "generalCreditsRetired",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllTiers",
    "outputs": [
      {
        "internalType": "string[5]",
        "name": "",
        "type": "string[5]"
      }
    ],
    "stateMutability": "pure",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "getTotalCreditsCreated",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "getTotalPendingCredits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getFirmAvailableTCO2PerTier",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmBCTBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmTotalTCO2Deposited",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmAverageContributionTier",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "getContractAddresses",
    "outputs": [
      {
        "internalType": "address",
        "name": "firmMgmt",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "creditMgmt",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tierPoolMgmt",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "bctMgmt",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "addUSDCToFirmWallet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      }
    ],
    "name": "buyBCT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "bctAmount",
        "type": "uint256"
      }
    ],
    "name": "sellBCT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBCTPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "getUSDCPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "usdcPool",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bctPool",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "invariant",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getFirmCredits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "generalCredits",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priorityCredits",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "usdcInput",
        "type": "uint256"
      }
    ],
    "name": "calculateBCTOutput",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "bctInput",
        "type": "uint256"
      }
    ],
    "name": "calculateUSDCOutput",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      }
    ],
    "name": "getFirmUSDCBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "addUSDCToFirmWalletWithEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      }
    ],
    "name": "buyBCTWithEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getTierPoolCounts",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "generalPoolCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priorityReserveCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "bctAmount",
        "type": "uint256"
      }
    ],
    "name": "sellBCTWithEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getUnretiredCreditIds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getRetiredCreditIds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getTierPoolPriorityIdsByFirmUnretired",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getTierPoolPriorityIdsByFirmRetired",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "firmAddress",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tier",
        "type": "string"
      }
    ],
    "name": "getFirmRetiredGeneralCreditIdsByTier",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  }
];