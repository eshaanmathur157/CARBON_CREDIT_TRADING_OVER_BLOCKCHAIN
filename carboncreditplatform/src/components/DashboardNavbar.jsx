import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { WalletContext } from '../contexts/WalletContext';

function DashboardNavbar() {
  const { walletAddress } = useContext(WalletContext);
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    if (!walletAddress) {
      alert('Please connect a wallet to proceed');
      return;
    }
    navigate(path);
  };

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md border-b border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)] z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-green-400">CarbonTrust Dashboard</div>
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(34,197,94,0.7)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('/mint')}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition relative overflow-hidden"
            >
              <span className="relative z-10">Mint BCT</span>
              <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(34,197,94,0.7)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('/retire')}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition relative overflow-hidden"
            >
              <span className="relative z-10">Retire BCT</span>
              <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(34,197,94,0.7)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('/sell')}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition relative overflow-hidden"
            >
              <span className="relative z-10">Sell BCT</span>
              <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(34,197,94,0.7)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('/buy')}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition relative overflow-hidden"
            >
              <span className="relative z-10">Buy BCT</span>
              <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(34,197,94,0.7)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('/stake')}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition relative overflow-hidden"
            >
              <span className="relative z-10">Stake BCT</span>
              <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 10px rgba(34,197,94,0.7)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('/kmlupload')}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition relative overflow-hidden"
            >
              <span className="relative z-10">Claim your TCO2</span>
              <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
            </motion.button>
      
            
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

export default DashboardNavbar;