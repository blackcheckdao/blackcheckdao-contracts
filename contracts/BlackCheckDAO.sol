// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

// @title Black Check DAO
// @author @tom_hirst

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./interfaces/IChecksOriginals.sol";
import "hardhat/console.sol";

// @TODO https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721Receiver
// @TODO https://eips.ethereum.org/EIPS/eip-4906
// @TODO https://eips.ethereum.org/EIPS/eip-2981

contract BlackCheckDAO is ERC721, IERC721Receiver, Ownable {
    address public operatorAddress;
    string public imageURI;

    IChecksOriginals public checks;

    uint256 private _totalSupply;
    uint256 private nextTokenId;

    uint256 public totalChecks;
    bool public blackCheckMinted;

    struct DAOToken {
        uint256 checkId;
        uint256 checks;
    }

    mapping(uint256 => DAOToken) public daoTokens;

    error EmptyOperatorAddress();
    error EmptyImageURI();
    error CheckAlreadyDeposited();
    error CheckDepositorNotOwner();
    error CheckNotDeposited();
    error WithdrawerNotApprovedOrOwner();
    error DAOTokenNotForThisCheck();
    error BlackCheckNotMinted();
    error TokenDoesNotExist();

    event Deposit(
        uint256 indexed tokenId,
        uint256 indexed daoTokenId,
        uint256 totalSupply,
        uint256 totalChecks
    );
    event Withdraw(
        uint256 indexed tokenId,
        uint256 indexed daoTokenId,
        uint256 totalSupply,
        uint256 totalChecks
    );
    event Composite(uint256 indexed tokenId, uint256 indexed burnedId);
    event Infinity(uint256 indexed tokenId, uint256[] indexed burnedIds);

    constructor(
        address _operatorAddress,
        string memory _imageURI
    ) ERC721("Black Check DAO", "BCDAO") {
        if (_operatorAddress == address(0)) {
            revert EmptyOperatorAddress();
        }

        checks = IChecksOriginals(0x036721e5A769Cc48B3189EFbb9ccE4471E8A48B1);
        operatorAddress = _operatorAddress;
        transferOwnership(_operatorAddress);
        imageURI = _imageURI;
    }

    // @notice Deposit a Check and receive a DAO token
    // @param _tokenId The ID of the Check to deposit
    function deposit(uint256 _tokenId) public {
        // Ensure that the Check is not already owned by this contract
        if (checks.ownerOf(_tokenId) == address(this)) {
            revert CheckAlreadyDeposited();
        }

        // @TODO Is this needed? Already in the Checks contract
        // Ensure that the depositor is the owner of the Check
        if (msg.sender != checks.ownerOf(_tokenId)) {
            revert CheckDepositorNotOwner();
        }

        // Transfer check to this contract
        checks.safeTransferFrom(msg.sender, address(this), _tokenId);

        // Get Check data
        IChecks.Check memory check = checks.getCheck(_tokenId);

        // Set the tokenId for the DAO token to be minted
        uint256 tokenId = ++nextTokenId;

        // Assign the Check ID to the DAO token
        daoTokens[tokenId].checkId = _tokenId;

        // Set the total number of Checks that the DAO token represents
        daoTokens[tokenId].checks = check.checksCount == 80
            ? 80 // 1x80
            : check.checksCount == 40
            ? 160 // 2x80
            : check.checksCount == 20
            ? 320 // 4x80
            : check.checksCount == 10
            ? 640 // 8x80
            : check.checksCount == 5
            ? 1280 // 16x80
            : check.checksCount == 4
            ? 2560 // 32x80
            : check.checksCount == 1
            ? 5120 // 64x80
            : 0;

        // Adjust contract state
        ++_totalSupply;
        totalChecks += check.checksCount;

        // Mint a DAO token to the depositor
        _safeMint(msg.sender, tokenId);

        // Emit event
        emit Deposit(_tokenId, tokenId, _totalSupply, totalChecks);
    }

    // @notice Deposit multiple Checks and receive multiple DAO tokens
    // @param _tokenIds The IDs of the Checks to deposit
    function depositMany(uint256[] calldata _tokenIds) public {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            deposit(_tokenIds[i]);
        }
    }

    // @notice Withdraw a Check and burn a DAO token
    // @param _daoTokenId The ID of the DAO token to exchange for its Check
    function withdraw(uint256 _daoTokenId) public {
        // Ensure that the withdrawer is the owner of the DAO token
        if (!_isApprovedOrOwner(msg.sender, _daoTokenId)) {
            revert WithdrawerNotApprovedOrOwner();
        }

        // Burn DAO token
        _burn(_daoTokenId);

        // Adjust contract state
        --_totalSupply;
        totalChecks -= daoTokens[_daoTokenId].checks;

        // Transfer Check to withdrawer
        checks.safeTransferFrom(
            address(this),
            msg.sender,
            daoTokens[_daoTokenId].checkId
        );

        // Emit event
        emit Withdraw(
            daoTokens[_daoTokenId].checkId,
            _daoTokenId,
            _totalSupply,
            totalChecks
        );
    }

    // @notice Withdraw multiple Checks and burn multiple DAO tokens
    // @param _daoTokenIds The IDs of the DAO tokens to exchange for their Checks
    function withdrawMany(uint256[] calldata _daoTokenIds) public {
        for (uint256 i = 0; i < _daoTokenIds.length; i++) {
            withdraw(_daoTokenIds[i]);
        }
    }

    // @notice Composite one deposited Check into another
    // @param _tokenId The ID of the deposited Check to retain
    // @param _burnId The ID of the deposited Check to composite into the tokenId
    // @param _swap Swap the visuals of the two deposited Checks before compositing
    function composite(
        uint256 _tokenId,
        uint256 _burnId,
        bool _swap
    ) public onlyOwner {
        // Call the Checks Originals contract to composite the Checks
        checks.composite(_tokenId, _burnId, _swap);

        // Emit event
        emit Composite(_tokenId, _burnId);
    }

    // @notice Composite multiple deposited Checks into multiple others
    // @param tokenIds The IDs of the deposited Checks to retain
    // @param burnIds The IDs of the deposited Checks to composite into the tokenIds
    // @dev burnIds[0] gets composited into tokenIds[0], and so on
    // @dev Can't swap visuals with this function (use composite first)
    function compositeMany(
        uint256[] calldata _tokenIds,
        uint256[] calldata _burnIds
    ) public onlyOwner {
        checks.compositeMany(_tokenIds, _burnIds);
    }

    // @notice Form the final Black Check from deposited Checks
    // @param _tokenIds The IDs of the deposited Checks to burn for the Black Check
    // @dev Requires 64 single-check tokens in this contract
    // @dev The deposited Check tokenId at _tokenIds[0] is retained by the Black Check
    function infinity(uint256[] calldata _tokenIds) public onlyOwner {
        // Call the Checks Originals contract to form the Black Check
        checks.infinity(_tokenIds);

        // Adjust contract state
        blackCheckMinted = true;

        // Emit event
        emit Infinity(_tokenIds[0], _tokenIds[1:]);
    }

    // @notice Lets the contract owner withdraw a deposited Check
    // @param _tokenId The ID of the deposited Check to withdraw
    // @dev Only callable once the Black Check has been minted
    function ownerWithdraw(uint256 _tokenId) public onlyOwner {
        if (!blackCheckMinted) {
            revert BlackCheckNotMinted();
        }

        checks.safeTransferFrom(address(this), msg.sender, _tokenId);
    }

    // @notice Returns the total number of DAO tokens
    // @dev _totalSupply is adjusted to account for burned tokens
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    // @notice Update the image URI for the DAO tokens
    // @param _URI The new image URI
    function setImageURI(string memory _imageURI) public onlyOwner {
        imageURI = _imageURI;
    }

    // @notice Override the default ERC721 tokenURI function
    // @param _tokenId The ID of the DAO token to get the metadata URI for
    // @dev Metadata is on-chain, art points to an off-chain API
    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        // Check that the token has been minted
        if (!_exists(_tokenId)) {
            revert TokenDoesNotExist();
        }

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            string(
                                abi.encodePacked(
                                    '{"name": "Black Check DAO Token #',
                                    Strings.toString(_tokenId),
                                    '", "description": "Black Check DAO Token for Check #',
                                    Strings.toString(
                                        daoTokens[_tokenId].checkId
                                    ),
                                    '", "image": "',
                                    imageURI,
                                    "/",
                                    Strings.toString(_tokenId),
                                    '","attributes":[{"trait_type": "Checks", "value": "',
                                    Strings.toString(
                                        daoTokens[_tokenId].checks
                                    ),
                                    '"}]}'
                                )
                            )
                        )
                    )
                )
            );
    }

    // @notice Return the total number of Checks in this contract
    // @dev totalChecks is the total number of 80 checks each Check represents
    function getTotalChecks() public view returns (uint256) {
        return totalChecks;
    }

    // @notice Return whether the Black Check can be minted
    // @dev 5120 (total checks needed to create a single check) * 64 = 327680
    function getCanInfinity() public view returns (bool) {
        return totalChecks >= 327680;
    }

    // @notice Tell Checks that this contract can receive tokens
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
