// 🔐 SECURE AES-256-GCM ENCRYPTION USING WEB CRYPTO API
// Replaces weak XOR encryption with military-grade AES encryption

// Helper function to convert ArrayBuffer to base64 without call stack overflow
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in 8KB chunks
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
};

// Helper function to convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
};

// Generate a cryptographically secure 256-bit encryption key
export const generateEncryptionKey = async () => {
  try {
    console.log('🔑 Generating AES-256 encryption key...');
    
    // Generate 256-bit key using Web Crypto API
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    
    // Export key to raw format for storage
    const keyBuffer = await crypto.subtle.exportKey('raw', key);
    const keyArray = new Uint8Array(keyBuffer);
    const keyHex = Array.from(keyArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    console.log('✅ AES-256 key generated successfully');
    return keyHex;
  } catch (error) {
    console.error('❌ Key generation failed:', error);
    throw new Error(`Key generation failed: ${error.message}`);
  }
};

// AES-256-GCM encryption with authentication
export const encryptFile = async (fileData, keyHex) => {
  try {
    console.log('🔒 Starting AES-256-GCM encryption...');
    console.log('📊 File size:', fileData.byteLength, 'bytes');
    
    if (!fileData || fileData.byteLength === 0) {
      throw new Error('No file data provided');
    }
    
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('Invalid encryption key - must be 64 hex characters (256 bits)');
    }
    
    // Convert hex key back to CryptoKey
    const keyBuffer = new Uint8Array(keyHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Generate random 96-bit IV (12 bytes) for GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the file data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      fileData
    );
    
    // Combine IV + encrypted data for storage
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert to base64 for IPFS storage (chunk-based to avoid call stack overflow)
    const base64Data = arrayBufferToBase64(combined);
    
    console.log('✅ AES-256-GCM encryption completed');
    console.log('📏 Encrypted size:', combined.length, 'bytes');
    
    return {
      success: true,
      encryptedData: base64Data,
      key: keyHex,
      algorithm: 'AES-256-GCM'
    };
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// AES-256-GCM decryption with authentication verification
export const decryptFile = async (encryptedData, keyHex) => {
  try {
    console.log('🔓 Starting AES-256-GCM decryption...');
    
    if (!encryptedData || !keyHex) {
      throw new Error('Missing encrypted data or decryption key');
    }
    
    if (keyHex.length !== 64) {
      throw new Error('Invalid decryption key format');
    }
    
    // Convert base64 back to binary
    const combined = base64ToArrayBuffer(encryptedData);
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    // Convert hex key back to CryptoKey
    const keyBuffer = new Uint8Array(keyHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      encryptedBuffer
    );
    
    console.log('✅ AES-256-GCM decryption completed');
    console.log('📏 Decrypted size:', decryptedBuffer.byteLength, 'bytes');
    
    return {
      success: true,
      data: new Uint8Array(decryptedBuffer)
    };
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    
    // Provide specific error messages
    let errorMessage = error.message;
    if (error.name === 'OperationError') {
      errorMessage = 'Decryption failed - invalid key or corrupted data';
    } else if (error.name === 'InvalidAccessError') {
      errorMessage = 'Authentication failed - data may have been tampered with';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// 🔐 UTILITY: Encrypt data for blockchain storage (for keys/metadata)
export const encryptForBlockchain = async (data, walletAddress) => {
  try {
    const key = await generateEncryptionKey();
    const encrypted = await encryptFile(new TextEncoder().encode(data), key);
    
    return {
      success: true,
      encryptedData: encrypted.encryptedData,
      key: key
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🔓 UTILITY: Decrypt data from blockchain storage
export const decryptFromBlockchain = async (encryptedData, key) => {
  try {
    const decrypted = await decryptFile(encryptedData, key);
    if (decrypted.success) {
      return {
        success: true,
        data: new TextDecoder().decode(decrypted.data)
      };
    }
    return decrypted;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
