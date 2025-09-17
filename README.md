# 🚀 BlockDrop - Secure Decentralized File Sharing

BlockDrop is a cutting-edge decentralized file sharing application that combines blockchain technology with IPFS storage to provide secure, encrypted file sharing with granular access control.

## ✨ Features

- **🔐 Military-Grade Encryption**: AES-256-GCM encryption with WebAssembly for maximum security
- **🌐 Decentralized Storage**: Files stored on IPFS with metadata on Ethereum blockchain
- **🎯 Granular Access Control**: Smart contract-based permission management
- **📊 Audit Trail**: Complete access logging and file activity tracking
- **⚡ Performance Optimized**: IPFS caching layer and optimized React components
- **🛡️ Error Resilience**: Comprehensive error boundaries and loading states
- **📱 Modern UI**: Beautiful, responsive interface with glassmorphism design

## 🏗️ Architecture

### Frontend Stack
- **React 18.2.0** - Modern React with hooks and concurrent features
- **Ethers.js v6** - Ethereum blockchain interaction
- **Lucide React** - Beautiful, consistent icons
- **React Dropzone** - Drag-and-drop file uploads

### Backend Infrastructure
- **Ethereum Smart Contract** - Solidity-based access control and metadata storage
- **IPFS** - Distributed file storage with caching layer
- **MetaMask** - Wallet integration for Sepolia testnet

### Security Features
- **WebAssembly AES-256-GCM** - Hardware-accelerated encryption
- **Blockchain-based Access Control** - Immutable permission management
- **Encrypted Key Storage** - Keys stored securely on-chain
- **Comprehensive Audit Logging** - All file access tracked

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MetaMask browser extension
- Sepolia testnet ETH for gas fees

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BlockDrop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your contract address:
   ```
   REACT_APP_CONTRACT_ADDRESS=
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### MetaMask Setup

1. Install MetaMask browser extension
2. Switch to Sepolia testnet
3. Get test ETH from [Sepolia faucet](https://sepoliafaucet.com/)
4. Connect wallet to BlockDrop

## 📖 Usage Guide

### Uploading Files

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Select File**: Drag and drop or click to select file for upload
3. **Automatic Processing**: 
   - File is encrypted with AES-256-GCM
   - Uploaded to IPFS with caching
   - Metadata stored on blockchain
4. **Share Link**: Copy the generated share link to send to recipients

### Sharing Files

1. **Grant Access**: Use the "Transfer" button on any uploaded file
2. **Add Recipients**: Enter Ethereum addresses or email addresses
3. **Set Permissions**: Configure access duration and permissions
4. **Blockchain Transaction**: Approve the access grant transaction

### Receiving Files

1. **Open Share Link**: Click the BlockDrop share link
2. **Connect Wallet**: Connect with authorized wallet address
3. **Download**: File is automatically decrypted and downloaded

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React components
│   ├── FileUploader.js  # File upload with encryption
│   ├── FileList.js      # File management interface
│   ├── WalletConnector.js # MetaMask integration
│   ├── ReceiveFile.js   # File receiving interface
│   └── ErrorBoundary.js # Error handling
├── utils/               # Utility functions
│   ├── encryption.js    # AES-256-GCM encryption
│   ├── blockchain.js    # Smart contract interaction
│   ├── ipfs.js         # IPFS operations
│   └── ipfsCache.js    # IPFS caching layer
├── contracts/           # Smart contract files
│   ├── BlockDrop.sol   # Main contract
│   └── FileTransfer.json # Contract ABI
└── App.js              # Main application
```

### Available Scripts

- `npm start` - Start development server
- `npm test` - Run test suite
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

### Key Components

**FileUploader**: Handles file encryption, IPFS upload, and blockchain storage
**FileList**: Displays user files with transfer and management options
**WalletConnector**: MetaMask integration and wallet management
**ReceiveFile**: Processes shared file links and handles decryption

## 🔧 Configuration

### Environment Variables
```bash
REACT_APP_CONTRACT_ADDRESS=0x... # Your deployed contract address
REACT_APP_IPFS_GATEWAY=https://... # Custom IPFS gateway (optional)
```

### Smart Contract Deployment
1. Deploy `BlockDrop.sol` to Sepolia testnet
2. Update contract address in `.env`
3. Verify contract on Etherscan for transparency

## 🔒 Security Considerations

- **Encryption Keys**: Never stored in localStorage, only on blockchain
- **Access Control**: Enforced at smart contract level
- **File Privacy**: Files encrypted before IPFS upload
- **Audit Trail**: All access logged immutably on blockchain

## 🚨 Known Limitations

- **Contract Address**: Currently uses placeholder - deploy your own contract
- **Network**: Only supports Sepolia testnet
- **File Size**: Limited by IPFS gateway constraints
- **Gas Costs**: Blockchain operations require ETH for gas

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: Check the `/docs` folder for detailed guides
- **Community**: Join our Discord for support and discussions

## 🔮 Roadmap

- [ ] Multi-chain support (Polygon, Arbitrum)
- [ ] Progressive Web App features
- [ ] File versioning and history
- [ ] Advanced permission templates
- [ ] Integration with ENS domains
- [ ] Mobile app development

---

Built with ❤️ using React, Ethereum, and IPFS



# CipherDrive

Decentralized, end-to-end encrypted file storage and sharing system powered by IPFS and Ethereum blockchain.

## Features

- Encrypt files client-side for privacy
- Store encrypted files on IPFS (decentralized storage)
- Record file metadata and permission logs on Ethereum blockchain for integrity and auditability
- Share and transfer files securely with blockchain-based access control
- Seamless MetaMask integration for authentication and contract interactions

## Tech Stack

- React (frontend)
- Solidity (smart contracts)
- IPFS (storage)
- Ethereum (Sepolia or Goerli testnet)
- MetaMask

## Getting Started

1. Clone the repository:
    ```
    git clone https://github.com/yourusername/CipherDrive.git
    cd CipherDrive
    ```
2. Install dependencies:
    ```
    npm install
    ```
3. Configure your Infura/IPFS keys in `.env`
4. Deploy contracts to Sepolia testnet:
    ```
    npm run deploy
    ```
5. Start the development server:
    ```
    npm start
    ```

## License

MIT License (see LICENSE file)

## Screenshot

![CipherDrive Demo](demo/screenshot.png)

## Author

- [Your Name](https://github.com/yourusername)

## Tags

`blockchain` `IPFS` `smart-contracts` `web3` `file-sharing` `decentralized-storage` `encryption` `MetaMask`

