import React, { useState, useEffect } from 'react';
import { Download, Lock, Calendar, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { decryptFile } from '../utils/encryption';
import { downloadFromIPFS } from '../utils/ipfs';

function ReceiveFile({ receiveId }) {
  const [transfer, setTransfer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTransfer(receiveId);
  }, [receiveId]);

  const loadTransfer = async (fileId) => {
    setIsLoading(true);
    setError('');

    try {
      // Load file from blockchain using file ID
      const { getFile, checkFileAccess } = await import('../utils/blockchain');
      const { connectToBlockchain } = await import('../utils/blockchain');
      
      // Connect to blockchain first
      await connectToBlockchain();
      
      // Get current user address
      const provider = new (await import('ethers')).ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Check if user has access to this file
      const accessResult = await checkFileAccess(fileId, userAddress);
      
      if (!accessResult.success || !accessResult.hasAccess) {
        setError('Access denied or transfer not found');
        return;
      }
      
      // Get file details from blockchain
      const fileResult = await getFile(fileId);
      
      if (fileResult.success) {
        setTransfer({
          id: fileId,
          fileName: `File_${fileId}`,
          ipfsHash: fileResult.file.ipfsHash,
          encryptionKey: fileResult.file.encryptedKey,
          transferredAt: new Date(fileResult.file.timestamp).toISOString()
        });
      } else {
        setError('File not found on blockchain');
      }
    } catch (error) {
      console.error('Transfer load error:', error);
      setError('Failed to load transfer details from blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!transfer) return;

    setIsDownloading(true);
    setError('');

    try {
      // Download from IPFS
      const downloadResult = await downloadFromIPFS(transfer.ipfsHash);
      
      if (!downloadResult.success) {
        throw new Error(`Download failed: ${downloadResult.error}`);
      }

      // Decrypt the file
      const encryptedString = new TextDecoder().decode(downloadResult.data);
      const decryptionResult = await decryptFile(encryptedString, transfer.encryptionKey);
      
      if (!decryptionResult.success) {
        throw new Error(`Decryption failed: ${decryptionResult.error}`);
      }

      // Create downloadable blob
      const blob = new Blob([decryptionResult.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = transfer.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('✅ File downloaded successfully!');

    } catch (error) {
      setError(`Download failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="App">
      <div className="receive-page">
        <div className="container">
          <button onClick={goHome} className="back-button">
            <ArrowLeft size={16} />
            Back to BlockDrop
          </button>

          <h1>📥 Receive File via BlockDrop</h1>
          
          {isLoading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading transfer details...</p>
            </div>
          )}

          {error && (
            <div className="status-message error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="status-message success">
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          {transfer && (
            <div className="transfer-details">
              <div className="file-card">
                <div className="file-header">
                  <div className="file-icon">
                    📁
                  </div>
                  <div className="file-info">
                    <h3>{transfer.fileName}</h3>
                    <p>Secure transfer via BlockDrop</p>
                  </div>
                  <div className="file-status">
                    <Lock size={16} className="encrypted-icon" title="Encrypted" />
                  </div>
                </div>

                <div className="transfer-info">
                  <div className="detail-item">
                    <Calendar size={14} />
                    <span>Transferred: {new Date(transfer.transferredAt).toLocaleString()}</span>
                  </div>
                  {transfer.message && (
                    <div className="transfer-message">
                      <strong>Message:</strong> {transfer.message}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="action-button download"
                >
                  {isDownloading ? (
                    <>
                      <div className="button-spinner"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Download File
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReceiveFile;
