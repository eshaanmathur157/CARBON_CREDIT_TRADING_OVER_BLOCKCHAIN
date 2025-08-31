import React from 'react';
import { motion } from 'framer-motion';

function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-green-950 to-blue-950 pt-20 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://source.unsplash.com/random/1920x1080/?nature')] opacity-10 bg-cover bg-center" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.h2
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight"
        >
          Redefining <span className="text-green-400">Carbon Finance</span>
        </motion.h2>
        <motion.p
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
          className="text-xl md:text-3xl text-gray-300 mb-10 max-w-3xl mx-auto"
        >
          Empowering a sustainable future with transparent, innovative carbon credit solutions.
        </motion.p>
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
          whileHover={{ scale: 1.15, boxShadow: '0 0 20px rgba(34,197,94,0.7)' }}
          className="bg-green-500 text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-green-600 transition"
        >
          Join the Revolution
        </motion.button>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-950 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      />
    </motion.div>
  );
}

export default Hero;