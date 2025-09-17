import { ethers } from 'ethers';

// 🔧 CONTRACT CONFIGURATION - Set via environment variables
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const CONTRACT_ABI = [
    // File Storage
    "function storeFile(string calldata _ipfsHash, bytes32 _fileHash, string calldata _encryptedKey) external returns (uint256)",
    "function getFile(uint256 _fileId) external view returns (tuple(address owner, string ipfsHash, bytes32 fileHash, string encryptedKey, uint32 timestamp, bool active, uint256 accessCount))",
    "function getUserFiles(address _user) external view returns (uint256[] memory)",
    "function deactivateFile(uint256 _fileId) external",
    
    // Access Control
    "function grantAccess(uint256 _fileId, address _recipient, string calldata _encryptedKeyForRecipient, uint32 _expiresAt) external",
    "function revokeAccess(uint256 _fileId, address _recipient) external",
    "function hasAccess(uint256 _fileId, address _user) external view returns (bool)",
    "function getDecryptionKey(uint256 _fileId) external returns (string memory)",
    "function getFileRecipients(uint256 _fileId) external view returns (address[] memory)",
    
    // Audit Trail
    "function getAuditLogs(uint256 _fileId) external view returns (tuple(address user, uint256 fileId, string action, uint32 timestamp, string details)[] memory)",
    
    // Events
    "event FileStored(uint256 indexed fileId, address indexed owner, string ipfsHash, bytes32 fileHash)",
    "event AccessGranted(uint256 indexed fileId, address indexed owner, address indexed recipient, uint32 expiresAt)",
    "event AccessRevoked(uint256 indexed fileId, address indexed owner, address indexed recipient)",
    "event FileAccessed(uint256 indexed fileId, address indexed user, uint32 timestamp)"
];

export const getContract = async () => {
    if (!CONTRACT_ADDRESS) {
        throw new Error('Smart contract address not configured. Check REACT_APP_CONTRACT_ADDRESS in environment.');
    }
    if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    throw new Error('MetaMask not detected. Please install MetaMask to use BlockDrop.');
};

export const connectToBlockchain = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const network = await provider.getNetwork();
  
  console.log('Connected to network:', network.name, network.chainId);
  
  return { provider, signer, network };
};

// 📁 STORE FILE WITH ENCRYPTED KEY ON BLOCKCHAIN
export const storeFileOnBlockchain = async (ipfsHash, originalFileName, encryptedKey) => {
    try {
        console.log('🔗 Storing file metadata on blockchain...');
        
        const contract = await getContract();
        
        // Create file hash from name + IPFS hash
        const fileHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(originalFileName + ipfsHash)
        );
        
        // Submit transaction with encrypted key
        const tx = await contract.storeFile(ipfsHash, fileHash, encryptedKey, {
            gasLimit: 500000  // Increased for new contract
        });
        
        console.log('📤 Transaction submitted:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed:', receipt.transactionHash);
        
        // Extract file ID from events
        const event = receipt.events?.find(e => e.event === 'FileStored');
        const fileId = event?.args?.fileId?.toNumber();
        
        return {
            success: true,
            transactionHash: receipt.transactionHash,
            blockchainId: fileId,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error('❌ Blockchain storage failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 🔐 GRANT ACCESS TO RECIPIENT
export const grantFileAccess = async (fileId, recipientAddress, encryptedKeyForRecipient, expiresAt = 0) => {
    try {
        console.log('🔑 Granting file access...');
        
        const contract = await getContract();
        
        const tx = await contract.grantAccess(
            fileId, 
            recipientAddress, 
            encryptedKeyForRecipient, 
            expiresAt,
            { gasLimit: 300000 }
        );
        
        console.log('📤 Access grant transaction:', tx.hash);
        const receipt = await tx.wait();
        
        return {
            success: true,
            transactionHash: receipt.transactionHash,
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error('❌ Access grant failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 🚫 REVOKE ACCESS FROM RECIPIENT
export const revokeFileAccess = async (fileId, recipientAddress) => {
    try {
        console.log('🚫 Revoking file access...');
        
        const contract = await getContract();
        
        const tx = await contract.revokeAccess(fileId, recipientAddress, {
            gasLimit: 200000
        });
        
        const receipt = await tx.wait();
        
        return {
            success: true,
            transactionHash: receipt.transactionHash
        };
    } catch (error) {
        console.error('❌ Access revocation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 🔍 CHECK IF USER HAS ACCESS TO FILE
export const checkFileAccess = async (fileId, userAddress) => {
    try {
        const contract = await getContract();
        const hasAccess = await contract.hasAccess(fileId, userAddress);
        
        return {
            success: true,
            hasAccess: hasAccess
        };
    } catch (error) {
        console.error('❌ Access check failed:', error);
        return {
            success: false,
            error: error.message,
            hasAccess: false
        };
    }
};

// 🔑 GET DECRYPTION KEY (with access verification)
export const getDecryptionKeyFromBlockchain = async (fileId) => {
    try {
        console.log('🔑 Retrieving decryption key...');
        
        const contract = await getContract();
        
        // This will automatically check access and log the action
        const encryptedKey = await contract.getDecryptionKey(fileId, {
            gasLimit: 200000
        });
        
        return {
            success: true,
            encryptedKey: encryptedKey
        };
    } catch (error) {
        console.error('❌ Key retrieval failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 📋 GET USER'S FILES FROM BLOCKCHAIN
export const getUserFilesFromBlockchain = async (userAddress) => {
    try {
        console.log('📋 Fetching user files from blockchain...');
        
        const contract = await getContract();
        const fileIds = await contract.getUserFiles(userAddress);
        
        const files = [];
        for (let id of fileIds) {
            const fileData = await contract.getFile(id);
            files.push({
                blockchainId: id.toNumber(),
                owner: fileData.owner,
                ipfsHash: fileData.ipfsHash,
                fileHash: fileData.fileHash,
                encryptedKey: fileData.encryptedKey,
                timestamp: fileData.timestamp * 1000,
                active: fileData.active,
                accessCount: fileData.accessCount.toNumber()
            });
        }
        
        console.log('✅ Retrieved', files.length, 'files');
        return { success: true, files };
    } catch (error) {
        console.error('❌ Failed to fetch blockchain files:', error);
        return { success: false, error: error.message };
    }
};

// 👥 GET FILE RECIPIENTS
export const getFileRecipients = async (fileId) => {
    try {
        const contract = await getContract();
        const recipients = await contract.getFileRecipients(fileId);
        
        return {
            success: true,
            recipients: recipients
        };
    } catch (error) {
        console.error('❌ Failed to get recipients:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 📜 GET AUDIT LOGS
export const getFileAuditLogs = async (fileId) => {
    try {
        const contract = await getContract();
        const logs = await contract.getAuditLogs(fileId);
        
        const formattedLogs = logs.map(log => ({
            user: log.user,
            fileId: log.fileId.toNumber(),
            action: log.action,
            timestamp: log.timestamp * 1000,
            details: log.details
        }));
        
        return {
            success: true,
            logs: formattedLogs
        };
    } catch (error) {
        console.error('❌ Failed to get audit logs:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// 🔧 UTILITY: Set contract address (for deployment)
export const setContractAddress = (address) => {
    if (ethers.utils.isAddress(address)) {
        // CONTRACT_ADDRESS = address; // Cannot reassign const
        console.log('✅ Contract address would be updated:', address);
        console.log('⚠️ To update contract address, modify the environment variable REACT_APP_CONTRACT_ADDRESS');
        return true;
    }
    console.error('❌ Invalid contract address:', address);
    return false;
};
