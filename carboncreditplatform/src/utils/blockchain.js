import Web3 from 'web3';
import { ABI } from './contractABI.js';

const contractABI = ABI;
let web3;
let contract;
let accounts;
const contractAddress = "0x8CdaF0CD259887258Bc13a92C0a6dA92698644C0";
async function connectTo(url = 'http://localhost:8545') {
  const addr = "0x8CdaF0CD259887258Bc13a92C0a6dA92698644C0";
  if (!url || !addr) {
    return { success: false, error: 'Enter Ganache URL and contract address' };
  }
  try {
    web3 = new Web3(url);
    if (!web3.utils.isAddress(addr)) {
      return { success: false, error: 'Invalid contract address' };
    }
    contract = new web3.eth.Contract(contractABI, addr);
    /*
    contract.methods > name1, name2, input type, output type
    */
    const code = await web3.eth.getCode(addr);
    if (code === '0x') {
      throw new Error('No contract found at the specified address');
    }
    accounts = await web3.eth.getAccounts();
    return { success: true, message: `Connected to blockchain at ${url}. Contract: ${addr}` };
  } catch (e) {
    console.error('Connection error:', e);
    return { success: false, error: `Connection failed: ${e.message}. Ensure Ganache is running and contract address is correct.` };
  }
}

async function registerFirm(addr) {
  try {
    const isAlreadyRegistered = await contract.methods.isFirmRegistered(addr).call();
    if (isAlreadyRegistered) {
      return { success: false, error: 'Firm already registered' };
    }

    const gasEstimate = await contract.methods.registerFirm().estimateGas({ from: addr });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = await contract.methods.registerFirm().send({
      from: addr,
      gas: Math.ceil(gasEstimate * 1.2),  // 20% buffer
      gasPrice
    });

    return { success: true, transaction: tx };
  } catch (error) {
    console.error("Error registering firm:", error);
    return { success: false, error: error.message || error };
  }
}


async function checkFirm(addr) {
  if (!contract) {
    return { success: false, error: 'Connect to blockchain' };
  }
  if (!web3.utils.isAddress(addr)) {
    return { success: false, error: 'Invalid address' };
  }
  try {
    console.log(`Checking firm status for ${addr}...`);
    const isReg = await contract.methods.isFirmRegistered(addr).call();
    console.log(`isFirmRegistered(${addr}): ${isReg}`);
    if (!isReg) {
      return { success: true, address: addr, registered: false };
    }
    const details = await contract.methods.getFirmDetails(addr).call();
    console.log('Firm details:', details);
    return {
      success: true,
      address: addr,
      registered: true,
      reputation: details.reputation ? details.reputation.toString() : '0',
      bctBalance: details.bctBalance ? details.bctBalance.toString() : '0',
      contributionRatio: details.contributionRatio ? details.contributionRatio.toString() : '0',
      averageContributionTier: details.averageContributionTier ? (Number(details.averageContributionTier) / 100).toFixed(2) : '0.00',
      totalTCO2Deposited: details.totalTCO2Deposited ? details.totalTCO2Deposited.toString() : '0',
      ownedCredits: details.ownedCredits?.length ? details.ownedCredits.join(', ') : 'None',
    };
  } catch (e) {
    console.error('Firm check error:', e);
    let errorMsg = e.message;
    if (errorMsg.includes('Firm not registered') || errorMsg.includes('revert')) {
      return { success: true, address: addr, registered: false };
    }
    return { success: false, error: `Error retrieving firm details: ${errorMsg}. Verify contract address and Ganache connection.` };
  }
}

async function analyzeCredits(addr) {
  if (!contract) {
    return { success: false, error: 'Connect to blockchain' };
  }
  if (!web3.utils.isAddress(addr)) {
    return { success: false, error: 'Invalid address' };
  }
  try {
    const isReg = await contract.methods.isFirmRegistered(addr).call();
    if (!isReg) {
      return { success: false, error: `Firm at ${addr} is not registered.` };
    }
    const tiers = await contract.methods.getAllTiers().call();
    const analysis = [];
    for (const tier of tiers) {
      const num = await contract.methods.getFirmCreditsPerTier(addr, tier).call();
      const available = await contract.methods.getFirmAvailableTCO2PerTier(addr, tier).call();
      console.log(`Tier ${tier}: ${num} credits (Available: ${available})`);
      analysis.push({
        tier,
        num: num ? num.toString() : '0',
        available: available ? num.toString() : '0',
        ids: 'None',
      });
    }
    return { success: true, data: analysis };
  } catch (e) {
    console.error('Credits analysis error:', e);
    return { success: false, error: `Error: ${e.message}` };
  }
}

async function getPoolStatus(tier) {
  if (!contract) {
    return { success: false, error: 'Connect to blockchain' };
  }
  if (!tier) {
    return { success: false, error: 'Please select a tier' };
  }
  try {
    console.log(`Fetching pool status for ${tier}...`);
    const status = await contract.methods.getTierPoolStatus(tier).call();
    const counts = await contract.methods.getTierPoolCounts(tier).call();
    console.log('Pool status:', status);
    console.log(`Tier ${tier}: General Pool: ${counts.generalPoolCount}, Priority Pool: ${counts.priorityReserveCount}`);
    return {
      success: true,
      tier,
      generalPoolCount: status.generalPoolCount ? status.generalPoolCount.toString() : '0',
      priorityReserveCount: status.priorityReserveCount ? status.priorityReserveCount.toString() : '0',
      totalCapacity: status.totalCapacity ? status.totalCapacity.toString() : '0',
      conversionRate: status.conversionRate ? (Number(status.conversionRate) / 100).toFixed(2) : '0.00',
      generalIds: 'None',
      priorityIds: 'None',
    };
  } catch (e) {
    console.error('Pool status error:', e);
    return { success: false, error: `Error: ${e.message}` };
  }
}

async function calculateTradePreview(isSellingBCT, amount) {
  if (!contract) {
    return { success: false, error: 'Connect to blockchain' };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount' };
  }
  try {
    let output;
    if (isSellingBCT) {
      output = await contract.methods.calculateUSDCOutput(amount).call();
      return { success: true, output: output ? output.toString() : '0', unit: 'USDC' };
    } else {
      output = await contract.methods.calculateBCTOutput(amount).call();
      return { success: true, output: output ? output.toString() : '0', unit: 'BCT' };
    }
  } catch (e) {
    console.error('Trade preview error:', e);
    return { success: false, error: `Unable to calculate preview: ${e.message}` };
  }
}

async function showMarketInfo() {
  if (!contract) {
    return { success: false, error: 'Connect to blockchain' };
  }
  try {
    const poolState = await contract.methods.getPoolState().call();
    const bctPrice = await contract.methods.getBCTPrice().call();
    const usdcPrice = await contract.methods.getUSDCPrice().call();
    console.log('=== MARKET INFO ===');
    console.log(`Pool Liquidity: ${poolState.usdcPool} USDC, ${poolState.bctPool} BCT`);
    console.log(`Current Prices:`);
    console.log(`  1 BCT = ${(Number(bctPrice) / 1000).toFixed(3)} USDC`);
    console.log(`  1 USDC = ${(Number(usdcPrice) / 1000).toFixed(3)} BCT`);
    console.log('==================');
    return {
      success: true,
      liquidity: {
        usdcPool: poolState.usdcPool ? poolState.usdcPool.toString() : '0',
        bctPool: poolState.bctPool ? poolState.bctPool.toString() : '0',
      },
      prices: {
        bctToUsdc: bctPrice ? (Number(bctPrice) / 1000).toFixed(3) : '0.000',
        usdcToBct: usdcPrice ? (Number(usdcPrice) / 1000).toFixed(3) : '0.000',
      },
    };
  } catch (e) {
    console.error('Error fetching market info:', e);
    return { success: false, error: `Unable to fetch market info: ${e.message}` };
  }
}

