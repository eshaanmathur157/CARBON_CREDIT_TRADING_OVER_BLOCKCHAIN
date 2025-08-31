import React, { useState, useContext, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { WalletContext } from '../contexts/WalletContext';
import { mintBCT, getAvailableTCO2, getTransactionHistory, getFirmBCTBalance } from '../utils/blockchain';
import { useInView } from 'react-intersection-observer';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Mint() {
  const { walletAddress } = useContext(WalletContext);
  const [firmAddress, setFirmAddress] = useState(walletAddress || '');
  const [tiers, setTiers] = useState({
    Platinum: 0,
    Gold: 0,
    Silver: 0,
    Bronze: 0,
    Grey: 0,
  });
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTCO2, setAvailableTCO2] = useState(null);
  const [bctBalance, setBctBalance] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const controls = useAnimation();
  const [historyRef, historyInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  // Fake market data for ticker
  const marketData = [
    'BCT: $12.34 +2.5% | 24h Vol: 1.2M',
    'USDC/BCT: 0.0812 -1.3% | Liquidity: $5.6M',
    'TCO2 Pool: 10,234 TCO2 | Depth: $3.2M',
  ];

  // Fake trade alerts
  const tradeAlerts = [
    '100 BCT minted @ $12.34',
    '50 Platinum TCO2 traded @ $15.67',
    '200 BCT swapped for USDC @ 0.082',
  ];

  useEffect(() => {
    setFirmAddress(walletAddress || '');
    if (walletAddress) {
      fetchAvailableTCO2(walletAddress);
      fetchTransactionHistory(walletAddress);
      fetchBCTBalance(walletAddress);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (historyInView && walletAddress) {
      fetchTransactionHistory(walletAddress);
    }
  }, [historyInView, walletAddress]);

  const fetchAvailableTCO2 = async (address) => {
    try {
      const result = await getAvailableTCO2(address);
      if (result.success) {
        setAvailableTCO2(result.data);
      } else {
        setStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Error fetching available TCO2: ${error.message}` });
    }
  };

  const fetchBCTBalance = async (address) => {
    try {
      const result = await getFirmBCTBalance(address);
      if (result.success) {
        setBctBalance(result.data);
      } else {
        setStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Error fetching BCT balance: ${error.message}` });
    }
  };

  const fetchTransactionHistory = async (address) => {
    try {
      const result = await getTransactionHistory();
      if (result.success) {
        const mintTxs = result.data.filter((tx) => tx.type === 'Mint');
        setTransactionHistory(mintTxs);
      } else {
        setStatus({ type: 'error', message: result.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Error fetching transaction history: ${error.message}` });
    }
  };

  const handleTierChange = (tier, value) => {
    setTiers((prev) => ({ ...prev, [tier]: Math.max(0, parseInt(value) || 0) }));
  };

  const handleMint = async () => {
    if (!walletAddress) {
      setStatus({ type: 'error', message: 'Connect a wallet to proceed' });
      return;
    }
    setIsLoading(true);
    setStatus(null);
    setResults(null);
    try {
      const result = await mintBCT(firmAddress, tiers);
      const calculatedBCT = (
        150 * (tiers.Platinum || 0) +
        125 * (tiers.Gold || 0) +
        100 * (tiers.Silver || 0) +
        75 * (tiers.Bronze || 0) +
        50 * (tiers.Grey || 0)
      );
      setStatus({ 
        type: result.status, 
        message: `Successfully minted: ${calculatedBCT} BCT`
      });
      setResults(result.results);
      controls.start({ scale: [1, 1.2, 1], transition: { duration: 0.3 } });
      await Promise.all([
        fetchAvailableTCO2(firmAddress),
        fetchTransactionHistory(firmAddress),
        fetchBCTBalance(firmAddress)
      ]);
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

  // Prepare chart data
  const bctMintedOverTime = {
    labels: transactionHistory.map((tx) => new Date(tx.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'BCT Minted',
        data: transactionHistory.map((tx) => tx.amount),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const tco2ByTier = {
    labels: ['Platinum', 'Gold', 'Silver', 'Bronze', 'Grey'],
    datasets: [
      {
        label: 'TCO2 Used by Tier',
        data: ['Platinum', 'Gold', 'Silver', 'Bronze', 'Grey'].map(
          (tier) =>
            transactionHistory
              .filter((tx) => tx.detail.includes(tier))
              .reduce((sum, tx) => sum + tx.secondaryAmount, 0)
        ),
        backgroundColor: [
          'rgba(229, 228, 226, 0.8)', // Platinum
          'rgba(255, 215, 0, 0.8)',   // Gold
          'rgba(192, 192, 192, 0.8)', // Silver
          'rgba(205, 127, 50, 0.8)',  // Bronze
          'rgba(128, 128, 128, 0.8)', // Grey
        ],
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'rgba(209, 213, 219, 1)' } },
      title: { display: true, color: 'rgba(209, 213, 219, 1)' },
    },
    scales: {
      x: { ticks: { color: 'rgba(209, 213, 219, 1)' }, grid: { color: 'rgba(75, 85, 99, 0.2)' } },
      y: { ticks: { color: 'rgba(209, 213, 219, 1)' }, grid: { color: 'rgba(75, 85, 99, 0.2)' } },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-blue-950 pt-20 relative overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://source.unsplash.com/random/1920x1080/?cyber')] opacity-10 bg-cover bg-center" />
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
        {/* Hexagon Grid */}
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

      {/* Market Ticker */}
      <div className="bg-gray-900/80 backdrop-blur-md border-b border-green-500/30 py-2 overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-100%'] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          className="flex space-x-8 whitespace-nowrap text-green-400 text-sm font-mono"
        >
          {marketData.map((item, index) => (
            <span key={index}>{item}</span>
          ))}
          {marketData.map((item, index) => (
            <span key={`dup-${index}`}>{item}</span>
          ))}
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-extrabold text-green-400 tracking-tight flex items-center justify-center gap-2">
            <span>Execute Your Green Trade</span>
            <svg className="w-8 h-8 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </h2>
          <p className="text-gray-300 mt-2">Mint BCT tokens from your TCO2 credits on the CarbonTrust Market</p>
        </motion.div>

        {/* BCT Balance Display */}
        {bctBalance !== null && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-12 bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/30"
          >
            <h4 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
              Firm BCT Balance
              <svg className="w-5 h-5 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </h4>
            <p className="text-green-400 text-2xl font-bold text-center">{bctBalance} BCT</p>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
        >
          {/* Firm Address Input */}
          <div className="mb-8">
            <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="firmAddress">
              Firm Address (Trading Account)
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
                Use Connected Wallet
              </motion.button>
            </div>
            <p id="firmAddressHelp" className="text-gray-400 text-xs mt-1">
              Must match your connected wallet: <span className="font-mono text-green-400">{walletAddress || 'Not connected'}</span>
            </p>
          </div>

          {/* Tier Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Object.keys(tiers).map((tier) => (
              <motion.div
                key={tier}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 * Object.keys(tiers).indexOf(tier), duration: 0.4 }}
                className="relative group"
              >
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor={`tier-${tier}`}>
                  {tier} TCO2 Order
                </label>
                <input
                  id={`tier-${tier}`}
                  type="number"
                  min="0"
                  value={tiers[tier]}
                  onChange={(e) => handleTierChange(tier, e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 text-white border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all"
                  aria-label={`${tier} TCO2 amount`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />
              </motion.div>
            ))}
          </div>

          {/* Mint Button */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34,197,94,0.8)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMint}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-blue-700 transition relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            animate={controls}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? 'Processing Trade...' : 'Mint BCT Trade'}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </span>
            <div className="absolute inset-0 bg-green-400/30 animate-pulse" />
            <div className="absolute inset-0 bg-[url('https://source.unsplash.com/random/100x100/?hologram')] opacity-10 bg-cover" />
          </motion.button>

          {/* Status Message */}
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
              } border border-${status.type === 'success' ? 'green' : status.type === 'warning' ? 'yellow' : 'red'}-500/30`}
            >
              <span className="block animate-pulse">{status.message}</span>
            </motion.div>
          )}

          {/* Results */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-8 bg-gray-900/70 backdrop-blur-sm rounded-xl p-6 border border-green-500/20"
            >
              <h4 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                Trade Execution Results
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </h4>
              <div className="space-y-3 text-gray-300">
                {results.map((result, index) => (
                  <motion.p
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    dangerouslySetInnerHTML={{ __html: result }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Available TCO2 */}
        {availableTCO2 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-12 bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/30"
          >
            <h4 className="text-xl font-semibold text-green-400 mb-6 flex items-center gap-2">
              Available TCO2 in Liquidity Pool
              <svg className="w-5 h-5 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(availableTCO2).map(([tier, amount]) => (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 * Object.keys(availableTCO2).indexOf(tier) }}
                  className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20 text-center"
                >
                  <p className="text-gray-300 font-medium">{tier}</p>
                  <p className="text-green-400 text-lg font-bold">{amount} TCO2</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Transaction History */}
        <motion.div
          ref={historyRef}
          initial={{ opacity: 0, y: 50 }}
          animate={historyInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.6 }}
          className="mt-12 bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/30"
        >
          <h4 className="text-xl font-semibold text-green-400 mb-6 flex items-center gap-2">
            Mint Transaction History
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
            </svg>
          </h4>
          {transactionHistory.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w unambigous-full text-gray-300">
                  <thead>
                    <tr className="border-b border-green-500/20">
                      <th className="py-2 px-4 text-left">Date</th>
                      <th className="py-2 px-4 text-left">Firm</th>
                      <th className="py-2 px-4 text-left">BCT Minted</th>
                      <th className="pyCGG-2 px-4 text-left">TCO2 Used</th>
                      <th className="py-2 px-4 text-left">Tier</th>
                      <th className="py-2 px-4 text-left">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionHistory.map((tx, index) => (
                      <motion.tr
                        key={tx.transactionHash}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border-b border-gray-700/50 hover:bg-green-500/10"
                      >
                        <td className="py-2 px-4">{new Date(tx.timestamp).toLocaleString()}</td>
                        <td className="py-2 px-4 font-mono text-green-400">
                          {`${tx.firm.slice(0, 6)}...${tx.firm.slice(-4)}`}
                        </td>
                        <td className="py-2 px-4">{tx.amount}</td>
                        <td className="py-2 px-4">{tx.secondaryAmount}</td>
                        <td className="py-2 px-4">{tx.detail.split(': ')[1]}</td>
                        <td className="py-2 px-4 font-mono text-green-400">
                          <a
                            href={`https://etherscan.io/tx/${tx.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {`${tx.transactionHash.slice(0, 6)}...${tx.transactionHash.slice(-4)}`}
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20"
                >
                  <Line
                    data={bctMintedOverTime}
                    options={{
                      ...chartOptions,
                      plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'BCT Minted Over Time' } },
                    }}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-900/50 p-4 rounded-lg border border-green-500/20"
                >
                  <Pie
                    data={tco2ByTier}
                    options={{
                      ...chartOptions,
                      plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'TCO2 Used by Tier' } },
                    }}
                  />
                </motion.div>
              </div>
            </div>
          ) : (
            <p className="text-gray-300 text-center">No mint transactions found.</p>
          )}
        </motion.div>

        {/* Trade Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="fixed bottom-4 right-4 space-y-2 max-w-xs"
        >
          {tradeAlerts.map((alert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.3, duration: 0.4 }}
              className="bg-green-600/20 text-green-300 p-3 rounded-lg border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
            >
              <span className="block text-sm font-mono">{alert}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Mint;