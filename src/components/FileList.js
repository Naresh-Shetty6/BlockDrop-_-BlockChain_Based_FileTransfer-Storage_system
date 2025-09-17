import React, { useState } from 'react';
import { Download, Eye, Lock, Calendar, HardDrive, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { decryptFile } from '../utils/encryption';
import { downloadFromIPFSCached } from '../utils/ipfsCache';
import { getDecryptionKeyFromBlockchain, grantFileAccess } from '../utils/blockchain';
import TransferModal from './TransferModal';

function FileList({ files }) {
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [error, setError] = useState('');
  
  // NEW: Transfer functionality state
  const [transferModal, setTransferModal] = useState({ isOpen: false, fileRecord: null });
  const [transfers, setTransfers] = useState([]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Download and decrypt file with blockchain verification
  const handleDownload = async (fileRecord) => {
    setDownloadingFile(fileRecord.id);
    setError('');
    setDownloadStatus('Starting secure download...');

    try {
      // Check if file has blockchain ID
      if (!fileRecord.blockchainId) {
        throw new Error('This file was not uploaded to blockchain. Please re-upload the file to enable secure downloads.');
      }

      // Step 1: Verify access via blockchain (REQUIRED)
      setDownloadStatus('Verifying blockchain access...');
      const keyResult = await getDecryptionKeyFromBlockchain(fileRecord.blockchainId);
      
      if (!keyResult.success) {
        throw new Error(`Access denied: ${keyResult.error}`);
      }

      // Step 2: Download from IPFS
      setDownloadStatus('Downloading from IPFS...');
      console.log('Downloading file:', fileRecord.name, 'Hash:', fileRecord.ipfsHash);
      
      const downloadResult = await downloadFromIPFSCached(fileRecord.ipfsHash);
      
      if (!downloadResult.success) {
        throw new Error(`Download failed: ${downloadResult.error}`);
      }

      // Step 3: Decrypt with AES-256-GCM
      setDownloadStatus('Decrypting with AES-256-GCM...');
      
      // Convert downloaded data to string for decryption
      const encryptedString = new TextDecoder().decode(downloadResult.data);
      const decryptionResult = await decryptFile(encryptedString, keyResult.encryptedKey);
      
      if (!decryptionResult.success) {
        throw new Error(`Decryption failed: ${decryptionResult.error}`);
      }

      // Step 4: Create downloadable blob
      setDownloadStatus('Preparing secure download...');
      const blob = new Blob([decryptionResult.data], { type: fileRecord.type });
      const url = window.URL.createObjectURL(blob);
      
      // Step 5: Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileRecord.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setDownloadStatus('✅ Secure download complete!');
      console.log('File downloaded and decrypted successfully');

    } catch (error) {
      console.error('Secure download failed:', error);
      setError(`Download failed: ${error.message}`);
      setDownloadStatus('');
    } finally {
      setDownloadingFile(null);
      
      // Clear messages after 3 seconds
      setTimeout(() => {
        setDownloadStatus('');
        setError('');
      }, 3000);
    }
  };

  // NEW: Initiate transfer
  const handleInitiateTransfer = (fileRecord) => {
    setTransferModal({ isOpen: true, fileRecord });
  };

  // NEW: Handle transfer via blockchain
  const handleTransfer = async (transferData) => {
    try {
      // Check if file has blockchain ID
      if (!transferData.fileRecord.blockchainId) {
        throw new Error('This file was not uploaded to blockchain. Please re-upload the file to enable transfers.');
      }

      // Grant access to recipient on blockchain
      const grantResult = await grantFileAccess(
        transferData.fileRecord.blockchainId,
        transferData.recipientAddress,
        transferData.fileRecord.encryptionKey,
        transferData.expiresAt || 0
      );
      
      if (!grantResult.success) {
        throw new Error(`Failed to grant blockchain access: ${grantResult.error}`);
      }
      
      // Create transfer link with blockchain file ID
      const transferLink = `${window.location.origin}/receive/${transferData.fileRecord.blockchainId}`;
      
      // Show success message with transfer link
      alert(`✅ Transfer granted successfully!\n\nShare this link with recipient:\n${transferLink}\n\nRecipient address: ${transferData.recipientAddress}\nTransaction: ${grantResult.transactionHash}`);
      
      console.log('Blockchain transfer granted:', grantResult);
    } catch (error) {
      throw new Error(`Failed to create transfer: ${error.message}`);
    }
  };

  // View file info
  const handleViewInfo = (fileRecord) => {
    const info = `
File Information:
━━━━━━━━━━━━━━━━━━
📁 Name: ${fileRecord.name}
📊 Size: ${formatFileSize(fileRecord.size)}
📋 Type: ${fileRecord.type}
🔗 IPFS Hash: ${fileRecord.ipfsHash}
🔐 Encryption Key: ${fileRecord.encryptionKey}
📅 Uploaded: ${formatDate(fileRecord.uploadedAt)}
👤 Uploaded by: ${fileRecord.uploadedBy}
🌐 IPFS URL: ${fileRecord.ipfsUrl}
${fileRecord.onChain ? `⛓️ Blockchain ID: ${fileRecord.blockchainId}
📄 Transaction: ${fileRecord.transactionHash}` : ''}
    `;
    alert(info);
  };

  if (files.length === 0) {
    return (
      <div className="file-list">
        <h3>📂 Your Files</h3>
        <div className="empty-state">
          <HardDrive size={48} className="empty-icon" />
          <p>No files uploaded yet</p>
          <p className="empty-subtitle">Upload your first encrypted file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list">
      <h3>📂 Your Files ({files.length})</h3>
      
      {/* Status Messages */}
      {downloadStatus && (
        <div className="status-message success">
          <CheckCircle size={16} />
          <span>{downloadStatus}</span>
        </div>
      )}
      
      {error && (
        <div className="status-message error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="files-grid">
        {files.map((fileRecord) => (
          <div key={fileRecord.id} className="file-card">
            <div className="file-header">
              <div className="file-icon">
                {fileRecord.type?.startsWith('image/') ? '🖼️' : 
                 fileRecord.type?.startsWith('video/') ? '🎥' : 
                 fileRecord.type?.startsWith('audio/') ? '🎵' : 
                 fileRecord.type?.includes('pdf') ? '📄' : '📁'}
              </div>
              <div className="file-info">
                <h4 className="file-name">{fileRecord.name}</h4>
                <p className="file-meta">
                  {formatFileSize(fileRecord.size)} • {fileRecord.type}
                </p>
              </div>
              <div className="file-status">
                <Lock size={16} className="encrypted-icon" title="Encrypted" />
                {fileRecord.onChain && (
                  <div className="blockchain-badge" title="Recorded on blockchain">
                    ⛓️
                  </div>
                )}
              </div>
            </div>

            <div className="file-details">
              <div className="detail-item">
                <Calendar size={14} />
                <span>{formatDate(fileRecord.uploadedAt)}</span>
              </div>
              <div className="detail-item">
                <span className="ipfs-hash">
                  IPFS: {fileRecord.ipfsHash.substring(0, 12)}...
                </span>
              </div>
              {fileRecord.onChain && (
                <div className="detail-item">
                  <span className="blockchain-info">
                    Chain ID: {fileRecord.blockchainId}
                  </span>
                </div>
              )}
            </div>

            <div className="file-actions">
              <button 
                onClick={() => handleDownload(fileRecord)}
                disabled={downloadingFile === fileRecord.id}
                className="action-button download"
              >
                {downloadingFile === fileRecord.id ? (
                  <div className="button-spinner"></div>
                ) : (
                  <Download size={16} />
                )}
                {downloadingFile === fileRecord.id ? 'Downloading...' : 'Download'}
              </button>
              
              {/* NEW: Transfer Button */}
              <button
                onClick={() => handleInitiateTransfer(fileRecord)}
                className="action-button transfer-button"
                title="Transfer file"
                disabled={!fileRecord.blockchainId}
              >
                <Send size={16} />
                {fileRecord.blockchainId ? 'Transfer' : 'Re-upload Required'}
              </button>
              
              <button 
                onClick={() => handleViewInfo(fileRecord)}
                className="action-button info"
              >
                <Eye size={16} />
                Info
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* NEW: Transfer Modal */}
      <TransferModal
        isOpen={transferModal.isOpen}
        onClose={() => setTransferModal({ isOpen: false, fileRecord: null })}
        fileRecord={transferModal.fileRecord}
        onTransfer={handleTransfer}
      />
    </div>
  );
}

// ✅ IMPORTANT: Add default export
export default FileList;
