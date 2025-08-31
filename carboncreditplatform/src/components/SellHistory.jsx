import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { connectTo, getTransactionHistory } from '../utils/blockchain';

function SellHistory() {
  const [sellTransactions, setSellTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  connectTo();
  useEffect(() => {
    fetchSellHistory();
    const interval = setInterval(fetchSellHistory, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, sellTransactions, sortBy, sortOrder]);

  const fetchSellHistory = async () => {
    try {
      setIsLoading(true);
      const result = await getTransactionHistory();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transaction history');
      }
      
      const transactions = result.data || [];
      const sells = transactions.filter((tx) => tx.type === 'Sell');
      setSellTransactions(sells);
      setError(null);
    } catch (err) {
      console.error('Error fetching sell history:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...sellTransactions];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.firm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.transactionHash?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort transactions
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'amount':
          aVal = Number(a.amount || 0);
          bVal = Number(b.amount || 0);
          break;
        case 'secondaryAmount':
          aVal = Number(a.secondaryAmount || 0);
          bVal = Number(b.secondaryAmount || 0);
          break;
        case 'price':
          aVal = Number(a.amount || 0) > 0 ? Number(a.secondaryAmount || 0) / Number(a.amount || 0) : 0;
          bVal = Number(b.amount || 0) > 0 ? Number(b.secondaryAmount || 0) / Number(b.amount || 0) : 0;
          break;
        case 'firm':
          aVal = a.firm || '';
          bVal = b.firm || '';
          break;
        case 'timestamp':
        default:
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      } else {
        return typeof aVal === 'string' ? bVal.localeCompare(aVal) : bVal - aVal;
      }
    });

    setFilteredTransactions(filtered);
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatNumber = (num) => {
    return Number(num || 0).toFixed(3);
  };

  const calculatePrice = (amount, secondaryAmount) => {
    const amt = Number(amount || 0);
    const secAmt = Number(secondaryAmount || 0);
    return amt > 0 ? (secAmt / amt).toFixed(3) : '0.000';
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const totalStats = {
    totalTransactions: filteredTransactions.length,
    totalBCTSold: filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    totalUSDCEarned: filteredTransactions.reduce((sum, tx) => sum + Number(tx.secondaryAmount || 0), 0),
    uniqueFirms: [...new Set(filteredTransactions.map(tx => tx.firm))].length,
    avgPrice: 0
  };

  if (totalStats.totalBCTSold > 0) {
    totalStats.avgPrice = totalStats.totalUSDCEarned / totalStats.totalBCTSold;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-cyan-500/30 shadow-[0_0_40px_rgba(0,255,255,0.3)]"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 className="text-2xl font-semibold text-cyan-400 mb-4 sm:mb-0 flex items-center gap-2">
          Sell Transaction History
          <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by firm address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 bg-gray-900/50 text-white border border-cyan-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all pl-10"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchSellHistory}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </motion.button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
          <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/20 text-center">
            <p className="text-gray-300 text-sm">Total Transactions</p>
            <p className="text-cyan-400 text-xl font-bold">{totalStats.totalTransactions}</p>
          </div>
        </Tilt>
        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
          <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/20 text-center">
            <p className="text-gray-300 text-sm">Total BCT Sold</p>
            <p className="text-cyan-400 text-xl font-bold">{formatNumber(totalStats.totalBCTSold)}</p>
          </div>
        </Tilt>
        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
          <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/20 text-center">
            <p className="text-gray-300 text-sm">Total USDC Earned</p>
            <p className="text-cyan-400 text-xl font-bold">{formatNumber(totalStats.totalUSDCEarned)}</p>
          </div>
        </Tilt>
        <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
          <div className="bg-gray-900/50 p-4 rounded-lg border border-cyan-500/20 text-center">
            <p className="text-gray-300 text-sm">Avg Price</p>
            <p className="text-cyan-400 text-xl font-bold">{formatNumber(totalStats.avgPrice)}</p>
          </div>
        </Tilt>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600/20 text-red-300 p-4 rounded-lg border border-red-500/30 mb-6"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Error: {error}
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyan-500/30">
                <th 
                  className="text-left py-3 px-4 font-medium text-gray-300 cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-2">
                    Timestamp
                    {getSortIcon('timestamp')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-gray-300 cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('firm')}
                >
                  <div className="flex items-center gap-2">
                    Firm
                    {getSortIcon('firm')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-gray-300 cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-2">
                    BCT Amount
                    {getSortIcon('amount')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-gray-300 cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('secondaryAmount')}
                >
                  <div className="flex items-center gap-2">
                    USDC Received
                    {getSortIcon('secondaryAmount')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 font-medium text-gray-300 cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Price (USDC/BCT)
                    {getSortIcon('price')}
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Transaction Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      {searchTerm ? 'No transactions found matching your search' : 'No sell transactions found'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, index) => (
                  <motion.tr 
                    key={`${tx.transactionHash}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-cyan-400 font-mono text-xs bg-gray-900/50 px-2 py-1 rounded">
                        {formatAddress(tx.firm)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-green-400 font-bold">
                      {formatNumber(tx.amount)} BCT
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-bold">
                      {formatNumber(tx.secondaryAmount)} USDC
                    </td>
                    <td className="py-3 px-4 text-yellow-400 font-bold">
                      {calculatePrice(tx.amount, tx.secondaryAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-400 font-mono text-xs bg-gray-900/50 px-2 py-1 rounded">
                        {formatAddress(tx.transactionHash)}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {filteredTransactions.length > 0 && (
        <div className="mt-4 text-center text-gray-400 text-sm">
          Showing {filteredTransactions.length} of {sellTransactions.length} transactions
          {searchTerm && (
            <span className="ml-2">
              (filtered by: <span className="text-cyan-400">"{searchTerm}"</span>)
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default SellHistory;