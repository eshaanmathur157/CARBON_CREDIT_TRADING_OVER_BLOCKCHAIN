import React from 'react';
import { motion } from 'framer-motion';

function Features() {
  const features = [
    {
      title: "Precision Credit Validation",
      description:
        "Validate carbon credits with advanced satellite imagery, assigning tiers based on environmental impact for trust and quality.",
      icon: "📡",
    },
    {
      title: "Dynamic Trading Ecosystem",
      description:
        "Trade Base Carbon Tonnes (BCT) via our AMM system, inspired by Uniswap, with seamless crypto exchange integration.",
      icon: "🔄",
    },
    {
      title: "Equitable Retirement System",
      description:
        "Retire BCT (1 metric tonne of CO2) with TCO2 fairly assigned based on firm reputation for transparency.",
      icon: "🌱",
    },
    {
      title: "Reputation Through Impact",
      description:
        "Earn reputation by staking BCT and contributing high-quality TCO2 credits, validated by satellite imagery.",
      icon: "⭐",
    },
    {
      title: "Priority Credit Access",
      description:
        "Control 40% of top-tier TCO2 credits in a priority pool, with general pool access based on reputation.",
      icon: "🔑",
    },
    {
      title: "Verified Emissions Boost",
      description:
        "Validate emissions via satellite imagery to enhance firm reputation, rewarding transparency.",
      icon: "✅",
    },
    {
      title: "Market Integrity Shield",
      description:
        "Cap staking points to prevent manipulation, ensuring high-quality TCO2 credits dominate.",
      icon: "🛡️",
    },
  ];

  return (
    <div className="py-24 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://source.unsplash.com/random/1920x1080/?forest')] opacity-5 bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 to-gray-900/90 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-5xl font-extrabold text-green-400 text-center mb-16 tracking-tight"
        >
          Our Core Features
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: 'easeOut' }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
              className="p-6 bg-gray-800/80 rounded-xl border border-green-500/20 backdrop-blur-sm"
            >
              <div className="text-3xl mb-4 text-green-400">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-300 text-base">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Features;