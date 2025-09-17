// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BlockDrop {
    struct FileRecord {
        address owner;
        string ipfsHash;
        bytes32 fileHash;
        string encryptedKey;  // AES key encrypted for owner
        uint32 timestamp;
        bool active;
        uint256 accessCount;
    }
    
    struct AccessPermission {
        address recipient;
        string encryptedKeyForRecipient;  // AES key encrypted for recipient
        uint32 grantedAt;
        uint32 expiresAt;  // 0 = never expires
        bool active;
    }
    
    struct AuditLog {
        address user;
        uint256 fileId;
        string action;  // "upload", "share", "access", "revoke"
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
    
    event FileStored(
        uint256 indexed fileId,
        address indexed owner,
        string ipfsHash,
        bytes32 fileHash
    );
    
    event AccessGranted(
        uint256 indexed fileId,
        address indexed owner,
        address indexed recipient,
        uint32 expiresAt
    );
    
    event AccessRevoked(
        uint256 indexed fileId,
        address indexed owner,
        address indexed recipient
    );
    
    event FileAccessed(
        uint256 indexed fileId,
        address indexed user,
        uint32 timestamp
    );
    
    modifier onlyFileOwner(uint256 _fileId) {
        require(files[_fileId].owner == msg.sender, "Not file owner");
        _;
    }
    
    modifier fileExists(uint256 _fileId) {
        require(_fileId > 0 && _fileId <= fileCount, "File does not exist");
        _;
    }
    
    // 📁 STORE FILE WITH ENCRYPTED KEY
    function storeFile(
        string calldata _ipfsHash,
        bytes32 _fileHash,
        string calldata _encryptedKey
    ) external returns (uint256) {
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
        
        // Log upload action
        _addAuditLog(fileCount, msg.sender, "upload", "File uploaded to IPFS");
        
        emit FileStored(fileCount, msg.sender, _ipfsHash, _fileHash);
        
        return fileCount;
    }
    
    // 🔐 GRANT ACCESS TO RECIPIENT
    function grantAccess(
        uint256 _fileId,
        address _recipient,
        string calldata _encryptedKeyForRecipient,
        uint32 _expiresAt
    ) external fileExists(_fileId) onlyFileOwner(_fileId) {
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != msg.sender, "Cannot grant access to yourself");
        
        // Store permission
        filePermissions[_fileId][_recipient] = AccessPermission({
            recipient: _recipient,
            encryptedKeyForRecipient: _encryptedKeyForRecipient,
            grantedAt: uint32(block.timestamp),
            expiresAt: _expiresAt,
            active: true
        });
        
        // Add to recipients list if not already there
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
        
        // Log access grant
        _addAuditLog(_fileId, msg.sender, "share", 
            string(abi.encodePacked("Access granted to ", _addressToString(_recipient))));
        
        emit AccessGranted(_fileId, msg.sender, _recipient, _expiresAt);
    }
    
    // 🚫 REVOKE ACCESS FROM RECIPIENT
    function revokeAccess(
        uint256 _fileId,
        address _recipient
    ) external fileExists(_fileId) onlyFileOwner(_fileId) {
        require(filePermissions[_fileId][_recipient].active, "Access not granted");
        
        filePermissions[_fileId][_recipient].active = false;
        
        // Log access revocation
        _addAuditLog(_fileId, msg.sender, "revoke", 
            string(abi.encodePacked("Access revoked from ", _addressToString(_recipient))));
        
        emit AccessRevoked(_fileId, msg.sender, _recipient);
    }
    
    // 🔍 CHECK ACCESS PERMISSION
    function hasAccess(uint256 _fileId, address _user) 
        external view fileExists(_fileId) returns (bool) {
        // Owner always has access
        if (files[_fileId].owner == _user) {
            return true;
        }
        
        AccessPermission memory permission = filePermissions[_fileId][_user];
        
        // Check if permission exists and is active
        if (!permission.active) {
            return false;
        }
        
        // Check if permission has expired
        if (permission.expiresAt > 0 && permission.expiresAt < block.timestamp) {
            return false;
        }
        
        return true;
    }
    
    // 🔑 GET DECRYPTION KEY (only if user has access)
    function getDecryptionKey(uint256 _fileId) 
        external fileExists(_fileId) returns (string memory) {
        require(files[_fileId].active, "File is inactive");
        
        // Owner gets their encrypted key
        if (files[_fileId].owner == msg.sender) {
            files[_fileId].accessCount++;
            _addAuditLog(_fileId, msg.sender, "access", "Owner accessed file");
            emit FileAccessed(_fileId, msg.sender, uint32(block.timestamp));
            return files[_fileId].encryptedKey;
        }
        
        // Check recipient access
        AccessPermission memory permission = filePermissions[_fileId][msg.sender];
        require(permission.active, "Access denied");
        require(permission.expiresAt == 0 || permission.expiresAt >= block.timestamp, 
                "Access expired");
        
        files[_fileId].accessCount++;
        _addAuditLog(_fileId, msg.sender, "access", "Recipient accessed file");
        emit FileAccessed(_fileId, msg.sender, uint32(block.timestamp));
        
        return permission.encryptedKeyForRecipient;
    }
    
    // 📊 GET FILE INFO
    function getFile(uint256 _fileId) 
        external view fileExists(_fileId) returns (FileRecord memory) {
        return files[_fileId];
    }
    
    // 📋 GET USER'S FILES
    function getUserFiles(address _user) 
        external view returns (uint256[] memory) {
        return userFiles[_user];
    }
    
    // 👥 GET FILE RECIPIENTS
    function getFileRecipients(uint256 _fileId) 
        external view fileExists(_fileId) returns (address[] memory) {
        require(files[_fileId].owner == msg.sender, "Not file owner");
        return fileRecipients[_fileId];
    }
    
    // 📜 GET AUDIT LOGS
    function getAuditLogs(uint256 _fileId) 
        external view fileExists(_fileId) returns (AuditLog[] memory) {
        require(files[_fileId].owner == msg.sender, "Not file owner");
        return auditLogs[_fileId];
    }
    
    // 🔒 DEACTIVATE FILE
    function deactivateFile(uint256 _fileId) 
        external fileExists(_fileId) onlyFileOwner(_fileId) {
        files[_fileId].active = false;
        _addAuditLog(_fileId, msg.sender, "deactivate", "File deactivated");
    }
    
    // 📝 INTERNAL: Add audit log entry
    function _addAuditLog(
        uint256 _fileId,
        address _user,
        string memory _action,
        string memory _details
    ) internal {
        auditLogs[_fileId].push(AuditLog({
            user: _user,
            fileId: _fileId,
            action: _action,
            timestamp: uint32(block.timestamp),
            details: _details
        }));
        totalAuditLogs++;
    }
    
    // 🔧 UTILITY: Convert address to string
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