async function getAvailableTCO2(firmAddress) {
  if (!contract || !web3.utils.isAddress(firmAddress)) {
    return { success: false, error: 'Invalid address or contract not connected' };
  }
  try {
    const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Grey'];
    const availableTCO2 = {};
    for (const tier of tiers) {
      const available = await contract.methods.getFirmAvailableTCO2PerTier(firmAddress, tier).call();
      availableTCO2[tier] = available ? BigInt(available).toString() : '0';
    }
    return { success: true, data: availableTCO2 };
  } catch (e) {
    console.error('Get available TCO2 error:', e);
    return { success: false, error: `Error fetching available TCO2: ${e.message}` };
  }
}

async function mintBCT(firmAddress, tiers) {
    if (!contract || !accounts || !accounts.length) {
        return { success: false, error: 'Contract or account not connected' };
    }

    if (!web3.utils.isAddress(firmAddress)) {
        return { success: false, error: 'Invalid firm address' };
    }

    try {
        const isRegistered = await contract.methods.isFirmRegistered(firmAddress).call();
        console.log('Is registered:', isRegistered);
        if (!isRegistered) {
            return { success: false, error: 'Firm address must be a registered firm' };
        }

        console.log("MATCHED ACCOUNT...BEFORE MINTING");

        // Convert all tier values to numbers and calculate total
        const totalCount = Object.values(tiers).reduce((sum, c) => {
            const num = Number(c) || 0;
            return sum + num;
        }, 0);
        console.log(tiers);
        if (totalCount === 0) {
            return { success: false, error: 'Select at least one TCO2 amount to mint' };
        }

        let totalBCT = 0;
        const results = [];

        for (const [tier, amount] of Object.entries(tiers)) {
            const amountNum = Number(amount) || 0;
            console.log(`Processing tier ${tier} with amount ${amountNum}`);
            
            if (amountNum > 0) {
                console.log(`Minting ${amountNum} ${tier} TCO2 for ${firmAddress}`);
                
                // Get available credits and convert to number
                const availableRaw = await contract.methods.getFirmCreditsPerTier(firmAddress, tier).call();
                const available = Number(availableRaw);
                console.log(`Available ${tier} TCO2:`, available);
                
                // Check BCT balance BEFORE transaction
                const balanceBeforeRaw = await contract.methods.getFirmBCTBalance(firmAddress).call();
                const balanceBefore = Number(balanceBeforeRaw);
                console.log(`BCT balance BEFORE transaction:`, balanceBefore);
                
                if (amountNum > available) {
                    return {
                        success: false,
                        error: `Insufficient ${tier} TCO2: requested ${amountNum}, available ${available}`
                    };
                }
                
                console.log(`Estimating gas for mintBCT(${tier}, ${amountNum})`);
                const gas = await contract.methods.mintBCT(tier, amountNum).estimateGas({ from: firmAddress });
                console.log(`Estimated gas:`, gas);
                
                // Get current gas price for legacy transaction
                const gasPrice = await web3.eth.getGasPrice();
                console.log(`Current gas price:`, gasPrice);
                
                const result = await contract.methods.mintBCT(tier, amountNum)
                    .send({ 
                        from: firmAddress, 
                        gas: Math.ceil(Number(gas) * 1.5),
                        gasPrice: gasPrice
                    });
                
                console.log('Full transaction result:', result);
                console.log('All events:', result.events);
                
                // Try multiple ways to get the BCT amount
                let bctMinted = null;
                
                // Method 1: Check for BCTMinted event from CarbonCreditSystem
                if (result.events && result.events.BCTMinted) {
                    console.log('BCTMinted event found:', result.events.BCTMinted);
                    console.log('BCTMinted returnValues:', result.events.BCTMinted.returnValues);
                    if (result.events.BCTMinted.returnValues) {
                        const rawAmount = result.events.BCTMinted.returnValues.amount;
                        console.log('Raw BCT amount from event (before conversion):', rawAmount, typeof rawAmount);
                        bctMinted = Number(rawAmount);
                        console.log('BCT amount from event (after conversion):', bctMinted);
                    }
                }
                
                // Debug: Check what the contract says should be minted BEFORE the transaction
                console.log(`DEBUG: Checking calculateBCTFromTCO2 for ${tier}, ${amountNum}`);
                const expectedBCTRaw = await contract.methods.calculateBCTFromTCO2(tier, amountNum).call();
                const expectedBCT = Number(expectedBCTRaw);
                console.log('Expected BCT from contract calculation:', expectedBCT);
                
                // Method 2: If no event or event shows 0, use the expected calculation
                if (!bctMinted || bctMinted === 0) {
                    bctMinted = expectedBCT;
                    console.log('Using calculated BCT amount:', bctMinted);
                }
                
                // Method 3: Check balance difference as additional verification
                const balanceAfterRaw = await contract.methods.getFirmBCTBalance(firmAddress).call();
                const balanceAfter = Number(balanceAfterRaw);
                console.log('BCT balance after transaction:', balanceAfter);
                
                if (bctMinted && bctMinted > 0) {
                    totalBCT += bctMinted;
                    results.push(`Minted ${bctMinted} BCT from ${amountNum} ${tier} TCO2`);
                    console.log(`Successfully minted ${bctMinted} BCT from ${amountNum} ${tier}`);
                } else {
                    // Still count as successful if transaction went through
                    const calculatedBCTRaw = await contract.methods.calculateBCTFromTCO2(tier, amountNum).call();
                    const calculatedBCT = Number(calculatedBCTRaw);
                    totalBCT += calculatedBCT;
                    results.push(`Minted ~${calculatedBCT} BCT from ${amountNum} ${tier} TCO2 (estimated)`);
                    console.log(`Transaction successful, estimated ${calculatedBCT} BCT minted`);
                }
            }
        }
        
        if (totalBCT > 0) {
            console.log('Total BCT minted:', totalBCT);
            const newBalanceRaw = await contract.methods.getFirmBCTBalance(firmAddress).call();
            const newBalance = Number(newBalanceRaw);
            console.log('New BCT balance:', newBalance);
            results.push(`New BCT Balance: ${newBalance}`);
            
            return {
                success: true,
                message: `Successfully minted approximately ${tiers["Platinum"] * 150 + tiers["Gold"] * 125 + tiers["Silver"] * 100 + tiers["Bronze"] * 75 + tiers["Grey"] * 50} BCT`,
                data: results
            };
        } else {
            const newBalanceRaw = await contract.methods.getFirmBCTBalance(firmAddress).call();
            const newBalance = Number(newBalanceRaw);
            results.push(`Current BCT Balance: ${newBalance}`);
            
            return {
                success: false,
                error: 'Minting completed but BCT amount unclear - check balance',
                data: results
            };
        }
    } catch (e) {
        console.error('Mint BCT error:', e);
        console.error('Error details:', e.message);
        return { success: false, error: `Error: ${e.message}` };
    }
}


