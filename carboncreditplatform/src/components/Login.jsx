import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { handleLogin } from '../utils/auth';
import { connectTo } from '../utils/blockchain';
import { WalletContext } from '../contexts/WalletContext';

function Login() {
  const [walletAddress, setWalletAddress] = useState('');
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setWalletAddress: setGlobalWalletAddress } = useContext(WalletContext);
  const navigate = useNavigate();

  const handleConnect = async () => {
    if (!walletAddress) {
      setStatus({ success: false, error: 'Please enter a wallet address' });
      return;
    }

    setIsLoading(true);
    try {
      // Authenticate wallet
      const authResult = await handleLogin(walletAddress);
      if (!authResult.success) {
        throw new Error(authResult.error);
      }

      // Connect to blockchain
      const connectResult = await connectTo('http://localhost:8545'); // Default Ganache URL
      if (!connectResult.success) {
        throw new Error(connectResult.error);
      }

      // Store wallet address in context and navigate to dashboard
      setGlobalWalletAddress(walletAddress);
      setStatus(authResult);
      navigate('/dashboard');
    } catch (error) {
      setStatus({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-green-950 to-blue-950 pt-20 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://source.unsplash.com/random/1920x1080/?nature')] opacity-10 bg-cover bg-center" />
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 bg-gray-800/80 backdrop-blur-md rounded-xl p-8 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
      >
        <h2 className="text-3xl font-extrabold text-green-400 text-center mb-6">Firm Login</h2>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="walletAddress">
            Wallet Address
          </label>
          <input
            id="walletAddress"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter your wallet address"
            className="w-full px-4 py-3 bg-gray-900/50 text-white border border-green-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(34,197,94,0.5)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleConnect}
          disabled={isLoading}
          className={`w-full bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet to Ganache'}
        </motion.button>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`mt-6 p-4 rounded-lg text-center ${
              status.success ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'
            }`}
          >
            {status.success
              ? `Success! Wallet: ${status.walletAddress} (Balance: ${status.balance} ETH)`
              : `Error: ${status.error}`}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default Login;