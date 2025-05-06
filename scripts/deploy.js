const hre = require("hardhat");

async function main() {
  // Make sure this matches EXACTLY with your contract name
  const Contract = await hre.ethers.getContractFactory("EquipmentLending");
  
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  
  console.log("Contract deployed to:", await contract.getAddress());
  return await contract.getAddress();
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});