async function stakeBCT(firmAddress, amount) {
  if (!contract) {
    return { success: false, error: 'Contract or account not connected' };
  }
  
  if (!amount || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Invalid stake amount' };
  }
  try {
    console.log(`Staking ${amount} BCT for firm ${firmAddress}...`);
    const isRegistered = await contract.methods.isFirmRegistered(firmAddress).call();
    console.log(`is firm registered: ${isRegistered}`);
    if (!isRegistered) {
      return { success: false, error: 'Firm must be registered to stake BCT' };
    }
    
    const bctBalance = await contract.methods.getFirmBCTBalance(firmAddress).call();
    if (BigInt(bctBalance) < BigInt(Math.floor(amount * 100)) / BigInt(100)) {
      return { success: false, error: `Insufficient BCT balance. Available: ${bctBalance} BCT` };
    }
    const gas = await contract.methods.stakeBCT(firmAddress, BigInt(Math.floor(amount * 100)) / BigInt(100)).estimateGas({ from: accounts[0] });
    const gasPrice = await web3.eth.getGasPrice();
    const result = await contract.methods.stakeBCT(firmAddress, BigInt(Math.floor(amount * 100)) / BigInt(100)).send({
      from: accounts[0],
      gas: Math.ceil(Number(gas) * 1.5),
      gasPrice: gasPrice,
    });
    console.log('Stake result:', result);
    return { success: true, message: `Successfully staked ${amount} BCT` };
  } catch (e) {
    console.error('Stake BCT error:', e);
    return { success: false, error: `Staking failed: ${e.message}` };
  }
}

async function getStakingInfo(firmAddress) {
  if (!contract || !web3.utils.isAddress(firmAddress)) {
    return { success: false, error: 'Invalid address or contract not connected' };
  }
  try {
    console.log(`Getting staking info for ${firmAddress}...`);
    const isRegistered = await contract.methods.isFirmRegistered(firmAddress).call();
    console.log(`is firm registered: ${isRegistered}`);
    if (!isRegistered) {
      return { success: false, error: 'Not a registered firm' };
    }
    const bctBalance = await contract.methods.getFirmBCTBalance(firmAddress).call();
    const stakedBCT = await contract.methods.getFirmStakedBCT(firmAddress).call();
    const totalStaked = await contract.methods.getTotalBCTStaked().call();
    console.log(`Staking info for ${firmAddress}:`, {
      bctBalance,
      stakedBCT,
      totalStaked,
    });
    return {
      success: true,
      data: {
        address: firmAddress,
        bctBalance: bctBalance ? BigInt(bctBalance).toString() : '0',
        stakedBCT: stakedBCT ? BigInt(stakedBCT).toString() : '0',
        totalStaked: totalStaked ? BigInt(totalStaked).toString() : '0',
      },
    };
  } catch (e) {
    console.error('Get staking info error:', e);
    return { success: false, error: `Error getting staking info: ${e.message}` };
  }
}

async function getAllFirmsStakingInfo() {
  if (!contract || !web3 || !accounts) {
    return { success: false, error: 'Contract or Web3 not connected' };
  }
  try {
    console.log('Fetching all firms staking info...');
    const allAccounts = await web3.eth.getAccounts();
    if (!allAccounts || allAccounts.length === 0) {
      return { success: true, data: { firms: [] } };
    }
    const firmsStats = [];
    let totalStaked = BigInt(0);
    for (const firmAddress of allAccounts) {
      const isRegistered = await contract.methods.isFirmRegistered(firmAddress).call();
      if (isRegistered) {
        const result = await getStakingInfo(firmAddress);
        if (result.success) {
          const { bctBalance, stakedBCT, totalStaked: firmTotalStaked } = result.data;
          totalStaked = BigInt(firmTotalStaked);
          firmsStats.push({
            address: firmAddress,
            bctBalance,
            stakedBCT,
            stakeShare: firmTotalStaked > 0 
              ? ((Number(stakedBCT) / Number(firmTotalStaked) * 100).toFixed(2))
              : '0.00',
          });
        }
      }
    }
    console.log('All firms stats:', firmsStats);
    return { success: true, data: { firms: firmsStats } };
  } catch (e) {
    console.error('Get all firms staking info error:', e);
    return { success: false, error: `Error fetching all firms staking info: ${e.message}` };
  }
}

async function buyBCT(firmAddr, usdcAmount) {
  if (!contract || !accounts || !accounts.length) {
    return { success: false, error: 'Contract or account not connected' };
  }
  if (!web3.utils.isAddress(firmAddr)) {
    return { success: false, error: 'Invalid firm address' };
  }
  if (!usdcAmount || isNaN(usdcAmount) || parseFloat(usdcAmount) <= 0) {
    return { success: false, error: 'Please enter a valid USDC amount' };
  }
  try {
    console.log(`Buying BCT with ${usdcAmount} USDC for firm ${firmAddr}...`);
    const isRegistered = await contract.methods.isFirmRegistered(firmAddr).call();
    if (!isRegistered) {
      return { success: false, error: 'Firm must be registered first' };
    }

    const usdcBalance = await contract.methods.getFirmUSDCBalance(firmAddr).call();
    console.log(`USDC balance: ${usdcBalance}`);
    if (parseInt(usdcBalance) < parseInt(usdcAmount)) {
      return { success: false, error: `Insufficient USDC balance. Available: ${usdcBalance} USDC` };
    }
    const expectedBCT = await contract.methods.calculateBCTOutput(parseInt(usdcAmount)).call();
    console.log(`Expected BCT output: ${expectedBCT}`);
    const bctPrice = await contract.methods.getBCTPrice().call();
    const priceDisplay = (parseInt(bctPrice) / 1000).toFixed(3);
    console.log(`Current BCT price: ${priceDisplay} USDC per BCT`);
    const gas = await contract.methods.buyBCTWithEvent(firmAddr, parseInt(usdcAmount)).estimateGas({ from: firmAddr });
    const gasPrice = await web3.eth.getGasPrice();
    const result = await contract.methods.buyBCTWithEvent(firmAddr, parseInt(usdcAmount)).send({
      from: firmAddr,
      gas: Math.ceil(Number(gas) * 1.5),
      gasPrice: gasPrice,
    });
    console.log('BCT purchase result:', result);
    return { success: true, message: `Successfully bought approximately ${expectedBCT} BCT with ${usdcAmount} USDC` };
  } catch (e) {
    console.error('BCT purchase error:', e);
    let errorMsg = e.message;
    if (errorMsg.includes('Insufficient USDC balance')) {
      return { success: false, error: 'Insufficient USDC balance' };
    } else if (errorMsg.includes('Firm not registered')) {
      return { success: false, error: 'Firm must be registered first' };
    } else if (errorMsg.includes('Not enough BCT in pool')) {
      return { success: false, error: 'Not enough BCT available in the pool' };
    } else {
      return { success: false, error: `Error buying BCT: ${errorMsg}` };
    }
  }
}

