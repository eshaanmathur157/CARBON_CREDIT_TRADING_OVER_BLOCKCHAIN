import React, { createContext, useContext } from 'react';

const WalletContext = createContext({
  walletAddress: null,
  setWalletAddress: () => {},
});

export { WalletContext };