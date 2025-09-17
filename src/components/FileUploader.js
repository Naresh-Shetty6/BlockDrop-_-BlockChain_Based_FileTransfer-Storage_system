import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { encryptFile, generateEncryptionKey } from '../utils/encryption';
import { uploadToIPFSCached } from '../utils/ipfsCache';
import { storeFileOnBlockchain } from '../utils/blockchain';

function FileUploader({ account, files, setFiles }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setIsUploading(true);
    setError('');
    setUploadStatus('Starting upload...');

    try {
      // Step 1: Read file data
      setUploadStatus('Reading file...');
      const fileData = await file.arrayBuffer();
      
      // Step 2: Generate AES-256 encryption key
      setUploadStatus('Generating AES-256 encryption key...');
      const encryptionKey = await generateEncryptionKey();
      
      // Step 3: Encrypt file with AES-256-GCM
      setUploadStatus('Encrypting file with AES-256-GCM...');
      const encryptionResult = await encryptFile(fileData, encryptionKey);
      
      if (!encryptionResult.success) {
        throw new Error(`Encryption failed: ${encryptionResult.error}`);
      }
      
      // Step 4: Upload to IPFS
      setUploadStatus('Uploading to IPFS...');
      const uploadResult = await uploadToIPFSCached(
        new TextEncoder().encode(encryptionResult.encryptedData),
        `encrypted_${file.name}`
      );
      
      if (!uploadResult.success) {
        throw new Error(`IPFS upload failed: ${uploadResult.error}`);
      }
      
      // Step 5: Record on blockchain with encrypted key (REQUIRED)
      setUploadStatus('Recording on blockchain...');
      const blockchainResult = await storeFileOnBlockchain(
        uploadResult.hash,
        file.name,
        encryptionKey
      );
      
      if (!blockchainResult.success) {
        throw new Error(`Blockchain recording failed: ${blockchainResult.error}`);
      }
      
      // Step 6: Create file record with blockchain data
      console.log('✅ Blockchain recording successful:', blockchainResult);
      
      const fileRecord = {
        id: blockchainResult.blockchainId,
        name: file.name,
        size: file.size,
        type: file.type,
        ipfsHash: uploadResult.hash,
        encryptionKey: encryptionKey,
        uploadedAt: new Date().toISOString(),
        uploadedBy: account,
        ipfsUrl: uploadResult.url,
        // Blockchain fields
        blockchainId: blockchainResult.blockchainId,
        transactionHash: blockchainResult.transactionHash,
        gasUsed: blockchainResult.gasUsed,
        onChain: true
      };
      
      setUploadStatus('✅ File uploaded with AES-256 encryption and recorded on blockchain!');
      
      // Add to files list
      setFiles(prevFiles => [...prevFiles, fileRecord]);
      
      console.log('File upload complete:', fileRecord);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError(`Upload failed: ${error.message}`);
      setUploadStatus('');
    } finally {
      setIsUploading(false);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setUploadStatus('');
        setError('');
      }, 5000);
    }
  }, [account, setFiles]);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB limit
  });

  return (
    <div className="file-uploader">
      <h3>🔒 Upload Encrypted Files</h3>
      <p>Files are encrypted before upload and stored on IPFS</p>
      
      {/* Drag and Drop Area */}
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${isUploading ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="dropzone-content">
          <Upload size={48} className="upload-icon" />
          
          {isUploading ? (
            <div className="uploading">
              <div className="spinner"></div>
              <p>Uploading...</p>
            </div>
          ) : isDragActive ? (
            <p>Drop the file here...</p>
          ) : (
            <div>
              <p>Drag & drop a file here, or <span className="click-text">click to select</span></p>
              <p className="file-limit">Maximum file size: 10MB</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Messages */}
      {uploadStatus && (
        <div className="status-message success">
          <CheckCircle size={16} />
          <span>{uploadStatus}</span>
        </div>
      )}
      
      {error && (
        <div className="status-message error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {/* Upload Process Info */}
      <div className="upload-process">
        <h4>🔐 Security Process:</h4>
        <ol>
          <li><Lock size={14} /> File is encrypted with unique key</li>
          <li>📡 Encrypted file uploaded to IPFS</li>
          <li>⛓️ File metadata recorded on blockchain</li>
          <li>🔗 Only you have the decryption key</li>
        </ol>
      </div>
    </div>
  );
}

export default FileUploader;