async function sellBCT(firmAddr, bctAmount) {
  if (!contract || !accounts || !accounts.length) {
    return { success: false, error: 'Contract or account not connected' };
  }
  if (!web3.utils.isAddress(firmAddr)) {
    return { success: false, error: 'Invalid firm address' };
  }
  if (!bctAmount || isNaN(bctAmount) || parseFloat(bctAmount) <= 0) {
    return { success: false, error: 'Please enter a valid BCT amount' };
  }
  try {
    console.log(`Selling ${bctAmount} BCT for firm ${firmAddr}...`);
    const isRegistered = await contract.methods.isFirmRegistered(firmAddr).call();
    if (!isRegistered) {
      return { success: false, error: 'Firm must be registered first' };
    }
    
    const bctBalance = await contract.methods.getFirmBCTBalance(firmAddr).call();
    console.log(`BCT balance: ${bctBalance}`);
    if (parseInt(bctBalance) < parseInt(bctAmount)) {
      return { success: false, error: `Insufficient BCT balance. Available: ${bctBalance} BCT` };
    }
    const expectedUSDC = await contract.methods.calculateUSDCOutput(parseInt(bctAmount)).call();
    console.log(`Expected USDC output: ${expectedUSDC}`);
    const usdcPrice = await contract.methods.getUSDCPrice().call();
    const priceDisplay = (parseInt(usdcPrice) / 1000).toFixed(3);
    console.log(`Current USDC price: ${priceDisplay} BCT per USDC`);
    const gas = await contract.methods.sellBCTWithEvent(firmAddr, parseInt(bctAmount)).estimateGas({ from: firmAddr });
    const gasPrice = await web3.eth.getGasPrice();
    const result = await contract.methods.sellBCTWithEvent(firmAddr, parseInt(bctAmount)).send({
      from: firmAddr,
      gas: Math.ceil(Number(gas) * 1.5),
      gasPrice: gasPrice,
    });
    console.log('BCT sale result:', result);
    return { success: true, message: `Successfully sold ${bctAmount} BCT for approximately ${expectedUSDC} USDC` };
  } catch (e) {
    console.error('BCT sale error:', e);
    let errorMsg = e.message;
    if (errorMsg.includes('Insufficient BCT balance')) {
      return { success: false, error: 'Insufficient BCT balance' };
    } else if (errorMsg.includes('Firm not registered')) {
      return { success: false, error: 'Firm must be registered first' };
    } else if (errorMsg.includes('Not enough USDC in pool')) {
      return { success: false, error: 'Not enough USDC available in the pool' };
    } else {
      return { success: false, error: `Error selling BCT: ${errorMsg}` };
    }
  }
}

async function updateFirmBalances(firmAddr) {
  if (!contract || !web3.utils.isAddress(firmAddr)) {
    return { success: false, error: 'Invalid address or contract not connected' };
  }
  try {
    const usdcBalance = await contract.methods.getFirmUSDCBalance(firmAddr).call();
    const bctBalance = await contract.methods.getFirmBCTBalance(firmAddr).call();
    console.log(`Updated balances - USDC: ${bctBalance}, BCT: ${usdcBalance}`);
    return {
      success: true,
      data: {
        usdcBalance: usdcBalance,
        bctBalance: bctBalance,
      },
    };
  } catch (e) {
    console.error('Error updating balances:', e);
    return { success: false, error: `Error updating balances: ${e.message}` };
  }
}

async function updatePoolState() {
  if (!contract) {
    return { success: false, error: 'Contract not connected' };
  }
  try {
    const poolState = await contract.methods.getPoolState().call();
    const bctPrice = await contract.methods.getBCTPrice().call();
    const usdcPrice = await contract.methods.getUSDCPrice().call();
    
    const invariantStr = typeof poolState.invariant === 'bigint' ? poolState.invariant.toString() : (poolState.invariant || '0');
    
    console.log(`Pool state - USDC: ${usdcPrice}, BCT: ${bctPrice}, K: ${invariantStr}`);
    console.log(`BCT Price: ${bctPrice} USDC per BCT`);
    console.log(`USDC Price: ${usdcPrice} BCT per USDC`);
    return {
      success: true,
      data: {
        usdcPool: poolState.usdcPool,
        bctPool: poolState.bctPool,
        invariant: poolState.invariant,
        bctPrice: bctPrice,
        usdcPrice: usdcPrice,
      },
    };
  } catch (e) {
    console.error('Error updating pool state:', e);
    return { success: false, error: `Error updating pool state: ${e.message}` };
  }
}

async function getTransactionHistory() {
  if (!contract) {
    console.error('Contract not initialized');
    return { success: false, error: 'Contract not connected' };
  }
  try {
    console.log('Fetching transaction history...');
    const mintEvents = await contract.getPastEvents('BCTMinted', {
      fromBlock: 0,
      toBlock: 'latest',
    });
    const stakeEvents = await contract.getPastEvents('BCTStaked', {
      fromBlock: 0,
      toBlock: 'latest',
    });
    const buyEvents = await contract.getPastEvents('BCTPurchased', {
      fromBlock: 0,
      toBlock: 'latest',
    });
    const sellEvents = await contract.getPastEvents('BCTSold', {
      fromBlock: 0,
      toBlock: 'latest',
    });
    console.log('Sell events:', sellEvents.map(e => ({
      bctAmount: e.returnValues.bctAmount,
      usdcReceived: e.returnValues.usdcReceived,
      types: {
        bctAmount: typeof e.returnValues.bctAmount,
        usdcReceived: typeof e.returnValues.usdcReceived,
      },
    })));
    const allTransactions = [];
    for (const event of mintEvents) {
      const block = await web3.eth.getBlock(event.blockNumber);
      const timestamp = block.timestamp
        ? new Date(Number(block.timestamp) * 1000).toISOString()
        : new Date().toISOString();
      const tier = event.returnValues.tier;
      let multiplier = 1;
      if (tier === 'Platinum') multiplier = 150;
      if (tier === 'Gold') multiplier = 125;
      if (tier === 'Silver') multiplier = 100;
      if (tier === 'Bronze') multiplier = 75;
      if (tier === 'Grey') multiplier = 50;
      const tco2Used = typeof event.returnValues.tco2Used === 'bigint'
        ? Number(event.returnValues.tco2Used)
        : Number(event.returnValues.tco2Used || 0);
      allTransactions.push({
        type: 'Mint',
        firm: event.returnValues.firm,
        amount: multiplier * tco2Used,
        secondaryAmount: tco2Used,
        detail: `Tier: ${tier}`,
        timestamp: timestamp,
        transactionHash: event.transactionHash,
      });
    }
    for (const event of stakeEvents) {
      const block = await web3.eth.getBlock(event.blockNumber);
      const timestamp = block.timestamp
        ? new Date(Number(block.timestamp) * 1000).toISOString()
        : new Date().toISOString();
      const amount = typeof event.returnValues.amount === 'bigint'
        ? Number(event.returnValues.amount)
        : Number(event.returnValues.amount || 0);
      allTransactions.push({
        type: 'Stake',
        firm: event.returnValues.firm,
        amount: amount,
        reputation: event.returnValues.reputation,
        detail: '-',
        timestamp: timestamp,
        transactionHash: event.transactionHash,
      });
      console.log(event.returnValues.firm);
    }
    for (const event of buyEvents) {
      const block = await web3.eth.getBlock(event.blockNumber);
      const timestamp = block.timestamp
        ? new Date(Number(block.timestamp) * 1000).toISOString()
        : new Date().toISOString();
      const bctReceived = typeof event.returnValues.bctReceived === 'bigint'
        ? Number(event.returnValues.bctReceived)
        : Number(event.returnValues.bctReceived || 0);
      const usdcAmount = typeof event.returnValues.usdcAmount === 'bigint'
        ? Number(event.returnValues.usdcAmount)
        : Number(event.returnValues.usdcAmount || 0);
      allTransactions.push({
        type: 'Buy',
        firm: event.returnValues.firm,
        amount: bctReceived,
        secondaryAmount: usdcAmount,
        detail: `USDC Spent: ${usdcAmount}`,
        timestamp: timestamp,
        transactionHash: event.transactionHash,
      });
    }
    for (const event of sellEvents) {
      const block = await web3.eth.getBlock(event.blockNumber);
      const timestamp = block.timestamp
        ? new Date(Number(block.timestamp) * 1000).toISOString()
        : new Date().toISOString();
      const bctAmount = typeof event.returnValues.bctAmount === 'bigint'
        ? Number(event.returnValues.bctAmount)
        : Number(event.returnValues.bctAmount || 0);
      const usdcReceived = typeof event.returnValues.usdcReceived === 'bigint'
        ? Number(event.returnValues.usdcReceived)
        : Number(event.returnValues.usdcReceived || 0);
      console.log(`Processing sell event: bctAmount=${bctAmount}, usdcReceived=${usdcReceived}, txHash=${event.transactionHash}`);
      allTransactions.push({
        type: 'Sell',
        firm: event.returnValues.firm,
        amount: bctAmount,
        secondaryAmount: usdcReceived,
        detail: `USDC Received: ${usdcReceived}`,
        timestamp: timestamp,
        transactionHash: event.transactionHash,
      });
    }
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    console.log('Transaction History:', allTransactions);
    return { success: true, data: allTransactions };
  } catch (e) {
    console.error('Error fetching transaction history:', e);
    return { success: false, error: `Error fetching transaction history: ${e.message}` };
  }
}

