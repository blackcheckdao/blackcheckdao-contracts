import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { constants } from "ethers";

describe("BlackCheckDAO", function () {
  const imageURI = "";

  async function signers() {
    const [owner, operator, alice, bob] = await ethers.getSigners();

    return { owner, operator, alice, bob };
  }

  async function deploy() {
    const { operator } = await signers();

    const BlackCheckDAO = await ethers.getContractFactory("BlackCheckDAO");
    const blackCheckDAO = await BlackCheckDAO.deploy(
      operator.address,
      imageURI
    );
    await blackCheckDAO.deployed();

    return { blackCheckDAO };
  }

  describe("Deployment", async function () {
    it("Should set the right image URI", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);

      expect(await blackCheckDAO.imageURI()).to.equal(imageURI);
    });

    it("Should set the right operator address", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);
      const { operator } = await signers();

      expect(await blackCheckDAO.operatorAddress()).to.equal(operator.address);
    });
  });
});
