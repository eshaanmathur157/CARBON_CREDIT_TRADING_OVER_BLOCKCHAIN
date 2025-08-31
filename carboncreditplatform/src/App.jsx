import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardNavbar from './components/DashboardNavbar';
import Hero from './components/Hero';
import Features from './components/Features';
import ModelAnimation from './components/ModelAnimation';
import Footer from './components/Footer';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { WalletContext } from './contexts/WalletContext';
import Mint from './components/Mint';
import Stake from './components/Stake';
import Sell from './components/Sell';
import SellHistory from './components/SellHistory';
import Buy from './components/Buy';
import CreditHistory from './components/CreditHistory';
import Retire from './components/Retire';
import './App.css';
import KMLUpload from './components/KMLUpload';
import AllCredits from './components/AllCredits';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);

  const ConditionalNavbar = () => {
    const location = useLocation();
    return location.pathname === '/dashboard' ? <DashboardNavbar /> : <Navbar />;
  };

  return (
    <WalletContext.Provider value={{ walletAddress, setWalletAddress }}>
      <Router>
        <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
          <ConditionalNavbar />
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Hero />
                  <Features />
                  <ModelAnimation />
                  <Footer />
                </>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/stake" element={<Stake />} />
            <Route path="/buy" element={<Buy />} />
            <Route path="/history" element={<SellHistory />} />
            <Route path="/creditHistory" element={<CreditHistory />} />
            <Route path="/retire" element={<Retire />} />
            <Route path="/kmlupload" element={<KMLUpload />} />
            <Route path="/credits" element={<AllCredits />} />
          </Routes>
        </div>
      </Router>
    </WalletContext.Provider>
  );
}
 
export default App;