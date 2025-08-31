import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, MapPin, ExternalLink, AlertCircle, Globe, FileText } from 'lucide-react';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { WalletContext } from '../contexts/WalletContext';
import { createTCO2Credit } from '../utils/blockchain.js';

function KMLUpload() {
  const { walletAddress } = useContext(WalletContext);
  const [file, setFile] = useState(null);
  const [coordinates, setCoordinates] = useState([]);
  const [location, setLocation] = useState('');
  const [mapUrl, setMapUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState(null);
  const [creditStatus, setCreditStatus] = useState(null);

  const keyPath = './gen-lang-client-0487226181-edaa2b0236d9.json';

  // Handle file upload and processing
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsLoading(true);
    setError(null);
    setCoordinates([]);
    setLocation('');
    setMapUrl(null);
    setResults(null);
    setCreditStatus(null);

    try {
      // Read and unzip the file
      const zip = new JSZip();
      const zipData = await zip.loadAsync(uploadedFile);
      
      // Find the KML file in the zip
      const kmlFile = Object.values(zipData.files).find(file => file.name.endsWith('.kml'));
      if (!kmlFile) {
        throw new Error('No KML file found in the zip');
      }

      // Read KML content
      const kmlText = await kmlFile.async('text');
      
      // Parse KML
      const parser = new XMLParser();
      const kmlData = parser.parse(kmlText);
      
      // Extract coordinates
      const coordsString = kmlData?.kml?.Document?.Placemark?.Polygon?.outerBoundaryIs?.LinearRing?.coordinates;
      if (!coordsString) {
        throw new Error('Invalid KML structure: No coordinates found');
      }

      // Extract location
      const locationName = kmlData?.kml?.Document?.name;
      if (!locationName) {
        throw new Error('Invalid KML structure: No location name found');
      }
      setLocation(locationName);

      // Process coordinates
      const coordsArray = coordsString.trim().split('\n').map(coord => {
        const [lng, lat] = coord.trim().split(',').map(Number);
        return [lng, lat];
      });

      setCoordinates(coordsArray);

      // Calculate centroid
      const centerLat = coordsArray.reduce((sum, coord) => sum + coord[1], 0) / coordsArray.length;
      const centerLng = coordsArray.reduce((sum, coord) => sum + coord[0], 0) / coordsArray.length;

      // Generate Google Maps URL
      const generatedUrl = `https://www.google.com/maps?q=${centerLat},${centerLng}&z=10&layer=t`;
      setMapUrl(generatedUrl);

    } catch (e) {
      setError(`Error processing file: ${e.message}`);
      setCoordinates([]);
      setLocation('');
      setMapUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission to call API and create credits
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coordinates.length || !startDate || !endDate || !walletAddress) {
      setError('Please upload a valid KML file, select both start and end dates, and ensure wallet is connected');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setCreditStatus(null);

    try {
      const options = {
        startDate,
        endDate,
        numSamples: 5000,
        splitRatio: 0.9,
        exportToGDrive: true
      };

      // Call backend API
      //gee -> gee(lat, lon) -> tier
      const response = await fetch('http://localhost:3001/api/estimate-carbon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyPath, coordinates, options }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch carbon estimation');
      }

      const result = await response.json();
      setResults(result);

      // Calculate TCO2 and create credits
      const tco2 = result.carbonStock * 3.67;
      console.log(`TCO2: ${tco2}`);
      const numCredits = Math.floor(tco2 / (2 * Math.pow(10, 4)));
      
      // Convert coordinates array to string
      const coordinatesStringArray = [];
      for (let i = 0; i < coordinates.length; i++) {
        coordinatesStringArray.push(JSON.stringify(coordinates[i]));
      }
      console.log(`Coordinates: ${coordinatesStringArray}`);
      // Create TCO2 credits
      
      console.log(`Creating ${numCredits} TCO2 credits for ${walletAddress}`);
      for (let i = 0; i < numCredits; i++) {
        await createTCO2Credit(walletAddress, result.tier, location, coordinatesStringArray);
      }

      setCreditStatus(`Successfully allocated ${numCredits} carbon credits`);

    } catch (e) {
      setError(`Error processing carbon estimation or creating credits: ${e.message}`);
    } finally {
      setIsLoading(false);
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
            Retrieve TCO2
          </motion.h1>
          <motion.div 
            className="flex items-center justify-center gap-3 text-gray-300 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Globe className="w-6 h-6 text-emerald-400" />
            <span>Upload the zip file containing KML coordinates</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)] overflow-hidden"
        >
          {/* File Upload Section */}
          <div className="p-6">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-emerald-500/30 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800/70 transition-all duration-300">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-emerald-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-300">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">ZIP file containing KML (MAX. 10MB)</p>
                  {file && <p className="text-sm text-emerald-400 mt-2">{file.name}</p>}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".zip"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Date Input Section */}
          {coordinates.length > 0 && (
            <div className="p-6 border-t border-gray-700/50">
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-gray-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-gray-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={isLoading || !walletAddress}
                >
                  <FileText className="w-5 h-5" />
                  Calculate Carbon Estimation
                </button>
                {!walletAddress && (
                  <p className="text-sm text-red-400 mt-2">Please connect your wallet to calculate and allocate credits</p>
                )}
              </form>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full mx-auto mb-4"
              />
              <p className="text-gray-300 text-lg">Processing...</p>
              <div className="mt-6 h-2 bg-emerald-500/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
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
                <AlertCircle className="w-6 h-6 text-red-500" />
                <span className="text-lg">{error}</span>
              </div>
            </motion.div>
          )}

          {/* Success Message for Credits */}
          {creditStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-emerald-900/30 border border-emerald-500/30 rounded-xl m-6"
            >
              <div className="flex items-center gap-3 text-emerald-300">
                <FileText className="w-6 h-6 text-emerald-500" />
                <span className="text-lg">{creditStatus}</span>
              </div>
            </motion.div>
          )}

          {/* Coordinates, Location, and Results */}
          {!isLoading && coordinates.length > 0 && (
            <div className="p-6">
              <div className="grid gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-emerald-500/50 transition-all duration-300"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Extracted Data
                      </h4>
                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on Google Maps
                        </a>
                      )}
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-gray-400 mb-3">Location: <span className="text-emerald-400">{location}</span></p>
                      <p className="text-sm text-gray-400 mb-3">Polygon Coordinates:</p>
                      {coordinates.map((coord, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                          <span className="text-sm text-gray-400">Point {index + 1}:</span>
                          <span className="font-mono text-emerald-400">{coord[1].toFixed(6)}°, {coord[0].toFixed(6)}°</span>
                        </div>
                      ))}
                    </div>

                    {results && (
                      <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-3">Carbon Estimation Results:</p>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-400">Tier: <span className="text-emerald-400">{results.tier}</span></p>
                          <p className="text-sm text-gray-400">Carbon Stock: <span className="text-emerald-400">{results.carbonStock.toFixed(2)} tonnes</span></p>
                          <p className="text-sm text-gray-400">Total Carbon Equivalent (TCO2): <span className="text-emerald-400">{(results.carbonStock * 3.67).toFixed(2)} tonnes</span></p>
                          <p className="text-sm text-gray-400">Number of Credits: <span className="text-emerald-400">{Math.floor((results.carbonStock * 3.67) / (2 * Math.pow(10, 4)))}</span></p>
                          <p className="text-sm text-gray-400">Sequestration: <span className="text-emerald-400">{results.sequestration.toFixed(2)} tonnes/year</span></p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-3">Area Preview:</p>
                      <div className="relative h-32 bg-gray-900/50 rounded border border-gray-700/50 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10" />
                        <div className="absolute inset-2 border-2 border-emerald-400/50 border-dashed rounded" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-400 text-xs font-mono">
                          {location || 'Project Area'}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default KMLUpload;