import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("BlackCheckDAO", function () {
    const operatorAddress = '';
    const imageURI = '';

    async function deploy() {
        const BlackCheckDAO = await ethers.getContractFactory("BlackCheckDAO");
        const blackCheckDAO = await BlackCheckDAO.deploy(operatorAddress, imageURI);

        await blackCheckDAO.deployed();

        return blackCheckDAO;
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const blackCheckDAO = await deploy();

            expect(await blackCheckDAO.owner()).to.equal(operatorAddress);
        });
    });
});