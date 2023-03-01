import { ethers } from "hardhat";

async function main() {
  const operatorAddress = '';
  const imageURI = '';

  const BlackCheckDAO = await ethers.getContractFactory("BlackCheckDAO");
  const blackCheckDAO = await BlackCheckDAO.deploy(operatorAddress, imageURI);

  await blackCheckDAO.deployed();

  console.log(
    `Black Check DAO contract deployed to ${blackCheckDAO.address}. Operator address: ${operatorAddress}. Image URI: ${imageURI}.`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
