require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function deploySimple() {
    console.log('🚀 Simple BlockDrop deployment...');
    
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error('❌ Add PRIVATE_KEY to .env file');
        return;
    }

    // Use public Sepolia RPC
    const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('📍 Deployer:', wallet.address);
    
    // Check balance
    const balance = await wallet.getBalance();
    console.log('💰 Balance:', ethers.utils.formatEther(balance), 'ETH');
    
    if (balance.lt(ethers.utils.parseEther('0.005'))) {
        console.error('❌ Need at least 0.005 ETH. Get from: https://sepoliafaucet.com/');
        return;
    }

    // Use Hardhat to deploy the actual BlockDrop contract
    console.log('📦 Deploying via Hardhat...');
    
    // This will use the existing hardhat deployment
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
        const deployProcess = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'sepolia'], {
            stdio: 'inherit'
        });
        
        deployProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Hardhat deployment completed');
                resolve('deployed');
            } else {
                reject(new Error('Hardhat deployment failed'));
            }
        });
    });

    console.log('📦 Deploying contract...');
    
    const tx = {
        data: contractBytecode,
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits('20', 'gwei')
    };

    const deployTx = await wallet.sendTransaction(tx);
    console.log('⏳ Transaction sent:', deployTx.hash);
    
    const receipt = await deployTx.wait();
    const contractAddress = receipt.contractAddress;
    
    console.log('✅ Contract deployed!');
    console.log('📍 Address:', contractAddress);
    
    // Update .env file
    const envPath = '.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
        /REACT_APP_CONTRACT_ADDRESS=.*/,
        `REACT_APP_CONTRACT_ADDRESS=${contractAddress}`
    );
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Updated .env file');
    console.log('\n🎉 Ready to use! Run: npm start');
    
    return contractAddress;
}

deploySimple().catch(console.error);
