import React, { useEffect, useState } from 'react';
import { Wallet, CheckCircle, AlertCircle } from 'lucide-react';

function WalletConnector({ account, setAccount, isConnected, setIsConnected }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // Check network and switch to Sepolia if needed
  const checkAndSwitchNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // Sepolia Chain ID is 0xAA36A7
      if (chainId !== '0xAA36A7') {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xAA36A7' }],
        });
      }
    } catch (error) {
      console.error('Network switch failed:', error);
      setError('Please switch to Sepolia Test Network in MetaMask');
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    setError('');
    setIsLoading(true);

    if (!isMetaMaskInstalled()) {
      setError('MetaMask not detected. Please install MetaMask extension.');
      setIsLoading(false);
      return;
    }

    try {
      // Check and switch network first
      await checkAndSwitchNetwork();
      
      // Request account access
      console.log('Requesting account access...');
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        setError('No accounts found. Please create an account in MetaMask.');
        setIsLoading(false);
        return;
      }

      const account = accounts[0];
      setAccount(account);
      setIsConnected(true);
      setError('');
      
      console.log('Connected account:', account);
    } catch (error) {
      console.error('Connection error:', error);
      
      if (error.code === 4001) {
        setError('Connection rejected. Please approve the connection in MetaMask.');
      } else if (error.code === -32002) {
        setError('Connection request pending. Please check MetaMask.');
      } else {
        setError(`Connection failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if already connected when component loads
  useEffect(() => {
    const checkConnection = async () => {
      if (isMetaMaskInstalled()) {
        try {
          // Always start as disconnected to force proper connection flow
          setIsConnected(false);
          setAccount('');
          console.log('Wallet connection check - requiring manual connection');
        } catch (error) {
          console.error('Connection check failed:', error);
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, [setAccount, setIsConnected]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setAccount('');
          setIsConnected(false);
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [setAccount, setIsConnected]);

  return (
    <div className="wallet-section">
      {isConnected ? (
        <div className="wallet-connected">
          <CheckCircle className="success-icon" />
          <div>
            <h3>Wallet Connected ✅</h3>
            <p>Address: {account.substring(0, 6)}...{account.substring(38)}</p>
            <p>Network: Sepolia Testnet</p>
          </div>
        </div>
      ) : (
        <div className="wallet-connect">
          <Wallet className="wallet-icon" />
          <h3>Connect Your Wallet</h3>
          <p>Connect your MetaMask wallet to start using BlockDrop</p>
          
          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          <button 
            onClick={connectWallet}
            className="connect-button"
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect MetaMask'}
          </button>
          
          {!isMetaMaskInstalled() && (
            <p className="install-link">
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                Download MetaMask
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default WalletConnector;