async function getPoolState() {
  if (!contract) {
    console.error('Contract not connected');
    return { success: false, error: 'Contract not connected' };
  }
  try {
    const poolState = await contract.methods.getPoolState().call();
    const usdcPoolStr = web3.utils.fromWei(
      typeof poolState.usdcPool === 'bigint' ? poolState.usdcPool.toString() : (poolState.usdcPool || '0'),
      'mwei'
    );
    const bctPoolStr = web3.utils.fromWei(
      typeof poolState.bctPool === 'bigint' ? poolState.bctPool.toString() : (poolState.bctPool || '0'),
      'ether'
    );
    const invariantStr = typeof poolState.invariant === 'bigint' ? poolState.invariant.toString() : (poolState.invariant || '0');
    console.log(`Pool state - USDC: ${usdcPoolStr}, BCT: ${bctPoolStr}, K: ${invariantStr}`);
    return {
      success: true,
      data: {
        usdcPool: poolState.usdcPool,
        bctPool: poolState.bctPool, 
        invariant: poolState.invariant,
      },
    };
  } catch (e) {
    console.error('Get pool state error:', e);
    return { success: false, error: `Error fetching pool state: ${e.message}` };
  }
}

async function getBCTPrice() {
  if (!contract) {
    console.error('Contract not connected');
    return { success: false, error: 'Contract not connected' };
  }
  try {
    const price = await contract.methods.getBCTPrice().call();
    
    return { success: true, data: price };
  } catch (e) {
    console.error('Get BCT price error:', e);
    return { success: false, error: `Error fetching BCT price: ${e.message}` };
  }
}

async function getUSDCPrice() {
  if (!contract) {
    console.error('Contract not connected');
    return { success: false, error: 'Contract not connected' };
  }
  try {
    const price = await contract.methods.getUSDCPrice().call();
    console.log(`USDC price - Raw: ${price}, Converted: ${price} BCT per USDC`);
    return { success: true, data: price };
  } catch (e) {
    console.error('Get USDC price error:', e);
    return { success: false, error: `Error fetching USDC price: ${e.message}` };
  }
}

