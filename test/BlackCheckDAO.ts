import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("BlackCheckDAO", function () {
  const imageURI = "";
  const checksAddress = "0x036721e5A769Cc48B3189EFbb9ccE4471E8A48B1";
  const schmryptoAddress = "0x5efdB6D8c798c2c2Bea5b1961982a5944F92a5C1";
  const schmryptoChecksTokenIds = [11, 313, 315, 462, 727, 737, 767];
  const randomChecksTokenIds = [658, 1992, 13, 21, 111, 1337, 14, 240];

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

  async function stealChecks() {
    const { alice, owner } = await signers();

    const checks = await ethers.getContractAt(
      "IChecksOriginals",
      checksAddress
    );

    for (let i = 0; i < randomChecksTokenIds.length; i++) {
      const tokenId = randomChecksTokenIds[i];
      const tokenOwner = await checks.ownerOf(tokenId);
      const tokenOwnerSigner = await ethers.getImpersonatedSigner(tokenOwner);

      await owner.sendTransaction({
        to: tokenOwner,
        value: ethers.utils.parseEther("1.0"),
      });

      await checks
        .connect(tokenOwnerSigner)
        .transferFrom(tokenOwner, alice.address, tokenId);
      expect(await checks.ownerOf(tokenId)).to.equal(alice.address);
    }
  }

  async function handleApprovals(blackCheckDAOAddress: string) {
    const { schmrypto, alice } = await signers();

    const checks = await ethers.getContractAt(
      "IChecksOriginals",
      checksAddress
    );

    const signersToApprove = [schmrypto, alice] as SignerWithAddress[];

    signersToApprove.forEach(async (signer) => {
      await checks
        .connect(signer)
        .setApprovalForAll(blackCheckDAOAddress, true);
    });
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
    await stealChecks();
    await handleApprovals(blackCheckDAO.address);

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

    it("Should instantiate Checks contract", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);

      const checks = await blackCheckDAO.checks();

      expect(checks).to.not.equal(0);
      expect(checks).to.equal(checksAddress);
    });
  });

  describe("Deposits", async function () {
    // @TODO - Schmrypto should be the first depositor of Checks  #1

    it("Should NOT allow Schmrypto to deposit a Check they do not own for a DAO token", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);
      const { schmrypto } = await loadFixture(signers);

      await expect(
        blackCheckDAO.connect(schmrypto).deposit(randomChecksTokenIds[0])
      ).to.be.revertedWithCustomError(blackCheckDAO, "CheckDepositorNotOwner");
    });

    it("Should allow Schmrypto to deposit an owned Checks for a DAO token", async function () {
      const { blackCheckDAO, checks } = await loadFixture(deploy);
      const { schmrypto } = await loadFixture(signers);

      await blackCheckDAO
        .connect(schmrypto)
        .deposit(schmryptoChecksTokenIds[0]);

      expect(await checks.ownerOf(schmryptoChecksTokenIds[0])).to.equal(
        blackCheckDAO.address
      );
      expect(await blackCheckDAO.balanceOf(schmrypto.address)).to.equal(1);
    });

    it("Should NOT allow Schmrypto to deposit the same Check twice", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);
      const { schmrypto } = await loadFixture(signers);

      await blackCheckDAO
        .connect(schmrypto)
        .deposit(schmryptoChecksTokenIds[0]);

      await expect(
        blackCheckDAO.connect(schmrypto).deposit(schmryptoChecksTokenIds[0])
      ).to.be.revertedWithCustomError(blackCheckDAO, "CheckAlreadyDeposited");
    });

    // Should allow Schmrypto to deposit multiple owned Checks for multiple DAO tokens
    it("Should allow Schmrypto to deposit multiple owned Checks for multiple DAO tokens", async function () {
      const { blackCheckDAO, checks } = await loadFixture(deploy);
      const { schmrypto } = await loadFixture(signers);

      await blackCheckDAO
        .connect(schmrypto)
        .depositMany([schmryptoChecksTokenIds[0], schmryptoChecksTokenIds[1]]);

      expect(await checks.ownerOf(schmryptoChecksTokenIds[0])).to.equal(
        blackCheckDAO.address
      );

      expect(await checks.ownerOf(schmryptoChecksTokenIds[1])).to.equal(
        blackCheckDAO.address
      );

      expect(await blackCheckDAO.balanceOf(schmrypto.address)).to.equal(2);
    });

    // Should not allow Schmrypto to deposit multiple mixed owned and unowned Checks for multiple DAO tokens
    it("Should NOT allow Schmrypto to deposit multiple mixed owned and unowned Checks for multiple DAO tokens", async function () {
      const { blackCheckDAO, checks } = await loadFixture(deploy);
      const { schmrypto } = await loadFixture(signers);

      await expect(
        blackCheckDAO
          .connect(schmrypto)
          .depositMany([schmryptoChecksTokenIds[0], randomChecksTokenIds[0]])
      ).to.be.revertedWithCustomError(blackCheckDAO, "CheckDepositorNotOwner");

      expect(await checks.ownerOf(schmryptoChecksTokenIds[0])).to.equal(
        schmrypto.address
      );

      expect(await blackCheckDAO.balanceOf(schmrypto.address)).to.equal(0);
    });
  });

  describe("Artwork", async function () {});

  describe("Metadata", async function () {});

  describe("Withdrawals", async function () {
    it("Should NOT allow Schmrypto to withdraw a Check they did not deposit", async function () {
      const { blackCheckDAO } = await loadFixture(deploy);
      const { schmrypto, alice } = await loadFixture(signers);

      await blackCheckDAO.connect(alice).deposit(randomChecksTokenIds[0]);

      // @TODO We either need to look up what DAO token ID is for what Check ID
      // OR we can just use the Check ID as the DAO token ID

      await expect(
        blackCheckDAO.connect(schmrypto).withdraw(randomChecksTokenIds[0])
      ).to.be.revertedWithCustomError(blackCheckDAO, "CheckDepositorNotOwner");
    });

    it("Should allow Schmrypto to withdraw a Check they deposited", async function () {
      const { blackCheckDAO, checks } = await loadFixture(deploy);
      const { schmrypto } = await loadFixture(signers);

      await blackCheckDAO
        .connect(schmrypto)
        .deposit(schmryptoChecksTokenIds[0]);

      await blackCheckDAO
        .connect(schmrypto)
        .withdraw(schmryptoChecksTokenIds[0]);

      expect(await checks.ownerOf(schmryptoChecksTokenIds[0])).to.equal(
        schmrypto.address
      );
      expect(await blackCheckDAO.balanceOf(schmrypto.address)).to.equal(0);
    });
  });

  describe("End game", async function () {
    // Should allow black check to be minted
  });
});
