import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { WalletContext } from '../contexts/WalletContext';
import { buyBCT, getFirmUSDCBalance, calculateUSDCOutput, getTransactionHistory, getAllFirmsStakingInfo, getPoolState, getFirmBCTBalance } from '../utils/blockchain';
import Chart from 'chart.js/auto';

function Buy() {
  const { walletAddress } = useContext(WalletContext);
  const [firmAddress, setFirmAddress] = useState(walletAddress || '');
  const [bctAmount, setBctAmount] = useState('');
  const [usdcCost, setUsdcCost] = useState(null);
  const [status, setStatus] = useState(null);
  const [buyInfo, setBuyInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allFirmsStats, setAllFirmsStats] = useState([]);
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0);
  const [historicalData, setHistoricalData] = useState({ labels: [], usdcSpent: [], bctReceived: [] });
  const [priceTrendData, setPriceTrendData] = useState({ labels: [], prices: [] });
  const [poolState, setPoolState] = useState(null);
  const [timeframe, setTimeframe] = useState('7d');

  // Refs for chart instances
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const priceChartRef = useRef(null);

  // Fetch buy info, all firms stats, historical data, price trend, and pool state
  useEffect(() => {
    setFirmAddress(walletAddress || '');
    if (walletAddress) {
      fetchBuyInfo(walletAddress);
      fetchAllFirmsStats();
      fetchHistoricalData(walletAddress);
      fetchPoolState();
    }

    // Poll every 30 seconds for all firms stats and pool state
    const pollInterval = setInterval(() => {
      if (walletAddress) {
        fetchAllFirmsStats();
        fetchPoolState();
      }
    }, 30000);

    // Cycle ticker every 5 seconds
    const tickerInterval = setInterval(() => {
      setCurrentTickerIndex((prev) => (prev + 1) % (allFirmsStats.length + 1));
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(tickerInterval);
    };
  }, [walletAddress, allFirmsStats.length]);

  // Calculate USDC cost when BCT amount changes
  useEffect(() => {
    async function fetchUsdcCost() {
      if (bctAmount && !isNaN(bctAmount) && parseFloat(bctAmount) > 0) {
        const result = await calculateUSDCOutput(parseFloat(bctAmount));
        if (result.success) {
          setUsdcCost(result.data);
        } else {
          setUsdcCost(null);
          setStatus({ type: 'error', message: result.error });
        }
      } else {
        setUsdcCost(null);
      }
    }
    fetchUsdcCost();
  }, [bctAmount]);

  // Initialize line chart for historical buy data
  useEffect(() => {
    console.log('Historical Data:', historicalData); // Debug log
    if (historicalData.labels.length > 0) {
      if (lineChartRef.current) lineChartRef.current.destroy();

      const lineCtx = document.getElementById('buyLineChart')?.getContext('2d');
      if (lineCtx) {
        lineChartRef.current = new Chart(lineCtx, {
          type: 'line',
          data: {
            labels: historicalData.labels,
            datasets: [
              {
                label: 'USDC Spent',
                data: historicalData.usdcSpent,
                borderColor: 'rgba(34, 197, 94, 1)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(34, 197, 94, 1)',
              },
              {
                label: 'BCT Received',
                data: historicalData.bctReceived,
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
  }, [historicalData]);

  // Initialize bar chart for buy comparison
  useEffect(() => {
    console.log('Buy Info:', buyInfo, 'All Firms Stats:', allFirmsStats); // Debug log
    if (buyInfo && allFirmsStats.length > 0) {
      if (barChartRef.current) barChartRef.current.destroy();

      const barCtx = document.getElementById('buyBarChart')?.getContext('2d');
      if (barCtx) {
        barChartRef.current = new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: ['Your BCT Bought', 'Others\' BCT Bought'],
            datasets: [{
              label: 'BCT Bought',
              data: [
                Number(buyInfo.totalBCTBought) || 0,
                allFirmsStats.reduce((sum, firm) => sum + (Number(firm.totalBCTBought) || 0), 0) - (Number(buyInfo.totalBCTBought) || 0),
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
  }, [buyInfo, allFirmsStats]);

  // Initialize price trend chart
  useEffect(() => {
    console.log('Price Trend Data:', priceTrendData); // Debug log
    if (priceTrendData.labels.length > 0) {
      if (priceChartRef.current) priceChartRef.current.destroy();

      const priceCtx = document.getElementById('priceTrendChart')?.getContext('2d');
      if (priceCtx) {
        priceChartRef.current = new Chart(priceCtx, {
          type: 'line',
          data: {
            labels: priceTrendData.labels,
            datasets: [{
              label: 'USDC/BCT Price',
              data: priceTrendData.prices,
              borderColor: 'rgba(34, 197, 94, 1)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: 'rgba(34, 197, 94, 1)',
            }],
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
                callbacks: {
                  label: function (context) {
                    return `${context.dataset.label}: ${context.raw.toFixed(4)} USDC/BCT`;
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
      if (priceChartRef.current) priceChartRef.current.destroy();
    };
  }, [priceTrendData]);

  const fetchBuyInfo = async (address) => {
    try {
      // Initialize buyInfo with defaults to prevent undefined errors
      setBuyInfo({ usdcBalance: 0, bctBalance: 0, totalBCTBought: 0, totalUsdcSpent: 0 });

      // Fetch USDC balance
      const usdcResult = await getFirmUSDCBalance(address);
      if (!usdcResult.success) {
        setStatus({ type: 'error', message: usdcResult.error });
        return;
      }

      // Fetch transaction history
      const txResult = await getTransactionHistory();
      if (!txResult.success) {
        setStatus({ type: 'error', message: txResult.error });
        return;
      }
      const buyEvents = txResult.data.filter((tx) => tx.type === 'Buy');
      const totalBCTBought = buyEvents.reduce((sum, tx) => sum + Number(tx.amount), 0);
      const totalUsdcSpent = buyEvents.reduce((sum, tx) => sum + Number(tx.secondaryAmount), 0);

      // Fetch BCT balance
      let bctBalance = 0;
      try {
        const bctResult = await getFirmBCTBalance(address);
        if (bctResult.success) {
          bctBalance = Number(bctResult.data);
        } else {
          console.warn(`Failed to fetch BCT balance: ${bctResult.error}`);
          setStatus({ type: 'warning', message: 'Could not fetch BCT balance, defaulting to 0' });
        }
      } catch (error) {
        console.error(`Error fetching BCT balance: ${error.message}`);
        setStatus({ type: 'warning', message: 'Could not fetch BCT balance, defaulting to 0' });
      }

      // Update buyInfo
      setBuyInfo({
        usdcBalance: Number(usdcResult.data),
        bctBalance,
        totalBCTBought,
        totalUsdcSpent,
      });
    } catch (error) {
      console.error(`Error in fetchBuyInfo: ${error.message}`);
      setStatus({ type: 'error', message: `Error fetching buy info: ${error.message}` });
    }
  };

  const fetchAllFirmsStats = async () => {
    try {
      const result = await getAllFirmsStakingInfo();
      if (result.success) {
        const txResult = await getTransactionHistory();
        if (txResult.success) {
          const firms = await Promise.all(result.data.firms.map(async (firm) => {
            const buyEvents = txResult.data.filter((tx) => tx.type === 'Buy');
            const totalBCTBought = buyEvents.reduce((sum, tx) => sum + Number(tx.amount), 0);
            const usdcResult = await getFirmUSDCBalance(firm.address);
            let bctBalance = 0;
            try {
              const bctResult = await getFirmBCTBalance(firm.address);
              bctBalance = bctResult.success ? Number(bctResult.data) : 0;
            } catch (error) {
              console.warn(`Error fetching BCT balance for firm ${firm.address}: ${error.message}`);
            }
            return {
              ...firm,
              totalBCTBought,
              usdcBalance: usdcResult.success ? Number(usdcResult.data) : 0,
              bctBalance,
            };
          }));
          setAllFirmsStats(firms);
        } else {
          setAllFirmsStats(result.data.firms);
          setStatus({ type: 'error', message: txResult.error });
        }
      } else {
        setStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      console.error(`Error fetching all firms stats: ${error.message}`);
      setStatus({ type: 'error', message: `Error fetching all firms stats: ${error.message}` });
    }
  };

  const fetchHistoricalData = async (address) => {
    try {
      const txResult = await getTransactionHistory();
      if (!txResult.success) {
        setStatus({ type: 'error', message: txResult.error });
        return;
      }

      const buyEvents = txResult.data.filter((tx) => tx.type === 'Buy');
      const cutoffDate = timeframe === '7d' ? Date.now() - 7 * 24 * 60 * 60 * 1000 : Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filteredEvents = buyEvents.filter((tx) => new Date(tx.timestamp).getTime() >= cutoffDate);

      const labels = [];
      const usdcSpent = [];
      const bctReceived = [];
      const prices = [];

      for (const event of filteredEvents) {
        labels.push(new Date(event.timestamp).toLocaleDateString());
        usdcSpent.push(Number(event.secondaryAmount));
        bctReceived.push(Number(event.amount));
        prices.push(event.amount > 0 ? Number(event.secondaryAmount) / Number(event.amount) : 0);
      }

      setHistoricalData({ labels, usdcSpent, bctReceived });
      setPriceTrendData({ labels, prices });
    } catch (error) {
      console.error(`Error fetching historical data: ${error.message}`);
      setStatus({ type: 'error', message: `Error fetching historical data: ${error.message}` });
    }
  };

  const fetchPoolState = async () => {
    try {
      const result = await getPoolState();
      if (result.success) {
        setPoolState(result.data);
      } else {
        setStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      console.error(`Error fetching pool state: ${error.message}`);
      setStatus({ type: 'error', message: `Error fetching pool state: ${error.message}` });
    }
  };

  const handleBuy = async () => {
    if (!walletAddress) {
      setStatus({ type: 'error', message: 'Connect a wallet to proceed' });
      return;
    }
    if (firmAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      setStatus({ type: 'error', message: 'Firm address must match connected wallet' });
      return;
    }
    if (!bctAmount || isNaN(bctAmount) || parseFloat(bctAmount) <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid BCT amount' });
      return;
    }
    if (!usdcCost) {
      setStatus({ type: 'error', message: 'Unable to calculate USDC cost' });
      return;
    }
    setIsLoading(true);
    setStatus(null);
    try {
      const result = await buyBCT(firmAddress, usdcCost);
      setStatus({ type: result.success ? 'success' : 'error', message: result.message || result.error });
      if (result.success) {
        await fetchBuyInfo(firmAddress);
        await fetchAllFirmsStats();
        await fetchHistoricalData(firmAddress);
        setBctAmount('');
        setUsdcCost(null);
      }
    } catch (error) {
      console.error(`Error in handleBuy: ${error.message}`);
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
    const totalBCTBought = allFirmsStats.reduce((sum, firm) => sum + (Number(firm.totalBCTBought) || 0), 0);
    const avgBuy = allFirmsStats.length > 0 ? totalBCTBought / allFirmsStats.length : 0;
    const currentPrice = poolState && poolState.bctPool > 0 ? Number(poolState.usdcPool) / Number(poolState.bctPool) : 0;
    return {
      totalBCTBought,
      avgBuy,
      numFirms: allFirmsStats.length,
      nextUpdate: 300,
      currentPrice,
    };
  };

  const getUserRank = () => {
    if (!buyInfo || !allFirmsStats.length) return 'N/A';
    const sortedFirms = [...allFirmsStats].sort((a, b) => (Number(b.totalBCTBought) || 0) - (Number(a.totalBCTBought) || 0));
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
                <span>BCT Bought: {(allFirmsStats[currentTickerIndex].totalBCTBought || 0)} BCT</span>
                <span>USDC Balance: {(allFirmsStats[currentTickerIndex].usdcBalance || 0)} USDC</span>
                <span>BCT Balance: {(allFirmsStats[currentTickerIndex].bctBalance || 0)} BCT</span>
              </>
            ) : (
              <>
                <span>Total BCT Bought: {getAggregatedStats().totalBCTBought.toLocaleString()} BCT</span>
                <span>Average Buy: {getAggregatedStats().avgBuy.toFixed(2)} BCT</span>
                <span>Registered Firms: {getAggregatedStats().numFirms}</span>
                <span>Current Price: {getAggregatedStats().currentPrice.toFixed(4)} USDC/BCT</span>
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
            <span>Buy BCT</span>
            <svg className="w-8 h-8 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.1.9-2 2-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
          </h2>
          <p className="text-gray-300 mt-2">Purchase BCT with USDC in the CarbonTrust Pool</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Buy Form */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.4)] col-span-1"
          >
            <h3 className="text-2xl font-semibold text-green-400 mb-6 flex items-center gap-2">
              Buy BCT
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
              <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="bctAmount">
                Desired BCT Amount
              </label>
              <input
                id="bctAmount"
                type="number"
                min="0"
                step="0.01"
                value={bctAmount}
                onChange={(e) => setBctAmount(e.target.value)}
                placeholder="Enter BCT amount"
                className="w-full px-4 py-3 bg-gray-900/50 text-white border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all"
                aria-label="BCT amount"
              />
              {usdcCost !== null && (
                <p className="text-gray-300 text-sm mt-2">
                  Estimated Cost: <span className="text-green-400 font-medium">{usdcCost.toFixed(2)} USDC</span>
                </p>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34,197,94,0.8)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBuy}
              disabled={isLoading || !usdcCost}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-blue-700 transition relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? 'Processing...' : 'Buy BCT'}
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

          {/* Buy Info and Charts */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="col-span-2 space-y-8"
          >
            {buyInfo && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Available USDC Balance</p>
                    <p className="text-green-400 text-2xl font-bold">{buyInfo.usdcBalance || 0} USDC</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Your BCT Balance</p>
                    <p className="text-green-400 text-2xl font-bold">{typeof buyInfo.bctBalance === 'number' ? buyInfo.bctBalance : 0} BCT</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Total BCT Bought</p>
                    <p className="text-green-400 text-2xl font-bold">{buyInfo.totalBCTBought || 0} BCT</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gray-900/50 p-6 rounded-lg border border-green-500/20 text-center"
                  >
                    <p className="text-gray-300 font-medium">Your Buy Share</p>
                    <p className="text-green-400 text-2xl font-bold">
                      {getAggregatedStats().totalBCTBought > 0
                        ? ((Number(buyInfo.totalBCTBought) / getAggregatedStats().totalBCTBought * 100).toFixed(2))
                        : '0.00'}%
                    </p>
                  </motion.div>
                </div>

                {/* Historical Buy Data Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                      Historical Buy Transactions
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
                    <canvas id="buyLineChart" />
                  </div>
                  {historicalData.labels.length === 0 && (
                    <p className="text-gray-300 text-center mt-4">No buy history found for the selected timeframe.</p>
                  )}
                </motion.div>

                {/* Buy Comparison Bar Chart and Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30"
                >
                  <h4 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                    Buy Comparison
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </h4>
                  <div className="relative h-80 mb-6">
                    <canvas id="buyBarChart" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20 text-center">
                      <p className="text-gray-300 font-medium">Your Buy Share</p>
                      <p className="text-green-400 text-xl font-bold">
                        {getAggregatedStats().totalBCTBought > 0
                          ? ((Number(buyInfo.totalBCTBought) / getAggregatedStats().totalBCTBought * 100).toFixed(2))
                          : '0.00'}%
                      </p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20 text-center">
                      <p className="text-gray-300 font-medium">Your Rank</p>
                      <p className="text-green-400 text-xl font-bold">{getUserRank()}</p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20 text-center">
                      <p className="text-gray-300 font-medium">Average BCT Bought per Firm</p>
                      <p className="text-green-400 text-xl font-bold">{getAggregatedStats().avgBuy.toFixed(2)} BCT</p>
                    </div>
                  </div>
                </motion.div>

                {/* USDC/BCT Price Trend Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30"
                >
                  <h4 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                    USDC/BCT Price Trend
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </h4>
                  <div className="relative h-80">
                    <canvas id="priceTrendChart" />
                  </div>
                  {priceTrendData.labels.length === 0 && (
                    <p className="text-gray-300 text-center mt-4">No price data available for the selected timeframe.</p>
                  )}
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default Buy;