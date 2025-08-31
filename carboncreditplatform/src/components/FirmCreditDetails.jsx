import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, ExternalLink, Copy, Check, Globe, Layers, Award, Zap, TreePine, Hash, User, Calendar } from 'lucide-react';
import { WalletContext } from '../contexts/WalletContext';
import { getTierPoolPriorityIdsByFirmUnretired, getTierPoolPriorityIdsByFirmRetired, getFirmRetiredGeneralCreditIdsByTier, getTCO2Credit } from '../utils/blockchain';

function FirmCreditDetails() {
  const { walletAddress } = useContext(WalletContext);
  const [credits, setCredits] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [copiedText, setCopiedText] = useState('');

  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Grey'];

  // Fetch credit IDs and details when walletAddress changes
  useEffect(() => {
    async function fetchCredits() {
      if (!walletAddress) {
        setError('Please connect a wallet to view firm credit details');
        setCredits({});
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const creditData = {};
        for (const tier of tiers) {
          // Fetch credit IDs for the tier
          const unretiredPriorityIds = await getTierPoolPriorityIdsByFirmUnretired(walletAddress, tier);
          const retiredPriorityIds = await getTierPoolPriorityIdsByFirmRetired(walletAddress, tier);
          const retiredGeneralIds = await getFirmRetiredGeneralCreditIdsByTier(walletAddress, tier);

          // Fetch TCO2 credit details for each ID
          const unretiredPriorityCredits = await Promise.all(
            unretiredPriorityIds.map(async (id) => {
              const credit = await getTCO2Credit(id);
              return { ...credit, creditType: 'Unretired Priority' };
            })
          );

          const retiredPriorityCredits = await Promise.all(
            retiredPriorityIds.map(async (id) => {
              const credit = await getTCO2Credit(id);
              return { ...credit, creditType: 'Retired Priority' };
            })
          );

          const retiredGeneralCredits = await Promise.all(
            retiredGeneralIds.map(async (id) => {
              const credit = await getTCO2Credit(id);
              return { ...credit, creditType: 'Retired General' };
            })
          );

          // Combine credits for the tier
          creditData[tier] = [
            ...unretiredPriorityCredits,
            ...retiredPriorityCredits,
            ...retiredGeneralCredits,
          ];
        }

        setCredits(creditData);
      } catch (e) {
        setError(`Error fetching firm credit details: ${e.message}`);
        setCredits({});
      } finally {
        setIsLoading(false);
      }
    }

    fetchCredits();
  }, [walletAddress]);

  // Function to truncate addresses
  const truncateAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(''), 2000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
    });
  };

  // Function to generate Google Maps URL
  const generateMapUrl = (coordinates) => {
    if (!coordinates || coordinates.length < 3) return null;
    const coords = coordinates.map(coord => {
      const [lat, lng] = coord.split(',').map(Number);
      return { lat, lng };
    });
    const centerLat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
    const centerLng = coords.reduce((sum, coord) => sum + coord.lng, 0) / coords.length;
    const pathString = coords.map(coord => `${coord.lat},${coord.lng}`).join('|');
    return `https://www.google.com/maps?q=${centerLat},${centerLng}&z=10&layer=t`;
  };

  // Function to get tier color
  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'from-slate-400 to-slate-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-300 to-gray-500';
      case 'bronze': return 'from-orange-400 to-orange-600';
      case 'grey': return 'from-gray-400 to-gray-600';
      default: return 'from-green-400 to-green-600';
    }
  };

  // Function to get tier icon
  const getTierIcon = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return <Award className="w-4 h-4" />;
      case 'gold': return <Zap className="w-4 h-4" />;
      case 'silver': return <Layers className="w-4 h-4" />;
      case 'bronze': return <TreePine className="w-4 h-4" />;
      case 'grey': return <Hash className="w-4 h-4" />;
      default: return <TreePine className="w-4 h-4" />;
    }
  };

  // Function to get credit type color
  const getCreditTypeColor = (creditType) => {
    switch (creditType) {
      case 'Unretired Priority': return 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30';
      case 'Retired Priority': return 'bg-blue-900/30 text-blue-300 border-blue-500/30';
      case 'Retired General': return 'bg-red-900/30 text-red-300 border-red-500/30';
      default: return 'bg-gray-900/30 text-gray-300 border-gray-500/30';
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
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 2,
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
              ease: 'linear',
            }}
          >
            Firm Carbon Credit Details
          </motion.h1>
          <motion.div
            className="flex items-center justify-center gap-3 text-gray-300 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Globe className="w-6 h-6 text-emerald-400" />
            <span>Displaying credits for</span>
            <span className="font-mono text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-500/30">
              {truncateAddress(walletAddress) || 'Not connected'}
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)] overflow-hidden"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full mx-auto mb-4"
              />
              <p className="text-gray-300 text-lg">Loading firm credit details...</p>
              <div className="mt-6 h-2 bg-emerald-500/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-red-900/30 border border-red-500/30 rounded-xl m-6"
            >
              <div className="flex items-center gap-3 text-red-300">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <span className="text-lg">{error}</span>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !error && Object.values(credits).every((tierCredits) => tierCredits.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-12 text-center"
            >
              <TreePine className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-xl">No carbon credits found for this firm</p>
              <p className="text-gray-500 mt-2">Start managing your carbon credits today!</p>
            </motion.div>
          )}

          {/* Credits List */}
          {!isLoading && Object.values(credits).some((tierCredits) => tierCredits.length > 0) && (
            <div className="p-6">
              {tiers.map((tier, tierIndex) => (
                credits[tier]?.length > 0 && (
                  <div key={tier} className="mb-8">
                    <h2 className="text-2xl font-bold text-emerald-400 mb-4">{tier} Tier Credits</h2>
                    <div className="grid gap-4">
                      {credits[tier].map((credit, creditIndex) => (
                        <motion.div
                          key={credit.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (tierIndex * credits[tier].length + creditIndex) * 0.1 }}
                          className="bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-emerald-500/50 transition-all duration-300 overflow-hidden"
                        >
                          {/* Main Credit Card */}
                          <div
                            className="p-6 cursor-pointer hover:bg-gray-800/70 transition-all duration-300"
                            onClick={() => setExpandedRow(`${tier}-${credit.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Tier Badge */}
                                <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getTierColor(tier)} text-white font-bold flex items-center gap-2 shadow-lg`}>
                                  {getTierIcon(tier)}
                                  {tier}
                                </div>

                                {/* Credit Info */}
                                <div>
                                  <h3 className="text-xl font-bold text-emerald-400">Credit ID: {credit.id}</h3>
                                  <p className="text-gray-300 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {credit.location}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Credit Type */}
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getCreditTypeColor(credit.creditType)} border`}>
                                  {credit.creditType}
                                </div>

                                {/* Status Badge */}
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  credit.isRetired
                                    ? 'bg-red-900/30 text-red-300 border border-red-500/30'
                                    : 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {credit.isRetired ? 'Retired' : 'Active'}
                                </div>

                                {/* Expand Button */}
                                <motion.div
                                  animate={{ rotate: expandedRow === `${tier}-${credit.id}` ? 180 : 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <ChevronDown className="w-6 h-6 text-gray-400" />
                                </motion.div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {expandedRow === `${tier}-${credit.id}` && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t border-gray-700/50 bg-gray-900/50"
                              >
                                <div className="p-6 grid lg:grid-cols-2 gap-6">
                                  {/* Left Column - Details */}
                                  <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-emerald-400 mb-4">Credit Details</h4>

                                    {/* Tier */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                      <Layers className="w-5 h-5 text-emerald-400" />
                                      <div>
                                        <p className="text-sm text-gray-400">Tier</p>
                                        <p className="text-white font-medium">{credit.tier}</p>
                                      </div>
                                    </div>

                                    {/* Owner */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                      <User className="w-5 h-5 text-blue-400" />
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-400">Owner</p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-mono">{truncateAddress(credit.owner)}</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyToClipboard(credit.owner);
                                            }}
                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                          >
                                            {copiedText === credit.owner ? (
                                              <Check className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-4 h-4 text-gray-400" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Credit Type */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                      <Hash className="w-5 h-5 text-orange-400" />
                                      <div>
                                        <p className="text-sm text-gray-400">Credit Type</p>
                                        <p className="text-white font-medium">{credit.creditType}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Column - Map */}
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-semibold text-emerald-400">Location</h4>
                                      {generateMapUrl(credit.coordinates) && (
                                        <a
                                          href={generateMapUrl(credit.coordinates)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                          View on Google Maps
                                        </a>
                                      )}
                                    </div>

                                    {/* Coordinates Display */}
                                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                                      <p className="text-sm text-gray-400 mb-3">Quadrilateral Coordinates:</p>
                                      {credit.coordinates.map((coord, coordIndex) => {
                                        const [lat, lng] = coord.split(',');
                                        return (
                                          <div key={coordIndex} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                                            <span className="text-sm text-gray-400">Point {coordIndex + 1}:</span>
                                            <span className="font-mono text-emerald-400">{lat}°, {lng}°</span>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Visual Coordinate Preview */}
                                    <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                                      <p className="text-sm text-gray-400 mb-3">Area Preview:</p>
                                      <div className="relative h-32 bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10" />
                                        <div className="absolute inset-2 border-2 border-emerald-400/50 border-dashed rounded" />
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-400 text-xs font-mono">
                                          Protected Area
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default FirmCreditDetails;