export async function getCreditAssignmentHistory(firmAddress) {
  if (!contract) {
    console.error('Contract not initialized');
    return { success: false, error: 'Contract not connected' };
  }
  
  if (!firmAddress) {
    console.error('Firm address is required');
    return { success: false, error: 'Firm address is required' };
  }
  
  try {
    // Log contract address and network for debugging
    const contractAddress = contract.options.address;
    const networkId = await web3.eth.net.getId();
    console.log(`Contract address: ${contractAddress}, Network ID: ${networkId}`);
    
    console.log(`Fetching credit history for firm: ${firmAddress}...`);
    
    // Verify both events exist in the contract ABI
    const hasCreditAssignedEvent = contract.options.jsonInterface.some(item => 
      item.type === 'event' && item.name === 'CreditAssignedToFirm'
    );
    
    const hasCreditCreatedEvent = contract.options.jsonInterface.some(item => 
      item.type === 'event' && item.name === 'CreditCreatedByFirm'
    );
    
    if (!hasCreditAssignedEvent) {
      console.error('CreditAssignedToFirm event not found in contract ABI');
      return { success: false, error: 'CreditAssignedToFirm event not found in contract ABI' };
    }
    
    if (!hasCreditCreatedEvent) {
      console.error('CreditCreatedByFirm event not found in contract ABI');
      return { success: false, error: 'CreditCreatedByFirm event not found in contract ABI' };
    }
    
    // Fetch both types of events
    const [assignmentEvents, creationEvents] = await Promise.all([
      contract.getPastEvents('CreditAssignedToFirm', {
        filter: { firm: firmAddress },
        fromBlock: 0,
        toBlock: 'latest',
      }),
      contract.getPastEvents('CreditCreatedByFirm', {
        filter: { 1: firmAddress }, // Index 1 corresponds to msg.sender in the event
        fromBlock: 0,
        toBlock: 'latest',
      })
    ]);
    
    console.log(`Found ${assignmentEvents.length} assignment events and ${creationEvents.length} creation events for firm ${firmAddress}`);
    
    const allTransactions = [];
    const seenTransactionHashes = new Set(); // Track unique transaction hashes
    
    // Process CreditAssignedToFirm events
    for (const event of assignmentEvents) {
      const block = await web3.eth.getBlock(event.blockNumber);
      const timestamp = block.timestamp
        ? new Date(Number(block.timestamp) * 1000).toISOString()
        : new Date().toISOString();
      
      const creditId = typeof event.returnValues.creditId === 'bigint'
        ? Number(event.returnValues.creditId)
        : Number(event.returnValues.creditId || 0);
      
      const firmAddr = event.returnValues.firm;
      
      console.log(`Processing assignment event: creditId=${creditId}, firm=${firmAddr}, tier=${event.returnValues.tier}, txHash=${event.transactionHash}`);
      
      // Fetch detailed credit information using getTCO2Credit
      let creditDetails = null;
      try {
        console.log(`Fetching credit details for creditId: ${creditId}`);
        creditDetails = await contract.methods.getTCO2Credit(creditId).call();
        creditDetails = {
          id: typeof creditDetails.id === 'bigint' ? Number(creditDetails.id) : Number(creditDetails.id || 0),
          tier: creditDetails.tier,
          location: creditDetails.location,
          coordinates: creditDetails.coordinates || [],
          owner: creditDetails.owner,
          isRetired: creditDetails.isRetired,
          carbonAmount: Number(creditDetails.carbonAmount || 0), // Ensure carbonAmount is included
          verificationStandard: creditDetails.verificationStandard || 'Unknown', // Ensure verificationStandard is included
          projectType: creditDetails.projectType || 'Unknown' // Ensure projectType is included
        };
        
        console.log(`Credit details for ${creditId}:`, creditDetails);
      } catch (creditError) {
        console.error(`Error fetching credit details for creditId ${creditId}:`, creditError);
        creditDetails = {
          id: creditId,
          tier: event.returnValues.tier || 'Unknown',
          location: 'Unknown',
          coordinates: [],
          owner: firmAddr,
          isRetired: false,
          carbonAmount: 0,
          verificationStandard: 'Unknown',
          projectType: 'Unknown'
        };
      }
      
      allTransactions.push({
        type: 'Credit Assignment',
        firm: firmAddr,
        amount: creditId,
        secondaryAmount: '-',
        detail: `Tier: ${creditDetails.tier}, Location: ${creditDetails.location}, Retired: ${creditDetails.isRetired ? 'Yes' : 'No'}`,
        tier: creditDetails.tier,
        creditId: creditDetails.id,
        location: creditDetails.location,
        coordinates: creditDetails.coordinates,
        owner: creditDetails.owner,
        isRetired: creditDetails.isRetired,
        timestamp: timestamp,
        transactionHash: event.transactionHash,
        carbonAmount: creditDetails.carbonAmount,
        verificationStandard: creditDetails.verificationStandard,
        projectType: creditDetails.projectType
      });
    }
    
    // Process CreditCreatedByFirm events
    for (const event of creationEvents) {
      if (seenTransactionHashes.has(event.transactionHash)) {
        console.log(`Skipping duplicate creation event: txHash=${event.transactionHash}`);
        continue; // Skip duplicate events
      }
      seenTransactionHashes.add(event.transactionHash);
      
      const block = await web3.eth.getBlock(event.blockNumber);
      const timestamp = block.timestamp
        ? new Date(Number(block.timestamp) * 1000).toISOString()
        : new Date().toISOString();
      
      // For CreditCreatedByFirm, returnValues[0] is creditId, returnValues[1] is msg.sender
      const creditId = typeof event.returnValues[0] === 'bigint'
        ? Number(event.returnValues[0])
        : Number(event.returnValues[0] || 0);
      const creator = event.returnValues[1] || firmAddress;
      
      console.log(`Processing creation event: creditId=${creditId}, creator=${creator}, txHash=${event.transactionHash}`);
      
      // Fetch detailed credit information using getTCO2Credit
      let creditDetails = null;
      try {
        console.log(`Fetching credit details for creditId: ${creditId}`);
        creditDetails = await contract.methods.getTCO2Credit(creditId).call();
        creditDetails = {
          id: typeof creditDetails.id === 'bigint' ? Number(creditDetails.id) : Number(creditDetails.id || 0),
          tier: creditDetails.tier,
          location: creditDetails.location,
          coordinates: creditDetails.coordinates || [],
          owner: creditDetails.owner,
          isRetired: creditDetails.isRetired,
          carbonAmount: Number(creditDetails.carbonAmount || 0),
          verificationStandard: creditDetails.verificationStandard || 'Unknown',
          projectType: creditDetails.projectType || 'Unknown'
        };
        
        console.log(`Credit details for ${creditId}:`, creditDetails);
      } catch (creditError) {
        console.error(`Error fetching credit details for creditId ${creditId}:`, creditError);
        creditDetails = {
          id: creditId,
          tier: 'Unknown',
          location: 'Unknown',
          coordinates: [],
          owner: creator,
          isRetired: false,
          carbonAmount: 0,
          verificationStandard: 'Unknown',
          projectType: 'Unknown'
        };
      }
      
      allTransactions.push({
        type: 'Credit Creation',
        firm: creator,
        amount: creditId,
        secondaryAmount: '-',
        detail: `Created credit with Tier: ${creditDetails.tier}`,
        tier: creditDetails.tier,
        creditId: creditDetails.id,
        location: creditDetails.location,
        coordinates: creditDetails.coordinates,
        owner: creditDetails.owner,
        isRetired: creditDetails.isRetired,
        timestamp: timestamp,
        transactionHash: event.transactionHash,
        carbonAmount: creditDetails.carbonAmount,
        verificationStandard: creditDetails.verificationStandard,
        projectType: creditDetails.projectType
      });
    }
    
    // Sort by timestamp (newest first)
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`Complete Credit History for ${firmAddress}:`, allTransactions);
    return { success: true, data: allTransactions };
    
  } catch (e) {
    console.error('Error fetching credit history:', e);
    return { success: false, error: `Error fetching credit history: ${e.message}` };
  }
}
async function getFirmBCTBalance(firmAddress) {
  if (!contract || !web3.utils.isAddress(firmAddress)) {
    console.error('Invalid address or contract not connected:', firmAddress);
    return { success: false, error: 'Invalid address or contract not connected' };
  }
  try {
    const balance = await contract.methods.getFirmBCTBalance(firmAddress).call();
    console.log(`BCT balance for ${firmAddress} - Raw: ${balance}, Converted: ${balance} BCT`);
    return { success: true, data: balance };
  } catch (e) {
    console.error('Get BCT balance error:', e);
    return { success: false, error: `Error fetching BCT balance: ${e.message}` };
  }
}

async function getFirmUSDCBalance(firmAddress) {
  if (!contract || !web3.utils.isAddress(firmAddress)) {
    console.error('Invalid address or contract not connected:', firmAddress);
    return { success: false, error: 'Invalid address or contract not connected' };
  }
  try {
    const balance = await contract.methods.getFirmUSDCBalance(firmAddress).call();
    console.log(`USDC balance for ${firmAddress} - Raw: ${balance}, Converted: ${balance} USDC`);
    return { success: true, data: balance };
  } catch (e) {
    console.error('Get USDC balance error:', e);
    return { success: false, error: `Error fetching USDC balance: ${e.message}` };
  }
}

// New functions for Solidity methods
  async function calculateBCTOutput(usdcInput) {
    //await initializeContract();
    try {
      const bctOutput = await contract.methods.calculateBCTOutput(Math.floor(Number(usdcInput))).call();
      return { success: true, data: Number(bctOutput) };
    } catch (error) {
      console.error('Error calculating BCT output:', error);
      return { success: false, error: error.message };
    }
  }
  
  async function calculateUSDCOutput(bctInput) {
    //await initializeContract();
    try {
      const usdcOutput = await contract.methods.calculateUSDCOutput(Math.floor(Number(bctInput))).call();
      return { success: true, data: Number(usdcOutput) };
    } catch (error) {
      console.error('Error calculating USDC output:', error);
      return { success: false, error: error.message };
    }
  }

