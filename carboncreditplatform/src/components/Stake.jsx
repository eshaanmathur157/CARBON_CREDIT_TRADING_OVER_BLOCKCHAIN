import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { WalletContext } from '../contexts/WalletContext';
import { stakeBCT, getStakingInfo, getAllFirmsStakingInfo, getTransactionHistory, getFirmReputation } from '../utils/blockchain';
import Chart from 'chart.js/auto';

function Stake() {
  const { walletAddress } = useContext(WalletContext);
  const [firmAddress, setFirmAddress] = useState(walletAddress || '');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState(null);
  const [stakingInfo, setStakingInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allFirmsStats, setAllFirmsStats] = useState([]);
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0);
  const [historicalData, setHistoricalData] = useState({ labels: [], staked: [], reputation: [] });
  const [timeframe, setTimeframe] = useState('7d');

  // Refs for chart instances
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

  // Fetch staking info, all firms stats, and historical data
  useEffect(() => {
    setFirmAddress(walletAddress || '');
    if (walletAddress) {
      fetchStakingInfo(walletAddress);
      fetchAllFirmsStakingInfo();
      fetchHistoricalData(walletAddress);
    }

    // Poll every 10 seconds for all firms stats
    const pollInterval = setInterval(() => {
      if (walletAddress) {
        fetchAllFirmsStakingInfo();
      }
    }, 10000);

    // Cycle ticker every 5 seconds
    const tickerInterval = setInterval(() => {
      setCurrentTickerIndex((prev) => (prev + 1) % (allFirmsStats.length + 1));
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(tickerInterval);
    };
  }, [walletAddress, allFirmsStats.length]);

  // Initialize line chart
  useEffect(() => {
    if (historicalData.labels.length > 0) {
      if (lineChartRef.current) lineChartRef.current.destroy();

      const lineCtx = document.getElementById('stakeLineChart')?.getContext('2d');
      if (lineCtx) {
        lineChartRef.current = new Chart(lineCtx, {
          type: 'line',
          data: {
            labels: historicalData.labels,
            datasets: [
              {
                label: 'Staked BCT',
                data: historicalData.staked,
                borderColor: 'rgba(34, 197, 94, 1)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(34, 197, 94, 1)',
              },
              {
                label: 'Reputation',
                data: historicalData.reputation,
                borderColor: 'rgba(234, 179, 8, 1)',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(234, 179, 8, 1)',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { color: '#d1d5db', font: { size: 14 } },
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: function (context) {
                    return `${context.dataset.label}: ${context.raw}`;
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: { color: '#d1d5db', font: { size: 12 } },
                grid: { color: 'rgba(209, 213, 219, 0.1)', display: false },
              },
              y: {
                ticks: { color: '#d1d5db', font: { size: 12 } },
                grid: { color: 'rgba(209, 213, 219, 0.1)', drawBorder: false },
              },
            },
          },
        });
      }
    }

    return () => {
      if (lineChartRef.current) lineChartRef.current.destroy();
    };
  }, [historicalData, timeframe]);

  // Initialize bar chart
  useEffect(() => {
    if (stakingInfo && allFirmsStats.length > 0) {
      if (barChartRef.current) barChartRef.current.destroy();

      const barCtx = document.getElementById('stakeBarChart')?.getContext('2d');
      if (barCtx) {
        barChartRef.current = new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: ['Your Stake', 'Others\' Stake'],
            datasets: [{
              label: 'Staked BCT',
              data: [
                Number(stakingInfo.stakedBCT),
                Number(stakingInfo.totalStaked) - Number(stakingInfo.stakedBCT) || 0,
              ],
              backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)'],
              borderColor: ['rgba(34, 197, 94, 1)', 'rgba(59, 130, 246, 1)'],
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return `${context.label}: ${context.raw} BCT`;
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: { color: '#d1d5db', font: { size: 14 } },
                grid: { color: 'rgba(209, 213, 219, 0.1)', display: false },
              },
              y: {
                ticks: { color: '#d1d5db', font: { size: 12 } },
                grid: { color: 'rgba(209, 213, 219, 0.1)', drawBorder: false },
              },
            },
          },
        });
      }
    }

    return () => {
      if (barChartRef.current) barChartRef.current.destroy();
    };
  }, [stakingInfo, allFirmsStats]);

  const fetchStakingInfo = async (address) => {
    try {
      const result = await getStakingInfo(address);
      if (result.success) {
        setStakingInfo(result.data);
      } else {
        setStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Error fetching staking info: ${error.message}` });
    }
  };

  const fetchAllFirmsStakingInfo = async () => {
    try {
      const result = await getAllFirmsStakingInfo();
      if (result.success) {
        setAllFirmsStats(result.data.firms);
      } else {
        setStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Error fetching all firms staking info: ${error.message}` });
    }
  };

  const fetchHistoricalData = async (address) => {
    try {
      const txResult = await getTransactionHistory();
      console.log(txResult);
      if (!txResult.success) {
        setStatus({ type: 'error', message: txResult.error });
        return;
      }

      const stakeEvents = txResult.data.filter((tx) => tx.type === 'Stake' && tx.firm.toLowerCase() === address.toLowerCase());
      const cutoffDate = timeframe === '7d' ? Date.now() - 7 * 24 * 60 * 60 * 1000 : Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filteredEvents = stakeEvents.filter((tx) => new Date(tx.timestamp).getTime() >= cutoffDate);

      const labels = [];
      const staked = [];
      const reputation = [];

      for (const event of filteredEvents) {
        labels.push(new Date(event.timestamp).toLocaleDateString());
        staked.push(Number(event.amount)); // Ensure staked amount is a Number

        // Fetch reputation for the firm at the time of the event
        try {
          const repResult = event.reputation;
          if (typeof repResult === 'bigint') {
            reputation.push(Number(repResult)); // Convert BigInt to Number
          } else {
            reputation.push(Number(repResult) || 0); // Fallback to 0 if invalid
          }
        } catch (error) {
          console.error(`Failed to fetch reputation for ${address} at ${event.timestamp}: ${error.message}`);
          reputation.push(0); // Fallback to 0 if reputation fetch fails
        }
      }

      setHistoricalData({ labels, staked, reputation });
    } catch (error) {
      setStatus({ type: 'error', message: `Error fetching historical data: ${error.message}` });
    }
  };

  const handleStake = async () => {
    if (!walletAddress) {
      setStatus({ type: 'error', message: 'Connect a wallet to proceed' });
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid stake amount' });
      return;
    }
    setIsLoading(true);
    setStatus(null);
    try {
      const result = await stakeBCT(firmAddress, parseFloat(amount));
      setStatus({ type: 'success', message: result.message });
      await fetchStakingInfo(firmAddress);
      await fetchAllFirmsStakingInfo();
      await fetchHistoricalData(firmAddress);
      setAmount('');
    } catch (error) {
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const resetFirmAddress = () => {
    setFirmAddress(walletAddress || '');
    setStatus(null);
  };

  const getStatusBorderColor = (type) => {
    switch (type) {
      case 'success': return 'border-green-500/30';
      case 'warning': return 'border-yellow-500/30';
      case 'error': return 'border-red-500/30';
      default: return 'border-gray-500/30';
    }
  };

  const formatCountdown = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getAggregatedStats = () => {
    const totalStaked = allFirmsStats.reduce((sum, firm) => sum + Number(firm.stakedBCT), 0);
    const avgStake = allFirmsStats.length > 0 ? totalStaked / allFirmsStats.length : 0;
    return {
      totalStaked,
      avgStake,
      numFirms: allFirmsStats.length,
      nextUpdate: 300, // Fixed for consistency
    };
  };

  const getUserRank = () => {
    if (!stakingInfo || !allFirmsStats.length) return 'N/A';
    const sortedFirms = [...allFirmsStats].sort((a, b) => Number(b.stakedBCT) - Number(a.stakedBCT));
    const userIndex = sortedFirms.findIndex(firm => firm.address.toLowerCase() === walletAddress.toLowerCase());
    return userIndex >= 0 ? userIndex + 1 : 'N/A';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-blue-950 pt-20 relative overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.shutterstock.com/image-illustration/glowing-green-candlestick-forex-chart-600nw-2274168017.jpg')] opacity-10 bg-cover bg-center" />
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-green-400/20 rounded-full animate-float"
            style={{
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
        <div className="absolute inset-0 opacity-20">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute border border-green-500/30 rounded-[12px] rotate-45 animate-pulse"
              style={{
                width: '30px',
                height: '30px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Real-Time Stats Ticker for All Firms */}
      {allFirmsStats.length > 0 && (
        <motion.div
          className="bg-gray-900/80 backdrop-blur-md border-b border-green-500/30 py-2 overflow-hidden mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            key={currentTickerIndex}
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="flex space-x-8 whitespace-nowrap text-green-400 text-sm font-mono px-4"
          >
            {currentTickerIndex < allFirmsStats.length ? (
              <>
                <span>Firm: {truncateAddress(allFirmsStats[currentTickerIndex].address)}</span>
                <span>Stake Share: {allFirmsStats[currentTickerIndex].stakeShare}%</span>
                <span>Staked: {allFirmsStats[currentTickerIndex].stakedBCT} BCT</span>
                <span>Balance: {allFirmsStats[currentTickerIndex].bctBalance} BCT</span>
              </>
            ) : (
              <>
                <span>Total Staked: {getAggregatedStats().totalStaked.toLocaleString()} BCT</span>
                <span>Average Stake: {getAggregatedStats().avgStake.toFixed(2)} BCT</span>
                <span>Registered Firms: {getAggregatedStats().numFirms}</span>
                <span>Next Pool Update: {formatCountdown(getAggregatedStats().nextUpdate)}</span>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-extrabold text-green-400 tracking-tight flex items-center justify-center gap-2">
            <span>Secure Your Stake</span>
            <svg className="w-8 h-8 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.1.9-2 2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
          </h2>
          <p className="text-gray-300 mt-2">Contribute to the CarbonTrust Staking Pool and track your performance</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Staking Form */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.4)] col-span-1"
          >
            <h3 className="text-2xl font-semibold text-green-400 mb-6 flex items-center gap-2">
              Stake BCT
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.1.9-2 2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
            </h3>
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="firmAddress">
                Firm Address
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="firmAddress"
                  type="text"
                  value={firmAddress}
                  onChange={(e) => setFirmAddress(e.target.value)}
                  placeholder="Enter firm address"
                  className="flex-1 px-4 py-3 bg-gray-900/50 text-white border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all"
                  aria-describedby="firmAddressHelp"
                />
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(34,197,94,0.7)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetFirmAddress}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition"
                >
                  Use Wallet
                </motion.button>
              </div>
              <p id="firmAddressHelp" className="text-gray-400 text-xs mt-1">
                Must match wallet: <span className="font-mono text-green-400">{walletAddress || 'Not connected'}</span>
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="stakeAmount">
                Stake Amount (BCT)
              </label>
              <input
                id="stakeAmount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to stake"
                className="w-full px-4 py-3 bg-gray-900/50 text-white border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all"
                aria-label="Stake amount"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34,197,94,0.8)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStake}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-blue-700 transition relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? 'Processing...' : 'Stake BCT'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.1.9-2 2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-green-400/30 animate-pulse" />
            </motion.button>
            {status && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`mt-6 p-4 rounded-lg text-center ${
                  status.type === 'success'
                    ? 'bg-green-600/20 text-green-300'
                    : status.type === 'warning'
                    ? 'bg-yellow-600/20 text-yellow-300'
                    : 'bg-red-600/20 text-red-300'
                } border ${getStatusBorderColor(status.type)}`}
              >
                <span className="block animate-pulse">{status.message}</span>
              </motion.div>
            )}
          </motion.div>

          {/* Staking Info and Charts */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="col-span-2 space-y-8"
          >
            {stakingInfo && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Available BCT Balance</p>
                    <p className="text-green-400 text-2xl font-bold">{stakingInfo.bctBalance} BCT</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Your Staked BCT</p>
                    <p className="text-green-400 text-2xl font-bold">{stakingInfo.stakedBCT} BCT</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Total Staked BCT</p>
                    <p className="text-green-400 text-2xl font-bold">{stakingInfo.totalStaked} BCT</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Your Stake Share</p>
                    <p className="text-green-400 text-2xl font-bold">
                      {stakingInfo.totalStaked > 0
                        ? ((Number(stakingInfo.stakedBCT) / Number(stakingInfo.totalStaked) * 100).toFixed(2))
                        : '0.00'}%
                    </p>
                  </motion.div>
                </div>

                {/* Historical Staking Data Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                      Historical Staking and Reputation
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setTimeframe('7d'); fetchHistoricalData(walletAddress); }}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${timeframe === '7d' ? 'bg-green-500 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'}`}
                      >
                        7 Days
                      </button>
                      <button
                        onClick={() => { setTimeframe('30d'); fetchHistoricalData(walletAddress); }}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${timeframe === '30d' ? 'bg-green-500 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'}`}
                      >
                        30 Days
                      </button>
                    </div>
                  </div>
                  <div className="relative h-80">
                    <canvas id="stakeLineChart" />
                  </div>
                  {historicalData.labels.length === 0 && (
                    <p className="text-gray-300 text-center mt-4">No staking history found for the selected timeframe.</p>
                  )}
                </motion.div>

                {/* Staking Comparison Bar Chart and Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30"
                >
                  <h4 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                    Staking Comparison
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </h4>
                  <div className="relative h-80 mb-6">
                    <canvas id="stakeBarChart" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20 text-center">
                      <p className="text-gray-300 font-medium">Your Stake Share</p>
                      <p className="text-green-400 text-xl font-bold">
                        {stakingInfo.totalStaked > 0
                          ? ((Number(stakingInfo.stakedBCT) / Number(stakingInfo.totalStaked) * 100).toFixed(2))
                          : '0.00'}%
                      </p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20 text-center">
                      <p className="text-gray-300 font-medium">Your Rank</p>
                      <p className="text-green-400 text-xl font-bold">{getUserRank()}</p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20 text-center">
                      <p className="text-gray-300 font-medium">Average Stake per Firm</p>
                      <p className="text-green-400 text-xl font-bold">{getAggregatedStats().avgStake.toFixed(2)} BCT</p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default Stake;