import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function Navbar() {
  const navItems = [
    'Top Contributors',
    'About Us',
    'Our Model',
    'Current BCT Prices',
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 bg-gray-900/70 backdrop-blur-lg shadow-[0_0_15px_rgba(34,197,94,0.3)] z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex-shrink-0"
          >
            <h1 className="text-3xl font-extrabold text-green-400 tracking-tight">CarbonTrust</h1>
          </motion.div>
          <div className="flex space-x-6 items-center">
            {navItems.map((item, index) => (
              <motion.button
                key={item}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1), duration: 0.4 }}
                whileHover={{ scale: 1.15, color: '#22C55E' }}
                className="text-gray-200 hover:text-green-400 px-4 py-2 rounded-lg text-base font-medium transition-colors"
              >
                {item}
              </motion.button>
            ))}
            <Link to="/login">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                whileHover={{ scale: 1.1, boxShadow: '0 0 15px rgba(34,197,94,0.5)' }}
                className="bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition"
              >
                Firm Login
              </motion.button>
            </Link>
            <Link to="/credits">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                whileHover={{ scale: 1.1, boxShadow: '0 0 15px rgba(34,197,94,0.5)' }}
                className="bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition"
              >
                All Credits
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

export default Navbar;