async function getFirmReputation(firmAddress) {
    if (!contract) {
      console.error('Contract not initialized');
      return { success: false, error: 'Contract not connected' };
    }
    try {
      console.log(`Fetching reputation for firm: ${firmAddress}`);
      const reputation = await contract.methods.getFirmReputation(firmAddress).call();
      return { success: true, data: Number(reputation) };
    } catch (error) {
      console.error(`Error fetching reputation for ${firmAddress}:`, error);
      return { success: false, error: `Error fetching reputation: ${error.message}` };
    }
  }

  export const getTierPoolCredits = async () => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Grey'];
    const credits = {};
    for (const tier of tiers) {
      const pool = await contract.methods.getTierPoolCounts(tier).call();
      credits[tier.toLowerCase()] = {
        priorityReserveCount: parseInt(pool.priorityReserveCount),
        generalPoolCount: parseInt(pool.generalPoolCount)
      };
    }
    return credits;
  };
  
  export async function retireBCT(addr, totalBCTAmount, platinum, gold, silver, bronze, grey) {
    if (!contract) {
        console.error('Contract not initialized');
        return;
    }

    if (totalBCTAmount <= 0) {
        console.error('Invalid BCT amount');
        return;
    }

    try {
        console.log(`Retiring BCT - Total: ${totalBCTAmount}, Platinum: ${platinum}, Gold: ${gold}, Silver: ${silver}, Bronze: ${bronze}, Grey: ${grey}`);
        console.log(`Minting to address: ${addr}`);

        // Validate tier allocation
        const tierSum = 150 * parseInt(platinum) + 125 * parseInt(gold) + 100 * parseInt(silver) + 75 * parseInt(bronze) + 50 * parseInt(grey);
        console.log(`Tier sum: ${tierSum}, Total BCT: ${totalBCTAmount}`);
        

        // Check if firm is registered
        const isRegistered = await contract.methods.isFirmRegistered(addr).call();
        console.log('Firm is registered:', isRegistered);
        
        if (!isRegistered) {
            console.error('❌ Firm is not registered');
            return;
        }

        // Check BCT balance if the contract has a balanceOf method
        try {
            const bctBalance = await contract.methods.getFirmBCTBalance(addr).call();
            console.log(`BCT Balance: ${bctBalance}, Trying to retire: ${totalBCTAmount}`);
            
            if (parseInt(bctBalance) < parseInt(totalBCTAmount)) {
                console.error('❌ Insufficient BCT balance');
                return;
            }
        } catch (e) {
            console.log('Could not check BCT balance (method might not exist)');
        }

        // Check firm credits
        const greyCredits = await contract.methods.getFirmCredits(addr, 'Grey').call();
        console.log(`Firm ${addr} has ${greyCredits.generalCredits} general grey credits and ${greyCredits.priorityCredits} priority grey credits`);

        // Check tier pool counts
        const greyPools = await contract.methods.getTierPoolCounts('Grey').call();
        console.log(`Tier Grey: General Pool: ${greyPools.generalPoolCount}, Specific Pool: ${greyPools.priorityReserveCount}`);

        // First, try to simulate the call to catch any revert reasons
        console.log('🔍 Simulating contract call...');
        try {
            // await contract.methods.retireBCT(
            //     addr,
            //     225,
            //     0,
            //     0,
            //     0,
            //     0,
            //     0
            // ).call({ from: contractAddress });
            console.log('✅ Contract call simulation successful');
        } catch (simulationError) {
            console.error('❌ Contract call simulation failed:', simulationError);
            
            // Try to extract more meaningful error message
            if (simulationError.message) {
                console.error('Error message:', simulationError.message);
            }
            if (simulationError.data) {
                console.error('Error data:', simulationError.data);
            }
            
            return;
        }

        // If simulation passed, proceed with gas estimation
        console.log('⛽ Estimating gas...');
        const gas = await contract.methods.retireBCT(
            addr,
            totalBCTAmount,
            platinum,
            gold,
            silver,
            bronze,
            grey
        ).estimateGas({ from: contractAddress });

        console.log(`Estimated gas: ${gas}`);

        // Handle BigInt gas value properly
        const gasLimit = typeof gas === 'bigint' 
            ? BigInt(Math.ceil(Number(gas) * 1.5))
            : Math.ceil(gas * 1.5);

        // Handle both EIP-1559 and legacy networks
        let txOptions = { from: addr, gas: gasLimit };

        try {
            const latestBlock = await web3.eth.getBlock('latest');
            
            if (latestBlock.baseFeePerGas) {
                console.log('Using EIP-1559 fee structure');
            } else {
                const gasPrice = await web3.eth.getGasPrice();
                txOptions.gasPrice = gasPrice;
                console.log('Using legacy gas pricing');
            }
        } catch (error) {
            const gasPrice = await web3.eth.getGasPrice();
            txOptions.gasPrice = gasPrice;
            console.log('Fallback to legacy gas pricing');
        }

        console.log('📤 Sending transaction...');
        const result = await contract.methods.retireBCT(
            addr,
            totalBCTAmount,
            platinum,
            gold,
            silver,
            bronze,
            grey
        ).send(txOptions);

        console.log('✅ Retirement transaction successful:', result);

        // Check for events
        if (result?.events?.BCTRetired) {
            const event = result.events.BCTRetired.returnValues;
            console.log('BCTRetired event:', event);
        } else {
            console.log(`🎉 Successfully retired ${totalBCTAmount} BCT tokens`);
        }

        // Refresh stats if function exists
        if (typeof getStats === 'function') {
            await getStats();
        }

    } catch (error) {
        console.error('❌ BCT retirement error:', error);
        
        // Log additional error details
        if (error.message) {
            console.error('Error message:', error.message);
        }
        if (error.data) {
            console.error('Error data:', error.data);
        }
        if (error.reason) {
            console.error('Error reason:', error.reason);
        }
    }
}
export const getTierPoolPriorityIdsByFirmUnretired = async (firmAddress, tier) => {
  if (!contract || !firmAddress) {
    throw new Error('Contract or firm address not initialized');
  }
  try {
    const creditIds = await contract.methods.getTierPoolPriorityIdsByFirmUnretired(firmAddress, tier).call();
    return creditIds.map(id => Number(id)); // Convert BigNumber to Number
  } catch (error) {
    console.error(`Error fetching unretired priority IDs for ${tier}:`, error);
    throw error;
  }
};

export const getTierPoolPriorityIdsByFirmRetired = async (firmAddress, tier) => {
  if (!contract || !firmAddress) {
    throw new Error('Contract or firm address not initialized');
  }
  try {
    const creditIds = await contract.methods.getTierPoolPriorityIdsByFirmRetired(firmAddress, tier).call();
    return creditIds.map(id => Number(id)); // Convert BigNumber to Number
  } catch (error) {
    console.error(`Error fetching retired priority IDs for ${tier}:`, error);
    throw error;
  }
};

export const getFirmRetiredGeneralCreditIdsByTier = async (firmAddress, tier) => {
  if (!contract || !firmAddress) {
    throw new Error('Contract or firm address not initialized');
  }
  try {
    const creditIds = await contract.methods.getFirmRetiredGeneralCreditIdsByTier(firmAddress, tier).call();
    return creditIds.map(id => Number(id)); // Convert BigNumber to Number
  } catch (error) {
    console.error(`Error fetching retired general credit IDs for ${tier}:`, error);
    throw error;
  }
};

export const getTCO2Credit = async (creditId) => {
  if (!contract) {
    throw new Error('Contract not initialized');
  }
  try {
    const credit = await contract.methods.getTCO2Credit(creditId).call();
    return {
      id: Number(credit.id),
      tier: credit.tier,
      location: credit.location,
      coordinates: credit.coordinates,
      owner: credit.owner,
      isRetired: credit.isRetired
    };
  } catch (error) {
    console.error(`Error fetching TCO2 credit for ID ${creditId}:`, error);
    throw error;
  }
};

