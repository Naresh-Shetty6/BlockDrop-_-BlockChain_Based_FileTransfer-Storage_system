const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying BlockDrop contract to Sepolia testnet...");

  // Get the contract factory
  const BlockDrop = await ethers.getContractFactory("BlockDrop");

  // Deploy the contract
  console.log("📦 Deploying contract...");
  const blockDrop = await BlockDrop.deploy();

  // Wait for deployment to complete
  await blockDrop.deployed();

  console.log("✅ BlockDrop contract deployed successfully!");
  console.log("📍 Contract address:", blockDrop.address);
  console.log("🔗 Transaction hash:", blockDrop.deployTransaction.hash);
  console.log("⛽ Gas used:", blockDrop.deployTransaction.gasLimit.toString());

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const fileCount = await blockDrop.fileCount();
  console.log("📊 Initial file count:", fileCount.toString());

  console.log("\n📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Contract Address: ${blockDrop.address}`);
  console.log(`Network: Sepolia Testnet`);
  console.log(`Deployer: ${(await ethers.getSigners())[0].address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n🔧 Next Steps:");
  console.log("1. Update your .env file with the contract address above");
  console.log("2. Add REACT_APP_CONTRACT_ADDRESS=" + blockDrop.address);
  console.log("3. Restart your React application");

  return blockDrop.address;
}

main()
  .then((address) => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
