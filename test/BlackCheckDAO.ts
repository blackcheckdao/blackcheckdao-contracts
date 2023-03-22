import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("BlackCheckDAO", function () {
  const imageURI = "";
  const checksAddress = "0x036721e5A769Cc48B3189EFbb9ccE4471E8A48B1";
  const schmryptoAddress = "0x5efdB6D8c798c2c2Bea5b1961982a5944F92a5C1";
  const schmryptoChecksOriginalsTokenIds = [11, 313, 315, 462, 727, 737, 767];

  async function signers() {
    const [owner, operator, alice, bob] = await ethers.getSigners();
    const schmrypto = await ethers.getImpersonatedSigner(schmryptoAddress);

    return { owner, operator, alice, bob, schmrypto };
  }

  async function creditAccounts() {
    const { owner, schmrypto } = await signers();

    const creditAmount = ethers.utils.parseEther("100.0");
    const prevBalance = await schmrypto.getBalance();

    await owner.sendTransaction({
      to: schmryptoAddress,
      value: creditAmount,
    });

    const newBalance = prevBalance.add(creditAmount);

    expect(await schmrypto.getBalance()).to.equal(newBalance);
  }

  async function deploy() {
    const { operator } = await signers();

    const BlackCheckDAO = await ethers.getContractFactory("BlackCheckDAO");
    const blackCheckDAO = await BlackCheckDAO.deploy(
      operator.address,
      imageURI
    );
    await blackCheckDAO.deployed();

    const checks = await ethers.getContractAt(
      "IChecksOriginals",
      checksAddress
    );

    await creditAccounts();

    return { blackCheckDAO, checks };
  }

  describe("Deployment", async function () {
    it("Should set the right image URI", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);

      expect(await blackCheckDAO.imageURI()).to.equal(imageURI);
    });

    it("Should set the right operator address", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);
      const { operator } = await loadFixture(signers);

      expect(await blackCheckDAO.operatorAddress()).to.equal(operator.address);
    });

    it("Should instantiate Checks Originals contract", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);

      const checks = await blackCheckDAO.checks();

      expect(checks).to.not.equal(0);
      expect(checks).to.equal(checksAddress);
    });
  });

  describe("Deposits", async function () {
    // Should not allow a non-Checks owner to deposit a Check for a DAO token

    // @TODO - Schmrypto should be the first depositor of Checks  #1

    it("Should allow Schmrypto to deposit an owned Checks for a DAO token", async function () {
      const { blackCheckDAO, checks } = await loadFixture(deploy);
      const { schmrypto } = await loadFixture(signers);

      await checks
        .connect(schmrypto)
        .setApprovalForAll(blackCheckDAO.address, true);

      await blackCheckDAO
        .connect(schmrypto)
        .deposit(schmryptoChecksOriginalsTokenIds[0]);

      expect(
        await checks.ownerOf(schmryptoChecksOriginalsTokenIds[0])
      ).to.equal(blackCheckDAO.address);
      expect(await blackCheckDAO.balanceOf(schmrypto.address)).to.equal(1);
    });

    // Should not allow Schmrypto to deposit a Check they do not own for a DAO token
  });

  describe("Artwork", async function () {});

  describe("Metadata", async function () {});

  describe("Withdrawals", async function () {
    // Should allow a user to withdraw a Check if they burn the corresponding DAO token
  });

  describe("End game", async function () {
    // Should allow black check to be minted
  });
});