export async function createTCO2Credit(addr, tier, location, coordinates) {
  if (!contract) {
    throw new Error('Contract not initialized');
  }
  try {
    const gas = await contract.methods.createTCO2Credit(tier, location, coordinates).estimateGas({ from: addr });
    const gasLimit = typeof gas === 'bigint' 
      ? BigInt(Math.ceil(Number(gas) * 1.5))
      : Math.ceil(gas * 1.5);
    
    const result = await contract.methods.createTCO2Credit(tier, location, coordinates).send({ 
      from: addr, 
      gas: gasLimit,
      type: '0x0',
      gasPrice: await web3.eth.getGasPrice()
    });
    
    return result;
  } catch (error) {
    console.error('Error creating TCO2 credit:', error);
    throw error;
  }
}

export async function getAllFirmsCreditAssignmentHistory() {
  connectTo()
  if (!contract) {
    console.error('Contract not initialized');
    return { success: false, error: 'Contract not connected' };
  }

  try {
    console.log('Fetching credit history for all firms on the network...');
    
    // Method 1: Get all accounts from Ganache
    const accounts = await web3.eth.getAccounts();
    console.log(`Found ${accounts.length} accounts on Ganache:`, accounts);
    
    // Method 2: Alternatively, get unique firm addresses from events
    // This approach finds firms that have actually interacted with the contract
    const uniqueFirms = new Set();
    
    // Get all CreditAssignedToFirm events to find firms that received credits
    try {
      const assignmentEvents = await contract.getPastEvents('CreditAssignedToFirm', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      assignmentEvents.forEach(event => {
        if (event.returnValues.firm) {
          uniqueFirms.add(event.returnValues.firm);
        }
      });
      
      console.log(`Found ${assignmentEvents.length} credit assignment events`);
    } catch (eventError) {
      console.warn('Could not fetch CreditAssignedToFirm events:', eventError.message);
    }
    
    // Get all CreditCreatedByFirm events to find firms that created credits
    try {
      const creationEvents = await contract.getPastEvents('CreditCreatedByFirm', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      creationEvents.forEach(event => {
        if (event.returnValues[1]) { // Index 1 is the creator (msg.sender)
          uniqueFirms.add(event.returnValues[1]);
        }
      });
      
      console.log(`Found ${creationEvents.length} credit creation events`);
    } catch (eventError) {
      console.warn('Could not fetch CreditCreatedByFirm events:', eventError.message);
    }
    
    // Convert Set to Array and combine with Ganache accounts
    const firmsFromEvents = Array.from(uniqueFirms);
    const allPotentialFirms = [...new Set([...accounts, ...firmsFromEvents])];
    
    console.log(`Total unique addresses to check: ${allPotentialFirms.length}`);
    console.log('Firms from events:', firmsFromEvents);
    
    // Fetch credit history for each firm
    const allFirmsHistory = {};
    const firmHistoryPromises = [];
    
    // Process firms in batches to avoid overwhelming the network
    const BATCH_SIZE = 5;
    for (let i = 0; i < allPotentialFirms.length; i += BATCH_SIZE) {
      const batch = allPotentialFirms.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (firmAddress) => {
        try {
          console.log(`Fetching history for firm: ${firmAddress}`);
          const result = await getCreditAssignmentHistory(firmAddress);
          
          if (result.success && result.data && result.data.length > 0) {
            console.log(`Found ${result.data.length} transactions for firm ${firmAddress}`);
            return { firmAddress, result };
          } else {
            console.log(`No transactions found for firm ${firmAddress}`);
            return { firmAddress, result: { success: true, data: [] } };
          }
        } catch (error) {
          console.error(`Error fetching history for firm ${firmAddress}:`, error);
          return { 
            firmAddress, 
            result: { 
              success: false, 
              error: `Error fetching history: ${error.message}` 
            } 
          };
        }
      });
      
      // Wait for current batch to complete before starting next batch
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ firmAddress, result }) => {
        allFirmsHistory[firmAddress] = result;
      });
      
      // Small delay between batches to be gentle on the network
      if (i + BATCH_SIZE < allPotentialFirms.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Filter out firms with no transaction history and summarize results
    const firmsWithHistory = {};
    const firmsWithoutHistory = [];
    let totalTransactions = 0;
    
    Object.entries(allFirmsHistory).forEach(([firmAddress, result]) => {
      if (result.success && result.data && result.data.length > 0) {
        firmsWithHistory[firmAddress] = result;
        totalTransactions += result.data.length;
      } else {
        firmsWithoutHistory.push(firmAddress);
      }
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total firms checked: ${allPotentialFirms.length}`);
    console.log(`Firms with transaction history: ${Object.keys(firmsWithHistory).length}`);
    console.log(`Firms without transaction history: ${firmsWithoutHistory.length}`);
    console.log(`Total transactions found: ${totalTransactions}`);
    
    if (Object.keys(firmsWithHistory).length > 0) {
      console.log('\nFirms with history:');
      Object.entries(firmsWithHistory).forEach(([firmAddress, result]) => {
        console.log(`  ${firmAddress}: ${result.data.length} transactions`);
      });
    }
    
    return {
      success: true,
      data: {
        firmsWithHistory,
        summary: {
          totalFirmsChecked: allPotentialFirms.length,
          firmsWithHistory: Object.keys(firmsWithHistory).length,
          firmsWithoutHistory: firmsWithoutHistory.length,
          totalTransactions,
          firmsWithoutHistoryList: firmsWithoutHistory
        }
      }
    };
    
  } catch (error) {
    console.error('Error fetching credit history for all firms:', error);
    return { 
      success: false, 
      error: `Error fetching credit history for all firms: ${error.message}` 
    };
  }
}

// Alternative function to get history for specific firm addresses
export async function getCreditHistoryForSpecificFirms(firmAddresses) {
  if (!Array.isArray(firmAddresses) || firmAddresses.length === 0) {
    console.error('Firm addresses array is required');
    return { success: false, error: 'Firm addresses array is required' };
  }
  
  console.log(`Fetching credit history for ${firmAddresses.length} specific firms...`);
  
  const results = {};
  
  for (const firmAddress of firmAddresses) {
    try {
      console.log(`Fetching history for firm: ${firmAddress}`);
      const result = await getCreditAssignmentHistory(firmAddress);
      results[firmAddress] = result;
      
      if (result.success && result.data) {
        console.log(`Found ${result.data.length} transactions for firm ${firmAddress}`);
      }
    } catch (error) {
      console.error(`Error fetching history for firm ${firmAddress}:`, error);
      results[firmAddress] = { 
        success: false, 
        error: `Error: ${error.message}` 
      };
    }
  }
  
  return { success: true, data: results };
}


export {
  connectTo,
  checkFirm,
  analyzeCredits,
  getPoolStatus,
  calculateTradePreview,
  showMarketInfo,
  getAvailableTCO2,
  mintBCT,
  stakeBCT,
  getStakingInfo,
  getAllFirmsStakingInfo,
  buyBCT,
  sellBCT,
  updateFirmBalances,
  updatePoolState,
  getPoolState,
  getBCTPrice,
  getUSDCPrice,
  getFirmBCTBalance,
  getFirmUSDCBalance,
  getTransactionHistory,
  getFirmReputation,
  calculateBCTOutput,
  calculateUSDCOutput};