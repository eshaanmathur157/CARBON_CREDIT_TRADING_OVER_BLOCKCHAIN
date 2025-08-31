import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { WalletContext } from '../contexts/WalletContext';
import Chart from 'chart.js/auto';
import Tilt from 'react-parallax-tilt';
import SellHistory from './SellHistory';
import {
  sellBCT,
  updateFirmBalances,
  updatePoolState,
  calculateTradePreview,
  getPoolState,
  getBCTPrice,
  getUSDCPrice,
  getTransactionHistory,
} from '../utils/blockchain';

function Sell() {
  const { walletAddress } = useContext(WalletContext);
  const [bctAmount, setBctAmount] = useState('');
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [poolState, setPoolState] = useState({ usdcPool: 0, bctPool: 0, invariant: 0 });
  const [bctPrice, setBctPrice] = useState(0);
  const [usdcPrice, setUsdcPrice] = useState(0);
  const [bctBalance, setBctBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [expectedUSDC, setExpectedUSDC] = useState(0);
  const [sellTransactions, setSellTransactions] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [volumeHistory, setVolumeHistory] = useState([]);
  const [firmDistribution, setFirmDistribution] = useState([]);

  const priceChartRef = useRef(null);
  const liquidityChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const distributionChartRef = useRef(null);

  // Fetch data and set up polling
  useEffect(() => {
    if (walletAddress) {
      fetchMarketData();
      updateBalances(walletAddress);
      fetchTransactionHistory();
    }

    const pollInterval = setInterval(() => {
      if (walletAddress) {
        fetchMarketData();
        updateBalances(walletAddress);
        fetchTransactionHistory();
      }
    }, 20000);

    return () => clearInterval(pollInterval);
  }, [walletAddress]);

  // Initialize charts
  useEffect(() => {
    // Price Chart
    if (priceChartRef.current) priceChartRef.current.destroy();
    const priceCtx = document.getElementById('priceChart')?.getContext('2d');
    if (priceCtx) {
      const gradient = priceCtx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
      priceChartRef.current = new Chart(priceCtx, {
        type: 'line',
        data: {
          labels: priceHistory.map((entry) => new Date(entry.timestamp).toLocaleTimeString()),
          datasets: [{
            label: 'BCT/USDC Price',
            data: priceHistory.map((entry) => entry.price),
            borderColor: 'rgba(34, 197, 94, 1)',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#d1d5db', font: { size: 14 } } },
            tooltip: { backgroundColor: '#1f2937', titleColor: '#d1d5db', bodyColor: '#d1d5db' },
          },
          scales: {
            x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(209, 213, 219, 0.1)' } },
            y: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(209, 213, 219, 0.1)' } },
          },
        },
      });
    }

    // Liquidity Chart
    if (liquidityChartRef.current) liquidityChartRef.current.destroy();
    const liquidityCtx = document.getElementById('liquidityChart')?.getContext('2d');
    if (liquidityCtx) {
      liquidityChartRef.current = new Chart(liquidityCtx, {
        type: 'doughnut',
        data: {
          labels: ['USDC Pool', 'BCT Pool'],
          datasets: [{
            data: [poolState.usdcPool || 0, poolState.bctPool || 0],
            backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(34, 197, 94, 0.8)'],
            borderColor: ['rgba(59, 130, 246, 1)', 'rgba(34, 197, 94, 1)'],
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#d1d5db', font: { size: 14 } } },
            tooltip: { backgroundColor: '#1f2937', titleColor: '#d1d5db', bodyColor: '#d1d5db' },
          },
        },
      });
    }

    // Volume Chart
    if (volumeChartRef.current) volumeChartRef.current.destroy();
    const volumeCtx = document.getElementById('volumeChart')?.getContext('2d');
    if (volumeCtx) {
      const gradient = volumeCtx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0.4)');
      volumeChartRef.current = new Chart(volumeCtx, {
        type: 'bar',
        data: {
          labels: volumeHistory.map((entry) => new Date(entry.timestamp).toLocaleTimeString()),
          datasets: [{
            label: 'Sell Volume (BCT)',
            data: volumeHistory.map((entry) => entry.amount),
            backgroundColor: gradient,
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#d1d5db', font: { size: 14 } } },
            tooltip: { backgroundColor: '#1f2937', titleColor: '#d1d5db', bodyColor: '#d1d5db' },
          },
          scales: {
            x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(209, 213, 219, 0.1)' } },
            y: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(209, 213, 219, 0.1)' } },
          },
        },
      });
    }

    // Distribution Chart
    if (distributionChartRef.current) distributionChartRef.current.destroy();
    const distributionCtx = document.getElementById('distributionChart')?.getContext('2d');
    if (distributionCtx) {
      distributionChartRef.current = new Chart(distributionCtx, {
        type: 'pie',
        data: {
          labels: firmDistribution.map((f) => f.firm.slice(0, 6) + '...'),
          datasets: [{
            data: firmDistribution.map((f) => f.totalBCT),
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(139, 92, 246, 0.8)',
            ],
            borderColor: '#1f2937',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#d1d5db', font: { size: 14 } } },
            tooltip: {
              backgroundColor: '#1f2937',
              titleColor: '#d1d5db',
              bodyColor: '#d1d5db',
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.raw} BCT`,
              },
            },
          },
        },
      });
    }

    return () => {
      if (priceChartRef.current) priceChartRef.current.destroy();
      if (liquidityChartRef.current) liquidityChartRef.current.destroy();
      if (volumeChartRef.current) volumeChartRef.current.destroy();
      if (distributionChartRef.current) distributionChartRef.current.destroy();
    };
  }, [poolState, priceHistory, volumeHistory, firmDistribution]);

  const fetchMarketData = async () => {
    try {
      const poolResult = await getPoolState();
      const bctPriceResult = await getBCTPrice();
      const usdcPriceResult = await getUSDCPrice();

      if (!poolResult.success || !bctPriceResult.success || !usdcPriceResult.success) {
        throw new Error(
          poolResult.error || bctPriceResult.error || usdcPriceResult.error || 'Failed to fetch market data'
        );
      }

      setPoolState({
        usdcPool: Number(poolResult.data.usdcPool) || 0,
        bctPool: Number(poolResult.data.bctPool) || 0,
        invariant: Number(poolResult.data.invariant) || 0,
      });
      setBctPrice(Number(bctPriceResult.data) || 0);
      setUsdcPrice(Number(usdcPriceResult.data) || 0);
    } catch (error) {
      console.error('Fetch market data error:', error);
      setStatus({ type: 'error', message: `Error fetching market data: ${error.message}` });
    }
  };

  const updateBalances = async (addr) => {
    try {
      const balanceResult = await updateFirmBalances(addr);
      if (!balanceResult.success) {
        throw new Error(balanceResult.error || 'Failed to fetch balances');
      }
      setBctBalance(Number(balanceResult.data.bctBalance) || 0);
      setUsdcBalance(Number(balanceResult.data.usdcBalance) || 0);
    } catch (error) {
      console.error('Update balances error:', error);
      setStatus({ type: 'error', message: `Error fetching balances: ${error.message}` });
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const result = await getTransactionHistory();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transaction history');
      }
      const transactions = result.data || [];
      const sells = transactions.filter((tx) => tx.type === 'Sell');
      setSellTransactions(sells);

      const prices = sells
        .map((tx) => {
          const amount = Number(tx.amount || 0);
          const secondaryAmount = Number(tx.secondaryAmount || 0);
          if (amount === 0) {
            console.warn(`Zero BCT amount in sell transaction: ${tx.transactionHash}`);
            return { price: 0, timestamp: tx.timestamp };
          }
          const price = secondaryAmount / amount;
          if (!Number.isFinite(price)) {
            console.warn(`Invalid price ${price} for tx ${tx.transactionHash}`);
            return { price: 0, timestamp: tx.timestamp };
          }
          return { price, timestamp: tx.timestamp };
        })
        .filter((p) => p.price > 0);
      setPriceHistory(prices.slice(-60));

      const volumes = sells
        .map((tx) => ({
          amount: Number(tx.amount || 0),
          timestamp: tx.timestamp,
        }))
        .filter((v) => v.amount > 0);
      setVolumeHistory(volumes.slice(-60));

      const firmMap = sells.reduce((acc, tx) => {
        const amount = Number(tx.amount || 0);
        if (amount > 0) {
          acc[tx.firm] = (acc[tx.firm] || 0) + amount;
        }
        return acc;
      }, {});
      const distribution = Object.entries(firmMap).map(([firm, totalBCT]) => ({ firm, totalBCT }));
      setFirmDistribution(distribution.slice(0, 5));
    } catch (error) {
      console.error('Error in fetchTransactionHistory:', error);
      setStatus({ type: 'error', message: `Error fetching transaction history: ${error.message}` });
    }
  };

  const handleSell = async () => {
    if (!walletAddress) {
      setStatus({ type: 'error', message: 'Connect a wallet to proceed' });
      return;
    }
    if (!bctAmount || isNaN(bctAmount) || parseFloat(bctAmount) <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid BCT amount' });
      return;
    }
    setIsLoading(true);
    setStatus(null);
    try {
      const result = await sellBCT(walletAddress, bctAmount);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sell BCT');
      }
      setStatus({ type: 'success', message: result.message });
      await Promise.all([
        updateBalances(walletAddress),
        fetchMarketData(),
        fetchTransactionHistory(),
      ]);
      setBctAmount('');
      setExpectedUSDC(0);
    } catch (error) {
      console.error('Sell error:', error);
      setStatus({ type: 'error', message: `Error selling BCT: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePreview = async () => {
    if (bctAmount && !isNaN(bctAmount) && parseFloat(bctAmount) > 0) {
      try {
        const previewResult = await calculateTradePreview(true, parseFloat(bctAmount));
        if (!previewResult.success) {
          throw new Error(previewResult.error || 'Failed to calculate preview');
        }
        setExpectedUSDC(Number(previewResult.output) || 0);
      } catch (error) {
        console.error('Calculate preview error:', error);
        setExpectedUSDC(0);
        setStatus({ type: 'error', message: `Error calculating preview: ${error.message}` });
      }
    } else {
      setExpectedUSDC(0);
    }
  };

  useEffect(() => {
    calculatePreview();
  }, [bctAmount]);

  // Calculate slippage
  const calculateSlippage = () => {
    if (!bctAmount || !expectedUSDC || !poolState.bctPool || !poolState.usdcPool) {
      return '0.00';
    }
    const currentPrice = poolState.usdcPool / poolState.bctPool;
    const effectivePrice = expectedUSDC / parseFloat(bctAmount);
    const slippagePercent = Math.abs(((currentPrice - effectivePrice) / currentPrice) * 100).toFixed(2);
    return Number.isFinite(slippagePercent) ? slippagePercent : '0.00';
  };
  const slippage = calculateSlippage();

  // Calculate advanced stats
  const priceImpact = bctAmount && poolState.bctPool
    ? ((parseFloat(bctAmount) / (poolState.bctPool + parseFloat(bctAmount))) * 100).toFixed(2)
    : '0.00';
  const poolShare = bctBalance && poolState.bctPool
    ? ((bctBalance / (poolState.bctPool + bctBalance)) * 100).toFixed(2)
    : '0.00';
  const totalBCTSold = sellTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalUSDCEarned = sellTransactions.reduce((sum, tx) => sum + Number(tx.secondaryAmount || 0), 0);
  const avgSellPrice = totalBCTSold ? (totalUSDCEarned / totalBCTSold).toFixed(3) : '0.000';
  const maxSell = sellTransactions.length
    ? Math.max(...sellTransactions.map((tx) => Number(tx.amount || 0)))
    : 0;
  const poolDepth = poolState.bctPool ? (poolState.usdcPool / poolState.bctPool).toFixed(3) : '0.000';
  const recentSells = sellTransactions.filter((tx) => {
    const txTime = new Date(tx.timestamp).getTime();
    const now = Date.now();
    return now - txTime < 24 * 60 * 60 * 1000; // Last 24 hours
  }).length;

  const getStatusBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30';
      case 'error':
        return 'border-red-500/30';
      default:
        return 'border-gray-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-cyan-950 to-blue-950 pt-20 relative overflow-hidden font-sans"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://source.unsplash.com/random/1920x1080/?futuristic')] opacity-10 bg-cover bg-center" />
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-cyan-400/20 rounded-full animate-float"
            style={{
              width: `${Math.random() * 15 + 5}px`,
              height: `${Math.random() * 15 + 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
        <div className="absolute inset-0 opacity-20">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute border border-cyan-500/30 rounded-[12px] rotate-45 animate-pulse"
              style={{
                width: '40px',
                height: '40px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Market Ticker */}
      <motion.div
        className="bg-gray-900/80 backdrop-blur-md border-b border-cyan-500/30 py-3 overflow-hidden mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="flex space-x-12 whitespace-nowrap text-cyan-400 text-sm font-mono px-6"
        >
          <span>BCT Price: {bctPrice.toFixed(3)} USDC</span>
          <span>USDC Price: {usdcPrice.toFixed(3)} BCT</span>
          <span>USDC Pool: {poolState.usdcPool} USDC</span>
          <span>BCT Pool: {poolState.bctPool} BCT</span>
          <span>Invariant K: {poolState.invariant}</span>
          <span>Total BCT Sold: {totalBCTSold} BCT</span>
          <span>Avg Sell Price: {avgSellPrice} USDC</span>
        </motion.div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl font-extrabold text-cyan-400 tracking-tight flex items-center justify-center gap-3">
            <span>Sell BCT</span>
            <svg className="w-10 h-10 text-cyan-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </h2>
          <p className="text-gray-300 mt-3 text-lg">Trade your BCT for USDC on our AMM-powered market</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sell Form */}
          <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} glareEnable={true} glareMaxOpacity={0.3} glareColor="#00ffff">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-8 border border-cyan-500/30 shadow-[0_0_40px_rgba(0,255,255,0.3)] col-span-1"
            >
              <h3 className="text-2xl font-semibold text-cyan-400 mb-6 flex items-center gap-2">
                Sell BCT for USDC
                <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </h3>
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Firm Address
                </label>
                <p className="text-gray-400 text-sm font-mono bg-gray-900/50 px-4 py-3 rounded-lg border border-cyan-500/50 truncate">
                  {walletAddress || 'Not connected'}
                </p>
                <p className="text-gray-400 text-xs mt-1">Using wallet address for transactions</p>
              </div>
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="sellBCTAmount">
                  BCT Amount
                </label>
                <input
                  id="sellBCTAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={bctAmount}
                  onChange={(e) => setBctAmount(e.target.value)}
                  placeholder="Enter BCT amount to sell"
                  className="w-full px-4 py-3 bg-gray-900/50 text-white border border-cyan-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all"
                  aria-label="BCT amount"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Available: <span className="font-mono text-cyan-400">{bctBalance} BCT</span>
                </p>
              </div>
              <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-cyan-500/20">
                <p className="text-gray-300 text-sm">
                  Expected USDC: <span className="text-cyan-400 font-bold">{expectedUSDC} USDC</span>
                </p>
                <p className="text-gray-300 text-sm">
                  Price Impact: <span className="text-cyan-400 font-bold">{priceImpact}%</span>
                </p>
                <p className="text-gray-300 text-sm">
                  Slippage: <span className="text-cyan-400 font-bold">{slippage}%</span>
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,255,255,0.8)' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSell}
                disabled={isLoading || !walletAddress}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-cyan-600 hover:to-blue-700 transition relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? 'Processing...' : 'Sell BCT'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-cyan-400/30 animate-pulse" />
              </motion.button>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`mt-6 p-4 rounded-lg text-center ${
                    status.type === 'success' ? 'bg-cyan-600/20 text-cyan-300' : 'bg-red-600/20 text-red-300'
                  } border ${getStatusBorderColor(status.type)}`}
                >
                  <span className="block animate-pulse">{status.message}</span>
                </motion.div>
              )}
            </motion.div>
          </Tilt>

          {/* Graphs and Stats */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="col-span-2 space-y-8"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20 text-center relative group"
                >
                  <p className="text-gray-300 font-medium">BCT Price</p>
                  <p className="text-cyan-400 text-2xl font-bold">{bctPrice.toFixed(3)} USDC</p>
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Current price of 1 BCT in USDC</span>
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20 text-center relative group"
                >
                  <p className="text-gray-300 font-medium">Your BCT Balance</p>
                  <p className="text-cyan-400 text-2xl font-bold">{bctBalance} BCT</p>
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Your available BCT</span>
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20 text-center relative group"
                >
                  <p className="text-gray-300 font-medium">Your USDC Balance</p>
                  <p className="text-cyan-400 text-2xl font-bold">{usdcBalance} USDC</p>
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Your available USDC</span>
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20 text-center relative group"
                >
                  <p className="text-gray-300 font-medium">Total BCT Sold</p>
                  <p className="text-cyan-400 text-2xl font-bold">{totalBCTSold} BCT</p>
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Total BCT sold across all transactions</span>
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20 text-center relative group"
                >
                  <p className="text-gray-300 font-medium">Avg Sell Price</p>
                  <p className="text-cyan-400 text-2xl font-bold">{avgSellPrice} USDC</p>
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Average price per BCT sold</span>
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/20 text-center relative group"
                >
                  <p className="text-gray-300 font-medium">Pool Depth</p>
                  <p className="text-cyan-400 text-2xl font-bold">{poolDepth} USDC/BCT</p>
                  <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">USDC per BCT in the pool</span>
                  </div>
                </motion.div>
              </Tilt>
            </div>

            {/* Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30"
                >
                  <h4 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    BCT/USDC Price Trend
                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </h4>
                  <div className="relative h-80">
                    <canvas id="priceChart" />
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30"
                >
                  <h4 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    Pool Liquidity
                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    </svg>
                  </h4>
                  <div className="relative h-80">
                    <canvas id="liquidityChart" />
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30"
                >
                  <h4 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    Sell Volume
                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </h4>
                  <div className="relative h-80">
                    <canvas id="volumeChart" />
                  </div>
                </motion.div>
              </Tilt>
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30"
                >
                  <h4 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    Sell Distribution by Firm
                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    </svg>
                  </h4>
                  <div className="relative h-80">
                    <canvas id="distributionChart" />
                  </div>
                </motion.div>
              </Tilt>
            </div>

            {/* Advanced Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30"
            >
              <h4 className="text-xl font-semibold text-cyan-400 mb-4">Advanced AMM Statistics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative group">
                  <p className="text-gray-300">Price Impact</p>
                  <p className="text-cyan-400 font-bold">{priceImpact}%</p>
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Price change due to trade size</span>
                  </div>
                </div>
                <div className="relative group">
                  <p className="text-gray-300">Slippage</p>
                  <p className="text-cyan-400 font-bold">{slippage}%</p>
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Potential price difference</span>
                  </div>
                </div>
                <div className="relative group">
                  <p className="text-gray-300">Pool Share</p>
                  <p className="text-cyan-400 font-bold">{poolShare}%</p>
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Your hypothetical pool share</span>
                  </div>
                </div>
                <div className="relative group">
                  <p className="text-gray-300">Pool Reserves</p>
                  <p className="text-cyan-400 font-bold">{poolState.usdcPool} USDC / {poolState.bctPool} BCT</p>
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Current pool liquidity</span>
                  </div>
                </div>
                <div className="relative group">
                  <p className="text-gray-300">Largest Sell</p>
                  <p className="text-cyan-400 font-bold">{maxSell} BCT</p>
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Largest single sell transaction</span>
                  </div>
                </div>
                <div className="relative group">
                  <p className="text-gray-300">Recent Sells (24h)</p>
                  <p className="text-cyan-400 font-bold">{recentSells}</p>
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-400 bg-gray-800/80 p-2 rounded">Sell transactions in last 24 hours</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sell History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/80 backdrop-blur-md rounded-2xl px-8 py-12 border border-cyan-500/30"
            >
              <h4 className="text-xl font-semibold text-cyan-400 mb-6 flex items-center gap-2">
                Sell Transaction History
                <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </h4>
              <SellHistory transactions={sellTransactions} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default Sell;