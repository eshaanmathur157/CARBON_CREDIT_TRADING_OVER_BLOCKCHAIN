import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { checkFirm, analyzeCredits, getPoolStatus, calculateTradePreview, showMarketInfo } from '../utils/blockchain';
import { WalletContext } from '../contexts/WalletContext';
import CreditHistory from './CreditHistory';
function Dashboard() {
  const { walletAddress } = useContext(WalletContext);
  const navigate = useNavigate();
  const [firmDetails, setFirmDetails] = useState(null);
  const [creditsAnalysis, setCreditsAnalysis] = useState([]);
  const [poolStatus, setPoolStatus] = useState(null);
  const [poolTier, setPoolTier] = useState('');
  const [marketData, setMarketData] = useState({ tradePreviews: null, marketInfo: null });
  const [isMarketLoading, setIsMarketLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFirmData = async () => {
    if (!walletAddress) {
      setStatus({ success: false, error: 'No wallet address found' });
      setIsLoading(false);
      return;
    }

    try {
      const firmResult = await checkFirm(walletAddress);
      setFirmDetails(firmResult);

      const creditsResult = await analyzeCredits(walletAddress);
      setCreditsAnalysis(creditsResult.success ? creditsResult.data : []);

      setStatus({ success: true, message: 'Data updated' });
    } catch (error) {
      setStatus({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetPoolStatus = async () => {
    if (!poolTier) {
      setStatus({ success: false, error: 'Please select a tier for pool status' });
      return;
    }

    try {
      const result = await getPoolStatus(poolTier);
      setPoolStatus(result);
      setStatus({ success: true, message: `Pool status for ${poolTier} retrieved` });
    } catch (error) {
      setStatus({ success: false, error: error.message });
    }
  };

  const fetchMarketData = async () => {
    setIsMarketLoading(true);
    try {
      const usdcToBct = await calculateTradePreview(false, 1);
      const bctToUsdc = await calculateTradePreview(true, 1);
      const marketInfo = await showMarketInfo();
      setMarketData({
        tradePreviews: { usdcToBct, bctToUsdc },
        marketInfo
      });
      setStatus({ success: true, message: 'Market data updated' });
    } catch (error) {
      setStatus({ success: false, error: `Failed to fetch market data: ${error.message}` });
    } finally {
      setIsMarketLoading(false);
    }
  };

  useEffect(() => {
    fetchFirmData();
    const interval = setInterval(fetchFirmData, 5000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const handleNavigate = (path) => {
    if (!walletAddress) {
      setStatus({ success: false, error: 'Please connect a wallet to proceed' });
      return;
    }
    navigate(path);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-blue-950 pt-20 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://source.unsplash.com/random/1920x1080/?nature')] opacity-10 bg-cover bg-center" />
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
              animationDuration: `${Math.random() * 10 + 10}s`
            }}
          />
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-extrabold text-green-400 tracking-tight">Firm Dashboard</h2>
          <p className="text-gray-300 mt-2">
            Wallet: <span className="font-mono text-green-400">{walletAddress || 'Not connected'}</span>
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Data updates every 5 seconds{' '}
            <span className="inline-block animate-pulse text-green-400">•</span>
          </p>
        </motion.div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center h-64"
          >
            <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Firm Details */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                <h3 className="text-2xl font-semibold text-white mb-6 flex items-center">
                  Firm Information{' '}
                  <span className="ml-2 text-green-400 animate-pulse">↻</span>
                </h3>
                {firmDetails ? (
                  <div className="text-gray-300 space-y-3">
                    <p><strong>Address:</strong> <span className="font-mono">{firmDetails.address}</span></p>
                    <p><strong>Registered:</strong> {firmDetails.registered ? 'Yes' : 'No'}</p>
                    {firmDetails.registered ? (
                      <>
                        <p><strong>Reputation:</strong> {firmDetails.reputation}</p>
                        <p><strong>BCT Balance:</strong> {firmDetails.bctBalance}</p>
                        {/* <p><strong>Contribution Ratio:</strong> {firmDetails.contributionRatio}</p> */}
                        <p><strong>Average Contribution Tier:</strong> {firmDetails.averageContributionTier}</p>
                        <p><strong>Total TCO2 Deposited:</strong> {firmDetails.totalTCO2Deposited}</p>
                        {/* <p><strong>Credits:</strong> {firmDetails.ownedCredits}</p> */}
                      </>
                    ) : (
                      <p className="text-red-400">This firm is not registered.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">Unable to load firm details.</p>
                )}
              </motion.div>

              {/* Credits Analysis */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                <h3 className="text-2xl font-semibold text-white mb-6">Credits Analysis</h3>
                {creditsAnalysis.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-300">
                      <thead>
                        <tr className="border-b border-green-500/20">
                          <th className="py-3 px-4">Tier</th>
                          <th className="py-3 px-4">Credits</th>
                          <th className="py-3 px-4">Available TCO2</th>
                          {/* <th className="py-3 px-4">Credit IDs</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {creditsAnalysis.map((tier, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 * index }}
                            whileHover={{ backgroundColor: 'rgba(34,197,94,0.1)' }}
                            className="border-b border-green-500/10"
                          >
                            <td className="py-3 px-4">{tier.tier}</td>
                            <td className="py-3 px-4">{tier.num}</td>
                            <td className="py-3 px-4">{tier.available}</td>
                            {/* <td className="py-3 px-4">{tier.ids}</td> */}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">No credits data available.</p>
                )}
              </motion.div>
            </div>

            {/* Pool Status Section */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)] mb-12"
            >
              <h3 className="text-2xl font-semibold text-white mb-8 text-center">Tier Pools</h3>
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="poolTier">
                    Tier
                  </label>
                  <select
                    id="poolTier"
                    value={poolTier}
                    onChange={(e) => setPoolTier(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 text-white border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="">Select a tier</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Grey">Grey</option>
                  </select>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(34,197,94,0.5)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetPoolStatus}
                  className="w-full bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition"
                >
                  Get Status
                </motion.button>
                {poolStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-6 text-gray-300"
                  >
                    <h4 className="text-lg font-semibold text-white mb-3">{poolStatus.tier} Pool Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <p><strong>General Pool:</strong> {poolStatus.generalPoolCount}</p>
                      <p><strong>Priority Reserve:</strong> {poolStatus.priorityReserveCount}</p>
                      <p><strong>Tier Capacity:</strong> {poolStatus.totalCapacity}</p>
                      <p><strong>Conversion Rate:</strong> {poolStatus.conversionRate} BCT/TCO2</p>
                    </div>
                  
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Market & Prices Section */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)] mb-12 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 opacity-50" />
              <h3 className="text-3xl font-extrabold text-green-400 mb-8 text-center relative z-10">
                Market & Prices
                <span className="block text-sm text-gray-400 font-normal mt-1">Live BCT/USDC Exchange</span>
              </h3>
              <div className="max-w-5xl mx-auto relative z-10">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34,197,94,0.7)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchMarketData}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-full font-semibold hover:from-green-600 hover:to-green-700 transition mb-8 relative overflow-hidden"
                  disabled={isMarketLoading}
                >
                  {isMarketLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Updating Market...
                    </span>
                  ) : (
                    <span className="relative z-10">Refresh Market Data</span>
                  )}
                  <div className="absolute inset-0 bg-green-400/30 animate-pulse" />
                </motion.button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  

                  {/* Market Info */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-4">Market Info</h4>
                    <div className="space-y-4">
                      <div className="bg-gray-900/70 p-6 rounded-lg border border-green-400/30">
                        <h5 className="text-lg font-medium text-green-400 mb-4">Pool Liquidity</h5>
                        {marketData.marketInfo?.success ? (
                          <div className="space-y-3">
                            <div>
                              <p className="text-gray-300">USDC Pool</p>
                              <div className="w-full bg-gray-800 rounded-full h-3 mt-1">
                                <motion.div
                                  className="bg-green-500 h-3 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(Number(marketData.marketInfo.liquidity.usdcPool) / 1000000 * 100, 100)}%` }}
                                  transition={{ duration: 1 }}
                                />
                              </div>
                              <p className="text-white mt-1">{marketData.marketInfo.liquidity.usdcPool} USDC</p>
                            </div>
                            <div>
                              <p className="text-gray-300">BCT Pool</p>
                              <div className="w-full bg-gray-800 rounded-full h-3 mt-1">
                                <motion.div
                                  className="bg-green-500 h-3 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(Number(marketData.marketInfo.liquidity.bctPool) / 1000000 * 100, 100)}%` }}
                                  transition={{ duration: 1 }}
                                />
                              </div>
                              <p className="text-white mt-1">{marketData.marketInfo.liquidity.bctPool} BCT</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-red-400">{marketData.marketInfo?.error || 'Loading...'}</p>
                        )}
                      </div>
                      <div className="bg-gray-900/70 p-6 rounded-lg border border-green-400/30">
                        <h5 className="text-lg font-medium text-green-400 mb-2">Current Prices</h5>
                        {marketData.marketInfo?.success ? (
                          <div className="space-y-2">
                            <p className="text-white">
                              1 BCT = <span className="text-green-400 font-bold">{marketData.marketInfo.prices.bctToUsdc} USDC</span>
                            </p>
                            <p className="text-white">
                              1 USDC = <span className="text-green-400 font-bold">{marketData.marketInfo.prices.usdcToBct} BCT</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-red-400">{marketData.marketInfo?.error || 'Loading...'}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* BCT Actions Section */}
            
          </>
        )}

        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`mt-8 p-4 rounded-lg text-center max-w-2xl mx-auto ${
              status.success ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'
            }`}
          >
            {status.success ? status.message : `Error: ${status.error}`}
          </motion.div>

        )}
        <CreditHistory />
      </div>
    </motion.div>
  );
}

export default Dashboard;