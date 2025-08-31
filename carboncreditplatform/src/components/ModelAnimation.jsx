import React from 'react';
import { motion } from 'framer-motion';

function ModelAnimation() {
  const items = [
    { name: 'Credits', icon: '📜', description: 'Paper-based carbon credits' },
    { name: 'TCO2', icon: '🌳', description: 'Carbon offset tokens' },
    { name: 'BCT', icon: '💾', description: 'Base Carbon Tonnes' },
    { name: 'USDC', icon: '💵', description: 'Stablecoin integration' },
  ];

  const arrowVariants = {
    blink: {
      opacity: [1, 0.4, 1],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  const itemVariants = {
    initial: { y: 0 },
    animate: {
      y: [-5, 5, -5],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  return (
    <div className="py-20 bg-gradient-to-b from-gray-900 to-gray-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-4xl font-extrabold text-green-400 text-center mb-12 tracking-tight"
        >
          Our Model
        </motion.h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
          {items.map((item, index) => (
            <React.Fragment key={item.name}>
              <motion.div
                variants={itemVariants}
                initial="initial"
                animate="animate"
                className="flex flex-col items-center text-center"
              >
                <div className="text-4xl mb-2 text-green-400">{item.icon}</div>
                <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                <p className="text-gray-400 text-sm max-w-[120px]">{item.description}</p>
              </motion.div>
              {index < items.length - 1 && (
                <motion.div
                  variants={arrowVariants}
                  animate="blink"
                  className="text-2xl text-green-400"
                >
                  ↔
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15)_0%,_transparent_70%)] pointer-events-none" />
    </div>
  );
}

export default ModelAnimation;