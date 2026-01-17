// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FirmManagement.sol";
import "./CreditManagement.sol";
import "./TierPoolManagement.sol";
import "./BCTManagement.sol";

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
    
    constructor() {
        // 1. Deploy FirmManagement (The Core)
        firmManagement = new FirmManagement();
        
        // 2. Deploy CreditManagement (Needs FirmMgmt, TierPool starts as 0)
        creditManagement = new CreditManagement(
            address(firmManagement),
            address(0) 
        );
        
        // 3. Deploy TierPoolManagement (Needs FirmMgmt, CreditMgmt)
        tierPoolManagement = new TierPoolManagement(
            address(firmManagement),
            address(creditManagement)
        );
        
        // 4. Deploy BCTManagement (Needs FirmMgmt)
        bctManagement = new BCTManagement(
            address(firmManagement)
        );
        
        // 5. LINK EVERYTHING TOGETHER
        
        // Update CreditManagement to know about TierPool
        creditManagement.setTierPoolManagement(address(tierPoolManagement));
        
        // Update FirmManagement to know about BCTManagement
        firmManagement.setBCTManagementContract(address(bctManagement));
        
        emit SystemInitialized(
            address(firmManagement),
            address(creditManagement),
            address(tierPoolManagement),
            address(bctManagement)
        );
    }

    // --- HELPER: GET ALL ADDRESSES ---
    // Use this in your Frontend to know where to send transactions
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
}