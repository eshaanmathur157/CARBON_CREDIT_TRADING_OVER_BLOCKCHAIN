import Web3 from 'web3';

// Configuration
const GANACHE_URL = 'http://localhost:8545';
const web3 = new Web3(new Web3.providers.HttpProvider(GANACHE_URL));

class WalletAuthenticator {
  constructor() {
    this.nonces = new Map();
  }

  generateNonce() {
    return Array(32)
      .fill()
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
  }

  getNonce(walletAddress) {
    const normalizedAddress = walletAddress.toLowerCase();
    if (!this.nonces.has(normalizedAddress)) {
      this.nonces.set(normalizedAddress, this.generateNonce());
    }
    return this.nonces.get(normalizedAddress);
  }

  // Get private key from server
  async getPrivateKey() {
    try {
      const response = await fetch('http://localhost:3002/get-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      return data.privateKey;
    } catch (error) {
      throw new Error(`Failed to get private key: ${error.message}`);
    }
  }

  async signMessage(message, privateKey) {
    try {
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      const signature = await account.sign(message);
      return signature;
    } catch (error) {
      throw new Error(`Signing failed: ${error.message}`);
    }
  }

  async verifySignature(message, signature, expectedAddress) {
    try {
      const recoveredAddress = web3.eth.accounts.recover(message, signature.signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  async authenticateWallet(enteredWalletAddress) {
    try {
      console.log(`🔐 Authenticating wallet: ${enteredWalletAddress}`);

      // Get private key from server
      const privateKey = await this.getPrivateKey();
      
      // Get signing address
      const signingAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
      const signingAddress = signingAccount.address;

      const nonce = this.generateNonce();
      const message = `Authentication nonce: ${nonce}\nTimestamp: ${Date.now()}`;

      const signature = await this.signMessage(message, privateKey);
      const isValid = await this.verifySignature(message, signature, signingAddress);

      if (!isValid) throw new Error('Signature verification failed');

      const balance = await web3.eth.getBalance(enteredWalletAddress);
      const balanceEth = web3.utils.fromWei(balance, 'ether');

      return {
        success: true,
        walletAddress: enteredWalletAddress,
        signingAddress: signingAddress,
        balance: balanceEth,
        nonce,
        timestamp: Date.now(),
        message: 'Authentication successful'
      };
    } catch (error) {
      console.error(`❌ Authentication failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async checkGanacheConnection() {
    try {
      const networkId = await web3.eth.net.getId();
      const accounts = await web3.eth.getAccounts();
      console.log(`🌐 Connected to Ganache (Network ID: ${networkId})`);
      return { connected: true, networkId, accountCount: accounts.length };
    } catch (error) {
      console.error(`❌ Ganache connection failed: ${error.message}`);
      return { connected: false, error: error.message };
    }
  }
}

async function handleLogin(walletAddress) {
  const authenticator = new WalletAuthenticator();
  const connectionStatus = await authenticator.checkGanacheConnection();

  if (!connectionStatus.connected) {
    console.error('❌ Ganache not running at port 8545');
    return { success: false, error: 'Ganache connection failed' };
  }

  const result = await authenticator.authenticateWallet(walletAddress);
  return result;
}

export { WalletAuthenticator, handleLogin };