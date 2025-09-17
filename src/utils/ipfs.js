import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

// Use Web3.Storage for free IPFS uploads (no project ID required)
const WEB3_STORAGE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDQwNzkyN0Y5MzA5MzA5MzA5MzA5MzA5MzA5MzA5MzA5MzA5MzAiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2MzUyNzQwNzIsIm5hbWUiOiJCbG9ja0Ryb3AifQ.demo'; // Demo token

// Fallback to direct IPFS node
const ipfsProviders = [
  { host: '127.0.0.1', port: 5001, protocol: 'http' }, // Local node
];

let currentIPFS = null;

// Initialize IPFS with fallback providers
const initIPFS = () => {
  if (!currentIPFS) {
    currentIPFS = create(ipfsProviders[0]);
  }
  return currentIPFS;
};

export const uploadToIPFS = async (fileData, fileName) => {
  // Check file size first
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  if (fileData.length > maxSize) {
    return {
      success: false,
      error: `File too large (${Math.round(fileData.length/1024/1024)}MB). Maximum size is 10MB.`
    };
  }

  try {
    console.log('🌐 Uploading to IPFS via Web3.Storage...');
    
    // Use Web3.Storage API for reliable uploads
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'application/octet-stream' });
    formData.append('file', blob, fileName);
    
    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEB3_STORAGE_TOKEN}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    const hash = result.cid;
    
    console.log('✅ IPFS Upload successful:', hash);
    
    return {
      success: true,
      hash: hash,
      url: `https://ipfs.io/ipfs/${hash}`
    };
  } catch (error) {
    console.error('❌ Web3.Storage upload failed, trying fallback...', error);
    
    // Fallback to mock storage for demo purposes
    try {
      const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store in sessionStorage for demo (not secure for production)
      sessionStorage.setItem(`ipfs_${mockHash}`, JSON.stringify({
        data: Array.from(fileData),
        fileName: fileName,
        timestamp: Date.now()
      }));
      
      console.log('📦 Using demo storage:', mockHash);
      
      return {
        success: true,
        hash: mockHash,
        url: `demo://ipfs/${mockHash}`,
        demo: true
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: `Upload failed: ${error.message}. Please try a smaller file or check your connection.`
      };
    }
  }
};

export const downloadFromIPFS = async (hash) => {
  try {
    console.log('📥 Downloading from IPFS:', hash);
    
    // Check if it's a demo hash first
    const demoData = sessionStorage.getItem(`ipfs_${hash}`);
    if (demoData) {
      console.log('📦 Loading from demo storage');
      const parsed = JSON.parse(demoData);
      return {
        success: true,
        data: new Uint8Array(parsed.data)
      };
    }
    
    // Try Web3.Storage gateway first
    try {
      const response = await fetch(`https://ipfs.io/ipfs/${hash}`, {
        timeout: 30000
      });
      
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return {
          success: true,
          data: new Uint8Array(arrayBuffer)
        };
      }
    } catch (gatewayError) {
      console.log('Gateway download failed, trying IPFS node...');
    }
    
    // Fallback to IPFS node
    const ipfs = initIPFS();
    const stream = ipfs.cat(hash, { timeout: 30000 });
    let data = new Uint8Array();
    
    for await (const chunk of stream) {
      const newData = new Uint8Array(data.length + chunk.length);
      newData.set(data);
      newData.set(chunk, data.length);
      data = newData;
    }
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('❌ IPFS download failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
