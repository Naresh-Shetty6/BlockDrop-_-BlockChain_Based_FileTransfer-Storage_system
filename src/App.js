import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WalletConnector from './components/WalletConnector';
import FileUploader from './components/FileUploader';
import FileList from './components/FileList';
import ReceiveFile from './components/ReceiveFile';
import ErrorBoundary from './components/ErrorBoundary';
import { getUserFilesFromBlockchain } from './utils/blockchain';
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // NEW: Simple routing state
  const [currentPage, setCurrentPage] = useState('main');
  const [receiveId, setReceiveId] = useState(null);

  // NEW: Handle URL routing without react-router
  useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      
      if (path.startsWith('/receive/')) {
        // Extract transfer ID from URL like /receive/abc123
        const id = path.replace('/receive/', '');
        setCurrentPage('receive');
        setReceiveId(id);
      } else {
        setCurrentPage('main');
        setReceiveId(null);
      }
    };

    // Handle initial page load
    handleRouting();

    // Handle back/forward browser navigation
    const onPopState = () => {
      handleRouting();
    };

    window.addEventListener('popstate', onPopState);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Load user's files from blockchain when wallet connects
  useEffect(() => {
    const loadUserFiles = async () => {
      if (isConnected && account) {
        setLoadingFiles(true);
        console.log('🔄 Loading files from blockchain for account:', account);
        
        try {
          const result = await getUserFilesFromBlockchain(account);
          
          if (result.success) {
            // Convert blockchain file data to app format
            const formattedFiles = result.files.map(blockchainFile => ({
              id: blockchainFile.blockchainId,
              name: `File_${blockchainFile.blockchainId}`,
              size: 0,
              type: 'application/octet-stream',
              ipfsHash: blockchainFile.ipfsHash,
              encryptionKey: blockchainFile.encryptedKey,
              uploadedAt: new Date(blockchainFile.timestamp).toISOString(),
              uploadedBy: blockchainFile.owner,
              ipfsUrl: `https://gateway.pinata.cloud/ipfs/${blockchainFile.ipfsHash}`,
              blockchainId: blockchainFile.blockchainId,
              transactionHash: '',
              gasUsed: '',
              onChain: blockchainFile.active,
              accessCount: blockchainFile.accessCount
            }));
            
            setFiles(formattedFiles);
            console.log('✅ Loaded', formattedFiles.length, 'files from blockchain');
          } else {
            throw new Error(`Failed to load files from blockchain: ${result.error}`);
          }
        } catch (error) {
          console.error('❌ Error loading files from blockchain:', error);
          setFiles([]);
        } finally {
          setLoadingFiles(false);
        }
      } else {
        // Clear files when wallet disconnects
        setFiles([]);
      }
    };

    loadUserFiles();
  }, [isConnected, account]);

  // NEW: Render ReceiveFile component for /receive/ URLs
  if (currentPage === 'receive') {
    return (
      <ErrorBoundary>
        <ReceiveFile receiveId={receiveId} />
      </ErrorBoundary>
    );
  }

  // Original main app
  return (
    <ErrorBoundary>
      <div className="App">
        <Header />
        
        <main className="main-content">
          <div className="container">
            <h1>Welcome to BlockDrop</h1>
            <p>Secure, decentralized file sharing powered by blockchain</p>
            
            {/* Wallet Connection Section */}
            <WalletConnector 
              account={account}
              setAccount={setAccount}
              isConnected={isConnected}
              setIsConnected={setIsConnected}
            />
            
            {/* File Upload Section - Only show if wallet connected */}
            {isConnected && (
              <>
                <FileUploader 
                  account={account}
                  files={files}
                  setFiles={setFiles}
                />
                
                {loadingFiles ? (
                  <div className="loading-files">
                    <div className="spinner"></div>
                    <p>Loading your files from blockchain...</p>
                  </div>
                ) : (
                  <FileList files={files} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
