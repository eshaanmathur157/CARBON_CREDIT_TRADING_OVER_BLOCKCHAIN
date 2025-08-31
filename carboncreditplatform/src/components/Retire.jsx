import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletContext } from '../contexts/WalletContext';
import { retireBCT, getTierPoolCredits } from '../utils/blockchain';
import { Flame, Sparkles, TrendingUp, Zap, Award, Star } from 'lucide-react';
import FirmCreditDetails from './FirmCreditDetails';

const Retire = () => {
  const { walletAddress } = useContext(WalletContext);
  const [totalAmount, setTotalAmount] = useState(100);
  const [allocations, setAllocations] = useState({
    platinum: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
    grey: 0
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [poolCredits, setPoolCredits] = useState({});

  const tierConversionRates = {
    platinum: 150,
    gold: 125,
    silver: 100,
    bronze: 75,
    grey: 50
  };

  const tiers = [
    { name: 'platinum', label: 'Platinum', icon: Award, rate: 150 },
    { name: 'gold', label: 'Gold', icon: Star, rate: 125 },
    { name: 'silver', label: 'Silver', icon: Sparkles, rate: 100 },
    { name: 'bronze', label: 'Bronze', icon: TrendingUp, rate: 75 },
    { name: 'grey', label: 'Grey', icon: Zap, rate: 50 }
  ];

  const priorityAmount = Math.floor(totalAmount * 0.4);
  const generalAmount = totalAmount - priorityAmount;
  const totalBCTAllocated = Object.entries(allocations).reduce((sum, [tier, count]) => sum + (count * tierConversionRates[tier]), 0);

  // Fetch available pool credits on mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const credits = await getTierPoolCredits();
        setPoolCredits(credits);
      } catch (error) {
        console.error('Error fetching pool credits:', error);
        setStatus({ message: `Error fetching ${error.message}`, type: 'error' });
      }
    };
    fetchCredits();
  }, []);

  // Validate allocation including pool credits
  const isValidAllocation = () => {
    if (totalAmount <= 0) return false;
    if (totalBCTAllocated === 0) return false;
    if (totalBCTAllocated > priorityAmount) return false;
    
    // Check if each tier allocation exceeds available TCO2 credits in pool
    for (const tier of tiers) {
      const requestedTCO2 = allocations[tier.name]; // This is the number of TCO2 credits requested
      const availableTCO2 = poolCredits[tier.name]?.priorityReserveCount || 0;
      if (requestedTCO2 > availableTCO2) {
        return false;
      }
    }
    return true;
  };

  // Update status based on allocation and pool credits - Fixed logic
  const updateStatus = () => {
    if (totalAmount <= 0) {
      setStatus({ message: 'Please enter a valid total BCT amount', type: 'error' });
      return;
    }

    if (totalBCTAllocated > priorityAmount) {
      setStatus({ 
        message: `❌ Allocation exceeds priority limit. Allocated: ${totalBCTAllocated}, Maximum: ${priorityAmount}`, 
        type: 'error' 
      });
      return;
    }
  };

  useEffect(() => {
    updateStatus();
  }, [totalAmount, allocations, totalBCTAllocated, priorityAmount, poolCredits]);

  const handleAllocationChange = (tier, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setAllocations(prev => ({
      ...prev,
      [tier]: numValue
    }));
  };

  const handleRetire = async () => {
    if (!walletAddress) {
      setStatus({ message: 'Please connect your wallet first', type: 'error' });
      return;
    }

    if (!isValidAllocation()) {
      setStatus({ message: 'Please fix allocation errors before retiring', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await retireBCT(
        walletAddress,
        totalAmount,
        allocations.platinum,
        allocations.gold,
        allocations.silver,
        allocations.bronze,
        allocations.grey,
        40
      );

      setStatus({ 
        message: `🎉 Successfully retired ${totalAmount} BCT tokens! (${totalBCTAllocated} priority, ${generalAmount} general)`, 
        type: 'success' 
      });

      // Reset form
      setTotalAmount(100);
      setAllocations({
        platinum: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        grey: 0
      });

    } catch (error) {
      setStatus({ 
        message: `❌ Error: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const distributeEvenly = () => {
    const targetBCT = priorityAmount;
    const totalWeight = tiers.reduce((sum, tier) => sum + tier.rate, 0);
    const newAllocations = {};
    
    tiers.forEach(tier => {
      const proportion = tier.rate / totalWeight;
      const availableTCO2 = poolCredits[tier.name]?.priorityReserveCount || 0;
      const maxAllowed = availableTCO2; // Max TCO2 tokens we can allocate
      const calculated = Math.floor((targetBCT * proportion) / tier.rate);
      newAllocations[tier.name] = Math.min(calculated, maxAllowed);
    });
    
    setAllocations(newAllocations);
  };

  const isButtonEnabled = walletAddress && isValidAllocation() && !isLoading;

  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'from-slate-400 to-slate-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-300 to-gray-500';
      case 'bronze': return 'from-orange-400 to-orange-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-blue-950 pt-20 relative overflow-hidden"
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-blue-900/20" />
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-emerald-400/10 rounded-full blur-sm"
            style={{
              width: `${Math.random() * 20 + 10}px`,
              height: `${Math.random() * 20 + 10}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-[linear-gradient(rgba(34,197,94,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.h1 
            className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-blue-400 tracking-tight mb-4"
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity,
              ease: "linear"
            }}
          >
            Retire BCT Tokens
          </motion.h1>
          <motion.p 
            className="text-gray-300 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Transform your BCT tokens into carbon credits across premium tiers with precision allocation
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="grid lg:grid-cols-2 gap-8"
        >
          {/* Left Panel - Configuration */}
          <div className="space-y-6">
            {/* Total Amount Card */}
            <motion.div
              className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)] p-6"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-400">Total BCT Amount</h2>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-6 py-4 bg-gray-800/50 border border-emerald-500/30 rounded-xl text-white text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                  placeholder="Enter BCT amount"
                  min="0"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                  BCT
                </div>
              </div>
            </motion.div>

            {/* Priority Pool Summary */}
            <motion.div
              className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)] p-6"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-400">Priority Pool Summary</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl border border-emerald-500/30">
                  <span className="text-emerald-300 font-semibold">Priority Amount (40%)</span>
                  <span className="text-emerald-400 font-bold text-xl">{priorityAmount} BCT</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl border border-blue-500/30">
                  <span className="text-blue-300 font-semibold">General Amount (60%)</span>
                  <span className="text-blue-400 font-bold text-xl">{generalAmount} BCT</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl border border-purple-500/30">
                  <span className="text-purple-300 font-semibold">BCT Allocated</span>
                  <span className="text-purple-400 font-bold text-xl">{totalBCTAllocated} BCT</span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)] p-6"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-bold text-emerald-400 mb-4">Quick Actions</h3>
              <div className="flex gap-3">
                <motion.button
                  onClick={distributeEvenly}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(236, 72, 153, 0.5)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  Distribute Evenly
                </motion.button>
                <motion.button
                  onClick={() => setAllocations({ platinum: 0, gold: 0, silver: 0, bronze: 0, grey: 0 })}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl text-white font-semibold"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(107, 114, 128, 0.5)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear All
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Right Panel - Tier Allocations */}
          <div className="space-y-4">
            <motion.div
              className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)] p-6"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <h4 className="text-2xl font-bold text-emerald-400 mb-6 text-center">🎯 Priority Tier Allocation</h4>
              <div className="space-y-4">
                {tiers.map((tier) => {
                  const availableTCO2 = poolCredits[tier.name]?.priorityReserveCount || 0;
                  const requestedTCO2 = allocations[tier.name];
                  const hasError = requestedTCO2 > availableTCO2;
                  
                  return (
                    <motion.div
                      key={tier.name}
                      className={`bg-gradient-to-r ${getTierColor(tier.name)} p-4 rounded-xl shadow-lg ${hasError ? 'ring-2 ring-red-500' : ''}`}
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <tier.icon className="w-6 h-6 text-white" />
                        <div>
                          <span className="text-white font-bold text-lg">{tier.label}</span>
                          <span className="text-white/80 text-sm ml-2">{tier.rate} BCT/TCO2</span>
                          <div className="text-white/80 text-sm">
                            Available: {availableTCO2} TCO2 credits
                          </div>
                          {hasError && (
                            <div className="text-red-200 text-sm font-semibold">
                              ⚠️ Exceeds available TCO2 credits!
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={availableTCO2}
                        value={allocations[tier.name]}
                        onChange={(e) => handleAllocationChange(tier.name, e.target.value)}
                        className={`w-full px-4 py-2 bg-gray-800/50 border ${hasError ? 'border-red-500' : 'border-emerald-500/30'} rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400`}
                        placeholder="0"
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Retirement Warning */}
              <motion.div
                className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-orange-500/30 flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <span className="text-2xl text-orange-400">⚠️</span>
                <span className="text-orange-300 font-medium">
                  BCT retirement is permanent and cannot be undone. Please verify your allocation carefully.
                </span>
              </motion.div>

              {/* Status Section */}
              <AnimatePresence>
                {status.message && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`mt-4 p-4 rounded-xl text-center font-semibold ${
                      status.type === 'success' 
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' 
                        : status.type === 'error'
                        ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                        : status.type === 'warning'
                        ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                        : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {status.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Retire Button */}
            <motion.button
              onClick={handleRetire}
              disabled={!isButtonEnabled}
              className={`w-full py-6 px-8 rounded-xl font-bold text-xl transition-all duration-300 ${
                !isButtonEnabled
                  ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed border border-gray-600/30'
                  : 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white border border-orange-500/30'
              }`}
              whileHover={isButtonEnabled ? { scale: 1.05, boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' } : {}}
              whileTap={isButtonEnabled ? { scale: 0.95 } : {}}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Retiring BCT...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Flame className="w-6 h-6" />
                  🔥 Retire BCT Tokens
                  <Flame className="w-6 h-6" />
                </div>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
      <FirmCreditDetails />
    </motion.div>
  );
};

export default Retire;