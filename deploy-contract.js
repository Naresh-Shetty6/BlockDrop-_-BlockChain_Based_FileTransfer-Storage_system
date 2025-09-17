require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Contract source code
const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BlockDrop {
    struct FileRecord {
        address owner;
        string ipfsHash;
        bytes32 fileHash;
        string encryptedKey;
        uint32 timestamp;
        bool active;
        uint256 accessCount;
    }
    
    struct AccessPermission {
        address recipient;
        string encryptedKeyForRecipient;
        uint32 grantedAt;
        uint32 expiresAt;
        bool active;
    }
    
    struct AuditLog {
        address user;
        uint256 fileId;
        string action;
        uint32 timestamp;
        string details;
    }
    
    mapping(uint256 => FileRecord) public files;
    mapping(address => uint256[]) public userFiles;
    mapping(uint256 => mapping(address => AccessPermission)) public filePermissions;
    mapping(uint256 => address[]) public fileRecipients;
    mapping(uint256 => AuditLog[]) public auditLogs;
    
    uint256 public fileCount;
    uint256 public totalAuditLogs;
    
    event FileStored(uint256 indexed fileId, address indexed owner, string ipfsHash, bytes32 fileHash);
    event AccessGranted(uint256 indexed fileId, address indexed owner, address indexed recipient, uint32 expiresAt);
    event AccessRevoked(uint256 indexed fileId, address indexed owner, address indexed recipient);
    event FileAccessed(uint256 indexed fileId, address indexed user, uint32 timestamp);
    
    modifier onlyFileOwner(uint256 _fileId) {
        require(files[_fileId].owner == msg.sender, "Not file owner");
        _;
    }
    
    modifier fileExists(uint256 _fileId) {
        require(_fileId > 0 && _fileId <= fileCount, "File does not exist");
        _;
    }
    
    function storeFile(string calldata _ipfsHash, bytes32 _fileHash, string calldata _encryptedKey) external returns (uint256) {
        fileCount++;
        files[fileCount] = FileRecord({
            owner: msg.sender,
            ipfsHash: _ipfsHash,
            fileHash: _fileHash,
            encryptedKey: _encryptedKey,
            timestamp: uint32(block.timestamp),
            active: true,
            accessCount: 0
        });
        userFiles[msg.sender].push(fileCount);
        _addAuditLog(fileCount, msg.sender, "upload", "File uploaded to IPFS");
        emit FileStored(fileCount, msg.sender, _ipfsHash, _fileHash);
        return fileCount;
    }
    
    function grantAccess(uint256 _fileId, address _recipient, string calldata _encryptedKeyForRecipient, uint32 _expiresAt) external fileExists(_fileId) onlyFileOwner(_fileId) {
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != msg.sender, "Cannot grant access to yourself");
        
        filePermissions[_fileId][_recipient] = AccessPermission({
            recipient: _recipient,
            encryptedKeyForRecipient: _encryptedKeyForRecipient,
            grantedAt: uint32(block.timestamp),
            expiresAt: _expiresAt,
            active: true
        });
        
        bool recipientExists = false;
        address[] storage recipients = fileRecipients[_fileId];
        for (uint i = 0; i < recipients.length; i++) {
            if (recipients[i] == _recipient) {
                recipientExists = true;
                break;
            }
        }
        if (!recipientExists) {
            fileRecipients[_fileId].push(_recipient);
        }
        
        _addAuditLog(_fileId, msg.sender, "share", "Access granted");
        emit AccessGranted(_fileId, msg.sender, _recipient, _expiresAt);
    }
    
    function revokeAccess(uint256 _fileId, address _recipient) external fileExists(_fileId) onlyFileOwner(_fileId) {
        require(filePermissions[_fileId][_recipient].active, "Access not granted");
        filePermissions[_fileId][_recipient].active = false;
        _addAuditLog(_fileId, msg.sender, "revoke", "Access revoked");
        emit AccessRevoked(_fileId, msg.sender, _recipient);
    }
    
    function hasAccess(uint256 _fileId, address _user) external view fileExists(_fileId) returns (bool) {
        if (files[_fileId].owner == _user) return true;
        AccessPermission memory permission = filePermissions[_fileId][_user];
        if (!permission.active) return false;
        if (permission.expiresAt > 0 && permission.expiresAt < block.timestamp) return false;
        return true;
    }
    
    function getDecryptionKey(uint256 _fileId) external fileExists(_fileId) returns (string memory) {
        require(files[_fileId].active, "File is inactive");
        
        if (files[_fileId].owner == msg.sender) {
            files[_fileId].accessCount++;
            _addAuditLog(_fileId, msg.sender, "access", "Owner accessed file");
            emit FileAccessed(_fileId, msg.sender, uint32(block.timestamp));
            return files[_fileId].encryptedKey;
        }
        
        AccessPermission memory permission = filePermissions[_fileId][msg.sender];
        require(permission.active, "Access denied");
        require(permission.expiresAt == 0 || permission.expiresAt >= block.timestamp, "Access expired");
        
        files[_fileId].accessCount++;
        _addAuditLog(_fileId, msg.sender, "access", "Recipient accessed file");
        emit FileAccessed(_fileId, msg.sender, uint32(block.timestamp));
        
        return permission.encryptedKeyForRecipient;
    }
    
    function getFile(uint256 _fileId) external view fileExists(_fileId) returns (FileRecord memory) {
        return files[_fileId];
    }
    
    function getUserFiles(address _user) external view returns (uint256[] memory) {
        return userFiles[_user];
    }
    
    function getFileRecipients(uint256 _fileId) external view fileExists(_fileId) returns (address[] memory) {
        require(files[_fileId].owner == msg.sender, "Not file owner");
        return fileRecipients[_fileId];
    }
    
    function getAuditLogs(uint256 _fileId) external view fileExists(_fileId) returns (AuditLog[] memory) {
        require(files[_fileId].owner == msg.sender, "Not file owner");
        return auditLogs[_fileId];
    }
    
    function deactivateFile(uint256 _fileId) external fileExists(_fileId) onlyFileOwner(_fileId) {
        files[_fileId].active = false;
        _addAuditLog(_fileId, msg.sender, "deactivate", "File deactivated");
    }
    
    function _addAuditLog(uint256 _fileId, address _user, string memory _action, string memory _details) internal {
        auditLogs[_fileId].push(AuditLog({
            user: _user,
            fileId: _fileId,
            action: _action,
            timestamp: uint32(block.timestamp),
            details: _details
        }));
        totalAuditLogs++;
    }
}
`;

async function deployContract() {
    console.log('🚀 Starting BlockDrop contract deployment...');
    
    // Check if we have a private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ PRIVATE_KEY not found in environment variables');
        console.log('Please add your private key to .env file:');
        console.log('PRIVATE_KEY=your_private_key_here');
        return;
    }
    
    // Connect to Sepolia using multiple RPC endpoints for reliability
    const rpcUrls = [
        'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        'https://rpc.sepolia.org',
        'https://eth-sepolia.public.blastapi.io'
    ];
    
    let provider;
    for (const url of rpcUrls) {
        try {
            provider = new ethers.providers.JsonRpcProvider({
                url: url,
                timeout: 30000
            });
            await provider.getNetwork(); // Test connection
            console.log('✅ Connected to Sepolia via:', url);
            break;
        } catch (error) {
            console.log('⚠️ Failed to connect to:', url);
            continue;
        }
    }
    
    if (!provider) {
        throw new Error('Failed to connect to any Sepolia RPC endpoint');
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('📍 Deployer address:', wallet.address);
    
    // Check balance
    const balance = await wallet.getBalance();
    console.log('💰 Balance:', ethers.utils.formatEther(balance), 'ETH');
    
    if (balance.lt(ethers.utils.parseEther('0.01'))) {
        console.error('❌ Insufficient balance. Need at least 0.01 ETH for deployment');
        console.log('Get Sepolia ETH from: https://sepoliafaucet.com/');
        return;
    }
    
    // Compile contract
    console.log('🔨 Compiling contract...');
    const solc = require('solc');
    
    const input = {
        language: 'Solidity',
        sources: {
            'BlockDrop.sol': {
                content: contractSource
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        console.error('❌ Compilation errors:', output.errors);
        return;
    }
    
    const contract = output.contracts['BlockDrop.sol']['BlockDrop'];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;
    
    // Deploy contract
    console.log('📦 Deploying contract...');
    const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);
    const deployedContract = await contractFactory.deploy({
        gasLimit: 3000000,
        gasPrice: ethers.utils.parseUnits('20', 'gwei')
    });
    
    console.log('⏳ Waiting for deployment confirmation...');
    await deployedContract.deployed();
    
    console.log('✅ Contract deployed successfully!');
    console.log('📍 Contract address:', deployedContract.address);
    console.log('🔗 Transaction hash:', deployedContract.deployTransaction.hash);
    console.log('⛽ Gas used:', deployedContract.deployTransaction.gasLimit.toString());
    
    // Update .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update contract address
    const newEnvContent = envContent.replace(
        /REACT_APP_CONTRACT_ADDRESS=.*/,
        `REACT_APP_CONTRACT_ADDRESS=${deployedContract.address}`
    );
    
    fs.writeFileSync(envPath, newEnvContent);
    
    console.log('✅ Updated .env file with contract address');
    console.log('\n🎉 Deployment completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Restart your React application');
    console.log('2. Connect your MetaMask wallet');
    console.log('3. Upload and test files');
    
    return deployedContract.address;
}

// Run deployment
if (require.main === module) {
    deployContract()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Deployment failed:', error);
            process.exit(1);
        });
}

module.exports = { deployContract };
